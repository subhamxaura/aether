import pytest

from aether import Agent, Supervisor, Tool, Workflow


@pytest.mark.asyncio
async def test_genuine_dag_tool_execution():
    @Tool(sandbox="wasm", timeout_ms=3000)
    def calculate_risk(asset: str = "core") -> dict:
        return {"asset": asset, "risk_score": 0.05, "status": "VERIFIED"}

    wf = Workflow("test_audit_pipeline")
    worker = Agent(name="auditor", role="WORKER", tools=[calculate_risk])
    supervisor = Supervisor(agents=[worker])

    wf.add_node("audit_step", worker)
    wf.add_node("review_step", supervisor)
    wf.connect("audit_step", "review_step")

    result = await wf.execute({"asset": "aether-core"})

    assert result.status == "COMPLETED"
    assert len(result.steps) == 2
    assert result.total_tokens > 0
    assert result.steps[0].node_id == "audit_step"
    assert len(result.steps[0].tools_executed) == 1
    assert result.steps[0].tools_executed[0]["output"]["status"] == "VERIFIED"
    assert result.steps[1].node_id == "review_step"


@pytest.mark.asyncio
async def test_empty_workflow_execution():
    wf = Workflow("empty_pipeline")
    result = await wf.execute({"key": "value"})

    assert result.status == "COMPLETED"
    assert len(result.steps) == 0
    assert result.output == {"key": "value"}


def test_workflow_connect_invalid_node():
    wf = Workflow("invalid_pipeline")
    worker = Agent(name="worker")
    wf.add_node("step1", worker)

    with pytest.raises(ValueError, match="Source node 'step0' not registered"):
        wf.connect("step0", "step1")

    with pytest.raises(ValueError, match="Target node 'step2' not registered"):
        wf.connect("step1", "step2")

