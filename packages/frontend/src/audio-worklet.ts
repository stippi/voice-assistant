class AudioStreamProcessor extends AudioWorkletProcessor {
  private buffers: Float32Array[] = [];
  private maxBuffers = 3;

  process(_inputs: Float32Array[][], outputs: Float32Array[][]): boolean {
    const output = outputs[0];
    const channelData = output[0];

    if (this.buffers.length > 0) {
      channelData.set(this.buffers[0]);
      this.buffers.shift();
    } else {
      channelData.fill(0);
    }

    return true;
  }

  addBuffer(buffer: Float32Array) {
    this.buffers.push(buffer);
    if (this.buffers.length > this.maxBuffers) {
      this.buffers.shift();
    }
  }
}

registerProcessor("audio-stream-processor", AudioStreamProcessor);
