import { AgentConfig, WorkflowConfig } from "./types.js";

export class WorkflowBuilder {
  public config: WorkflowConfig;
  public nodes: Map<string, AgentConfig> = new Map();
  public edges: Array<{ from: string; to: string; condition?: string }> = [];

  constructor(config: WorkflowConfig) {
    this.config = config;
  }

  public step(nodeId: string, agent: AgentConfig): this {
    this.nodes.set(nodeId, agent);
    return this;
  }

  public connect(from: string, to: string, condition?: string): this {
    this.edges.push({ from, to, condition });
    return this;
  }
}

export function defineWorkflow(config: WorkflowConfig): WorkflowBuilder {
  return new WorkflowBuilder(config);
}
