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
  setVolume(volume: number): void;
  onPlaybackComplete(callback: () => void): void;
  finalizePlayback(): void;
}

abstract class BaseAudioPlaybackService implements TextToSpeechService {
  protected options: SpeechOptions;
  protected textBuffer: string = "";
  protected lastPlayedOffset: number = 0;
  protected isCurrentlyPlaying: boolean = false;
  protected onCompleteCallback: (() => void) | null = null;
  protected sentenceQueue: string[] = [];
  protected audioQueue: HTMLAudioElement[] = [];
  protected isStreaming: boolean = true;

  protected constructor(options: SpeechOptions) {
    this.options = options;
  }

  addText(text: string): void {
    if (this.textBuffer === "" && this.sentenceQueue.length === 0) {
      document.dispatchEvent(new CustomEvent("reduce-volume"));
    }
    this.textBuffer += text;
    this.processSentences();
  }

  isPlaying(): boolean {
    return this.isCurrentlyPlaying;
  }

  abstract stopPlayback(): void;

  abstract setVolume(volume: number): void;

  onPlaybackComplete(callback: () => void): void {
    this.onCompleteCallback = callback;
  }

  finalizePlayback(): void {
    this.isStreaming = false;
    this.processSentences();
  }

  protected processSentences(): void {
    const sentences = splitIntoSentencesAst(
      this.textBuffer.slice(this.lastPlayedOffset),
    );
    // sentenceCount excludes the last, possibly incomplete sentence while we are still streaming
    const sentenceCount = this.isStreaming
      ? sentences.length - 1
      : sentences.length;
    for (let i = 0; i < sentenceCount; i++) {
      const sentence = sentences[i];
      if (sentence.content.trim()) {
        console.log(`playing segment "${sentence.content}"`);
        this.sentenceQueue.push(sentence.content);
        this.lastPlayedOffset += sentence.offset + sentence.content.length;
        if (!this.isCurrentlyPlaying) {
          this.playNextSentence();
        }
      }
    }
  }

  protected async playNextSentence(): Promise<void> {
    if (this.sentenceQueue.length === 0) {
      if (!this.isStreaming) {
        this.onComplete();
      }
      return;
    }

    const sentence = this.sentenceQueue.shift()!;
    this.isCurrentlyPlaying = true;

    const audio = await this.createAudioElement(sentence);
    this.audioQueue.push(audio);

    if (this.audioQueue.length === 1) {
      this.playAudioQueue();
    }
  }

  protected abstract createAudioElement(
    sentence: string,
  ): Promise<HTMLAudioElement>;

  protected playAudioQueue(): void {
    if (this.audioQueue.length === 0) {
      this.isCurrentlyPlaying = false;
      this.playNextSentence();
      return;
    }

    const audio = this.audioQueue[0];
    audio.onended = () => {
      this.audioQueue.shift();
      this.playAudioQueue();
    };
    audio.play().catch(console.error);
  }

  protected onComplete(): void {
    this.isCurrentlyPlaying = false;
    this.textBuffer = "";
    this.lastPlayedOffset = 0;
    this.sentenceQueue = [];
    this.audioQueue = [];
    this.isStreaming = true;
    if (this.onCompleteCallback) {
      this.onCompleteCallback();
      document.dispatchEvent(new CustomEvent("restore-volume"));
    }
  }
}

export class OpenAIAudioPlaybackService extends BaseAudioPlaybackService {
  private openAi: OpenAI;

  constructor(
    apiKey: string,
    baseURL: string | undefined,
    options: SpeechOptions,
  ) {
    super(options);
    this.openAi = new OpenAI({
      apiKey: apiKey,
      dangerouslyAllowBrowser: true,
      baseURL: baseURL,
    });
  }

  protected async createAudioElement(
    sentence: string,
  ): Promise<HTMLAudioElement> {
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

  stopPlayback(): void {
    this.fadeOutAndStop();
  }

  setVolume(volume: number): void {
    this.audioQueue.forEach((audio) => {
      audio.volume = Math.max(0, Math.min(1, volume));
    });
  }

  private fadeOutAndStop(): void {
    const fadeOutInterval = 50; // ms
    const fadeOutStep = 0.1;

    const fadeOut = (audio: HTMLAudioElement) => {
      const fadeOutTimer = setInterval(() => {
        if (audio.volume > fadeOutStep) {
          audio.volume -= fadeOutStep;
        } else {
          clearInterval(fadeOutTimer);
          audio.pause();
          audio.currentTime = 0;
        }
      }, fadeOutInterval);
    };

    this.audioQueue.forEach(fadeOut);
    this.onComplete();
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
        throw new Error(
          "API key is required for OpenAI audio playback service",
        );
      }
      return new OpenAIAudioPlaybackService(
        config.apiKey,
        config.baseURL,
        config.options,
      );
    // case "WebSpeech":
    //     return new WebSpeechAudioPlaybackService(config.options);
    default:
      throw new Error(
        `Unsupported audio playback service type: ${config.type}`,
      );
  }
}
