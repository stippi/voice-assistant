import OpenAI from "openai";
import { splitIntoSentencesAst } from "../utils/textUtils";

export interface SpeechOptions {
  voice: "alloy" | "echo" | "fable" | "onyx" | "nova" | "shimmer";
  speed: number;
}

export interface TextToSpeechService {
  addText(text: string): void;
  isPlaying(): boolean;
  stopPlayback(): void;
  onPlaybackComplete(callback: () => void): void;
  finalizePlayback(): void;
}

abstract class BaseTextToSpeechService implements TextToSpeechService {
  protected options: SpeechOptions;

  protected textBuffer: string = "";
  protected lastPlayedOffset: number = 0;
  protected onCompleteCallback: (() => void) | null = null;
  protected sentenceQueue: string[] = [];
  protected isExpectingMoreText: boolean = true;

  protected audioEndedPromise: Promise<unknown> | null = null;
  protected currentAudio: HTMLAudioElement | null = null;
  protected firstAudio = true;
  protected isAudioPlaying = false;
  protected cancelled = false;

  constructor(options: SpeechOptions) {
    this.options = options;
  }

  addText(text: string): void {
    this.isExpectingMoreText = true;
    this.textBuffer += text;
    this.processSentences();
  }

  isPlaying(): boolean {
    return this.isAudioPlaying;
  }

  onPlaybackComplete(callback: () => void): void {
    this.onCompleteCallback = callback;
  }

  finalizePlayback(): void {
    this.isExpectingMoreText = false;
    this.processSentences();
  }

  async stopPlayback(): Promise<void> {
    this.cancelled = true;
    this.isExpectingMoreText = false;
    await this.fadeOutAudio();
    this.onComplete();
  }

  protected processSentences(): void {
    const sentences = splitIntoSentencesAst(this.textBuffer.slice(this.lastPlayedOffset));
    // sentenceCount excludes the last, possibly incomplete sentence while we are still streaming
    const sentenceCount = this.isExpectingMoreText ? sentences.length - 1 : sentences.length;
    for (let i = 0; i < sentenceCount; i++) {
      const sentence = sentences[i];
      if (sentence.content.trim()) {
        console.log(`playing segment "${sentence.content}"`);
        this.sentenceQueue.push(sentence.content);
        this.lastPlayedOffset += sentence.offset + sentence.content.length;
        if (!this.isAudioPlaying) {
          this.isAudioPlaying = true;
          this.playSentencesFromQueue().catch((error) => {
            console.error("Failed to play sentences", error);
          });
        }
      }
    }
  }

  protected async playSentencesFromQueue() {
    while (this.sentenceQueue.length > 0) {
      const sentence = this.sentenceQueue.shift();
      if (sentence) {
        await this.playSentence(sentence);
      }
    }
    if (!this.isExpectingMoreText) {
      this.onComplete();
    }
    this.isAudioPlaying = false;
  }

  protected async playSentence(sentence: string) {
    if (this.cancelled) {
      return;
    }

    const audio = await this.createAudioElement(sentence);

    if (this.audioEndedPromise) {
      // Wait for the previous audio to finish playing before starting the next one
      await this.audioEndedPromise;
      if (this.cancelled) {
        return;
      }
    }

    if (this.firstAudio) {
      this.firstAudio = false;
      document.dispatchEvent(new CustomEvent("reduce-volume"));
    }

    this.currentAudio = audio;
    this.audioEndedPromise = new Promise<void>((resolve) => {
      audio.onended = () => {
        URL.revokeObjectURL(audio.src);
        this.currentAudio = null;
        resolve();
      };
    });

    audio.play().catch((error) => {
      this.currentAudio = null;
      console.error("Failed to play audio", error);
    });
  }

  protected abstract createAudioElement(sentence: string): Promise<HTMLAudioElement>;

  protected onComplete(): void {
    this.isAudioPlaying = false;
    this.firstAudio = true;
    this.textBuffer = "";
    this.lastPlayedOffset = 0;
    this.sentenceQueue = [];
    this.currentAudio = null;
    this.audioEndedPromise = null;
    this.cancelled = false;
    if (this.onCompleteCallback) {
      this.onCompleteCallback();
      document.dispatchEvent(new CustomEvent("restore-volume"));
    }
  }

  protected async fadeOutAudio(): Promise<void> {
    if (this.currentAudio === null) {
      return;
    }

    return new Promise<void>((resolve) => {
      let volume = 1.0;
      const fadeInterval = window.setInterval(() => {
        if (this.currentAudio && volume > 0.2) {
          volume -= 0.2;
          this.currentAudio.volume = volume;
        } else {
          clearInterval(fadeInterval);
          if (this.currentAudio) {
            this.currentAudio.pause();
            this.currentAudio.currentTime = 0;
            if (this.currentAudio.onended) {
              // @ts-expect-error - The onended event listener which we registered above, ignores the event.
              this.currentAudio.onended();
            }
          }
          resolve();
        }
      }, 100);
    });
  }
}

export class OpenAITextToSpeechService extends BaseTextToSpeechService {
  private openAi: OpenAI;

  constructor(apiKey: string, baseURL: string | undefined, options: SpeechOptions) {
    super(options);
    this.openAi = new OpenAI({
      apiKey: apiKey,
      dangerouslyAllowBrowser: true,
      baseURL: baseURL,
    });
  }

  protected async createAudioElement(sentence: string): Promise<HTMLAudioElement> {
    console.log(`fetching audio for "${sentence}"`);
    const response = await this.openAi.audio.speech.create({
      model: "tts-1",
      voice: this.options.voice,
      speed: this.options.speed,
      input: sentence,
    });

    const arrayBuffer = await response.arrayBuffer();
    const blob = new Blob([arrayBuffer], { type: "audio/mpeg" });
    const url = URL.createObjectURL(blob);

    const audio = new Audio(url);
    audio.onended = () => URL.revokeObjectURL(url);
    return audio;
  }
}

// export class WebSpeechAudioPlaybackService extends BaseAudioPlaybackService {
//     private synthesis: SpeechSynthesis;
//     private currentUtterance: SpeechSynthesisUtterance | null = null;

//     constructor(options: SpeechOptions) {
//         super(options);
//         this.synthesis = window.speechSynthesis;
//     }

//     protected async playSentence(sentence: string): Promise<void> {
//         return new Promise((resolve) => {
//             const utterance = new SpeechSynthesisUtterance(sentence);
//             utterance.voice = this.synthesis.getVoices().find(voice => voice.name === this.options.voice) || null;
//             utterance.rate = this.options.speed;

//             utterance.onend = () => {
//                 this.currentUtterance = null;
//                 resolve();
//             };

//             this.currentUtterance = utterance;
//             this.synthesis.speak(utterance);
//         });
//     }

//     stopPlayback(): void {
//         if (this.currentUtterance) {
//             this.synthesis.cancel();
//         }
//         this.onComplete();
//     }

//     setVolume(volume: number): void {
//         if (this.currentUtterance) {
//             this.currentUtterance.volume = Math.max(0, Math.min(1, volume));
//         }
//     }
// }

export function createTextToSpeechService(config: {
  type: "OpenAI" | "WebSpeech";
  apiKey?: string;
  baseURL?: string;
  options: SpeechOptions;
}): TextToSpeechService {
  switch (config.type) {
    case "OpenAI":
      if (!config.apiKey) {
        throw new Error("API key is required for OpenAI audio playback service");
      }
      return new OpenAITextToSpeechService(config.apiKey, config.baseURL, config.options);
    // case "WebSpeech":
    //     return new WebSpeechAudioPlaybackService(config.options);
    default:
      throw new Error(`Unsupported audio playback service type: ${config.type}`);
  }
}
