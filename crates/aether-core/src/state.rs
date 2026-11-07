use crate::error::AetherError;
use crate::event::{Event, EventPayload};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub enum SagaStatus {
    Pending,
    Running,
    Suspended,
    Completed,
    Aborted,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct SagaState {
    pub saga_id: Uuid,
    pub workflow_id: Uuid,
    pub status: SagaStatus,
    pub last_seq: u64,
    pub total_prompt_tokens: u64,
    pub total_completion_tokens: u64,
    pub active_tool: Option<String>,
    pub final_result: Option<serde_json::Value>,
    pub abort_reason: Option<String>,
}

impl SagaState {
    pub fn new(saga_id: Uuid, workflow_id: Uuid) -> Self {
        Self {
            saga_id,
            workflow_id,
            status: SagaStatus::Pending,
            last_seq: 0,
            total_prompt_tokens: 0,
            total_completion_tokens: 0,
            active_tool: None,
            final_result: None,
            abort_reason: None,
        }
    }

    /// Pure deterministic fold function: S_t = fold(S_0, [E_1, ..., E_t])
    pub fn apply(mut self, event: &Event) -> Result<Self, AetherError> {
        if event.saga_id != self.saga_id {
            return Err(AetherError::InvalidTransition {
                from: self.saga_id.to_string(),
                to: event.saga_id.to_string(),
                reason: "Event saga_id does not match state saga_id".to_string(),
            });
        }

        // First validate sequence > 0
        if event.seq == 0 {
            return Err(AetherError::SequenceMismatch {
                expected: self.last_seq + 1,
                actual: 0,
            });
        }

        // Idempotent duplicate redelivery check MUST come before terminal status check
        if event.seq <= self.last_seq {
            return Ok(self); // Idempotent duplicate: event already folded
        }

        // Terminal state protection
        if matches!(self.status, SagaStatus::Completed | SagaStatus::Aborted) {
            return Err(AetherError::InvalidTransition {
                from: format!("{:?}", self.status),
                to: format!("{:?}", event.payload),
                reason: "Cannot apply events to a terminated saga".to_string(),
            });
        }

        if event.seq != self.last_seq + 1 {
            return Err(AetherError::SequenceMismatch {
                expected: self.last_seq + 1,
                actual: event.seq,
            });
        }

        self.last_seq = event.seq;

        match &event.payload {
            EventPayload::AgentJobCreated { workflow_id, .. } => {
                self.workflow_id = *workflow_id;
                self.status = SagaStatus::Running;
            }
            EventPayload::ContextWindowHydrated { .. } => {}
            EventPayload::PromptDispatched { .. } => {}
            EventPayload::InferenceCompleted {
                prompt_tokens,
                completion_tokens,
                ..
            } => {
                self.total_prompt_tokens += *prompt_tokens as u64;
                self.total_completion_tokens += *completion_tokens as u64;
            }
            EventPayload::PolicyCheckEvaluated { .. } => {}
            EventPayload::ExecutionSuspended { .. } => {
                self.status = SagaStatus::Suspended;
            }
            EventPayload::ExecutionResumed { .. } => {
                self.status = SagaStatus::Running;
            }
            EventPayload::ToolExecutionStarted { tool_name, .. } => {
                self.active_tool = Some(tool_name.clone());
            }
            EventPayload::ToolExecutionFinished { .. } => {
                self.active_tool = None;
            }
            EventPayload::MemoryConsolidated { .. } => {}
            EventPayload::AgentJobCompleted { final_output, .. } => {
                self.status = SagaStatus::Completed;
                self.final_result = Some(final_output.clone());
            }
            EventPayload::AgentJobAborted { reason, .. } => {
                self.status = SagaStatus::Aborted;
                self.abort_reason = Some(reason.clone());
            }
        }

        Ok(self)
    }

    /// Deterministic fold over an entire event sequence
    pub fn fold(initial: Self, events: &[Event]) -> Result<Self, AetherError> {
        events
            .iter()
            .try_fold(initial, |state, event| state.apply(event))
    }

    /// Deterministic fold over any iterator yielding event references
    pub fn fold_iter<'a, I>(initial: Self, events: I) -> Result<Self, AetherError>
    where
        I: IntoIterator<Item = &'a Event>,
    {
        events
            .into_iter()
            .try_fold(initial, |state, event| state.apply(event))
    }

    /// Deterministic SHA-256 state hash for verification and snapshot comparison
    pub fn state_hash(&self) -> String {
        let serialized = serde_json::to_string(self).unwrap_or_default();
        let mut hasher = Sha256::new();
        hasher.update(serialized.as_bytes());
        format!("{:x}", hasher.finalize())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::event::{Event, EventPayload};
    use serde_json::json;

    #[test]
    fn test_duplicate_redelivery_on_completed_saga() {
        let saga_id = Uuid::new_v4();
        let workflow_id = Uuid::new_v4();
        let mut state = SagaState::new(saga_id, workflow_id);
        state.status = SagaStatus::Completed;
        state.last_seq = 2;

        let duplicate_event = Event::new(
            saga_id,
            1,
            EventPayload::AgentJobCreated {
                workflow_id,
                goal: "Completed task redelivery".to_string(),
                initial_context: json!({}),
            },
            "0".repeat(64),
        );

        let res = state.clone().apply(&duplicate_event);
        assert!(
            res.is_ok(),
            "Duplicate redelivery on Completed saga should return Ok"
        );
        assert_eq!(res.unwrap(), state);
    }

    #[test]
    fn test_duplicate_redelivery_on_aborted_saga() {
        let saga_id = Uuid::new_v4();
        let workflow_id = Uuid::new_v4();
        let mut state = SagaState::new(saga_id, workflow_id);
        state.status = SagaStatus::Aborted;
        state.last_seq = 2;

        let duplicate_event = Event::new(
            saga_id,
            2,
            EventPayload::AgentJobAborted {
                reason: "Timeout".to_string(),
                error_code: "EXEC_TIMEOUT".to_string(),
            },
            "0".repeat(64),
        );

        let res = state.clone().apply(&duplicate_event);
        assert!(
            res.is_ok(),
            "Duplicate redelivery on Aborted saga should return Ok"
        );
        assert_eq!(res.unwrap(), state);
    }

    #[test]
    fn test_sequence_zero_rejected() {
        let saga_id = Uuid::new_v4();
        let workflow_id = Uuid::new_v4();
        let state = SagaState::new(saga_id, workflow_id);

        let seq_zero_event = Event::new(
            saga_id,
            0,
            EventPayload::AgentJobCreated {
                workflow_id,
                goal: "Seq 0 task".to_string(),
                initial_context: json!({}),
            },
            "0".repeat(64),
        );

        let res = state.apply(&seq_zero_event);
        match res {
            Err(AetherError::SequenceMismatch { expected, actual }) => {
                assert_eq!(expected, 1);
                assert_eq!(actual, 0);
            }
            other => panic!("Expected SequenceMismatch for seq=0, got {:?}", other),
        }
    }
}
