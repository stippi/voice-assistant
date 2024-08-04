import { TranscriptionResult, TranscriptionBuffer } from "./types";

export class TranscriptionBufferManager {
  private buffer: TranscriptionBuffer;

  constructor() {
    this.buffer = {
      committed: [],
      buffer: [],
      new: [],
      lastCommittedTime: 0,
      lastCommittedWord: null,
    };
  }

  insert(newTranscription: TranscriptionResult[], offset: number): void {
    this.buffer.new = newTranscription
      .map((t) => ({
        ...t,
        start: t.start + offset,
        end: t.end + offset,
      }))
      .filter((t) => t.start > this.buffer.lastCommittedTime - 0.1);

    // Implement logic to remove duplicates from the beginning of new transcription
    // This part is simplified and may need to be adjusted based on your specific requirements
    if (this.buffer.new.length > 0 && this.buffer.committed.length > 0) {
      const lastCommitted = this.buffer.committed[this.buffer.committed.length - 1];
      while (this.buffer.new.length > 0 && this.buffer.new[0].text === lastCommitted.text) {
        this.buffer.new.shift();
      }
    }
  }

  flush(): TranscriptionResult[] {
    const commit: TranscriptionResult[] = [];
    while (this.buffer.new.length > 0 && this.buffer.buffer.length > 0) {
      if (this.buffer.new[0].text === this.buffer.buffer[0].text) {
        const committed = this.buffer.new.shift()!;
        commit.push(committed);
        this.buffer.lastCommittedWord = committed.text;
        this.buffer.lastCommittedTime = committed.end;
        this.buffer.buffer.shift();
      } else {
        break;
      }
    }
    this.buffer.buffer = this.buffer.new;
    this.buffer.new = [];
    this.buffer.committed.push(...commit);
    return commit;
  }

  getCommitted(): TranscriptionResult[] {
    return this.buffer.committed;
  }

  getBufferTimeOffset(): number {
    return this.buffer.lastCommittedTime;
  }

  getPrompt(): string {
    // Return the last 200 characters of committed text
    return this.buffer.committed
      .map((t) => t.text)
      .join(" ")
      .slice(-200);
  }
}
