export interface TranscriptionResult {
  text: string;
  start: number;
  end: number;
}

export interface TranscriptionBuffer {
  committed: TranscriptionResult[];
  buffer: TranscriptionResult[];
  new: TranscriptionResult[];
  lastCommittedTime: number;
  lastCommittedWord: string | null;
}

export interface AudioChunkRequest {
  audioChunk: Float32Array;
  isFirst?: boolean;
  isLast?: boolean;
  language?: string;
}
