export type LLMConfig = {
  id: string;
  name: string;

  apiEndPoint: string;
  apiKey: string;

  apiCompatibility: "OpenAI" | "VertexAI";

  modelID: string;

  useTools: boolean;
  useStreaming: boolean;
};
