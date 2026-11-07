pub mod error;
pub mod event;
pub mod state;

pub use error::AetherError;
pub use event::{Event, EventPayload};
pub use state::{SagaState, SagaStatus};

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;
    use uuid::Uuid;

    #[test]
    fn test_deterministic_event_fold() {
        let saga_id = Uuid::new_v4();
        let workflow_id = Uuid::new_v4();
        let initial_state = SagaState::new(saga_id, workflow_id);

        let genesis_hash = "0000000000000000000000000000000000000000000000000000000000000000".to_string();

        let e1 = Event::new(
            saga_id,
            1,
            EventPayload::AgentJobCreated {
                workflow_id,
                goal: "Analyze code vulnerability".to_string(),
                initial_context: json!({"repo": "aether-ai/aether"}),
            },
            genesis_hash,
        );

        let e2 = Event::new(
            saga_id,
            2,
            EventPayload::InferenceCompleted {
                prompt_tokens: 150,
                completion_tokens: 45,
                duration_ms: 320,
                content: "Executing security tool".to_string(),
            },
            e1.current_hash.clone(),
        );

        let e3 = Event::new(
            saga_id,
            3,
            EventPayload::ToolExecutionStarted {
                tool_name: "cargo_audit".to_string(),
                sandbox_id: "wasm-sb-1".to_string(),
                input_args: json!({}),
            },
            e2.current_hash.clone(),
        );

        let e4 = Event::new(
            saga_id,
            4,
            EventPayload::ToolExecutionFinished {
                tool_name: "cargo_audit".to_string(),
                exit_code: 0,
                output: json!({"vulns": 0}),
            },
            e3.current_hash.clone(),
        );

        let e5 = Event::new(
            saga_id,
            5,
            EventPayload::AgentJobCompleted {
                final_output: json!({"status": "SECURE"}),
                total_tokens: 195,
            },
            e4.current_hash.clone(),
        );

        let events = vec![e1, e2, e3, e4, e5];

        let state_run1 = SagaState::fold(initial_state.clone(), &events).expect("Fold run 1 failed");
        let state_run2 = SagaState::fold(initial_state, &events).expect("Fold run 2 failed");

        assert_eq!(state_run1, state_run2);
        assert_eq!(state_run1.status, SagaStatus::Completed);
        assert_eq!(state_run1.last_seq, 5);
        assert_eq!(state_run1.total_prompt_tokens, 150);
        assert_eq!(state_run1.total_completion_tokens, 45);
        assert_eq!(state_run1.active_tool, None);
        assert_eq!(state_run1.final_result, Some(json!({"status": "SECURE"})));
    }

    #[test]
    fn test_sequence_mismatch_error() {
        let saga_id = Uuid::new_v4();
        let workflow_id = Uuid::new_v4();
        let initial_state = SagaState::new(saga_id, workflow_id);

        let e_invalid = Event::new(
            saga_id,
            2, // Skipped seq 1!
            EventPayload::AgentJobCreated {
                workflow_id,
                goal: "Invalid start".to_string(),
                initial_context: json!({}),
            },
            "0".repeat(64),
        );

        let result = initial_state.apply(&e_invalid);
        assert!(matches!(result, Err(AetherError::SequenceMismatch { expected: 1, actual: 2 })));
    }

    #[test]
    fn test_cross_saga_id_rejection() {
        let saga_id = Uuid::new_v4();
        let other_saga_id = Uuid::new_v4();
        let workflow_id = Uuid::new_v4();
        let state = SagaState::new(saga_id, workflow_id);

        let cross_event = Event::new(
            other_saga_id,
            1,
            EventPayload::AgentJobCreated {
                workflow_id,
                goal: "Adversarial cross injection".to_string(),
                initial_context: json!({}),
            },
            "0".repeat(64),
        );

        let res = state.apply(&cross_event);
        assert!(matches!(res, Err(AetherError::InvalidTransition { .. })));
    }

    #[test]
    fn test_terminal_state_protection() {
        let saga_id = Uuid::new_v4();
        let workflow_id = Uuid::new_v4();
        let mut state = SagaState::new(saga_id, workflow_id);
        state.status = SagaStatus::Completed;
        state.last_seq = 1;

        let post_event = Event::new(
            saga_id,
            2,
            EventPayload::InferenceCompleted {
                prompt_tokens: 100,
                completion_tokens: 50,
                duration_ms: 100,
                content: "Unauthorized post-completion inference".to_string(),
            },
            "0".repeat(64),
        );

        let res = state.apply(&post_event);
        assert!(matches!(res, Err(AetherError::InvalidTransition { .. })));
    }

    #[test]
    fn test_idempotent_duplicate_handling() {
        let saga_id = Uuid::new_v4();
        let workflow_id = Uuid::new_v4();
        let initial_state = SagaState::new(saga_id, workflow_id);

        let e1 = Event::new(
            saga_id,
            1,
            EventPayload::AgentJobCreated {
                workflow_id,
                goal: "Idempotency test".to_string(),
                initial_context: json!({}),
            },
            "0".repeat(64),
        );

        let s1 = initial_state.apply(&e1).expect("Failed to apply e1");
        assert_eq!(s1.last_seq, 1);
        assert_eq!(s1.status, SagaStatus::Running);

        // Replay e1 (duplicate redelivery from NATS JetStream)
        let s1_duplicate = s1.clone().apply(&e1).expect("Duplicate event should be handled idempotently");
        assert_eq!(s1, s1_duplicate);
    }
}

