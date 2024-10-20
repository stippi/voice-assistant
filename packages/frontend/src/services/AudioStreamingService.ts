/*
MIT License

Copyright (c) 2024 OpenAI

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

import { AudioAnalysisService, AnalysisType } from "./AudioAnalysisService";

type TrackSampleOffset = {
  trackId: string | null;
  offset: number;
  currentTime: number;
};

type EventMap = {
  trackFinished: string;
};

type EventKey = keyof EventMap;
type EventCallback<T extends EventKey> = (arg: EventMap[T]) => void;

export class AudioStreamingService {
  private sampleRate: number;
  private context: AudioContext | null;
  private stream: AudioWorkletNode | null;
  private analyser: AnalyserNode | null;
  private trackSampleOffsets: Record<string, TrackSampleOffset>;
  private interruptedTrackIds: Record<string, boolean>;
  private eventListeners: { [K in EventKey]?: EventCallback<K>[] };

  constructor({ sampleRate = 44100 } = {}) {
    this.sampleRate = sampleRate;
    this.context = null;
    this.stream = null;
    this.analyser = null;
    this.trackSampleOffsets = {};
    this.interruptedTrackIds = {};
    this.eventListeners = {};
  }

  /**
   * Connects the audio context and enables output to speakers
   */
  async connect(): Promise<void> {
    this.context = new AudioContext({ sampleRate: this.sampleRate });
    if (this.context.state === "suspended") {
      await this.context.resume();
    }
    try {
      await this.context.audioWorklet.addModule("/src/audio-worklet.ts");
    } catch (e) {
      console.error(e);
      throw new Error(`Could not add audioWorklet module: "/src/audio-worklet.ts"`);
    }
    this.analyser = this.context.createAnalyser();
    this.analyser.fftSize = 8192;
    this.analyser.smoothingTimeConstant = 0.1;
  }

  isConnected(): boolean {
    return this.analyser != null;
  }

  /**
   * Gets the current frequency domain data from the playing track
   */
  getFrequencies(analysisType: AnalysisType = "frequency", minDecibels = -100, maxDecibels = -30) {
    if (!this.analyser) {
      throw new Error("Not connected, please call .connect() first");
    }
    return AudioAnalysisService.getFrequencies(
      this.analyser,
      this.sampleRate,
      null,
      analysisType,
      minDecibels,
      maxDecibels,
    );
  }

  /**
   * Starts audio streaming
   */
  private start() {
    if (!this.context || !this.analyser) {
      throw new Error("Must call connect() before trying to start streaming");
    }
    const streamNode = new AudioWorkletNode(this.context, "audio-stream-processor");
    streamNode.connect(this.context.destination);
    streamNode.port.onmessage = (e) => {
      const { event } = e.data;
      if (event === "stop") {
        streamNode.disconnect();
        this.stream = null;
      } else if (event === "offset") {
        const { requestId, trackId, offset } = e.data;
        const currentTime = offset / this.sampleRate;
        this.trackSampleOffsets[requestId] = { trackId, offset, currentTime };
      } else if (event === "track-finished") {
        const { trackId } = e.data;
        this.emit("trackFinished", trackId);
      }
    };
    this.analyser.disconnect();
    streamNode.connect(this.analyser);
    this.stream = streamNode;
    return true;
  }

  /**
   * Adds 16BitPCM data to the currently playing audio stream
   * You can add chunks beyond the current play point and they will be queued for play
   */
  add16BitPCM(arrayBuffer: ArrayBuffer | Int16Array, trackId = "default"): Int16Array | void {
    if (typeof trackId !== "string") {
      throw new Error(`trackId must be a string`);
    } else if (this.interruptedTrackIds[trackId]) {
      return;
    }
    if (!this.stream) {
      this.start();
    }
    let buffer;
    if (arrayBuffer instanceof Int16Array) {
      buffer = arrayBuffer;
    } else if (arrayBuffer instanceof ArrayBuffer) {
      buffer = new Int16Array(arrayBuffer);
    } else {
      throw new Error(`argument must be Int16Array or ArrayBuffer`);
    }
    this.stream!.port.postMessage({ event: "write", buffer, trackId });
    return buffer;
  }

  /**
   * Gets the offset (sample count) of the currently playing stream
   */
  async getTrackSampleOffset(interrupt = false): Promise<TrackSampleOffset | null> {
    if (!this.stream) {
      return null;
    }
    const requestId = crypto.randomUUID();
    this.stream.port.postMessage({
      event: interrupt ? "interrupt" : "offset",
      requestId,
    });
    let trackSampleOffset;
    while (!trackSampleOffset) {
      trackSampleOffset = this.trackSampleOffsets[requestId];
      await new Promise<void>((resolve) => setTimeout(() => resolve(), 1));
    }
    const { trackId } = trackSampleOffset;
    if (interrupt && trackId) {
      this.interruptedTrackIds[trackId] = true;
    }
    return trackSampleOffset;
  }

  /**
   * Strips the current stream and returns the sample offset of the audio
   */
  async interrupt(): Promise<TrackSampleOffset | null> {
    return this.getTrackSampleOffset(true);
  }

  getAudioContext(): AudioContext | null {
    return this.context;
  }

  on<T extends EventKey>(eventName: T, callback: EventCallback<T>): void {
    if (!this.eventListeners[eventName]) {
      this.eventListeners[eventName] = [];
    }
    (this.eventListeners[eventName] as EventCallback<T>[]).push(callback);
  }

  off<T extends EventKey>(eventName: T, callback: EventCallback<T>): void {
    const listeners = this.eventListeners[eventName];
    if (!listeners) return;
    const index = listeners.indexOf(callback as EventCallback<EventKey>);
    if (index !== -1) {
      listeners.splice(index, 1);
    }
  }

  private emit<T extends EventKey>(eventName: T, arg: EventMap[T]): void {
    const listeners = this.eventListeners[eventName];
    if (!listeners) return;
    listeners.forEach((callback) => (callback as EventCallback<T>)(arg));
  }
}
