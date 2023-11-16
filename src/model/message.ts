export type Message = {
  role: "user" | "assistant" | "system" | "function",
  content: string | null
}