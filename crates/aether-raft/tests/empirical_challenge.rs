use aether_core::{AetherError, Event, EventPayload, SagaStatus};
use aether_raft::RaftStateMachine;
use serde_json::json;
use std::sync::Arc;
use uuid::Uuid;

fn make_event(saga_id: Uuid, seq: u64, payload: EventPayload) -> Event {
    Event::new(saga_id, seq, payload, "0".repeat(64))
}

#[tokio::test]
async fn test_raft_no_phantom_state_on_seq_zero() {
    let sm = RaftStateMachine::new();
    let saga_id = Uuid::new_v4();
    let workflow_id = Uuid::new_v4();

    let invalid_event = make_event(
        saga_id,
        0,
        EventPayload::AgentJobCreated {
            workflow_id,
            goal: "Sequence zero".to_string(),
            initial_context: json!({}),
        },
    );

    let res = sm.apply_event(&invalid_event).await;
    assert!(res.is_err(), "seq=0 must be rejected");
    match res {
        Err(AetherError::SequenceMismatch { expected, actual }) => {
            assert_eq!(expected, 1);
            assert_eq!(actual, 0);
        }
        other => panic!("Expected SequenceMismatch, got {:?}", other),
    }

    assert!(
        sm.get_state(&saga_id).await.is_none(),
        "Raft map must not contain phantom state after seq=0 failure"
    );
}

#[tokio::test]
async fn test_raft_no_phantom_state_on_seq_gap() {
    let sm = RaftStateMachine::new();
    let saga_id = Uuid::new_v4();
    let workflow_id = Uuid::new_v4();

    let gap_event = make_event(
        saga_id,
        5,
        EventPayload::AgentJobCreated {
            workflow_id,
            goal: "Sequence gap".to_string(),
            initial_context: json!({}),
        },
    );

    let res = sm.apply_event(&gap_event).await;
    assert!(res.is_err(), "seq=5 on new saga must be rejected");
    assert!(
        sm.get_state(&saga_id).await.is_none(),
        "Raft map must not contain phantom state after gap sequence failure"
    );
}

#[tokio::test]
async fn test_raft_no_corruption_on_error_after_valid_event() {
    let sm = RaftStateMachine::new();
    let saga_id = Uuid::new_v4();
    let workflow_id = Uuid::new_v4();

    // Valid event 1
    let e1 = make_event(
        saga_id,
        1,
        EventPayload::AgentJobCreated {
            workflow_id,
            goal: "Valid first event".to_string(),
            initial_context: json!({}),
        },
    );
    let s1 = sm.apply_event(&e1).await.expect("e1 should succeed");
    assert_eq!(s1.last_seq, 1);
    assert_eq!(s1.status, SagaStatus::Running);

    // Invalid event 2 (seq gap)
    let invalid_gap = make_event(
        saga_id,
        3, // should be 2
        EventPayload::InferenceCompleted {
            prompt_tokens: 10,
            completion_tokens: 10,
            duration_ms: 50,
            content: "Gap inference".to_string(),
        },
    );
    let gap_res = sm.apply_event(&invalid_gap).await;
    assert!(gap_res.is_err(), "Gap event must fail");

    // Verify existing state in RaftStateMachine was NOT corrupted or overwritten
    let current = sm.get_state(&saga_id).await.expect("State should still exist");
    assert_eq!(current, s1, "Failed transition must leave previous valid state unmodified");

    // Invalid event with seq=0
    let invalid_zero = make_event(
        saga_id,
        0,
        EventPayload::InferenceCompleted {
            prompt_tokens: 10,
            completion_tokens: 10,
            duration_ms: 50,
            content: "Zero seq inference".to_string(),
        },
    );
    let zero_res = sm.apply_event(&invalid_zero).await;
    assert!(zero_res.is_err(), "Zero seq event must fail");

    let current_after_zero = sm.get_state(&saga_id).await.expect("State should still exist");
    assert_eq!(current_after_zero, s1, "Zero seq failure must leave previous state unmodified");
}

#[tokio::test]
async fn test_raft_duplicate_redelivery_on_completed_saga() {
    let sm = RaftStateMachine::new();
    let saga_id = Uuid::new_v4();
    let workflow_id = Uuid::new_v4();

    let e1 = make_event(
        saga_id,
        1,
        EventPayload::AgentJobCreated {
            workflow_id,
            goal: "Complete me".to_string(),
            initial_context: json!({}),
        },
    );
    let e2 = make_event(
        saga_id,
        2,
        EventPayload::AgentJobCompleted {
            final_output: json!({"status": "SUCCESS"}),
            total_tokens: 42,
        },
    );

    sm.apply_event(&e1).await.expect("apply e1");
    let completed_state = sm.apply_event(&e2).await.expect("apply e2");
    assert_eq!(completed_state.status, SagaStatus::Completed);
    assert_eq!(completed_state.last_seq, 2);

    // Redeliver e1 via Raft
    let dup1_res = sm.apply_event(&e1).await.expect("e1 duplicate must succeed");
    assert_eq!(dup1_res, completed_state);

    // Redeliver e2 via Raft
    let dup2_res = sm.apply_event(&e2).await.expect("e2 duplicate must succeed");
    assert_eq!(dup2_res, completed_state);

    // Verify state in map remains completed
    let state_in_sm = sm.get_state(&saga_id).await.expect("must exist");
    assert_eq!(state_in_sm, completed_state);

    // Submit new event (seq 3) after completion -> must fail
    let post_complete_event = make_event(
        saga_id,
        3,
        EventPayload::InferenceCompleted {
            prompt_tokens: 5,
            completion_tokens: 5,
            duration_ms: 10,
            content: "Illegal post-completion event".to_string(),
        },
    );
    let post_res = sm.apply_event(&post_complete_event).await;
    assert!(post_res.is_err(), "New events on Completed saga must be rejected");
    assert!(matches!(post_res, Err(AetherError::InvalidTransition { .. })));

    // State in SM still intact
    assert_eq!(sm.get_state(&saga_id).await.unwrap(), completed_state);
}

#[tokio::test]
async fn test_raft_concurrent_duplicate_stress() {
    let sm = Arc::new(RaftStateMachine::new());
    let saga_id = Uuid::new_v4();
    let workflow_id = Uuid::new_v4();

    // Sequence of 5 events
    let events = vec![
        make_event(
            saga_id,
            1,
            EventPayload::AgentJobCreated {
                workflow_id,
                goal: "Concurrent stress".to_string(),
                initial_context: json!({}),
            },
        ),
        make_event(
            saga_id,
            2,
            EventPayload::InferenceCompleted {
                prompt_tokens: 10,
                completion_tokens: 20,
                duration_ms: 100,
                content: "Step 1".to_string(),
            },
        ),
        make_event(
            saga_id,
            3,
            EventPayload::ExecutionSuspended {
                reason: "Pause".to_string(),
                requires_human_approval: true,
            },
        ),
        make_event(
            saga_id,
            4,
            EventPayload::ExecutionResumed {
                approver_id: "admin".to_string(),
                decision: "APPROVED".to_string(),
            },
        ),
        make_event(
            saga_id,
            5,
            EventPayload::AgentJobCompleted {
                final_output: json!({"done": true}),
                total_tokens: 30,
            },
        ),
    ];

    // First apply sequentially
    for e in &events {
        sm.apply_event(e).await.expect("sequential apply");
    }

    // Now spawn 20 concurrent tasks hammering the state machine with duplicate redeliveries
    let mut handles = Vec::new();
    for _ in 0..20 {
        let sm_clone = Arc::clone(&sm);
        let events_clone = events.clone();
        handles.push(tokio::spawn(async move {
            for e in &events_clone {
                let res = sm_clone.apply_event(e).await;
                assert!(res.is_ok(), "Duplicate redelivery must succeed");
                let state = res.unwrap();
                assert_eq!(state.status, SagaStatus::Completed);
                assert_eq!(state.last_seq, 5);
            }
        }));
    }

    for h in handles {
        h.await.expect("task join failed");
    }

    let final_state = sm.get_state(&saga_id).await.expect("final state exists");
    assert_eq!(final_state.status, SagaStatus::Completed);
    assert_eq!(final_state.last_seq, 5);
    assert_eq!(final_state.total_prompt_tokens, 10);
    assert_eq!(final_state.total_completion_tokens, 20);
}
