use aether_core::{Event, EventPayload, SagaState};
use serde_json::json;
use std::time::Instant;
use uuid::Uuid;

fn main() {
    println!("Starting fold replay benchmark via benches/fold_replay_bench.rs...");
    let saga_id = Uuid::new_v4();
    let workflow_id = Uuid::new_v4();
    let initial_state = SagaState::new(saga_id, workflow_id);

    let count = 100_000;
    let mut events = Vec::with_capacity(count);
    events.push(Event::new(
        saga_id,
        1,
        EventPayload::AgentJobCreated {
            workflow_id,
            goal: "Benchmark fold".to_string(),
            initial_context: json!({}),
        },
        "0".repeat(64),
    ));

    for seq in 2..=count as u64 {
        events.push(Event {
            event_id: Uuid::from_u128(seq as u128),
            saga_id,
            seq,
            payload: EventPayload::InferenceCompleted {
                prompt_tokens: 10,
                completion_tokens: 5,
                duration_ms: 10,
                content: "bench".to_string(),
            },
            timestamp: chrono::Utc::now(),
            previous_hash: "0".repeat(64),
            current_hash: "0".repeat(64),
            signature: None,
        });
    }

    let start = Instant::now();
    let res = SagaState::fold(initial_state, &events).expect("Fold succeeded");
    let dur = start.elapsed();
    println!(
        "Processed {} events in {:.4}s ({:.2} events/sec), final seq {}",
        count,
        dur.as_secs_f64(),
        (count as f64) / dur.as_secs_f64(),
        res.last_seq
    );
}
