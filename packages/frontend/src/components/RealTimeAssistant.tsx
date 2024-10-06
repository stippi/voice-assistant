import { useEffect, useRef, useCallback, useState } from "react";
import IconButton from "@mui/material/IconButton";
import MicIcon from "@mui/icons-material/Mic";
import { RealtimeClient } from "@openai/realtime-api-beta";
import { ItemType } from "@openai/realtime-api-beta/dist/lib/client.js";
import { completionsApiKey } from "../config";
import { AudioStreamingService } from "../services/AudioStreamingService";
import { PvEngine } from "@picovoice/web-voice-processor/dist/types/types";
import { WebVoiceProcessor } from "@picovoice/web-voice-processor";
import { createSystemMessageService } from "../services/SystemMessageService";
import { Message } from "@shared/types";
import { Conversation } from "./chat/Conversation";
// import { Conversation } from "./chat/Conversation";
// import { MessageBar } from "./MessageBar";
// import { useVoiceAssistant } from "../hooks";

export default function RealtimeAssistant() {
  const wavStreamPlayerRef = useRef(new AudioStreamingService({ sampleRate: 24000 }));
  const clientRef = useRef(
    new RealtimeClient({
      apiKey: completionsApiKey,
      dangerouslyAllowAPIKeyInBrowser: true,
    }),
  );
  const instructionsRef = useRef(createSystemMessageService());

  const [items, setItems] = useState<ItemType[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [subscribed, setSubscribed] = useState(false);

  /**
   * Connect to conversation:
   * WavRecorder taks speech input, WavStreamPlayer output, client is API client
   */
  const connectConversation = useCallback(async () => {
    const client = clientRef.current;
    const wavStreamPlayer = wavStreamPlayerRef.current;

    // Set state variables
    setIsConnected(true);
    setItems(client.conversation.getItems());

    // Connect to microphone
    //    await wavRecorder.begin();

    // Connect to audio output
    await wavStreamPlayer.connect();

    // Connect to realtime API
    await client.connect();
    client.sendUserMessageContent([
      {
        type: `input_text`,
        text: `Hello!`,
        // text: `For testing purposes, I want you to list ten car brands. Number each item, e.g. "one (or whatever number you are one): the item name".`
      },
    ]);

    if (client.getTurnDetectionType() === "server_vad") {
      //await wavRecorder.record((data) => client.appendInputAudio(data.mono));
    }
  }, []);

  /**
   * Disconnect and reset conversation state
   */
  const disconnectConversation = useCallback(async () => {
    setIsConnected(false);
    setItems([]);

    const client = clientRef.current;
    client.disconnect();

    // const wavRecorder = wavRecorderRef.current;
    // await wavRecorder.end();

    const wavStreamPlayer = wavStreamPlayerRef.current;
    await wavStreamPlayer.interrupt();
  }, []);

  const audioRecorder = useRef<PvEngine>({
    onmessage: async (event: MessageEvent) => {
      const client = clientRef.current;
      switch (event.data.command) {
        case "process":
          if (client.getTurnDetectionType() === "server_vad") {
            client.appendInputAudio(event.data.inputFrame);
          }
          break;
      }
    },
  });

  // Subscribe the audio recorder to the WebVoiceProcessor when connected.
  useEffect(() => {
    if (isConnected && !subscribed) {
      console.log("subscribing to web voice engine");
      WebVoiceProcessor.subscribe(audioRecorder.current);
      setSubscribed(true);
    }
    if (!isConnected && subscribed) {
      console.log("unsubscribing from web voice engine");
      WebVoiceProcessor.unsubscribe(audioRecorder.current);
      setSubscribed(false);
    }
  }, [isConnected, subscribed]);

  // const deleteConversationItem = useCallback(async (id: string) => {
  //   const client = clientRef.current;
  //   client.deleteItem(id);
  // }, []);

  /**
   * Core RealtimeClient and audio capture setup
   * Set all of our instructions, tools, events and more
   */
  useEffect(() => {
    // Get refs
    const wavStreamPlayer = wavStreamPlayerRef.current;
    const client = clientRef.current;
    const instructions = instructionsRef.current;

    // Set instructions
    client.updateSession({
      instructions: instructions.generateSystemMessage(false, "snarky", [], undefined, null),
    });
    // Set transcription, otherwise we don't get user transcriptions back
    client.updateSession({ input_audio_transcription: { model: "whisper-1" } });

    // Add tools
    client.addTool(
      {
        name: "end_conversation",
        description:
          "Ends the current conversation with the user. Use when the user indicates the assistant is no longer needed.",
        parameters: {
          type: "object",
          properties: {},
          required: [],
        },
      },
      async () => {
        disconnectConversation();
        return { ok: true };
      },
    );

    client.on("error", (event: never) => console.error(event));
    client.on("conversation.interrupted", async () => {
      const trackSampleOffset = await wavStreamPlayer.interrupt();
      if (trackSampleOffset?.trackId) {
        const { trackId, offset } = trackSampleOffset;
        client.cancelResponse(trackId, offset);
      }
    });
    client.on("conversation.updated", async ({ item, delta }: any) => {
      const items = client.conversation.getItems();
      if (delta?.audio) {
        wavStreamPlayer.add16BitPCM(delta.audio, item.id);
      }
      // if (item.status === "completed" && item.formatted.audio?.length) {
      //   const wavFile = await WavRecorder.decode(item.formatted.audio, 24000, 24000);
      //   item.formatted.file = wavFile;
      // }
      setItems(items);
    });

    setItems(client.conversation.getItems());

    return () => {
      // cleanup; resets to defaults
      client.reset();
    };
  }, [disconnectConversation]);

  const messages: Message[] = items
    .filter((item) => {
      item.type === "message" && item.role === "assistant";
    })
    .map((item) => {
      return {
        id: item.id,
        role: item.role,
        content: item.object,
      } as Message;
    });
  return (
    <>
      <Conversation chat={messages} deleteMessage={() => {}} />
      <IconButton area-label="start conversation" color={"error"} onClick={connectConversation}>
        <MicIcon />
      </IconButton>
    </>
  );
}
