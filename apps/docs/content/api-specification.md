# AETHER Protocol & API Specifications

**Document Class:** Technical Interface & Wire Protocol Specification  
**Version:** 1.0.0  
**Compatibility:** OpenAPI 3.1.0 / Protobuf v3 / HTTP/2 gRPC / SSE / WebSockets

---

## 1. Architectural Overview & Protocol Matrix

Aether decouples control, execution, and client observation through three specialized transport protocols:

| Transport Layer        | Primary Usage                                                          | Latency SLA | Security / Auth           |
| :--------------------- | :--------------------------------------------------------------------- | :---------- | :------------------------ |
| **REST (OpenAPI 3.1)** | Client management, workflow CRUD, runs trigger, HITL gates             | < 50ms      | OIDC Bearer JWT / API Key |
| **gRPC (HTTP/2)**      | Engine-to-worker dispatch, tool execution, checkpoint sync             | < 2ms       | SPIFFE/SPIRE mTLS         |
| **SSE (EventStream)**  | One-way telemetry streaming, live token generation, UI traces          | < 10ms      | Bearer Token / URL ticket |
| **WebSocket**          | Interactive duplex steering, terminal forwarding, manual step override | < 10ms      | Session handshake token   |

---

## 2. REST OpenAPI 3.1 Specification

```yaml
openapi: 3.1.0
info:
  title: Aether Sovereign Orchestration Engine API
  version: 1.0.0
  description: >
    Production-grade RESTful API for triggering, managing, and inspecting
    autonomous multi-agent event-sourced workflows.
servers:
  - url: https://api.aether.io/v1
    description: Production Sovereign Cloud
  - url: http://localhost:8080/v1
    description: Local Development Engine

security:
  - BearerAuth: []
  - ApiKeyAuth: []

paths:
  /workflows:
    get:
      summary: List registered workflows
      operationId: listWorkflows
      parameters:
        - in: query
          name: limit
          schema:
            type: integer
            default: 20
        - in: query
          name: offset
          schema:
            type: integer
            default: 0
      responses:
        "200":
          description: Array of workflow definitions
          content:
            application/json:
              schema:
                type: object
                properties:
                  items:
                    type: array
                    items:
                      $ref: "#/components/schemas/WorkflowResponse"
                  total:
                    type: integer

    post:
      summary: Register or version a workflow DAG
      operationId: createWorkflow
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: "#/components/schemas/WorkflowCreateRequest"
      responses:
        "201":
          description: Workflow registered successfully
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/WorkflowResponse"
        "400":
          $ref: "#/components/responses/ValidationError"

  /workflows/{workflow_id}/runs:
    post:
      summary: Trigger execution run for a workflow
      operationId: triggerWorkflowRun
      parameters:
        - in: path
          name: workflow_id
          required: true
          schema:
            type: string
            format: uuid
        - in: header
          name: Idempotency-Key
          required: true
          description: Unique client token ensuring strictly once execution
          schema:
            type: string
            format: uuid
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: "#/components/schemas/RunTriggerRequest"
      responses:
        "202":
          description: Workflow run accepted and queued in NATS JetStream
          headers:
            X-RateLimit-Limit:
              schema: { type: integer }
            X-RateLimit-Remaining:
              schema: { type: integer }
            X-RateLimit-Reset:
              schema: { type: integer }
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/WorkflowRunSummary"
        "429":
          $ref: "#/components/responses/RateLimitError"

  /runs/{run_id}:
    get:
      summary: Get detailed status and execution state of a run
      operationId: getRunStatus
      parameters:
        - in: path
          name: run_id
          required: true
          schema:
            type: string
            format: uuid
      responses:
        "200":
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/WorkflowRunDetail"
        "404":
          $ref: "#/components/responses/NotFoundError"

  /runs/{run_id}/resume:
    post:
      summary: Human-in-the-Loop approval / step injection to resume suspended run
      operationId: resumeWorkflowRun
      parameters:
        - in: path
          name: run_id
          required: true
          schema:
            type: string
            format: uuid
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: "#/components/schemas/ResumeRunRequest"
      responses:
        "200":
          description: Run resumed and scheduled for continuation
          content:
            application/json:
              schema:
                type: object
                properties:
                  resumed: { type: boolean }
                  resumed_step: { type: integer }

  /runs/{run_id}/cancel:
    post:
      summary: Abort an in-flight workflow run
      operationId: cancelWorkflowRun
      parameters:
        - in: path
          name: run_id
          required: true
          schema:
            type: string
            format: uuid
      responses:
        "200":
          description: Run cancelled

components:
  securitySchemes:
    BearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT
    ApiKeyAuth:
      type: apiKey
      in: header
      name: X-Aether-Key

  responses:
    ValidationError:
      description: Invalid payload or malformed schema
      content:
        application/json:
          schema:
            $ref: "#/components/schemas/ErrorResponse"
    RateLimitError:
      description: Token bucket limit exceeded
      headers:
        Retry-After:
          schema: { type: integer }
      content:
        application/json:
          schema:
            $ref: "#/components/schemas/ErrorResponse"
    NotFoundError:
      description: Requested resource was not found
      content:
        application/json:
          schema:
            $ref: "#/components/schemas/ErrorResponse"

  schemas:
    WorkflowCreateRequest:
      type: object
      required: [name, dag_definition]
      properties:
        name:
          type: string
          example: "autonomous-secops-triager"
        description:
          type: string
        timeout_seconds:
          type: integer
          default: 3600
        dag_definition:
          type: object
          required: [nodes, edges]
          properties:
            nodes:
              type: array
              items:
                $ref: "#/components/schemas/DAGNode"
            edges:
              type: array
              items:
                $ref: "#/components/schemas/DAGEdge"

    DAGNode:
      type: object
      required: [id, agent_role]
      properties:
        id: { type: string, example: "code_analyzer" }
        agent_role:
          {
            type: string,
            enum: [SUPERVISOR, WORKER, CRITIC, SPECIALIST, AUDITOR],
          }
        model_override: { type: string, example: "claude-3-5-sonnet" }
        max_retries: { type: integer, default: 3 }

    DAGEdge:
      type: object
      required: [from_node, to_node]
      properties:
        from_node: { type: string }
        to_node: { type: string }
        condition:
          { type: string, example: "output.vulnerabilities.length > 0" }

    WorkflowResponse:
      type: object
      properties:
        id: { type: string, format: uuid }
        name: { type: string }
        version: { type: integer }
        is_active: { type: boolean }
        created_at: { type: string, format: date-time }

    RunTriggerRequest:
      type: object
      required: [inputs]
      properties:
        inputs:
          type: object
          additionalProperties: true
        overrides:
          type: object
          properties:
            model_name: { type: string }
            timeout_seconds: { type: integer }

    WorkflowRunSummary:
      type: object
      properties:
        run_id: { type: string, format: uuid }
        workflow_id: { type: string, format: uuid }
        status:
          type: string
          enum:
            [
              PENDING,
              RUNNING,
              WAITING_INPUT,
              SUSPENDED,
              COMPLETED,
              FAILED,
              CANCELLED,
            ]
        created_at: { type: string, format: date-time }

    WorkflowRunDetail:
      type: object
      properties:
        run_id: { type: string, format: uuid }
        status: { type: string }
        total_tokens_consumed: { type: integer }
        total_cost_usd: { type: number }
        active_step: { type: integer }
        execution_graph:
          type: array
          items:
            type: object
            properties:
              node_id: { type: string }
              status: { type: string }
              duration_ms: { type: integer }
              step_index: { type: integer }

    ResumeRunRequest:
      type: object
      required: [decision]
      properties:
        decision:
          type: string
          enum: [APPROVED, REJECTED, MODIFIED]
        feedback: { type: string }
        modified_payload: { type: object }

    ErrorResponse:
      type: object
      required: [code, message]
      properties:
        code: { type: string, example: "RATE_LIMIT_EXCEEDED" }
        message:
          {
            type: string,
            example: "Token quota breached for organization tier.",
          }
        details: { type: object }
```

---

## 3. High-Performance gRPC Protobuf Contracts (`runtimev1.proto`)

```protobuf
syntax = "proto3";

package aether.runtime.v1;

option go_package = "github.com/aether-ai/aether/gen/go/v1;runtimev1";
option java_multiple_files = true;
option java_package = "ai.aether.runtime.v1";

import "google/protobuf/timestamp.proto";
import "google/protobuf/struct.proto";

// Service governing execution node dispatch and worker cluster topology
service OrchestrationEngineService {
  // Dispatches an atomic execution task to a sandboxed worker
  rpc DispatchTask(TaskDispatchRequest) returns (TaskDispatchResponse);

  // Worker reports completion or failure of a step
  rpc ReportTaskCompletion(TaskCompletionRequest) returns (TaskCompletionResponse);

  // Real-time bidirectional event streaming between worker and engine
  rpc StreamExecutionEvents(stream ExecutionEvent) returns (stream ControlSignal);

  // Heartbeat keepalive ensuring worker liveness
  rpc Heartbeat(WorkerHeartbeatRequest) returns (WorkerHeartbeatResponse);
}

// Service governing agent reasoning, sandboxed execution, and memory retrieval
service AgentRuntimeService {
  // Executes an isolated compound task returning a stream of real-time execution events
  rpc ExecuteTask(TaskExecutionRequest) returns (stream ExecutionEvent);

  // Executes an isolated reasoning step with streaming tokens
  rpc ExecuteStep(StepExecutionRequest) returns (stream StepStreamResponse);

  // Invocates an isolated tool inside WebAssembly / MicroVM
  rpc ExecuteToolCall(ToolCallRequest) returns (ToolCallResponse);

  // Queries the Tri-Tier memory fabric
  rpc QueryMemory(MemoryQueryRequest) returns (MemoryQueryResponse);

  // Persists deterministic execution state checkpoint
  rpc SaveCheckpoint(CheckpointRequest) returns (CheckpointResponse);

  // Direct worker health check probe
  rpc Heartbeat(WorkerHeartbeatRequest) returns (WorkerHeartbeatResponse);
}

message TaskExecutionRequest {
  string task_id = 1;
  string run_id = 2;
  string workflow_id = 3;
  string agent_id = 4;
  google.protobuf.Struct input_context = 5;
  int64 deadline_epoch_ms = 6;
  repeated string granted_capabilities = 7;
}


enum ExecutionStatus {
  EXECUTION_STATUS_UNSPECIFIED = 0;
  EXECUTION_STATUS_PENDING = 1;
  EXECUTION_STATUS_RUNNING = 2;
  EXECUTION_STATUS_AWAITING_INTERVENTION = 3;
  EXECUTION_STATUS_SUCCESS = 4;
  EXECUTION_STATUS_FAILED = 5;
  EXECUTION_STATUS_TIMEOUT = 6;
}

message TaskDispatchRequest {
  string task_id = 1;
  string run_id = 2;
  string workflow_id = 3;
  string agent_id = 4;
  int32 step_index = 5;
  google.protobuf.Struct input_context = 6;
  int64 deadline_epoch_ms = 7;
  repeated string granted_capabilities = 8;
}

message TaskDispatchResponse {
  bool accepted = 1;
  string rejection_reason = 2;
  int64 assigned_worker_epoch_ms = 3;
}

message TaskCompletionRequest {
  string task_id = 1;
  string run_id = 2;
  int32 step_index = 3;
  ExecutionStatus status = 4;
  google.protobuf.Struct output_payload = 5;
  string error_message = 6;
  int64 prompt_tokens = 7;
  int64 completion_tokens = 8;
  double execution_duration_ms = 9;
}

message TaskCompletionResponse {
  bool acknowledged = 1;
  int64 next_step_index = 2;
}

message StepExecutionRequest {
  string run_id = 1;
  string agent_id = 2;
  string model = 3;
  repeated Message messages = 4;
  repeated google.protobuf.Struct tools = 5;
  float temperature = 6;
}

message Message {
  string role = 1; // "system", "user", "assistant", "tool"
  string content = 2;
  string tool_call_id = 3;
}

message StepStreamResponse {
  oneof delta {
    string token = 1;
    ToolCallRequest tool_call = 2;
    google.protobuf.Struct finish_reason = 3;
  }
}

message ToolCallRequest {
  string tool_call_id = 1;
  string tool_name = 2;
  google.protobuf.Struct arguments = 3;
  string execution_sandbox_id = 4; // Wasmtime or MicroVM ID
  int32 timeout_ms = 5;
}

message ToolCallResponse {
  string tool_call_id = 1;
  bool is_error = 2;
  google.protobuf.Struct output = 3;
  string raw_stderr = 4;
  int64 memory_consumed_bytes = 5;
  int64 cpu_time_micros = 6;
}

message ExecutionEvent {
  string run_id = 1;
  string node_id = 2;
  google.protobuf.Timestamp timestamp = 3;
  oneof payload {
    AgentTokenEvent token = 4;
    ToolInvocationEvent tool_invocation = 5;
    StateTransitionEvent state_transition = 6;
  }
}

message AgentTokenEvent {
  string token = 1;
  int32 token_index = 2;
}

message ToolInvocationEvent {
  string tool_name = 1;
  string invocation_input = 2;
}

message StateTransitionEvent {
  string previous_state = 1;
  string new_state = 2;
}

message ControlSignal {
  enum Action {
    ACTION_CONTINUE = 0;
    ACTION_PAUSE = 1;
    ACTION_TERMINATE = 2;
    ACTION_INTERVENE = 3;
  }
  Action action = 1;
  string intervention_payload = 2;
}

message WorkerHeartbeatRequest {
  string worker_id = 1;
  string hostname = 2;
  int32 active_tasks = 3;
  double cpu_usage_pct = 4;
  double memory_usage_mb = 5;
}

message WorkerHeartbeatResponse {
  bool healthy = 1;
  bool drain_requested = 2;
}

message MemoryQueryRequest {
  string org_id = 1;
  string agent_id = 2;
  string query_text = 3;
  repeated float embedding = 4;
  int32 top_k = 5;
  float min_similarity = 6;
  repeated string required_tags = 7;
}

message MemoryQueryResponse {
  message MemoryMatch {
    string memory_id = 1;
    string content = 2;
    float score = 3;
    google.protobuf.Struct metadata = 4;
  }
  repeated MemoryMatch matches = 1;
}

message CheckpointRequest {
  string run_id = 1;
  int32 step_index = 2;
  bytes state_snapshot_blob = 3;
  int64 wal_offset = 4;
}

message CheckpointResponse {
  bool committed = 1;
  string checkpoint_id = 2;
}
```

---

## 4. Real-Time Streaming Protocols

### 4.1 Server-Sent Events (SSE) Contract

- **Endpoint**: `GET /api/v1/runs/{run_id}/stream`
- **Headers**:
  ```http
  Accept: text/event-stream
  Cache-Control: no-cache
  Connection: keep-alive
  Last-Event-ID: 1048575
  ```
- **Event Taxonomy & Wire Examples**:

```
id: 1048576
event: node.started
data: {"node_id": "code_analyzer", "started_at": "2026-11-07T08:25:01Z", "model": "claude-3-5-sonnet"}

id: 1048577
event: agent.token
data: {"token": "Analyzing", "index": 0}

id: 1048578
event: agent.token
data: {"token": " codebase vulnerabilities...", "index": 1}

id: 1048579
event: tool.invoked
data: {"tool": "cargo_audit", "arguments": {"workspace": true}, "sandbox_id": "wasm-sb-402"}

id: 1048580
event: checkpoint.saved
data: {"step_index": 3, "state_hash": "f4c8996fb92427ae41e4649b934ca495991b7852b855e3b0c44298fc1c149afb"}

id: 1048581
event: run.suspended
data: {"reason": "HUMAN_APPROVAL_REQUIRED", "action": "promote_production_binary", "urgency": "HIGH"}
```

---

### 4.2 Bidirectional WebSocket Steering Contract

- **Endpoint**: `GET /ws/v1/runs/{run_id}/control`
- **Subprotocol**: `aether-duplex-v1`
- **Client Frame (Human-in-the-Loop Override)**:
  ```json
  {
    "type": "HUMAN_INTERVENTION",
    "run_id": "31c786ef-0228-4799-b2e1-73e2b2559926",
    "step_index": 3,
    "action": "OVERRIDE_OUTPUT",
    "payload": {
      "decision": "APPROVE_WITH_REVISED_PARAMS",
      "flags": ["--skip-benchmark"]
    }
  }
  ```
- **Server Frame (Engine Acknowledgment)**:
  ```json
  {
    "type": "INTERVENTION_ACK",
    "run_id": "31c786ef-0228-4799-b2e1-73e2b2559926",
    "resumed_step": 4,
    "status": "RUNNING"
  }
  ```
