use aether_core::{AetherError, Event, EventPayload, SagaState, SagaStatus};
use rand::rngs::StdRng;
use rand::{Rng, SeedableRng};
use serde_json::json;
use std::time::Instant;
use uuid::Uuid;

fn generate_random_event(
    rng: &mut StdRng,
    saga_id: Uuid,
    seq: u64,
    _workflow_id: Uuid,
) -> Event {
    let payload_type = rng.gen_range(0..11);
    let payload = match payload_type {
        0 => EventPayload::ContextWindowHydrated {
            token_count: rng.gen_range(512..8192),
            memory_ids: vec![Uuid::new_v4()],
        },
        1 => EventPayload::PromptDispatched {
            model: if rng.gen_bool(0.5) { "claude-3-7-sonnet".to_string() } else { "gpt-4o".to_string() },
            prompt_hash: format!("{:016x}", rng.r#gen::<u64>()),
        },
        2 => EventPayload::InferenceCompleted {
            prompt_tokens: rng.gen_range(10..1500),
            completion_tokens: rng.gen_range(5..800),
            duration_ms: rng.gen_range(50..2000),
            content: format!("Fuzzed inference output for seq {}", seq),
        },
        3 => EventPayload::PolicyCheckEvaluated {
            rule_id: format!("POL-{:03}", rng.gen_range(1..20)),
            passed: rng.gen_bool(0.95),
            risk_score: rng.gen_range(0.0..0.2),
        },
        4 => EventPayload::ToolExecutionStarted {
            tool_name: "code_executor".to_string(),
            sandbox_id: format!("sb-{}", rng.gen_range(1..5)),
            input_args: json!({"cmd": "echo test"}),
        },
        5 => EventPayload::ToolExecutionFinished {
            tool_name: "code_executor".to_string(),
            exit_code: 0,
            output: json!({"stdout": "test\n"}),
        },
        6 => EventPayload::MemoryConsolidated {
            facts_extracted: rng.gen_range(1..10),
            memory_tier: "working_memory".to_string(),
        },
        7 => EventPayload::ExecutionSuspended {
            reason: "Approval needed".to_string(),
            requires_human_approval: true,
        },
        8 => EventPayload::ExecutionResumed {
            approver_id: "sec-admin-1".to_string(),
            decision: "approved".to_string(),
        },
        9 => EventPayload::AgentJobCompleted {
            final_output: json!({"status": "SUCCESS", "seq": seq}),
            total_tokens: rng.gen_range(1000..50000),
        },
        _ => EventPayload::AgentJobAborted {
            reason: "Random fuzz termination".to_string(),
            error_code: "FUZZ_ABORT".to_string(),
        },
    };

    Event {
        event_id: Uuid::new_v4(),
        saga_id,
        seq,
        payload,
        timestamp: chrono::Utc::now(),
        previous_hash: "0".repeat(64),
        current_hash: format!("{:016x}", rng.r#gen::<u64>()),
        signature: None,
    }
}

#[test]
fn test_state_machine_fuzzing_100k_iterations() {
    println!("================================================================================");
    println!("     AETHER-CORE: STATE MACHINE FUZZING & PROPERTY BENCHMARK (100,000 ITERS)    ");
    println!("================================================================================");

    let start_time = Instant::now();
    let mut rng = StdRng::seed_from_u64(0xDEADBEEF_CAFE1337);

    let target_iterations = 100_000usize;
    let mut current_saga_id = Uuid::new_v4();
    let mut current_workflow_id = Uuid::new_v4();
    let mut state = SagaState::new(current_saga_id, current_workflow_id);

    // Initial event: AgentJobCreated
    let e1 = Event {
        event_id: Uuid::new_v4(),
        saga_id: current_saga_id,
        seq: 1,
        payload: EventPayload::AgentJobCreated {
            workflow_id: current_workflow_id,
            goal: "Initial fuzz saga".to_string(),
            initial_context: json!({}),
        },
        timestamp: chrono::Utc::now(),
        previous_hash: "0".repeat(64),
        current_hash: "0".repeat(64),
        signature: None,
    };
    state = state.apply(&e1).expect("e1 must succeed");
    let mut applied_history: Vec<Event> = vec![e1];
    let mut expected_prompt_tokens: u64 = 0;
    let mut expected_completion_tokens: u64 = 0;

    // Invariant validation counters
    let mut inv1_seq_monotonicity_checks: u64 = 0;
    let mut inv2_terminal_immutability_checks: u64 = 0;
    let mut inv3_idempotent_stability_checks: u64 = 0;
    let mut inv4_token_accounting_checks: u64 = 0;
    let mut inv5_cross_saga_isolation_checks: u64 = 0;

    let mut sagas_cycled: u64 = 0;
    let mut terminal_probes: usize = 0;

    for _iteration in 0..target_iterations {
        let action = rng.gen_range(0..100);

        if action < 45 {
            // ACTION A: Valid sequential progress (Invariant 1: Monotonicity, Invariant 4: Token Accounting)
            let next_seq = state.last_seq + 1;
            let event = generate_random_event(&mut rng, current_saga_id, next_seq, current_workflow_id);

            let is_terminal_before = matches!(state.status, SagaStatus::Completed | SagaStatus::Aborted);

            let res = state.clone().apply(&event);

            if is_terminal_before {
                // Invariant 2: Terminal State Immutability
                assert!(res.is_err(), "Applying event to terminated saga must fail");
                match res {
                    Err(AetherError::InvalidTransition { .. }) => {
                        inv2_terminal_immutability_checks += 1;
                    }
                    Err(other) => panic!("Expected InvalidTransition on terminal saga, got {:?}", other),
                    Ok(_) => unreachable!(),
                }
            } else {
                let new_state = res.expect("Valid sequential event must succeed");

                // Invariant 1: Monotonicity verification
                assert_eq!(
                    new_state.last_seq, next_seq,
                    "Sequence must advance strictly monotonically: {} -> {}",
                    state.last_seq, next_seq
                );
                inv1_seq_monotonicity_checks += 1;

                // Track expected token counts for Invariant 4
                if let EventPayload::InferenceCompleted {
                    prompt_tokens,
                    completion_tokens,
                    ..
                } = &event.payload
                {
                    expected_prompt_tokens += *prompt_tokens as u64;
                    expected_completion_tokens += *completion_tokens as u64;
                }

                // Invariant 4: Token Accounting Invariant
                assert_eq!(
                    new_state.total_prompt_tokens, expected_prompt_tokens,
                    "Prompt tokens accounting invariant violated!"
                );
                assert_eq!(
                    new_state.total_completion_tokens, expected_completion_tokens,
                    "Completion tokens accounting invariant violated!"
                );
                inv4_token_accounting_checks += 1;

                applied_history.push(event);
                state = new_state;
            }
        } else if action < 65 {
            // ACTION B: Idempotent Redelivery Test (Invariant 3: S_t o E_k = S_t for all k <= t)
            if !applied_history.is_empty() {
                let past_idx = rng.gen_range(0..applied_history.len());
                let past_event = &applied_history[past_idx];
                assert!(past_event.seq <= state.last_seq);

                let res = state.clone().apply(past_event);
                assert!(
                    res.is_ok(),
                    "Duplicate redelivery of seq {} must succeed idempotently",
                    past_event.seq
                );
                let state_after_dup = res.unwrap();

                // Core Invariant 3: S_t o E_k == S_t
                assert_eq!(
                    state_after_dup, state,
                    "State was mutated by duplicate event delivery at seq {}!",
                    past_event.seq
                );
                inv3_idempotent_stability_checks += 1;
            }
        } else if action < 80 {
            // ACTION C: Sequence Gap / Zero Violation (Invariant 1: Monotonicity violation rejected)
            let is_zero = rng.gen_bool(0.2);
            let bad_seq = if is_zero {
                0
            } else {
                state.last_seq + rng.gen_range(2..100)
            };

            let invalid_event = Event {
                event_id: Uuid::new_v4(),
                saga_id: current_saga_id,
                seq: bad_seq,
                payload: EventPayload::ContextWindowHydrated {
                    token_count: 1024,
                    memory_ids: vec![],
                },
                timestamp: chrono::Utc::now(),
                previous_hash: "0".repeat(64),
                current_hash: "0".repeat(64),
                signature: None,
            };

            let res = state.clone().apply(&invalid_event);
            if matches!(state.status, SagaStatus::Completed | SagaStatus::Aborted) && !is_zero {
                // Terminal state takes precedence if not seq 0
                assert!(res.is_err(), "Terminal saga must reject new events");
                inv2_terminal_immutability_checks += 1;
            } else {
                assert!(res.is_err(), "Non-monotonic sequence {} must be rejected", bad_seq);
                match res {
                    Err(AetherError::SequenceMismatch { expected, actual }) => {
                        if is_zero {
                            assert_eq!(actual, 0);
                        } else {
                            assert_eq!(expected, state.last_seq + 1);
                            assert_eq!(actual, bad_seq);
                        }
                        inv1_seq_monotonicity_checks += 1;
                    }
                    Err(AetherError::InvalidTransition { .. }) if matches!(state.status, SagaStatus::Completed | SagaStatus::Aborted) => {
                        inv2_terminal_immutability_checks += 1;
                    }
                    other => panic!("Unexpected error on sequence violation: {:?}", other),
                }
            }
        } else if action < 92 {
            // ACTION D: Cross-Saga Isolation (Invariant 5: E_other -> Rejected)
            let other_saga_id = Uuid::new_v4();
            let cross_event = Event {
                event_id: Uuid::new_v4(),
                saga_id: other_saga_id,
                seq: state.last_seq + 1,
                payload: EventPayload::InferenceCompleted {
                    prompt_tokens: 10,
                    completion_tokens: 10,
                    duration_ms: 10,
                    content: "Cross injection".to_string(),
                },
                timestamp: chrono::Utc::now(),
                previous_hash: "0".repeat(64),
                current_hash: "0".repeat(64),
                signature: None,
            };

            let res = state.clone().apply(&cross_event);
            assert!(res.is_err(), "Cross-saga injection must be rejected");
            match res {
                Err(AetherError::InvalidTransition { reason, .. }) => {
                    assert!(reason.contains("does not match"));
                    inv5_cross_saga_isolation_checks += 1;
                }
                other => panic!("Expected InvalidTransition for cross-saga, got {:?}", other),
            }
        } else {
            // ACTION E: Terminal State Direct Probe (Invariant 2: Immutability)
            if matches!(state.status, SagaStatus::Completed | SagaStatus::Aborted) {
                let post_event = generate_random_event(
                    &mut rng,
                    current_saga_id,
                    state.last_seq + 1,
                    current_workflow_id,
                );
                let res = state.clone().apply(&post_event);
                assert!(res.is_err(), "Post-terminal event application must fail");
                match res {
                    Err(AetherError::InvalidTransition { reason, .. }) => {
                        assert!(reason.contains("terminated saga"));
                        inv2_terminal_immutability_checks += 1;
                    }
                    other => panic!("Expected InvalidTransition on terminal saga, got {:?}", other),
                }
            }
        }

        // If saga has reached terminal state, probe it for Invariant 2 (Terminal Immutability)
        if matches!(state.status, SagaStatus::Completed | SagaStatus::Aborted) {
            terminal_probes += 1;
            let post_event = generate_random_event(
                &mut rng,
                current_saga_id,
                state.last_seq + 1,
                current_workflow_id,
            );
            let res = state.clone().apply(&post_event);
            assert!(res.is_err(), "Post-terminal event application must fail");
            match res {
                Err(AetherError::InvalidTransition { reason, .. }) => {
                    assert!(reason.contains("terminated saga"));
                    inv2_terminal_immutability_checks += 1;
                }
                other => panic!("Expected InvalidTransition on terminal saga, got {:?}", other),
            }

            if terminal_probes >= 3 {
                // Cycle to fresh saga after testing terminal immutability
                sagas_cycled += 1;
                terminal_probes = 0;
                current_saga_id = Uuid::new_v4();
                current_workflow_id = Uuid::new_v4();
                state = SagaState::new(current_saga_id, current_workflow_id);

                let fresh_e1 = Event {
                    event_id: Uuid::new_v4(),
                    saga_id: current_saga_id,
                    seq: 1,
                    payload: EventPayload::AgentJobCreated {
                        workflow_id: current_workflow_id,
                        goal: format!("Fuzz saga cycle {}", sagas_cycled),
                        initial_context: json!({"cycle": sagas_cycled}),
                    },
                    timestamp: chrono::Utc::now(),
                    previous_hash: "0".repeat(64),
                    current_hash: "0".repeat(64),
                    signature: None,
                };
                state = state.apply(&fresh_e1).expect("Fresh saga e1 must succeed");
                applied_history = vec![fresh_e1];
                expected_prompt_tokens = 0;
                expected_completion_tokens = 0;
            }
        } else if state.last_seq > 100 {
            // Cycle long-lived active sagas to explore new starting parameters
            sagas_cycled += 1;
            terminal_probes = 0;
            current_saga_id = Uuid::new_v4();
            current_workflow_id = Uuid::new_v4();
            state = SagaState::new(current_saga_id, current_workflow_id);

            let fresh_e1 = Event {
                event_id: Uuid::new_v4(),
                saga_id: current_saga_id,
                seq: 1,
                payload: EventPayload::AgentJobCreated {
                    workflow_id: current_workflow_id,
                    goal: format!("Fuzz saga cycle {}", sagas_cycled),
                    initial_context: json!({"cycle": sagas_cycled}),
                },
                timestamp: chrono::Utc::now(),
                previous_hash: "0".repeat(64),
                current_hash: "0".repeat(64),
                signature: None,
            };
            state = state.apply(&fresh_e1).expect("Fresh saga e1 must succeed");
            applied_history = vec![fresh_e1];
            expected_prompt_tokens = 0;
            expected_completion_tokens = 0;
        }
    }

    let elapsed = start_time.elapsed();
    let throughput = (target_iterations as f64) / elapsed.as_secs_f64();

    println!("  Total Fuzzing Iterations:          {}", target_iterations);
    println!("  Execution Elapsed Time:            {:.4} s", elapsed.as_secs_f64());
    println!("  Fuzzing Throughput:                {:.2} iterations/sec", throughput);
    println!("  Saga Lifecycles Explored:          {}", sagas_cycled);
    println!("  Invariant 1 Checks (Monotonicity): {}", inv1_seq_monotonicity_checks);
    println!("  Invariant 2 Checks (Immutability): {}", inv2_terminal_immutability_checks);
    println!("  Invariant 3 Checks (Idempotency):  {}", inv3_idempotent_stability_checks);
    println!("  Invariant 4 Checks (Token Acct):   {}", inv4_token_accounting_checks);
    println!("  Invariant 5 Checks (Isolation):    {}", inv5_cross_saga_isolation_checks);
    println!("  Total Invariant Validations:       {}",
        inv1_seq_monotonicity_checks + inv2_terminal_immutability_checks +
        inv3_idempotent_stability_checks + inv4_token_accounting_checks +
        inv5_cross_saga_isolation_checks
    );
    println!("  Unhandled Panics:                  0 (Zero panics)");
    println!("  Invariant Violations:              0 (100% Invariant Compliance)");
    println!("================================================================================");

    assert!(inv1_seq_monotonicity_checks > 10_000);
    assert!(inv2_terminal_immutability_checks > 1_000);
    assert!(inv3_idempotent_stability_checks > 10_000);
    assert!(inv4_token_accounting_checks > 10_000);
    assert!(inv5_cross_saga_isolation_checks > 5_000);
}
