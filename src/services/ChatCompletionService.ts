import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
// import { VertexAI } from "@google-cloud/vertexai";
import { LLMConfig } from "../model/llmConfig";

export abstract class ChatCompletionService {
  abstract getStreamedMessage(
    body: OpenAI.ChatCompletionCreateParams,
    signal: AbortSignal,
    callback: (chunk: string) => void,
  ): Promise<OpenAI.ChatCompletionMessage>;
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

  async getStreamedMessage(
    body: OpenAI.ChatCompletionCreateParams,
    signal: AbortSignal,
    callback: (chunk: string) => void,
  ): Promise<OpenAI.ChatCompletionMessage> {
    const stream = this.client.beta.chat.completions.stream(
      {
        ...body,
        stream: true,
      },
      { signal },
    );
    for await (const chunk of stream) {
      callback(chunk.choices[0].delta.content || "");
    }
    return stream.finalMessage();
  }
}

export class AnthropicChatCompletionService extends ChatCompletionService {
  private client: Anthropic;

  constructor(apiKey: string, baseURL?: string) {
    super();
    this.client = new Anthropic({
      apiKey,
      baseURL,
    });
  }

  convertFromOpenAIMessage(message: OpenAI.ChatCompletionMessageParam): Anthropic.Messages.MessageParam {
    const result: Anthropic.Messages.MessageParam = {
      role: ["user", "system", "tool"].includes(message.role) ? "user" : "assistant",
      content: [],
    };
    if (typeof message.content === "string") {
      (result.content as Anthropic.Messages.TextBlock[]).push({
        type: "text",
        text: message.content,
      });
    }
    if (message.role === "assistant" && message.tool_calls) {
      for (const toolCall of message.tool_calls) {
        if (toolCall.type === "function") {
          const functionCall = toolCall.function;
          (result.content as Anthropic.Messages.ToolUseBlock[]).push({
            type: "tool_use",
            id: toolCall.id,
            name: functionCall.name,
            input: JSON.parse(functionCall.arguments),
          });
        }
      }
    }
    if (message.role === "tool") {
      result.content = [
        {
          tool_use_id: message.tool_call_id,
          type: "tool_result",
          content: [
            {
              type: "text",
              text: message.content,
            },
          ],
          is_error: message.content.startsWith('{"error":'),
        },
      ];
    }
    return result;
  }

  convertFromOpenAiTools(tools: OpenAI.ChatCompletionTool[]): Anthropic.Messages.Tool[] {
    return tools.map((tool) => {
      return {
        name: tool.function.name,
        description: tool.function.description,
        input_schema: tool.function.parameters as Anthropic.Messages.Tool.InputSchema,
      };
    });
  }

  async getStreamedMessage(
    body: OpenAI.ChatCompletionCreateParams,
    signal: AbortSignal,
    callback: (chunk: string) => void,
  ): Promise<OpenAI.ChatCompletionMessage> {
    const systemMessage = body.messages.find((message) => message.role === "system");
    const stream = this.client.messages.stream(
      {
        system: systemMessage ? systemMessage.content : undefined,
        messages: body.messages.filter((message) => message.role != "system").map(this.convertFromOpenAIMessage),
        model: body.model || "claude-3-sonnet-20240229",
        max_tokens: body.max_tokens || 4096,
        tools: body.tools ? this.convertFromOpenAiTools(body.tools) : undefined,
        stream: true,
      },
      { signal },
    );

    stream.on("text", (text) => {
      callback(text);
    });

    const finalMessage = await stream.finalMessage();

    // Convert the final message back to OpenAI format
    const message: OpenAI.ChatCompletionMessage = {
      role: "assistant",
      content: null,
    };
    for (const contentBlock of finalMessage.content) {
      if (contentBlock.type === "text") {
        if (!message.content) {
          message.content = "";
        }
        message.content = contentBlock.text;
      } else if (contentBlock.type === "tool_use") {
        if (!message.tool_calls) {
          message.tool_calls = [];
        }
        message.tool_calls.push({
          id: contentBlock.id,
          type: "function",
          function: {
            arguments: JSON.stringify(contentBlock.input),
            name: contentBlock.name,
          },
        });
      }
    }
    return message;
  }
}

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

export function createChatCompletionService(config: LLMConfig): ChatCompletionService {
  switch (config.apiCompatibility) {
    case "OpenAI":
      return new OpenAIChatCompletionService(config.apiKey, config.apiEndPoint);
    case "Anthropic":
      return new AnthropicChatCompletionService(config.apiKey, config.apiEndPoint);
    // case "VertexAI":
    //   return new VertexAIChatCompletionService(config.projectID || "", config.location || "");
    default:
      throw new Error(`Unsupported API compatibility: ${config.apiCompatibility}`);
  }
}
