import OpenAI from "openai";
import ChatCompletionMessageToolCall = OpenAI.ChatCompletionMessageToolCall;

export type Message = {
  role: "user" | "assistant" | "system" | "tool",
  content: string | null,
  name?: string,
  tool_call_id?: string,
  tool_calls?: ChatCompletionMessageToolCall[],
}
