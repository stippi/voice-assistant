import OpenAI from "openai";
import { ChatCompletionService } from "../ChatCompletionService";

export class OllamaChatCompletionService implements ChatCompletionService {
  private client: OpenAI;

  constructor(apiKey?: string, baseURL?: string) {
    this.client = new OpenAI({
      apiKey: apiKey,
      dangerouslyAllowBrowser: true,
      baseURL,
    });
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
A description of each tool is given below.
You detect when to use a tool and choose the best tool for the task (see "How Tools Work" for how to invoke tools).
You never hallucinate input parameters for the tools.
Instead, if you do not already know the value for a parameter, you ask the user.
You only use a tool when it is necessary to accomplish what the user is asking for.

### Tool Declarations

What follows is a formal declaration of all available tools in JSON Object Schema notation:

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
  "tool": <name of the selected tool>,
  "tool_input": <parameters for the selected tool, matching the tool's JSON schema>
}
</tool>

When you need the result of a tool to complete your task, reply with ONLY the JSON object that contains the name of the tool and the input parameters according to the specification of the tool in the tools array.

It is important that you do not explain to the user that you will use a tool.
Do not append any text after the tool invocation JSON object.
The system will detect your use of a tool by intercepting your message, meaning the user will not read your message that contains the JSON object.
The system will call the respective tool's implementation with your input parameters.
It will then insert the result of the tool as a message into the chat and it will look like a message from the user.
Your task is then to extract the relevant information from the tool's result and use it in your reply to the user.

Again, the flow in simplified form:

1. The user is asking you for some information that can be retrieved with one of the tools.
2. You reply with a JSON object between <tool> and </tool> as explained above. This is the tool invocation and is not shown to the user.
3. The system inserts a message on the user's behalf containing the result of the tool.
4. You extract the relevant information and formulate a reply to the user. This is then shown to the user.

`;
    return (
      systemMessage.slice(0, realTimeDataSectionOffset) + toolsSection + systemMessage.slice(realTimeDataSectionOffset)
    );
  }

  async getStreamedMessage(
    systemMessage: string,
    body: OpenAI.ChatCompletionCreateParams,
    signal: AbortSignal,
    callback: (chunk: string) => Promise<boolean>,
  ): Promise<OpenAI.ChatCompletionMessage> {
    if (body.tools) {
      systemMessage = this.insertToolExplanation(systemMessage, body.tools);
    }
    body.messages = [{ role: "system", content: systemMessage }, ...body.messages];
    delete body.tools;
    body.messages = body.messages.map((message) => {
      if (message.role === "assistant" && message.content === null && message.tool_calls) {
        return {
          role: "assistant",
          content: message.tool_calls
            .map((toolCall) => {
              return `<tool>${JSON.stringify({ tool: toolCall.function.name, tool_input: toolCall.function.arguments })}</tool>`;
            })
            .join("\n"),
        } as OpenAI.ChatCompletionMessageParam;
      }
      return {
        role: message.role === "tool" ? "user" : message.role,
        content: message.content,
      } as OpenAI.ChatCompletionMessageParam;
    });

    const stream = this.client.beta.chat.completions.stream(
      {
        ...body,
        stream: true,
      },
      { signal },
    );
    let content = "";
    let previousContentWithoutToolBlocks = "";
    for await (const chunk of stream) {
      content += chunk.choices[0].delta.content || "";
      const contentWithoutToolBlocks = this.removeToolBlocks(content).trim();
      if (contentWithoutToolBlocks !== previousContentWithoutToolBlocks) {
        const keepStreaming = await callback(contentWithoutToolBlocks.slice(previousContentWithoutToolBlocks.length));
        if (!keepStreaming) {
          break;
        }
        previousContentWithoutToolBlocks = contentWithoutToolBlocks;
      }
    }
    const finalMessage = await stream.finalMessage();

    if (typeof finalMessage.content === "string") {
      const matches = finalMessage.content.match(/<tool>[\s\S]*?<\/tool>/g);
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
      finalMessage.content = this.removeToolBlocks(finalMessage.content);
      if (finalMessage.content.trim() === "") {
        finalMessage.content = null;
      }
    }

    return finalMessage;
  }
}
