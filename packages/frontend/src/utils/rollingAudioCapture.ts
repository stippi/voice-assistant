interface Options {
  maxBuffers: number;
}

export class RollingAudioCapture {
  private options: Options;
  private buffers: Int16Array[] = [];
  private currentIndex = 0;
  private transcribe = false;

  constructor(options: Options) {
    this.options = options || {};
    if (!this.options.maxBuffers) {
      this.options.maxBuffers = 10;
    }
  }

  setTranscribe(transcribe: boolean) {
    this.transcribe = transcribe;
  }

  appendBuffer(buffer: Int16Array) {
    if (this.buffers.length < this.options.maxBuffers) {
      this.buffers.push(buffer);
    } else {
      this.buffers[this.currentIndex] = buffer;
      this.currentIndex = (this.currentIndex + 1) % this.options.maxBuffers;
      if (this.currentIndex === 0 && this.transcribe) {
        fetch("http://localhost:3000/api/transcribe", {
          method: "POST",
          headers: {
            "Content-Type": "audio/wav",
          },
          body: this.convertInt16BuffersToFloat32Blob(this.buffers),
        })
          .then((response) => {
            if (response.ok) {
              return response.json();
            }
            throw new Error("Failed to transcribe audio");
          })
          .then((data) => {
            console.log("Transcription:", data.transcription);
          })
          .catch((error) => {
            console.error("Error during transcription:", error);
          });
      }
    }
  }

  private convertInt16BuffersToFloat32Blob(int16Buffers: Int16Array[]) {
    const totalLength = int16Buffers.reduce((sum, buffer) => sum + buffer.length, 0);
    const float32Array = new Float32Array(totalLength);
    console.log("Total length:", totalLength);

    let offset = 0;
    for (const int16Buffer of int16Buffers) {
      for (let i = 0; i < int16Buffer.length; i++) {
        // convert and normalize
        float32Array[offset + i] = int16Buffer[i] / 32768;
      }
      offset += int16Buffer.length;
    }

    return new Blob([float32Array], { type: "audio/wav" });
  }

  countBuffers(): number {
    return this.buffers.length;
  }

  getBuffer(index: number): Int16Array {
    const bufferIndex = (this.currentIndex + index) % this.options.maxBuffers;
    return this.buffers[bufferIndex];
  }
}
