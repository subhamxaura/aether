use aether_core::{Event, SagaState};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::RwLock;
use uuid::Uuid;

pub type NodeId = u64;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct ClusterNode {
    pub node_id: NodeId,
    pub address: String,
    pub is_leader: bool,
}

#[derive(Debug, Default, Clone)]
pub struct RaftStateMachine {
    pub sagas: Arc<RwLock<HashMap<Uuid, SagaState>>>,
}

impl RaftStateMachine {
    pub fn new() -> Self {
        Self {
            sagas: Arc::new(RwLock::new(HashMap::new())),
        }
    }

    pub async fn apply_event(&self, event: &Event) -> Result<SagaState, aether_core::AetherError> {
        let mut sagas = self.sagas.write().await;
        let current_state = sagas
            .get(&event.saga_id)
            .cloned()
            .unwrap_or_else(|| SagaState::new(event.saga_id, Uuid::nil()));

        let new_state = current_state.apply(event)?;
        sagas.insert(event.saga_id, new_state.clone());
        Ok(new_state)
    }

    pub async fn get_state(&self, saga_id: &Uuid) -> Option<SagaState> {
        let sagas = self.sagas.read().await;
        sagas.get(saga_id).cloned()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use aether_core::{Event, EventPayload};
    use serde_json::json;

    #[tokio::test]
    async fn test_raft_state_machine_apply() {
        let sm = RaftStateMachine::new();
        let saga_id = Uuid::new_v4();
        let workflow_id = Uuid::new_v4();

        let event = Event::new(
            saga_id,
            1,
            EventPayload::AgentJobCreated {
                workflow_id,
                goal: "Distributed task".to_string(),
                initial_context: json!({}),
            },
            "0".repeat(64),
        );

        let state = sm.apply_event(&event).await.expect("Failed to apply event");
        assert_eq!(state.last_seq, 1);
        assert_eq!(state.workflow_id, workflow_id);

        let retrieved = sm.get_state(&saga_id).await.expect("State not found");
        assert_eq!(retrieved, state);
    }

    #[tokio::test]
    async fn test_raft_state_machine_invalid_event_no_phantom_state() {
        let sm = RaftStateMachine::new();
        let saga_id = Uuid::new_v4();
        let workflow_id = Uuid::new_v4();

        // Sequence mismatch: starting with seq 2 instead of 1
        let invalid_event = Event::new(
            saga_id,
            2,
            EventPayload::AgentJobCreated {
                workflow_id,
                goal: "Invalid start sequence".to_string(),
                initial_context: json!({}),
            },
            "0".repeat(64),
        );

        let result = sm.apply_event(&invalid_event).await;
        assert!(result.is_err(), "Expected apply_event to fail on sequence mismatch");
        assert!(
            sm.get_state(&saga_id).await.is_none(),
            "Phantom saga state must not be retained in sagas map on failure"
        );
    }
}
