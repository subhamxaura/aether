import { z } from "zod";

export interface AgentConfig<TInput = unknown, TOutput = unknown> {
  id: string;
  role: "SUPERVISOR" | "WORKER" | "CRITIC" | "SPECIALIST" | "AUDITOR";
  model: string;
  systemPrompt?: string;
  inputSchema?: z.ZodType<TInput>;
  outputSchema?: z.ZodType<TOutput>;
}

export interface WorkflowConfig {
  name: string;
  timeoutSeconds?: number;
}

export interface RunSummary {
  id: string;
  workflowId: string;
  status: "PENDING" | "RUNNING" | "COMPLETED" | "FAILED" | "SUSPENDED";
  totalTokens: number;
  totalCostUsd: number;
}

export interface RunEvent {
  id: string;
  type: "node.started" | "agent.token" | "tool.invoked" | "checkpoint.saved" | "run.suspended";
  data: Record<string, unknown>;
  token?: string;
}
