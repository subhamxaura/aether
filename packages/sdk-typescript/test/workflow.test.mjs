import { describe, it } from 'node:test';
import assert from 'node:assert';
import { WorkflowBuilder, defineWorkflow } from '../src/workflow.js';
import { defineWorkflow as indexDefineWorkflow, WorkflowBuilder as IndexWorkflowBuilder } from '../src/index.js';

describe('TypeScript SDK Workflow & Agent Topology', () => {
  it('constructs multi-node DAG topology with directed edges using defineWorkflow', () => {
    const builder = defineWorkflow({ name: 'code_review_pipeline', timeoutSeconds: 300 });

    assert.ok(builder instanceof WorkflowBuilder, 'defineWorkflow must return a WorkflowBuilder instance');
    assert.strictEqual(builder.config.name, 'code_review_pipeline');
    assert.strictEqual(builder.config.timeoutSeconds, 300);

    const stepRes1 = builder.step('planner', { id: 'agent-1', role: 'SUPERVISOR', model: 'claude-3-7-sonnet' });
    const stepRes2 = builder.step('executor', { id: 'agent-2', role: 'WORKER', model: 'claude-3-5-sonnet' });
    const stepRes3 = builder.step('auditor', { id: 'agent-3', role: 'AUDITOR', model: 'claude-3-5-sonnet' });

    assert.strictEqual(stepRes1, builder, '.step() must return this for method chaining');
    assert.strictEqual(stepRes2, builder);
    assert.strictEqual(stepRes3, builder);

    assert.strictEqual(builder.nodes.size, 3);
    assert.deepStrictEqual(builder.nodes.get('planner'), { id: 'agent-1', role: 'SUPERVISOR', model: 'claude-3-7-sonnet' });
    assert.deepStrictEqual(builder.nodes.get('executor'), { id: 'agent-2', role: 'WORKER', model: 'claude-3-5-sonnet' });
    assert.deepStrictEqual(builder.nodes.get('auditor'), { id: 'agent-3', role: 'AUDITOR', model: 'claude-3-5-sonnet' });

    const connRes1 = builder.connect('planner', 'executor', 'task_approved == true');
    const connRes2 = builder.connect('executor', 'auditor');

    assert.strictEqual(connRes1, builder, '.connect() must return this for method chaining');
    assert.strictEqual(connRes2, builder);

    assert.strictEqual(builder.edges.length, 2);
    assert.deepStrictEqual(builder.edges[0], { from: 'planner', to: 'executor', condition: 'task_approved == true' });
    assert.deepStrictEqual(builder.edges[1], { from: 'executor', to: 'auditor', condition: undefined });
  });

  it('supports direct WorkflowBuilder class instantiation and index exports', () => {
    assert.strictEqual(IndexWorkflowBuilder, WorkflowBuilder);
    assert.strictEqual(indexDefineWorkflow, defineWorkflow);

    const direct = new WorkflowBuilder({ name: 'direct_graph' });
    direct
      .step('init', { id: 'init-1', role: 'WORKER', model: 'gpt-4o' })
      .step('finish', { id: 'finish-1', role: 'AUDITOR', model: 'gpt-4o' })
      .connect('init', 'finish');

    assert.strictEqual(direct.config.name, 'direct_graph');
    assert.strictEqual(direct.nodes.size, 2);
    assert.strictEqual(direct.edges.length, 1);
    assert.strictEqual(direct.edges[0].from, 'init');
    assert.strictEqual(direct.edges[0].to, 'finish');
  });
});
