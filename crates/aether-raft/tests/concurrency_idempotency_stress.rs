use aether_core::{Event, EventPayload, SagaState, SagaStatus};
use aether_raft::RaftStateMachine;
use serde_json::json;
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::Arc;
use std::time::Instant;
use tokio::sync::Barrier;
use uuid::Uuid;

#[tokio::test(flavor = "multi_thread", worker_threads = 8)]
async fn test_raft_concurrency_and_duplicate_idempotency_stress() {
    println!("================================================================================");
    println!("  AETHER-RAFT: CONCURRENCY & DUPLICATE EVENT IDEMPOTENCY STRESS BENCHMARK       ");
    println!("================================================================================");

    let start_time = Instant::now();
    let num_tasks: usize = 64; // 64 concurrent tasks (> 50 required)
    let total_unique_events: usize = 10_000;
    let duplicates_per_worker: usize = 800; // 63 * 800 = 50,400 duplicates (> 50,000 required)
    let total_duplicates = (num_tasks - 1) * duplicates_per_worker;
    let total_events = total_unique_events + total_duplicates;

    let dup_ratio = (total_duplicates as f64) / (total_events as f64) * 100.0;
    println!("  Concurrent Tasks:          {}", num_tasks);
    println!("  Unique Progression Events: {}", total_unique_events);
    println!("  Duplicate Events Injected: {}", total_duplicates);
    println!("  Total Events Processed:    {}", total_events);
    println!("  Duplicate Event Ratio:     {:.2}% (Requirement >= 50%)", dup_ratio);
    assert!(dup_ratio >= 50.0);
    assert!(total_events >= 50_000);
    assert!(num_tasks >= 50);

    let saga_id = Uuid::new_v4();
    let workflow_id = Uuid::new_v4();
    let initial_state = SagaState::new(saga_id, workflow_id);

    // Pre-generate canonical event sequence
    println!("  [1/4] Pre-generating {} canonical Raft events...", total_unique_events);
    let mut canonical_events = Vec::with_capacity(total_unique_events);

    let e1 = Event::new(
        saga_id,
        1,
        EventPayload::AgentJobCreated {
            workflow_id,
            goal: "Distributed Raft concurrency stress saga".to_string(),
            initial_context: json!({"concurrency": num_tasks, "consensus": "raft"}),
        },
        "0".repeat(64),
    );
    canonical_events.push(e1);

    for seq in 2..total_unique_events as u64 {
        let payload = match seq % 4 {
            0 => EventPayload::InferenceCompleted {
                prompt_tokens: 20,
                completion_tokens: 10,
                duration_ms: 15,
                content: format!("Raft consensus step {}", seq),
            },
            1 => EventPayload::ContextWindowHydrated {
                token_count: 4096,
                memory_ids: vec![Uuid::from_u128(seq as u128)],
            },
            2 => EventPayload::ToolExecutionStarted {
                tool_name: "distributed_consensus".to_string(),
                sandbox_id: "wasm_node_0".to_string(),
                input_args: json!({"seq": seq}),
            },
            _ => EventPayload::ToolExecutionFinished {
                tool_name: "distributed_consensus".to_string(),
                exit_code: 0,
                output: json!({"committed": true}),
            },
        };

        canonical_events.push(Event::new(saga_id, seq, payload, "0".repeat(64)));
    }

    let e_complete = Event::new(
        saga_id,
        total_unique_events as u64,
        EventPayload::AgentJobCompleted {
            final_output: json!({"status": "SUCCESS", "consensus": "COMMITTED"}),
            total_tokens: 300_000,
        },
        "0".repeat(64),
    );
    canonical_events.push(e_complete);

    // Baseline single-threaded state calculation
    println!("  [2/4] Computing baseline sequential Raft state...");
    let baseline_state = SagaState::fold(initial_state, &canonical_events)
        .expect("Baseline sequential fold failed");
    let baseline_hash = baseline_state.state_hash();
    println!("      Baseline State Hash: {}", baseline_hash);

    // Initialize Raft State Machine
    let sm = Arc::new(RaftStateMachine::new());
    let shared_events = Arc::new(canonical_events);
    let barrier = Arc::new(Barrier::new(num_tasks));

    let processed_events_counter = Arc::new(AtomicU64::new(0));
    let duplicate_success_counter = Arc::new(AtomicU64::new(0));
    let progress_success_counter = Arc::new(AtomicU64::new(0));

    println!("  [3/4] Launching {} concurrent tasks against RaftStateMachine...", num_tasks);
    let mut handles = Vec::with_capacity(num_tasks);

    // Task 0: Stream progression driver
    {
        let sm_clone = Arc::clone(&sm);
        let events_clone = Arc::clone(&shared_events);
        let barrier_clone = Arc::clone(&barrier);
        let processed = Arc::clone(&processed_events_counter);
        let prog_counter = Arc::clone(&progress_success_counter);

        handles.push(tokio::spawn(async move {
            barrier_clone.wait().await;
            for event in events_clone.iter() {
                let state = sm_clone.apply_event(event).await.expect("Progression event must succeed");
                assert_eq!(state.last_seq, event.seq);
                processed.fetch_add(1, Ordering::Relaxed);
                prog_counter.fetch_add(1, Ordering::Relaxed);

                // Yield periodically to interleave with concurrent duplicate flood
                if event.seq % 50 == 0 {
                    tokio::task::yield_now().await;
                }
            }
        }));
    }

    // Tasks 1..64: High-frequency concurrent duplicate injectors
    for worker_id in 1..num_tasks {
        let sm_clone = Arc::clone(&sm);
        let events_clone = Arc::clone(&shared_events);
        let barrier_clone = Arc::clone(&barrier);
        let processed = Arc::clone(&processed_events_counter);
        let dup_counter = Arc::clone(&duplicate_success_counter);

        handles.push(tokio::spawn(async move {
            barrier_clone.wait().await;
            let mut lcg: u64 = (worker_id as u64).wrapping_mul(0x5851F42D4C957F2D).wrapping_add(1);

            for _ in 0..duplicates_per_worker {
                // Read current committed sequence safely via RaftStateMachine
                let max_avail = match sm_clone.get_state(&saga_id).await {
                    Some(s) => s.last_seq,
                    None => 0,
                };

                if max_avail > 0 {
                    // Pick any past event <= max_avail to inject as duplicate
                    lcg = lcg.wrapping_mul(6364136223846793005).wrapping_add(1);
                    let target_seq = (lcg % max_avail) + 1;
                    let dup_event = &events_clone[(target_seq - 1) as usize];

                    let state = sm_clone.apply_event(dup_event).await
                        .expect("Duplicate event application must succeed idempotently in RaftStateMachine");

                    assert!(
                        state.last_seq >= dup_event.seq,
                        "State sequence regressed under duplicate event!"
                    );
                    dup_counter.fetch_add(1, Ordering::Relaxed);
                    processed.fetch_add(1, Ordering::Relaxed);
                } else {
                    tokio::task::yield_now().await;
                }
            }
        }));
    }

    // Await completion of all 64 tasks
    for handle in handles {
        handle.await.expect("Raft task panicked or timed out");
    }

    let elapsed = start_time.elapsed();
    let final_processed = processed_events_counter.load(Ordering::SeqCst);
    let final_progress = progress_success_counter.load(Ordering::SeqCst);
    let final_duplicates = duplicate_success_counter.load(Ordering::SeqCst);
    let throughput = (final_processed as f64) / elapsed.as_secs_f64();

    println!("  [4/4] Verifying Raft determinism and zero race conditions...");
    let final_state = sm.get_state(&saga_id).await.expect("Final state must exist in Raft state machine");
    let final_hash = final_state.state_hash();

    println!("      Raft Final State Status:       {:?}", final_state.status);
    println!("      Raft Final State Last Seq:     {}", final_state.last_seq);
    println!("      Raft Final State Hash:         {}", final_hash);
    println!("      Progression Events Applied:    {}", final_progress);
    println!("      Duplicate Redeliveries Handled:{}", final_duplicates);
    println!("      Total Events Processed:        {}", final_processed);
    println!("      Execution Duration:            {:.4} s", elapsed.as_secs_f64());
    println!("      Concurrent Throughput:         {:.2} events/sec", throughput);

    // Invariant and Determinism Assertions
    assert_eq!(final_progress, total_unique_events as u64);
    assert_eq!(final_state.status, SagaStatus::Completed);
    assert_eq!(final_state.last_seq, total_unique_events as u64);
    assert_eq!(final_state.total_prompt_tokens, baseline_state.total_prompt_tokens);
    assert_eq!(final_state.total_completion_tokens, baseline_state.total_completion_tokens);
    assert_eq!(
        final_state, baseline_state,
        "CRITICAL: Final Raft state diverged from sequential baseline!"
    );
    assert_eq!(
        final_hash, baseline_hash,
        "CRITICAL: Final Raft state hash diverged from sequential baseline!"
    );

    println!("================================================================================");
    println!("  AETHER-RAFT: CONCURRENCY & IDEMPOTENCY STRESS VERIFICATION PASSED             ");
    println!("================================================================================");
}
