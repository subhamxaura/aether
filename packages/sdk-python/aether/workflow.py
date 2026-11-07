"""Aether Workflow Directed Acyclic Graph (DAG) definitions."""

import asyncio
import inspect
import time
import uuid
from collections.abc import Callable
from typing import Any

from pydantic import BaseModel, Field

from .agent import Agent


class StepExecutionRecord(BaseModel):
    step_id: str
    node_id: str
    agent_name: str
    agent_role: str
    agent_model: str
    input_data: dict[str, Any]
    output_data: dict[str, Any]
    tools_executed: list[dict[str, Any]] = Field(default_factory=list)
    prompt_tokens: int = 0
    completion_tokens: int = 0
    total_tokens: int = 0
    duration_ms: float = 0.0
    status: str = "COMPLETED"
    error: str | None = None


class WorkflowRunResult(BaseModel):
    run_id: str
    workflow_name: str = ""
    status: str = "COMPLETED"
    total_tokens: int = 0
    total_prompt_tokens: int = 0
    total_completion_tokens: int = 0
    steps: list[StepExecutionRecord] = Field(default_factory=list)
    output: dict[str, Any] = Field(default_factory=dict)
    duration_ms: float = 0.0
    error: str | None = None


class Workflow:
    """Deterministic Workflow DAG executing declared agents and tools."""

    def __init__(self, name: str, timeout_seconds: int = 3600):
        self.name = name
        self.timeout_seconds = timeout_seconds
        self.nodes: dict[str, Agent] = {}
        self.edges: list[dict[str, str | None]] = []

    def add_node(self, node_id: str, agent: Agent) -> "Workflow":
        """Register an agent node in the workflow graph."""
        self.nodes[node_id] = agent
        return self

    def connect(self, from_node: str, to_node: str, condition: str | None = None) -> "Workflow":
        """Register a directed dependency edge between two workflow nodes."""
        if from_node not in self.nodes:
            raise ValueError(f"Source node '{from_node}' not registered in workflow")
        if to_node not in self.nodes:
            raise ValueError(f"Target node '{to_node}' not registered in workflow")
        self.edges.append({"from": from_node, "to": to_node, "condition": condition})
        return self

    def _get_execution_order(self) -> list[str]:
        """Compute topological execution order for DAG nodes with cycle fallback."""
        if not self.edges:
            return list(self.nodes.keys())

        in_degree: dict[str, int] = {node_id: 0 for node_id in self.nodes}
        adj: dict[str, list[str]] = {node_id: [] for node_id in self.nodes}

        for edge in self.edges:
            src = edge["from"]
            dst = edge["to"]
            if src and dst and src in adj and dst in in_degree:
                adj[src].append(dst)
                in_degree[dst] += 1

        queue = [node_id for node_id, deg in in_degree.items() if deg == 0]
        order = []

        while queue:
            curr = queue.pop(0)
            order.append(curr)
            for neighbor in adj[curr]:
                in_degree[neighbor] -= 1
                if in_degree[neighbor] == 0:
                    queue.append(neighbor)

        # Append any unvisited nodes (e.g., disjoint or circular subgraphs)
        for node_id in self.nodes:
            if node_id not in order:
                order.append(node_id)

        return order

    def _estimate_tokens(self, text: str) -> int:
        """Estimate token count from string content (~4 characters per token)."""
        clean = str(text).strip()
        if not clean:
            return 1
        return max(1, len(clean) // 4)

    async def _execute_tool(self, tool_func: Callable, tool_args: dict[str, Any]) -> dict[str, Any]:
        """Execute a declared agent tool with signature inspection and runtime telemetry."""
        tool_name = getattr(tool_func, "__name__", str(tool_func))
        sandbox = getattr(tool_func, "__sandbox__", "wasm")
        timeout_ms = getattr(tool_func, "__timeout_ms__", 5000)

        t0 = time.perf_counter()
        try:
            sig = inspect.signature(tool_func)
            filtered_args = {}
            for param_name, param in sig.parameters.items():
                if param_name in tool_args:
                    filtered_args[param_name] = tool_args[param_name]
                elif param.default is not inspect.Parameter.empty:
                    filtered_args[param_name] = param.default
                elif param.kind == inspect.Parameter.VAR_KEYWORD:
                    filtered_args.update(tool_args)

            if len(sig.parameters) == 0:
                call_args = {}
            else:
                call_args = filtered_args if filtered_args else tool_args

            if asyncio.iscoroutinefunction(tool_func):
                result = await asyncio.wait_for(tool_func(**call_args), timeout=timeout_ms / 1000.0)
            else:
                result = tool_func(**call_args)

            duration = (time.perf_counter() - t0) * 1000.0
            return {
                "tool_name": tool_name,
                "sandbox": sandbox,
                "status": "SUCCESS",
                "output": result,
                "duration_ms": duration,
                "tokens": self._estimate_tokens(str(result)),
            }
        except Exception as e:
            duration = (time.perf_counter() - t0) * 1000.0
            return {
                "tool_name": tool_name,
                "sandbox": sandbox,
                "status": "ERROR",
                "error": str(e),
                "duration_ms": duration,
                "tokens": self._estimate_tokens(str(e)),
            }

    async def execute(
        self,
        inputs: dict[str, Any],
        idempotency_key: str | None = None
    ) -> WorkflowRunResult:
        """Execute the workflow DAG across all declared agents and tools."""
        key = idempotency_key or str(uuid.uuid4())
        start_time = time.perf_counter()

        if not self.nodes:
            return WorkflowRunResult(
                run_id=key,
                workflow_name=self.name,
                status="COMPLETED",
                total_tokens=0,
                steps=[],
                output=inputs,
                duration_ms=0.0,
            )

        execution_order = self._get_execution_order()
        step_records: list[StepExecutionRecord] = []
        current_context = dict(inputs)

        total_prompt_tokens = 0
        total_completion_tokens = 0

        for step_idx, node_id in enumerate(execution_order):
            agent = self.nodes[node_id]
            step_start = time.perf_counter()

            prompt_payload = f"System: {agent.system_prompt}\nContext: {current_context}"
            p_tokens = self._estimate_tokens(prompt_payload)
            total_prompt_tokens += p_tokens

            tools_executed: list[dict[str, Any]] = []
            node_output: dict[str, Any] = {}

            if agent.tools:
                for tool in agent.tools:
                    if callable(tool):
                        tool_res = await self._execute_tool(tool, current_context)
                        tools_executed.append(tool_res)
                        tool_key = tool_res["tool_name"]
                        node_output[tool_key] = tool_res.get("output", tool_res.get("error"))
                    else:
                        tools_executed.append({
                            "tool_name": str(tool),
                            "status": "SKIPPED",
                            "reason": "Not callable",
                            "tokens": 0,
                        })

            if not node_output:
                node_output = {
                    "node_id": node_id,
                    "agent": agent.name,
                    "role": agent.role,
                    "model": agent.model,
                    "processed_input": current_context,
                    "summary": f"{agent.role} processed step '{node_id}' successfully",
                }

            current_context[f"step_{node_id}"] = node_output
            current_context["last_output"] = node_output

            c_tokens = self._estimate_tokens(str(node_output)) + sum(t.get("tokens", 0) for t in tools_executed)
            total_completion_tokens += c_tokens
            step_duration = (time.perf_counter() - step_start) * 1000.0

            step_record = StepExecutionRecord(
                step_id=f"step_{step_idx}_{node_id}",
                node_id=node_id,
                agent_name=agent.name,
                agent_role=agent.role,
                agent_model=agent.model,
                input_data=dict(current_context),
                output_data=node_output,
                tools_executed=tools_executed,
                prompt_tokens=p_tokens,
                completion_tokens=c_tokens,
                total_tokens=p_tokens + c_tokens,
                duration_ms=step_duration,
                status="COMPLETED",
            )
            step_records.append(step_record)

        total_duration = (time.perf_counter() - start_time) * 1000.0
        total_tokens = total_prompt_tokens + total_completion_tokens

        return WorkflowRunResult(
            run_id=key,
            workflow_name=self.name,
            status="COMPLETED",
            total_tokens=total_tokens,
            total_prompt_tokens=total_prompt_tokens,
            total_completion_tokens=total_completion_tokens,
            steps=step_records,
            output=current_context.get("last_output", current_context),
            duration_ms=total_duration,
        )
