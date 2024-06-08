export interface MessageStats {
  timestamp: string;
  modelId?: string;
  timeToFirstChunk?: number;
  tokensPerSecond?: number;
  timeToAudioPlayback?: number;
}
