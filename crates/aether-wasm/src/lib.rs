use thiserror::Error;
use wasmtime::*;

#[derive(Error, Debug)]
pub enum WasmSandboxError {
    #[error("Engine error: {0}")]
    Engine(#[from] wasmtime::Error),

    #[error("Execution fuel exhausted (CPU limit reached)")]
    FuelExhausted,

    #[error("Memory limit breached: allocated {allocated_bytes} bytes exceeds max {max_bytes} bytes")]
    MemoryExceeded {
        allocated_bytes: usize,
        max_bytes: usize,
    },
}

#[derive(Clone, Debug)]
pub struct SandboxConfig {
    pub max_memory_bytes: usize,
    pub initial_fuel: u64,
}

impl Default for SandboxConfig {
    fn default() -> Self {
        Self {
            max_memory_bytes: 64 * 1024 * 1024, // 64 MB
            initial_fuel: 1_000_000,            // 1M fuel units
        }
    }
}

pub struct WasmSandbox {
    engine: Engine,
    config: SandboxConfig,
}

impl WasmSandbox {
    pub fn new(config: SandboxConfig) -> Result<Self, WasmSandboxError> {
        let mut engine_cfg = Config::new();
        engine_cfg.consume_fuel(true);
        let engine = Engine::new(&engine_cfg)?;

        Ok(Self { engine, config })
    }

    pub fn engine(&self) -> &Engine {
        &self.engine
    }

    pub fn config(&self) -> &SandboxConfig {
        &self.config
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_wasm_sandbox_initialization() {
        let config = SandboxConfig::default();
        let sandbox = WasmSandbox::new(config).expect("Failed to initialize Wasm sandbox");
        assert_eq!(sandbox.config().max_memory_bytes, 64 * 1024 * 1024);
    }
}
