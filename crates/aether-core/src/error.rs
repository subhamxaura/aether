use thiserror::Error;

#[derive(Error, Debug)]
pub enum AetherError {
    #[error("Invalid state transition from {from:?} to {to:?}: {reason}")]
    InvalidTransition {
        from: String,
        to: String,
        reason: String,
    },

    #[error("Event sequence mismatch: expected sequence {expected}, found {actual}")]
    SequenceMismatch { expected: u64, actual: u64 },

    #[error("Cryptographic signature verification failed for event {event_id}")]
    SignatureVerificationFailed { event_id: String },

    #[error("Serialization error: {0}")]
    Serialization(#[from] serde_json::Error),

    #[error("Execution timeout exceeded: {0}ms")]
    Timeout(u64),

    #[error("Internal engine error: {0}")]
    Internal(String),
}
