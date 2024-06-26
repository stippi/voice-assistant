import OpenAI from "openai";

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
}

abstract class BaseAudioPlaybackService implements TextToSpeechService {
    protected options: SpeechOptions;
    protected textBuffer: string = "";
    protected isCurrentlyPlaying: boolean = false;
    protected onCompleteCallback: (() => void) | null = null;

    protected constructor(options: SpeechOptions) {
        this.options = options;
    }

    addText(text: string): void {
        if (this.textBuffer === "") {
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

    protected async processSentences(): Promise<void> {
        const sentences = this.textBuffer.match(/[^.!?]+[.!?]+/g) || [];
        if (sentences.length > 0 && !this.isCurrentlyPlaying) {
            const sentence = sentences.shift() as string;
            this.textBuffer = sentences.join("") + this.textBuffer.slice(sentence.length);

            this.isCurrentlyPlaying = true;
            await this.playSentence(sentence);
            this.isCurrentlyPlaying = false;

            if (this.textBuffer.trim().length > 0) {
                await this.processSentences();
            } else  {
                this.onComplete();
            }
        }
    }

    protected onComplete(): void {
        this.isCurrentlyPlaying = false;
        this.textBuffer = "";
        if (this.onCompleteCallback) {
            this.onCompleteCallback();
            document.dispatchEvent(new CustomEvent("restore-volume"));
        }
    }

    protected abstract playSentence(sentence: string): Promise<void>;
}

export class OpenAIAudioPlaybackService extends BaseAudioPlaybackService {
    private openAi: OpenAI;
    private currentAudio: HTMLAudioElement | null = null;

    constructor(apiKey: string, baseURL: string | undefined, options: SpeechOptions) {
        super(options);
        this.openAi = new OpenAI({
            apiKey: apiKey,
            dangerouslyAllowBrowser: true,
            baseURL: baseURL,
        });
    }

    protected async playSentence(sentence: string): Promise<void> {
        const response = await this.openAi.audio.speech.create({
            model: "tts-1",
            voice: this.options.voice,
            speed: this.options.speed,
            input: sentence,
        });

        const arrayBuffer = await response.arrayBuffer();
        const blob = new Blob([arrayBuffer], { type: "audio/mpeg" });
        const url = URL.createObjectURL(blob);

        return new Promise((resolve) => {
            const audio = new Audio(url);
            this.currentAudio = audio;

            audio.onended = () => {
                URL.revokeObjectURL(url);
                this.currentAudio = null;
                resolve();
            };

            audio.play().catch((error) => {
                console.error("Failed to play audio", error);
                resolve();
            });
        });
    }

    stopPlayback(): void {
        if (this.currentAudio) {
            this.currentAudio.pause();
            this.currentAudio.currentTime = 0;
        }
        this.onComplete();
    }

    setVolume(volume: number): void {
        if (this.currentAudio) {
            this.currentAudio.volume = Math.max(0, Math.min(1, volume));
        }
    }
}

export class WebSpeechAudioPlaybackService extends BaseAudioPlaybackService {
    private synthesis: SpeechSynthesis;
    private currentUtterance: SpeechSynthesisUtterance | null = null;

    constructor(options: SpeechOptions) {
        super(options);
        this.synthesis = window.speechSynthesis;
    }

    protected async playSentence(sentence: string): Promise<void> {
        return new Promise((resolve) => {
            const utterance = new SpeechSynthesisUtterance(sentence);
            utterance.voice = this.synthesis.getVoices().find(voice => voice.name === this.options.voice) || null;
            utterance.rate = this.options.speed;

            utterance.onend = () => {
                this.currentUtterance = null;
                resolve();
            };

            this.currentUtterance = utterance;
            this.synthesis.speak(utterance);
        });
    }

    stopPlayback(): void {
        if (this.currentUtterance) {
            this.synthesis.cancel();
        }
        this.onComplete();
    }

    setVolume(volume: number): void {
        if (this.currentUtterance) {
            this.currentUtterance.volume = Math.max(0, Math.min(1, volume));
        }
    }
}

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
            return new OpenAIAudioPlaybackService(config.apiKey, config.baseURL, config.options);
        case "WebSpeech":
            return new WebSpeechAudioPlaybackService(config.options);
        default:
            throw new Error(`Unsupported audio playback service type: ${config.type}`);
    }
}
