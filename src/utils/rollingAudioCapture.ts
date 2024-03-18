
interface Options {
  maxBuffers: number;
}

export class RollingAudioCapture {
  options: Options;
  buffers: Int16Array[] = [];
  currentIndex = 0;
  
  constructor(options: Options) {
    this.options = options;
  }
  
  appendBuffer(buffer: Int16Array) {
    if (this.buffers.length < this.options.maxBuffers) {
      this.buffers.push(buffer);
    } else {
      this.buffers[this.currentIndex] = buffer;
      this.currentIndex = (this.currentIndex + 1) % this.options.maxBuffers;
    }
  }
  
  countBuffers(): number {
    return this.buffers.length;
  }
  
  getBuffer(index: number): Int16Array {
    const bufferIndex = (this.currentIndex + index) % this.options.maxBuffers;
    return this.buffers[bufferIndex];
  }
}