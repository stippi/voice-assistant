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
  private isProcessing: boolean;
  private audioQueue: Float32Array[];
  private unstableTranscription: TranscriptionResult[];

  constructor(modelPath: string, minChunkSize: number = 0.5) {
    this.whisper = new Whisper(modelPath, { offload: 120, gpu: true });
    this.buffer = new TranscriptionBufferManager();
    this.audioBuffer = new Float32Array();
    this.bufferTimeOffset = 0;
    this.minChunkSize = minChunkSize;
    this.sampleRate = 16000;
    this.isProcessing = false;
    this.audioQueue = [];
    this.unstableTranscription = [];

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
    this.audioQueue.push(request.audioChunk);

    if (!this.isProcessing) {
      console.log("Processing queue");
      this.processQueue();
    } else {
      console.log("Queue is already being processed");
    }

    return this.getCurrentTranscription();
  }

  private async processQueue() {
    if (this.isProcessing || this.audioQueue.length === 0) return;

    this.isProcessing = true;

    while (this.audioQueue.length > 0) {
      const chunk = this.audioQueue.shift()!;
      this.audioBuffer = this.concatenateFloat32Arrays(this.audioBuffer, chunk);
    }
    if (this.getBufferDuration() >= this.minChunkSize) {
      console.log("Transcribing buffer");
      await this.transcribeBuffer();
    } else {
      console.log("Buffer is too short, waiting for more audio");
    }

    this.isProcessing = false;
  }

  private async transcribeBuffer() {
    const task = await this.whisper.transcribe<"simple", true>(this.audioBuffer, {
      language: "auto",
      split_on_word: true,
      temperature: 0.2,
      initial_prompt: this.buffer.getPrompt(),
    });

    const result = await task.result;
    const transcription = this.parseWhisperResult(result);
    console.log("transcription", transcription);

    this.buffer.insert(transcription, this.bufferTimeOffset);
    const committed = this.buffer.flush();
    this.unstableTranscription = transcription.slice(committed.length);

    this.trimAudioBuffer();
  }

  private getCurrentTranscription(): TranscriptionResult[] {
    return [...this.buffer.getCommitted(), ...this.unstableTranscription];
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

  async free(): Promise<void> {
    await this.whisper.free();
  }
}
