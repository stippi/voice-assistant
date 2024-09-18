import OpenAI from "openai";
import {
  AnthropicChatCompletionService,
  OllamaChatCompletionService,
  OpenAIChatCompletionService,
  VertexAIChatCompletionService,
} from "./chat-completion-impl";
import { LLMConfig } from "@shared/types";

export interface ChatCompletionService {
  getStreamedMessage(
    systemMessage: string,
    body: OpenAI.ChatCompletionCreateParams,
    signal: AbortSignal,
    callback: (chunk: string) => Promise<boolean>,
  ): Promise<OpenAI.ChatCompletionMessage>;
}

export function createChatCompletionService(config: LLMConfig): ChatCompletionService {
  switch (config.apiCompatibility) {
    case "OpenAI":
      return new OpenAIChatCompletionService(config.apiKey, config.apiEndPoint);
    case "Ollama":
      return new OllamaChatCompletionService(config.apiEndPoint);
    case "Anthropic":
      return new AnthropicChatCompletionService(config.apiKey, config.apiEndPoint);
    case "VertexAI":
      return new VertexAIChatCompletionService(config.projectID || "", config.region || "");
    default:
      throw new Error(`Unsupported API compatibility: ${config.apiCompatibility}`);
  }
}
