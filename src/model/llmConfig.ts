export type LLMConfig = {
  id: string;
  name: string;

  apiEndPoint: string;
  apiKey: string;
  projectID?: string;
  location?: string;

  apiCompatibility: "Anthropic" | "OpenAI" | "VertexAI";

  modelID: string;

  useTools: boolean;
  useStreaming: boolean;
};
