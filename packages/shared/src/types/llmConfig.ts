export type LLMConfig = {
  id: string;
  name: string;

  apiEndPoint: string;
  apiKey: string;
  projectID?: string; // Google VertexAI
  region?: string; // Google VertexAI

  apiCompatibility: "Anthropic" | "OpenAI" | "VertexAI" | "Ollama";

  modelID: string;

  useTools: boolean;
};
