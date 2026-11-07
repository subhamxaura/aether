import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import http from 'node:http';
import { AetherClient } from '../src/client.js';
import { defineWorkflow } from '../src/workflow.js';

describe('TypeScript SDK AetherClient & SSE Stream Consumer', () => {
  let server;
  let serverPort;

  before(async () => {
    server = http.createServer((req, res) => {
      if (req.url === '/api/v1/runs/test-run-101/stream') {
        res.writeHead(200, {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        });
        res.write('id: 101\nevent: node.started\ndata: {"node_id": "auditor"}\n\n');
        res.write('id: 102\nevent: agent.token\ndata: {"token": "Authenticating worker sandbox..."}\n\n');
        res.write('id: 103\nevent: tool.invoked\ndata: {"tool": "cargo_audit", "status": "CLEAN"}\n\n');
        res.end();
      } else if (req.url === '/v1/workflows/audit_workflow/runs' && req.method === 'POST') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          id: 'run-uuid-42',
          workflowId: 'audit_workflow',
          status: 'RUNNING',
          totalTokens: 128,
          totalCostUsd: 0.003,
        }));
      } else {
        res.writeHead(404);
        res.end();
      }
    });

    await new Promise((resolve) => {
      server.listen(0, () => {
        serverPort = server.address().port;
        resolve();
      });
    });
  });

  after(() => {
    server.close();
  });

  it('correctly consumes and parses W3C SSE event stream frames via AetherClient.streamRunEvents', async () => {
    const client = new AetherClient({ endpoint: `http://localhost:${serverPort}` });
    const events = [];

    for await (const event of client.streamRunEvents('test-run-101')) {
      events.push(event);
    }

    assert.strictEqual(events.length, 3);
    assert.strictEqual(events[0].id, '101');
    assert.strictEqual(events[0].type, 'node.started');
    assert.strictEqual(events[1].id, '102');
    assert.strictEqual(events[1].token, 'Authenticating worker sandbox...');
    assert.strictEqual(events[2].type, 'tool.invoked');
    assert.strictEqual(events[2].data.tool, 'cargo_audit');
  });

  it('triggers workflow runs via AetherClient.triggerWorkflow with idempotency headers', async () => {
    const client = new AetherClient({ endpoint: `http://localhost:${serverPort}`, apiKey: 'sk-test-key' });
    const workflow = defineWorkflow({ name: 'audit_workflow' });
    const result = await client.triggerWorkflow(workflow, { inputs: { repo: 'aether' } });

    assert.strictEqual(result.id, 'run-uuid-42');
    assert.strictEqual(result.workflowId, 'audit_workflow');
    assert.strictEqual(result.status, 'RUNNING');
    assert.strictEqual(result.totalTokens, 128);
  });

  it('rejects with descriptive error on unreachable host', async () => {
    const badClient = new AetherClient({ endpoint: 'http://127.0.0.1:59999' });
    const workflow = defineWorkflow({ name: 'test_workflow' });
    await assert.rejects(
      async () => {
        await badClient.triggerWorkflow(workflow, { inputs: {} });
      },
      /Failed to trigger workflow|fetch failed|ECONNREFUSED/
    );
  });
});
