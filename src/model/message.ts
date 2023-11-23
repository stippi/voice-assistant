import OpenAI from "openai";
import ChatCompletionMessageToolCall = OpenAI.ChatCompletionMessageToolCall;

export type Message = {
  role: "user" | "assistant" | "system" | "tool",
  content: string | null,
  tool_calls?: ChatCompletionMessageToolCall[],
}
