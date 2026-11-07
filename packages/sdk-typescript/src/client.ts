import { WorkflowBuilder } from "./workflow.js";
import { RunSummary, RunEvent } from "./types.js";

export interface AetherClientOptions {
  endpoint?: string;
  apiKey?: string;
}

export class AetherClient {
  private endpoint: string;
  private apiKey?: string;

  constructor(options: AetherClientOptions = {}) {
    this.endpoint = (options.endpoint ?? "http://localhost:8080").replace(
      /\/+$/,
      "",
    );
    this.apiKey = options.apiKey;
  }

  public async triggerWorkflow(
    workflow: WorkflowBuilder,
    options: { inputs: Record<string, unknown>; idempotencyKey?: string },
  ): Promise<RunSummary> {
    const payload = {
      workflowName: workflow.config.name,
      inputs: options.inputs,
    };

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "Idempotency-Key": options.idempotencyKey ?? crypto.randomUUID(),
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
      throw new Error(
        `Failed to trigger workflow '${workflow.config.name}' (${res.status}): ${errorDetail}`,
      );
    }

    return (await res.json()) as RunSummary;
  }

  public async *streamRunEvents(
    runId: string,
    options?: { lastEventId?: string },
  ): AsyncGenerator<RunEvent> {
    const headers: Record<string, string> = {
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
    const response = await fetch(url, { headers });

    if (!response.ok) {
      const errorMsg = await response.text().catch(() => response.statusText);
      throw new Error(
        `Failed to open event stream for run '${runId}' (${response.status}): ${errorMsg}`,
      );
    }

    if (!response.body) {
      throw new Error(`Event stream body is null for run '${runId}'`);
    }

    const reader = response.body.getReader();
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

          let eventId = "";
          let eventType: RunEvent["type"] = "node.started";
          let dataStr = "";

          for (const line of block.split("\n")) {
            if (line.startsWith("id:")) {
              eventId = line.slice(3).trim();
            } else if (line.startsWith("event:")) {
              eventType = line.slice(6).trim() as RunEvent["type"];
            } else if (line.startsWith("data:")) {
              dataStr += line.slice(5).trim();
            }
          }

          if (dataStr) {
            let parsedData: Record<string, unknown> = {};
            try {
              parsedData = JSON.parse(dataStr);
            } catch {
              parsedData = { raw: dataStr };
            }

            const token =
              typeof parsedData.token === "string"
                ? parsedData.token
                : undefined;

            yield {
              id: eventId || crypto.randomUUID(),
              type: eventType,
              data: parsedData,
              ...(token !== undefined ? { token } : {}),
            };
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }
}
