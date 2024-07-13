import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import { LLMConfig } from "../model/llmConfig";
import { loginFlow } from "../integrations/google";

export interface ChatCompletionService {
  getStreamedMessage(
    body: OpenAI.ChatCompletionCreateParams,
    signal: AbortSignal,
    callback: (chunk: string) => void,
  ): Promise<OpenAI.ChatCompletionMessage>;
}

export class OpenAIChatCompletionService implements ChatCompletionService {
  private client: OpenAI;

  constructor(apiKey: string, baseURL?: string) {
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

export class AnthropicChatCompletionService implements ChatCompletionService {
  private client: Anthropic;

  constructor(apiKey: string, baseURL?: string) {
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

interface FunctionCall {
  name: string;
  args: never;
}

interface GeminiMessage {
  role: string;
  parts: {
    text?: string;
    functionResponse?: {
      name: string;
      response: {
        name: string;
        content: never;
      };
    };
    functionCall?: FunctionCall;
  }[];
}

interface Candidate {
  content: {
    role: string;
    parts: {
      text?: string;
      functionCall?: FunctionCall;
    }[];
  };
  finishReason: string;
}

interface GeminiResponse {
  candidates: Candidate[];
  usageMetadata: {
    promptTokenCount: number;
    candidatesTokenCount: number;
    totalTokenCount: number;
  };
}

export class VertexAIChatCompletionService implements ChatCompletionService {
  private projectId: string;
  private region: string;
  constructor(projectId: string, region: string) {
    this.projectId = projectId;
    this.region = region;
  }

  private convertRole(role: string) {
    switch (role) {
      case "assistant":
        return "model";
      case "tool":
        return "function";
      default:
        return "user";
    }
  }

  convertFromOpenAIMessage(message: OpenAI.ChatCompletionMessageParam): GeminiMessage {
    const converted: GeminiMessage = {
      role: this.convertRole(message.role),
      parts: [],
    };
    if (message.role === "tool") {
      converted.parts.push({
        functionResponse: {
          name: message.name,
          response: {
            name: message.name,
            content: JSON.parse(message.content || "{}") as never,
          },
        },
      });
    } else if (message.role === "assistant" && message.tool_calls) {
      for (const toolCall of message.tool_calls) {
        converted.parts.push({
          functionCall: {
            name: toolCall.function.name,
            args: JSON.parse(toolCall.function.arguments) as never,
          },
        });
      }
    } else if (typeof message.content === "string") {
      converted.parts.push({
        text: message.content,
      });
    }
    return converted;
  }

  async getStreamedMessage(
    options: OpenAI.ChatCompletionCreateParams,
    _: AbortSignal,
    callback: (chunk: string) => void,
  ): Promise<OpenAI.ChatCompletionMessage> {
    const accessToken = await loginFlow.getAccessToken();

    const systemMessage = options.messages.find((message) => message.role === "system");

    const wrappedSystemMessage = "Hi. I'll explain how you should behave:\n" + systemMessage!.content;
    const transformedMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      { role: "user", content: wrappedSystemMessage },
      { role: "assistant", content: "Ok, let's start! Please continue in your native language." },
      ...options.messages.filter((message) => message.role !== "system"),
    ];

    const url = `https://${this.region}-aiplatform.googleapis.com/v1/projects/${this.projectId}/locations/${this.region}/publishers/google/models/${options.model}:streamGenerateContent?alt=sse`;

    type GeminiPayload = {
      contents: GeminiMessage[];
      tools?: {
        functionDeclarations: unknown[];
      }[];
    };

    const body: GeminiPayload = {
      contents: transformedMessages.map((message) => this.convertFromOpenAIMessage(message)),
    };

    if (options.tools) {
      body.tools = [
        {
          functionDeclarations: options.tools.map((tool) => tool.function),
        },
      ];
    }

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        Authorization: `Bearer ${accessToken}`,
        Accept: "text/event-stream",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok || !response.body) {
      throw new Error(`Failed to fetch from Gemini: ${response.status} ${response.statusText}`);
    }

    let content = "";
    let functionCall: FunctionCall | undefined;
    for await (const event of this.fetchServerSentEvents(response.body.getReader())) {
      const delta: GeminiResponse = JSON.parse(event.data);
      if (delta.candidates?.[0].content?.parts?.[0].text) {
        content += delta.candidates[0].content.parts[0].text;
        callback(delta.candidates[0].content.parts[0].text);
      }
      if (delta.candidates?.[0].content?.parts?.[0].functionCall) {
        functionCall = delta.candidates[0].content.parts[0].functionCall;
      }
    }

    const finalMessage: OpenAI.ChatCompletionMessage = {
      role: "assistant",
      content: content ? content : null,
    };
    if (functionCall) {
      finalMessage.tool_calls = [
        {
          id: "unused",
          type: "function",
          function: {
            name: functionCall.name,
            arguments: JSON.stringify(functionCall.args),
          },
        },
      ];
    }

    return finalMessage;
  }

  async *fetchServerSentEvents(reader: ReadableStreamDefaultReader<Uint8Array>): AsyncIterableIterator<MessageEvent> {
    const decoder = new TextDecoder();
    let data = "";

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          // Server closed the stream
          break;
        }

        // Decode the chunk and add it to the data
        const text = decoder.decode(value, { stream: true });
        data += text;
        //console.log('chunk:', text);

        // Split the data into messages
        let eolIndex;
        while ((eolIndex = data.indexOf("\r\n\r\n")) >= 0) {
          const message = data.substring("data: ".length, eolIndex).trim();
          data = data.substring(eolIndex + 4);

          if (message) {
            const event = new MessageEvent("message", {
              data: message.split("\n").pop(),
            });
            // Hand the result to the iterator
            yield event;
          }
        }
      }
      //console.log("data after exiting loop", data);
    } finally {
      reader.releaseLock();
    }
  }
}

export function createChatCompletionService(config: LLMConfig): ChatCompletionService {
  switch (config.apiCompatibility) {
    case "OpenAI":
      return new OpenAIChatCompletionService(config.apiKey, config.apiEndPoint);
    case "Anthropic":
      return new AnthropicChatCompletionService(config.apiKey, config.apiEndPoint);
    case "VertexAI":
      return new VertexAIChatCompletionService(config.projectID || "", config.region || "");
    default:
      throw new Error(`Unsupported API compatibility: ${config.apiCompatibility}`);
  }
}
