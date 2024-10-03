import OpenAI from "openai";
import { ChatCompletionService } from "../ChatCompletionService";
import { loginFlow } from "../../integrations/google";

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
    console.log(`VertexAIChatCompletionService initialized with projectId: ${projectId}, region: ${region}`);
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
    if (message.role === "tool" && typeof message.content === "string") {
      converted.parts.push({
        functionResponse: {
          //@ts-expect-error "name" is present, since it's actually Messages in the array'
          name: message.name,
          response: {
            //@ts-expect-error "name" is present, since it's actually Messages in the array
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
    systemMessage: string,
    options: OpenAI.ChatCompletionCreateParams,
    _: AbortSignal,
    callback: (chunk: string) => Promise<boolean>,
  ): Promise<OpenAI.ChatCompletionMessage> {
    const accessToken = await loginFlow.getAccessToken();

    const wrappedSystemMessage = "Hi. I'll explain how you should behave:\n" + systemMessage;
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
        const keepStreaming = await callback(delta.candidates[0].content.parts[0].text);
        if (!keepStreaming) {
          break;
        }
      }
      if (delta.candidates?.[0].content?.parts?.[0].functionCall) {
        functionCall = delta.candidates[0].content.parts[0].functionCall;
      }
    }

    const finalMessage: Partial<OpenAI.ChatCompletionMessage> = {
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

    return finalMessage as OpenAI.ChatCompletionMessage;
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
