import OpenAI from "openai";
import { ChatCompletionService } from "../ChatCompletionService";

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
    systemMessage: string,
    body: OpenAI.ChatCompletionCreateParams,
    signal: AbortSignal,
    callback: (chunk: string) => Promise<boolean>,
  ): Promise<OpenAI.ChatCompletionMessage> {
    body.messages = [{ role: "system", content: systemMessage }, ...body.messages];
    const stream = this.client.beta.chat.completions.stream(
      {
        ...body,
        stream: true,
      },
      { signal },
    );
    for await (const chunk of stream) {
      const keepStreaming = await callback(chunk.choices[0].delta.content || "");
      if (!keepStreaming) {
        break;
      }
    }
    return stream.finalMessage();
  }
}
