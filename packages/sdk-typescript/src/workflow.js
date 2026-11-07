export class WorkflowBuilder {
  constructor(config) {
    this.config = config;
    this.nodes = new Map();
    this.edges = [];
  }

  step(nodeId, agent) {
    this.nodes.set(nodeId, agent);
    return this;
  }

  connect(from, to, condition) {
    this.edges.push({ from, to, condition });
    return this;
  }
}

export function defineWorkflow(config) {
  return new WorkflowBuilder(config);
}
