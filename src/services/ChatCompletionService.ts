import OpenAI from "openai";
// import Anthropic from "@anthropic-ai/sdk";
// import { VertexAI } from "@google-cloud/vertexai";
import { LLMConfig } from "../model/llmConfig";
import { ChatCompletionStream } from "openai/lib/ChatCompletionStream";

export abstract class ChatCompletionService {
  abstract stream(
    body: OpenAI.ChatCompletionCreateParams,
    signal: AbortSignal,
  ): ChatCompletionStream;
}

export class OpenAIChatCompletionService extends ChatCompletionService {
  private client: OpenAI;

  constructor(apiKey: string, baseURL?: string) {
    super();
    this.client = new OpenAI({
      apiKey,
      dangerouslyAllowBrowser: true,
      baseURL,
    });
  }

  stream(
    body: OpenAI.ChatCompletionCreateParams,
    signal: AbortSignal,
  ): ChatCompletionStream {
    return this.client.beta.chat.completions.stream(
      {
        ...body,
        stream: true,
      },
      { signal },
    );
  }
}

// export class AnthropicChatCompletionService extends ChatCompletionService {
//     private client: Anthropic;
//
//     constructor(apiKey: string) {
//         super();
//         this.client = new Anthropic({ apiKey });
//     }
//
//     async *streamChatCompletion(
//         options: ChatCompletionOptions,
//         signal: AbortSignal
//     ): AsyncGenerator<StreamChunk, FinalMessage, unknown> {
//         const stream = await this.client.messages.stream({
//             messages: options.messages,
//             model: options.model,
//             max_tokens: 1024,
//         }, { signal });
//
//         let finalContent = "";
//
//         for await (const message of stream) {
//             if (message.type === 'content_block_delta') {
//                 finalContent += message.delta?.text || "";
//                 yield {
//                     choices: [{ delta: { content: message.delta?.text || "" } }],
//                 };
//             }
//         }
//
//         return {
//             role: "assistant",
//             content: finalContent,
//         } as FinalMessage;
//     }
// }
//
// export class VertexAIChatCompletionService extends ChatCompletionService {
//     private client: VertexAI;
//
//     constructor(projectId: string, location: string) {
//         super();
//         this.client = new VertexAI({ project: projectId, location });
//     }
//
//     async *streamChatCompletion(
//         options: ChatCompletionOptions,
//         signal: AbortSignal
//     ): AsyncGenerator<StreamChunk, FinalMessage, unknown> {
//         const model = this.client.preview.getGenerativeModel({ model: options.model });
//         const chat = model.startChat();
//         const lastMessage = options.messages[options.messages.length - 1];
//         const result = await chat.sendMessageStream(lastMessage.content as string);
//
//         let finalContent = "";
//
//         for await (const chunk of result.stream) {
//             finalContent += chunk.candidates[0]?.content || "";
//             yield {
//                 choices: [{ delta: { content: chunk.candidates[0]?.content || "" } }],
//             };
//         }
//
//         return {
//             role: "assistant",
//             content: finalContent,
//         } as FinalMessage;
//     }
// }

export function createChatCompletionService(
  config: LLMConfig,
): ChatCompletionService {
  switch (config.apiCompatibility) {
    case "OpenAI":
      return new OpenAIChatCompletionService(config.apiKey, config.apiEndPoint);
    // case "Anthropic":
    //     return new AnthropicChatCompletionService(config.apiKey);
    // case "VertexAI":
    //     return new VertexAIChatCompletionService(config.projectID || "", config.location || "");
    default:
      throw new Error(
        `Unsupported API compatibility: ${config.apiCompatibility}`,
      );
  }
}
