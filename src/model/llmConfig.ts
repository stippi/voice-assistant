export type LLMConfig = {
  id: string;
  name: string;

  apiEndPoint: string;
  apiKey: string;
  projectID?: string; // Google VertexAI
  region?: string; // Google VertexAI

  apiCompatibility: "Anthropic" | "OpenAI" | "VertexAI";

  modelID: string;

  useTools: boolean;
  useStreaming: boolean;
};
