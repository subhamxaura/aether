export class AetherClient {
  constructor(options = {}) {
    this.endpoint = (options.endpoint ?? "http://localhost:8080").replace(/\/+$/, "");
    this.apiKey = options.apiKey;
  }

  async triggerWorkflow(workflow, options = {}) {
    const payload = {
      workflowName: workflow.config.name,
      inputs: options.inputs ?? {},
    };

    const headers = {
      "Content-Type": "application/json",
      "Idempotency-Key": options.idempotencyKey ?? (globalThis.crypto?.randomUUID ? crypto.randomUUID() : `key-${Date.now()}`),
    };

    if (this.apiKey) {
      headers["X-Aether-Key"] = this.apiKey;
    }

    const url = `${this.endpoint}/v1/workflows/${encodeURIComponent(workflow.config.name)}/runs`;
    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errorDetail = await res.text().catch(() => res.statusText);
      throw new Error(`Failed to trigger workflow '${workflow.config.name}' (${res.status}): ${errorDetail}`);
    }

    return await res.json();
  }

  async *streamRunEvents(runId, options = {}) {
    const headers = {
      Accept: "text/event-stream",
      "Cache-Control": "no-cache",
    };

    if (this.apiKey) {
      headers["X-Aether-Key"] = this.apiKey;
    }

    if (options?.lastEventId) {
      headers["Last-Event-ID"] = options.lastEventId;
    }

    const url = `${this.endpoint}/api/v1/runs/${encodeURIComponent(runId)}/stream`;
    const res = await fetch(url, { headers });

    if (!res.ok) {
      const errorDetail = await res.text().catch(() => res.statusText);
      throw new Error(`Failed to subscribe to run stream '${runId}' (${res.status}): ${errorDetail}`);
    }

    if (!res.body) {
      throw new Error(`Response body is empty for stream '${runId}'`);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const blocks = buffer.split("\n\n");
        buffer = blocks.pop() ?? "";

        for (const block of blocks) {
          if (!block.trim()) continue;

          let id = "";
          let eventType = "node.started";
          let dataStr = "";

          const lines = block.split("\n");
          for (const line of lines) {
            if (line.startsWith("id:")) {
              id = line.slice(3).trim();
            } else if (line.startsWith("event:")) {
              eventType = line.slice(6).trim();
            } else if (line.startsWith("data:")) {
              dataStr += line.slice(5).trim();
            }
          }

          if (dataStr) {
            try {
              const data = JSON.parse(dataStr);
              yield {
                id,
                type: eventType,
                data,
                token: data.token,
              };
            } catch {
              yield {
                id,
                type: eventType,
                data: { raw: dataStr },
              };
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }
}
