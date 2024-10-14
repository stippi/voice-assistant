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

type WriteBuffer = {
  buffer: Float32Array;
  trackId: string | null;
};

class AudioStreamProcessor extends AudioWorkletProcessor {
  private hasStarted = false;
  private hasInterrupted = false;
  private outputBuffers: WriteBuffer[] = [];
  private bufferLength = 128;
  private write: WriteBuffer;
  private writeOffset = 0;
  private trackSampleOffsets: Record<string, number> = {};
  private currentTrackId: string | null = null;

  constructor() {
    super();
    this.write = { buffer: new Float32Array(this.bufferLength), trackId: null };
    this.port.onmessage = (event) => {
      if (event.data) {
        const payload = event.data;
        if (payload.event === "write") {
          const int16Array = payload.buffer;
          const float32Array = new Float32Array(int16Array.length);
          for (let i = 0; i < int16Array.length; i++) {
            float32Array[i] = int16Array[i] / 0x8000; // Convert Int16 to Float32
          }
          this.writeData(float32Array, payload.trackId);
        } else if (payload.event === "offset" || payload.event === "interrupt") {
          const requestId = payload.requestId;
          const trackId = this.write.trackId;
          const offset = trackId ? this.trackSampleOffsets[trackId] || 0 : 0;
          this.port.postMessage({
            event: "offset",
            requestId,
            trackId,
            offset,
          });
          if (payload.event === "interrupt") {
            this.hasInterrupted = true;
          }
        } else {
          throw new Error(`Unhandled event "${payload.event}"`);
        }
      }
    };
  }

  writeData(float32Array: Float32Array, trackId = null) {
    let { buffer } = this.write;
    let offset = this.writeOffset;
    for (let i = 0; i < float32Array.length; i++) {
      buffer[offset++] = float32Array[i];
      if (offset >= buffer.length) {
        this.outputBuffers.push(this.write);
        this.write = { buffer: new Float32Array(this.bufferLength), trackId };
        buffer = this.write.buffer;
        offset = 0;
      }
    }
    this.writeOffset = offset;
    return true;
  }

  private sendTrackFinished(trackId: string | null) {
    if (trackId !== null) {
      this.port.postMessage({
        event: "track-finished",
        trackId: trackId,
      });
    }
  }

  process(_inputs: Float32Array[][], outputs: Float32Array[][]): boolean {
    const output = outputs[0];
    const outputChannelData = output[0];
    const outputBuffers = this.outputBuffers;

    if (this.hasInterrupted) {
      this.sendTrackFinished(this.currentTrackId);
      this.port.postMessage({ event: "stop" });
      return false;
    } else if (outputBuffers.length) {
      this.hasStarted = true;
      const { buffer, trackId } = outputBuffers.shift()!;

      // Check if the track has changed
      if (trackId !== this.currentTrackId) {
        this.sendTrackFinished(this.currentTrackId);
        this.currentTrackId = trackId;
      }

      if (trackId) {
        this.trackSampleOffsets[trackId] = (this.trackSampleOffsets[trackId] || 0) + buffer.length;
      }

      for (let i = 0; i < outputChannelData.length; i++) {
        outputChannelData[i] = buffer[i] || 0;
      }
      return true;
    } else if (this.hasStarted) {
      this.sendTrackFinished(this.currentTrackId);
      this.currentTrackId = null;
      this.port.postMessage({ event: "stop" });
      return false;
    } else {
      return true;
    }
  }
}

registerProcessor("audio-stream-processor", AudioStreamProcessor);
