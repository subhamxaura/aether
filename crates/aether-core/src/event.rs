use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(tag = "type", content = "payload")]
pub enum EventPayload {
    AgentJobCreated {
        workflow_id: Uuid,
        goal: String,
        initial_context: serde_json::Value,
    },
    ContextWindowHydrated {
        token_count: usize,
        memory_ids: Vec<Uuid>,
    },
    PromptDispatched {
        model: String,
        prompt_hash: String,
    },
    InferenceCompleted {
        prompt_tokens: u32,
        completion_tokens: u32,
        duration_ms: u64,
        content: String,
    },
    PolicyCheckEvaluated {
        rule_id: String,
        passed: bool,
        risk_score: f32,
    },
    ExecutionSuspended {
        reason: String,
        requires_human_approval: bool,
    },
    ExecutionResumed {
        approver_id: String,
        decision: String,
    },
    ToolExecutionStarted {
        tool_name: String,
        sandbox_id: String,
        input_args: serde_json::Value,
    },
    ToolExecutionFinished {
        tool_name: String,
        exit_code: i32,
        output: serde_json::Value,
    },
    MemoryConsolidated {
        facts_extracted: usize,
        memory_tier: String,
    },
    AgentJobCompleted {
        final_output: serde_json::Value,
        total_tokens: u64,
    },
    AgentJobAborted {
        reason: String,
        error_code: String,
    },
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct Event {
    pub event_id: Uuid,
    pub saga_id: Uuid,
    pub seq: u64,
    pub payload: EventPayload,
    pub timestamp: DateTime<Utc>,
    pub previous_hash: String,
    pub current_hash: String,
    pub signature: Option<String>,
}

impl Event {
    /// Creates a new unsigned event in the saga stream.
    pub fn new(saga_id: Uuid, seq: u64, payload: EventPayload, previous_hash: String) -> Self {
        Self::new_with_signature(saga_id, seq, payload, previous_hash, None)
    }

    /// Creates a new cryptographically signed event in the saga stream.
    pub fn new_with_signature(
        saga_id: Uuid,
        seq: u64,
        payload: EventPayload,
        previous_hash: String,
        signature: Option<String>,
    ) -> Self {
        let event_id = Uuid::new_v4();
        let timestamp = Utc::now();
        let payload_json = serde_json::to_string(&payload).unwrap_or_default();

        let mut hasher = Sha256::new();
        hasher.update(previous_hash.as_bytes());
        hasher.update(payload_json.as_bytes());
        hasher.update(timestamp.to_rfc3339().as_bytes());
        if let Some(ref sig) = signature {
            hasher.update(sig.as_bytes());
        }
        let current_hash = format!("{:x}", hasher.finalize());

        Self {
            event_id,
            saga_id,
            seq,
            payload,
            timestamp,
            previous_hash,
            current_hash,
            signature,
        }
    }

    /// Builder pattern to attach a cryptographic signature and update the Merkle digest.
    pub fn with_signature(mut self, signature: impl Into<String>) -> Self {
        let sig = signature.into();
        let payload_json = serde_json::to_string(&self.payload).unwrap_or_default();

        let mut hasher = Sha256::new();
        hasher.update(self.previous_hash.as_bytes());
        hasher.update(payload_json.as_bytes());
        hasher.update(self.timestamp.to_rfc3339().as_bytes());
        hasher.update(sig.as_bytes());
        self.current_hash = format!("{:x}", hasher.finalize());
        self.signature = Some(sig);
        self
    }
}
