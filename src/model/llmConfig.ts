export type LLMConfig = {
  name: string;

  apiEndPoint: string;
  apiKey: string;

  apiCompatibility: "OpenAI" | "VertexAI";

  modelID: string;

  useTools: boolean;
  useStreaming: boolean;
};
