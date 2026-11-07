export function defineAgent(config) {
  return {
    ...config,
    systemPrompt: config.systemPrompt ?? "You are a specialized autonomous agent.",
  };
}
