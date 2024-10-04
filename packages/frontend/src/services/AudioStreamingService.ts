export class AudioStreamingService {
  private audioContext: AudioContext | null = null;
  private streamNode: AudioWorkletNode | null = null;

  async initialize() {
    this.audioContext = new AudioContext();
    await this.audioContext.audioWorklet.addModule("/src/audio-worklet.js");
    this.streamNode = new AudioWorkletNode(this.audioContext, "audio-stream-processor");
    this.streamNode.connect(this.audioContext.destination);
  }

  pushAudioBuffer(buffer: Float32Array) {
    if (this.streamNode) {
      this.streamNode.port.postMessage(buffer);
    }
  }

  start() {
    this.audioContext?.resume();
  }

  stop() {
    this.audioContext?.suspend();
  }

  close() {
    this.audioContext?.close();
    this.audioContext = null;
    this.streamNode = null;
  }
}
