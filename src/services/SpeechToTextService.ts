import OpenAI, { toFile } from "openai";

export interface TranscriptionOptions {
  language: string;
}

export interface SpeechToTextService {
  transcribe(audioBlob: Blob, fileExtension: string): Promise<string>;
}

abstract class BaseSpeechToTextService implements SpeechToTextService {
  protected transcriptionLanguage: string = "";

  protected constructor(options: TranscriptionOptions) {
    this.transcriptionLanguage = options?.language || "";
  }

  abstract transcribe(audioBlob: Blob, fileExtension: string): Promise<string>;
}

export class OpenAISpeechToTextService extends BaseSpeechToTextService {
  private openAi: OpenAI;
  private model: string | undefined;

  constructor(apiKey: string, baseURL: string | undefined, model: string | undefined, options: TranscriptionOptions) {
    super(options);
    this.openAi = new OpenAI({
      apiKey: apiKey,
      dangerouslyAllowBrowser: true,
      baseURL: baseURL,
    });
    this.model = model;
  }

  async transcribe(audioBlob: Blob, fileExtension: string): Promise<string> {
    const transcription = await this.openAi.audio.transcriptions.create({
      model: this.model || "whisper-1",
      language: this.transcriptionLanguage.substring(0, 2),
      file: await toFile(audioBlob, `audio.${fileExtension}`, {
        type: audioBlob.type,
      }),
    });
    return transcription.text;
  }
}

export function createSpeechToTextService(config: {
  type: "OpenAI";
  apiKey?: string;
  baseURL?: string;
  model?: string;
  options: TranscriptionOptions;
}): SpeechToTextService {
  switch (config.type) {
    case "OpenAI":
      if (!config.apiKey) {
        throw new Error("API key is required for OpenAI STT service");
      }
      return new OpenAISpeechToTextService(config.apiKey, config.baseURL, config.model, config.options);
    default:
      throw new Error(`Unsupported speech to text service type: ${config.type}`);
  }
}
