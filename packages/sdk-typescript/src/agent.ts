import { AgentConfig } from "./types.js";

export function defineAgent<TInput, TOutput>(config: AgentConfig<TInput, TOutput>): AgentConfig<TInput, TOutput> {
  return {
    ...config,
    systemPrompt: config.systemPrompt ?? "You are a specialized autonomous agent.",
  };
}
