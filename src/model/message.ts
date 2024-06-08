import OpenAI from "openai";
import ChatCompletionMessageToolCall = OpenAI.ChatCompletionMessageToolCall;
import { MessageStats } from "./messageStats";

export type Message = {
  role: "user" | "assistant" | "system" | "tool";
  content: string | null;
  stats?: MessageStats;
  name?: string;
  tool_call_id?: string;
  tool_calls?: ChatCompletionMessageToolCall[];
};
