use aether_core::{AetherError, Event, EventPayload, SagaState, SagaStatus};
use serde_json::json;
use uuid::Uuid;

fn make_event(saga_id: Uuid, seq: u64, payload: EventPayload) -> Event {
    Event::new(saga_id, seq, payload, "0".repeat(64))
}

fn create_running_saga(saga_id: Uuid, workflow_id: Uuid) -> SagaState {
    let initial = SagaState::new(saga_id, workflow_id);
    let e1 = make_event(
        saga_id,
        1,
        EventPayload::AgentJobCreated {
            workflow_id,
            goal: "Empirical test task".to_string(),
            initial_context: json!({"key": "val"}),
        },
    );
    initial.apply(&e1).expect("Failed to apply initial event")
}

fn create_suspended_saga(saga_id: Uuid, workflow_id: Uuid) -> SagaState {
    let running = create_running_saga(saga_id, workflow_id);
    let e2 = make_event(
        saga_id,
        2,
        EventPayload::ExecutionSuspended {
            reason: "Waiting for human approval".to_string(),
            requires_human_approval: true,
        },
    );
    running.apply(&e2).expect("Failed to suspend saga")
}

fn create_completed_saga(saga_id: Uuid, workflow_id: Uuid) -> SagaState {
    let running = create_running_saga(saga_id, workflow_id);
    let e2 = make_event(
        saga_id,
        2,
        EventPayload::AgentJobCompleted {
            final_output: json!({"result": "SUCCESS"}),
            total_tokens: 100,
        },
    );
    running.apply(&e2).expect("Failed to complete saga")
}

fn create_aborted_saga(saga_id: Uuid, workflow_id: Uuid) -> SagaState {
    let running = create_running_saga(saga_id, workflow_id);
    let e2 = make_event(
        saga_id,
        2,
        EventPayload::AgentJobAborted {
            reason: "Execution budget exceeded".to_string(),
            error_code: "OUT_OF_BUDGET".to_string(),
        },
    );
    running.apply(&e2).expect("Failed to abort saga")
}

#[test]
fn test_duplicate_redelivery_across_all_statuses() {
    let saga_id = Uuid::new_v4();
    let workflow_id = Uuid::new_v4();

    // 1. Pending status with last_seq = 1 (ContextWindowHydrated does not advance status to Running)
    let pending_initial = SagaState::new(saga_id, workflow_id);
    let e1_pending = make_event(
        saga_id,
        1,
        EventPayload::ContextWindowHydrated {
            token_count: 50,
            memory_ids: vec![],
        },
    );
    let pending_state = pending_initial.apply(&e1_pending).expect("apply pending");
    assert_eq!(pending_state.status, SagaStatus::Pending);
    assert_eq!(pending_state.last_seq, 1);

    let dup_pending = pending_state
        .clone()
        .apply(&e1_pending)
        .expect("dup pending");
    assert_eq!(
        dup_pending, pending_state,
        "Pending status must be idempotent"
    );

    // 2. Running status
    let running_state = create_running_saga(saga_id, workflow_id);
    let e1 = make_event(
        saga_id,
        1,
        EventPayload::AgentJobCreated {
            workflow_id,
            goal: "Empirical test task".to_string(),
            initial_context: json!({"key": "val"}),
        },
    );
    let dup_running = running_state.clone().apply(&e1).expect("dup running");
    assert_eq!(
        dup_running, running_state,
        "Running status must be idempotent"
    );

    // 3. Suspended status
    let suspended_state = create_suspended_saga(saga_id, workflow_id);
    let e2_susp = make_event(
        saga_id,
        2,
        EventPayload::ExecutionSuspended {
            reason: "Waiting for human approval".to_string(),
            requires_human_approval: true,
        },
    );
    let dup_susp_1 = suspended_state.clone().apply(&e1).expect("dup susp e1");
    let dup_susp_2 = suspended_state
        .clone()
        .apply(&e2_susp)
        .expect("dup susp e2");
    assert_eq!(dup_susp_1, suspended_state);
    assert_eq!(dup_susp_2, suspended_state);

    // 4. Completed status
    let completed_state = create_completed_saga(saga_id, workflow_id);
    let e2_comp = make_event(
        saga_id,
        2,
        EventPayload::AgentJobCompleted {
            final_output: json!({"result": "SUCCESS"}),
            total_tokens: 100,
        },
    );
    let dup_comp_1 = completed_state.clone().apply(&e1).expect("dup comp e1");
    let dup_comp_2 = completed_state
        .clone()
        .apply(&e2_comp)
        .expect("dup comp e2");
    assert_eq!(dup_comp_1, completed_state);
    assert_eq!(dup_comp_2, completed_state);

    // 5. Aborted status
    let aborted_state = create_aborted_saga(saga_id, workflow_id);
    let e2_abort = make_event(
        saga_id,
        2,
        EventPayload::AgentJobAborted {
            reason: "Execution budget exceeded".to_string(),
            error_code: "OUT_OF_BUDGET".to_string(),
        },
    );
    let dup_abort_1 = aborted_state.clone().apply(&e1).expect("dup abort e1");
    let dup_abort_2 = aborted_state
        .clone()
        .apply(&e2_abort)
        .expect("dup abort e2");
    assert_eq!(dup_abort_1, aborted_state);
    assert_eq!(dup_abort_2, aborted_state);
}

#[test]
fn test_new_events_rejected_on_terminal_sagas() {
    let saga_id = Uuid::new_v4();
    let workflow_id = Uuid::new_v4();

    // Completed saga
    let completed_state = create_completed_saga(saga_id, workflow_id);
    assert_eq!(completed_state.last_seq, 2);

    let next_event = make_event(
        saga_id,
        3,
        EventPayload::InferenceCompleted {
            prompt_tokens: 10,
            completion_tokens: 20,
            duration_ms: 100,
            content: "Post-complete work".to_string(),
        },
    );
    let gap_event = make_event(
        saga_id,
        10,
        EventPayload::InferenceCompleted {
            prompt_tokens: 10,
            completion_tokens: 20,
            duration_ms: 100,
            content: "Gap post-complete work".to_string(),
        },
    );

    match completed_state.clone().apply(&next_event) {
        Err(AetherError::InvalidTransition { from, reason, .. }) => {
            assert!(from.contains("Completed"));
            assert!(reason.contains("terminated saga"));
        }
        res => panic!("Expected InvalidTransition on Completed, got {:?}", res),
    }

    match completed_state.apply(&gap_event) {
        Err(AetherError::InvalidTransition { from, reason, .. }) => {
            assert!(from.contains("Completed"));
            assert!(reason.contains("terminated saga"));
        }
        res => panic!(
            "Expected InvalidTransition on gap event on Completed, got {:?}",
            res
        ),
    }

    // Aborted saga
    let aborted_state = create_aborted_saga(saga_id, workflow_id);
    assert_eq!(aborted_state.last_seq, 2);

    match aborted_state.clone().apply(&next_event) {
        Err(AetherError::InvalidTransition { from, reason, .. }) => {
            assert!(from.contains("Aborted"));
            assert!(reason.contains("terminated saga"));
        }
        res => panic!("Expected InvalidTransition on Aborted, got {:?}", res),
    }

    match aborted_state.apply(&gap_event) {
        Err(AetherError::InvalidTransition { from, reason, .. }) => {
            assert!(from.contains("Aborted"));
            assert!(reason.contains("terminated saga"));
        }
        res => panic!(
            "Expected InvalidTransition on gap event on Aborted, got {:?}",
            res
        ),
    }
}

#[test]
fn test_sequence_zero_rejected_across_all_statuses() {
    let saga_id = Uuid::new_v4();
    let workflow_id = Uuid::new_v4();

    let seq_zero_event = make_event(
        saga_id,
        0,
        EventPayload::ContextWindowHydrated {
            token_count: 10,
            memory_ids: vec![],
        },
    );

    // 1. Fresh state (last_seq = 0, status = Pending)
    let fresh = SagaState::new(saga_id, workflow_id);
    match fresh.apply(&seq_zero_event) {
        Err(AetherError::SequenceMismatch { expected, actual }) => {
            assert_eq!(expected, 1);
            assert_eq!(actual, 0);
        }
        res => panic!("Expected SequenceMismatch, got {:?}", res),
    }

    // 2. Running state (last_seq = 1)
    let running = create_running_saga(saga_id, workflow_id);
    match running.apply(&seq_zero_event) {
        Err(AetherError::SequenceMismatch { expected, actual }) => {
            assert_eq!(expected, 2);
            assert_eq!(actual, 0);
        }
        res => panic!("Expected SequenceMismatch, got {:?}", res),
    }

    // 3. Suspended state (last_seq = 2)
    let suspended = create_suspended_saga(saga_id, workflow_id);
    match suspended.apply(&seq_zero_event) {
        Err(AetherError::SequenceMismatch { expected, actual }) => {
            assert_eq!(expected, 3);
            assert_eq!(actual, 0);
        }
        res => panic!("Expected SequenceMismatch, got {:?}", res),
    }

    // 4. Completed state (last_seq = 2)
    let completed = create_completed_saga(saga_id, workflow_id);
    match completed.apply(&seq_zero_event) {
        Err(AetherError::SequenceMismatch { expected, actual }) => {
            assert_eq!(expected, 3);
            assert_eq!(actual, 0);
        }
        res => panic!("Expected SequenceMismatch, got {:?}", res),
    }

    // 5. Aborted state (last_seq = 2)
    let aborted = create_aborted_saga(saga_id, workflow_id);
    match aborted.apply(&seq_zero_event) {
        Err(AetherError::SequenceMismatch { expected, actual }) => {
            assert_eq!(expected, 3);
            assert_eq!(actual, 0);
        }
        res => panic!("Expected SequenceMismatch, got {:?}", res),
    }
}

#[test]
fn test_sequence_gap_rejected_on_active_sagas() {
    let saga_id = Uuid::new_v4();
    let workflow_id = Uuid::new_v4();

    let running = create_running_saga(saga_id, workflow_id);
    assert_eq!(running.last_seq, 1);

    let gap_event = make_event(
        saga_id,
        3, // Skipped 2
        EventPayload::InferenceCompleted {
            prompt_tokens: 10,
            completion_tokens: 10,
            duration_ms: 50,
            content: "Gap inference".to_string(),
        },
    );

    match running.apply(&gap_event) {
        Err(AetherError::SequenceMismatch { expected, actual }) => {
            assert_eq!(expected, 2);
            assert_eq!(actual, 3);
        }
        res => panic!("Expected SequenceMismatch for gap, got {:?}", res),
    }
}

#[test]
fn test_stress_duplicate_injection_in_event_stream() {
    let saga_id = Uuid::new_v4();
    let workflow_id = Uuid::new_v4();

    let mut clean_events = Vec::new();
    let mut current_hash = "0".repeat(64);

    let e1 = Event::new(
        saga_id,
        1,
        EventPayload::AgentJobCreated {
            workflow_id,
            goal: "Stress test task".to_string(),
            initial_context: json!({}),
        },
        current_hash.clone(),
    );
    current_hash = e1.current_hash.clone();
    clean_events.push(e1);

    for seq in 2..=100 {
        let e = Event::new(
            saga_id,
            seq,
            EventPayload::InferenceCompleted {
                prompt_tokens: 10,
                completion_tokens: 5,
                duration_ms: 10,
                content: format!("Step {}", seq),
            },
            current_hash.clone(),
        );
        current_hash = e.current_hash.clone();
        clean_events.push(e);
    }

    let e_complete = Event::new(
        saga_id,
        101,
        EventPayload::AgentJobCompleted {
            final_output: json!({"status": "DONE"}),
            total_tokens: 1500,
        },
        current_hash,
    );
    clean_events.push(e_complete);

    // Now build noisy event stream with 50%+ duplicate injections
    let mut noisy_events = Vec::new();
    for e in &clean_events {
        noisy_events.push(e.clone());
        // Inject duplicate of the current event
        noisy_events.push(e.clone());
        // Also inject a previous event if available
        if e.seq > 5 && e.seq % 3 == 0 {
            noisy_events.push(clean_events[(e.seq / 2) as usize].clone());
        }
    }
    // And inject duplicates of early events after completion
    noisy_events.push(clean_events[0].clone());
    noisy_events.push(clean_events[50].clone());
    noisy_events.push(clean_events[100].clone());

    let initial = SagaState::new(saga_id, workflow_id);
    let clean_state = SagaState::fold(initial.clone(), &clean_events).expect("clean fold");
    let noisy_state = SagaState::fold(initial, &noisy_events).expect("noisy fold with duplicates");

    assert_eq!(
        clean_state, noisy_state,
        "Stream with duplicate redeliveries must yield identical state"
    );
    assert_eq!(noisy_state.status, SagaStatus::Completed);
    assert_eq!(noisy_state.last_seq, 101);
    assert_eq!(noisy_state.total_prompt_tokens, 99 * 10);
    assert_eq!(noisy_state.total_completion_tokens, 99 * 5);
}
