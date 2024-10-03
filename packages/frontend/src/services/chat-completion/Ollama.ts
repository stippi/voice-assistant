import { Ollama, Message } from "ollama/browser";
import { OpenAI } from "openai";
import { ChatCompletionService } from "../ChatCompletionService";

export class OllamaChatCompletionService implements ChatCompletionService {
  private readonly client: Ollama;
  private readonly contextLength: number;

  constructor(host: string = "http://localhost:11434", contextLength: number = 8192) {
    this.client = new Ollama({
      host,
    });
    this.contextLength = contextLength;
  }

  removeToolBlocks(text: string): string {
    // Regular expression for complete <tool> blocks
    const completeToolRegex = /<tool>[\s\S]*?<\/tool>/g;

    // Regular expression for incomplete <tool> blocks at the end
    const incompleteToolRegex = /<(?:tool(?:>[\s\S]*)?|t(?:o(?:o(?:l)?)?)?)?$/;

    // Remove complete <tool> blocks
    let cleanedText = text.replace(completeToolRegex, "");

    // Remove incomplete <tool> block at the end, if any
    cleanedText = cleanedText.replace(incompleteToolRegex, "");

    return cleanedText;
  }

  insertToolExplanation(systemMessage: string, tools: OpenAI.ChatCompletionTool[]): string {
    const realTimeDataSectionOffset = systemMessage.indexOf("## Realtime Data");
    const toolsSection = `
## Tools

A number of tools are available to you, which help you accomplish the user's request.

You detect when to use a tool and choose the best tool for the task (see "How Tools Work" for how to invoke tools).
You never hallucinate input parameters for the tools.
Instead, if you do not already know the value for a parameter, you ask the user.
You only use a tool when it is necessary to accomplish what the user is asking for.

### Available Tools

This is the list of all available tools:

${JSON.stringify(
  tools.map((tool) => tool.function),
  null,
  2,
)}

### How Tools Work

You can invoke a tool at any time during the conversation with the user.
To invoke a tool, reply with a JSON object between the '<tool>' tags like shown below:

<tool>
{
  "tool": <name of the tool>,
  "tool_input": <parameters for the tool according to its JSON schema>
}
</tool>

It is important that you do not explain to the user that you will use a tool.
The user will not see the part of your message between <tool> and </tool>.
The system will call the respective tool's implementation with the input parameters you provided.
It will then insert the result of the tool as a message into the chat and it will look like a message from the user.
Your task is then to extract the relevant information from the tool's result and use it in your reply to the user.
If required, you can use the result of a tool as input for another tool.

Again, the flow in simplified form:

1. The user is asking you for something that can be done with one of the tools.
2. You reply with a JSON object between <tool> and </tool> as explained above. This is the tool invocation and is not shown to the user.
3. The system inserts a message on the user's behalf containing the result of the tool.
4. You extract the relevant information and formulate a reply to the user. This is then shown to the user.

`;
    return (
      systemMessage.slice(0, realTimeDataSectionOffset) + toolsSection + systemMessage.slice(realTimeDataSectionOffset)
    );
  }

  convertMessagesFromOpenAI(messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[]): Message[] {
    return messages.map((message) => {
      if (message.role === "assistant" && message.content === null && message.tool_calls) {
        return {
          role: "assistant",
          content: message.tool_calls
            .map((toolCall) => {
              return `<tool>${JSON.stringify({ tool: toolCall.function.name, tool_input: toolCall.function.arguments })}</tool>`;
            })
            .join("\n"),
        } as Message;
      }
      return {
        role: message.role === "tool" ? "user" : message.role,
        content: message.content,
      } as Message;
    });
  }

  async getStreamedMessage(
    systemMessage: string,
    body: OpenAI.ChatCompletionCreateParams,
    _signal: AbortSignal,
    callback: (chunk: string) => Promise<boolean>,
  ): Promise<OpenAI.ChatCompletionMessage> {
    if (body.tools) {
      systemMessage = this.insertToolExplanation(systemMessage, body.tools);
    }
    body.messages = [{ role: "system", content: systemMessage }, ...body.messages];
    delete body.tools;

    const stream = await this.client.chat({
      model: body.model,
      messages: this.convertMessagesFromOpenAI(body.messages),
      stream: true,
      options: {
        // temperature: request.temperature,
        // num_predict: request.max_tokens,
        num_ctx: this.contextLength, // Increases the context size, default is 2048
      },
    });

    let content = "";
    let previousContentWithoutToolBlocks = "";
    for await (const chunk of stream) {
      content += chunk.message.content || "";
      const contentWithoutToolBlocks = this.removeToolBlocks(content).trim();
      if (contentWithoutToolBlocks !== previousContentWithoutToolBlocks) {
        const keepStreaming = await callback(contentWithoutToolBlocks.slice(previousContentWithoutToolBlocks.length));
        if (!keepStreaming || chunk.done) {
          break;
        }
        previousContentWithoutToolBlocks = contentWithoutToolBlocks;
      }
    }
    const finalMessage: OpenAI.ChatCompletionMessage = {
      content: null,
      role: "assistant",
      refusal: null,
    };

    const matches = content.match(/<tool>[\s\S]*?<\/tool>/g);
    if (matches) {
      finalMessage.tool_calls = matches.map((match) => {
        try {
          const toolCall = JSON.parse(match.slice(6, -7));
          return {
            type: "function",
            id: crypto.randomUUID(),
            function: {
              name: toolCall.tool,
              arguments: JSON.stringify(toolCall.tool_input),
            },
          };
        } catch (e) {
          return {
            type: "function",
            id: crypto.randomUUID(),
            function: {
              name: "unknown",
              arguments: "{}",
            },
          };
        }
      });
    }
    content = this.removeToolBlocks(content);
    if (content.trim() !== "") {
      finalMessage.content = content;
    }

    return finalMessage;
  }
}
