"""Aether Agent & Tool definitions."""

from collections.abc import Callable
from typing import Any

from pydantic import BaseModel, Field


def Tool(sandbox: str = "wasm", timeout_ms: int = 5000) -> Callable:
    """Decorator to declare a deterministic, isolated tool function."""
    def decorator(func: Callable) -> Callable:
        setattr(func, "__aether_tool__", True)
        setattr(func, "__sandbox__", sandbox)
        setattr(func, "__timeout_ms__", timeout_ms)
        return func
    return decorator


class Agent(BaseModel):
    name: str = "autonomous-agent"
    role: str = "WORKER"
    model: str = "claude-3-5-sonnet"
    system_prompt: str = "You are a specialized autonomous agent."
    tools: list[Any] = Field(default_factory=list)


def Supervisor(agents: list[Agent], model: str = "claude-3-7-sonnet") -> Agent:
    """Helper to instantiate a hierarchical supervisor agent."""
    return Agent(
        name="supervisor",
        role="SUPERVISOR",
        model=model,
        system_prompt="You supervise and coordinate specialist agents.",
        tools=[],
    )
