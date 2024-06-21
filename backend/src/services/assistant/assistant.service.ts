import {completionsApiUrl, modelName} from "../../config";
import {Message} from "../../model/message";
import OpenAI from "openai";
import {UserInfo} from "../../model/userInfo";
import {Settings} from "../../model/settings";
import generateSystemMessage from "./generateSystemMessage";



export class AssistantService {

    private openAi: OpenAI;

    constructor() {
        const completionsApiKey = process.env.OPENAI_API_KEY;

        if (!completionsApiKey) {
            throw new Error("OPENAI_API_KEY is not set");
        }

        this.openAi = new OpenAI({
            apiKey: completionsApiKey,
            baseURL: completionsApiUrl
        });
    }


    async generateResponse(messages: Message[], user: UserInfo, settings: Settings, isAudioConversation: boolean): Promise<Message[]> {

        const systemMessage = generateSystemMessage(isAudioConversation, settings.personality, user.timers, user.location);

        const completionResponse = await this.openAi.chat.completions.create({
            messages: [systemMessage, ...messages],
            model: modelName,
        });

        const content = completionResponse!.choices[0].message.content

        if (!content) {
            throw new Error("No content in completion response");
        }

        const assistantMessage: Message = {
            role: "assistant",
            content: content,
            name: "Assistant"
        }
        return [assistantMessage];
    }

    // async generateResponseAsStream(messages: Message[], user: UserInfo, settings: Settings, isAudioConversation: boolean)  {
    //     const systemMessage = generateSystemMessage(isAudioConversation, settings.personality, user.timers, user.location);
    //
    //     const stream = this.openAi.beta.chat.completions.stream({
    //         messages: [systemMessage, ...messages],
    //         model: modelName,
    //         stream: true,
    //     });
    //
    //
    // }

}