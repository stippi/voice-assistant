import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { ChatCompletionService } from "../ChatCompletionService";

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
    systemMessage: string,
    body: OpenAI.ChatCompletionCreateParams,
    signal: AbortSignal,
    callback: (chunk: string) => Promise<boolean>,
  ): Promise<OpenAI.ChatCompletionMessage> {
    const stream = this.client.messages.stream(
      {
        system: systemMessage,
        messages: body.messages.filter((message) => message.role != "system").map(this.convertFromOpenAIMessage),
        model: body.model || "claude-3-sonnet-20240229",
        max_tokens: body.max_tokens || 4096,
        tools: body.tools ? this.convertFromOpenAiTools(body.tools) : undefined,
        stream: true,
      },
      { signal },
    );

    stream.on("text", async (text) => {
      await callback(text);
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
