import { TranscribeSimpleResult, Whisper } from "smart-whisper";
import { TranscriptionBufferManager } from "./transcriptionBuffer";
import { TranscriptionResult, AudioChunkRequest } from "./types";

export class WhisperTranscriber {
  private whisper: Whisper;
  private buffer: TranscriptionBufferManager;
  private audioBuffer: Float32Array;
  private bufferTimeOffset: number;
  private minChunkSize: number;
  private sampleRate: number;

  constructor(modelPath: string, minChunkSize: number = 1.0) {
    this.whisper = new Whisper(modelPath, { gpu: true });
    this.buffer = new TranscriptionBufferManager();
    this.audioBuffer = new Float32Array();
    this.bufferTimeOffset = 0;
    this.minChunkSize = minChunkSize;
    this.sampleRate = 16000; // Whisper expects 16kHz audio
    this.whisper
      .load()
      .then((model) => {
        console.log("Model loaded:", model);
      })
      .catch((error) => {
        console.error("Failed to load model:", error);
      });
  }

  async processChunk(request: AudioChunkRequest): Promise<TranscriptionResult[]> {
    this.audioBuffer = this.concatenateFloat32Arrays(this.audioBuffer, request.audioChunk);

    if (this.getBufferDuration() < this.minChunkSize && !request.isLast) {
      // Not enough audio data to process yet
      return this.buffer.getCommitted();
    }

    const task = await this.whisper.transcribe<"simple", true>(this.audioBuffer, {
      language: request.language || "auto",
      initial_prompt: this.buffer.getPrompt(),
    });

    const result = await task.result;
    const transcription = this.parseWhisperResult(result);

    this.buffer.insert(transcription, this.bufferTimeOffset);
    const committed = this.buffer.flush();

    this.trimAudioBuffer();

    if (request.isLast) {
      const finalTranscription = await this.finishTranscription(request.language);
      committed.push(...finalTranscription);
    }

    return this.buffer.getCommitted();
  }

  private parseWhisperResult(result: TranscribeSimpleResult[]): TranscriptionResult[] {
    // Parse the result from smart-whisper into TranscriptionResult format
    return result.map((result) => ({
      text: result.text,
      start: result.from + this.bufferTimeOffset,
      end: result.to + this.bufferTimeOffset,
    }));
  }

  private concatenateFloat32Arrays(a: Float32Array, b: Float32Array): Float32Array {
    const result = new Float32Array(a.length + b.length);
    result.set(a, 0);
    result.set(b, a.length);
    return result;
  }

  private getBufferDuration(): number {
    return this.audioBuffer.length / this.sampleRate;
  }

  private trimAudioBuffer() {
    const lastCommittedTime = this.buffer.getBufferTimeOffset();
    const samplesToKeep = Math.max(0, this.audioBuffer.length - Math.floor(lastCommittedTime * this.sampleRate));
    this.audioBuffer = this.audioBuffer.slice(-samplesToKeep);
    this.bufferTimeOffset = lastCommittedTime;
  }

  private async finishTranscription(language?: string): Promise<TranscriptionResult[]> {
    // Process any remaining audio in the buffer
    const task = await this.whisper.transcribe<"simple", true>(this.audioBuffer, {
      language: language || "auto",
      initial_prompt: this.buffer.getPrompt(),
    });
    const result = await task.result;
    return this.parseWhisperResult(result);
  }

  async free(): Promise<void> {
    await this.whisper.free();
  }
}
