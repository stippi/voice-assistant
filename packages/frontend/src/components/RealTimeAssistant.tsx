import { useEffect, useRef, useCallback, useState } from "react";
import "./MessageBar.css";
import IconButton from "@mui/material/IconButton";
import MicIcon from "@mui/icons-material/Mic";
import RecordVoiceOverIcon from "@mui/icons-material/RecordVoiceOver";
import { RealtimeClient } from "@openai/realtime-api-beta";
import { ItemType, ToolDefinitionType } from "@openai/realtime-api-beta/dist/lib/client.js";
import { completionsApiKey } from "../config";
import { AudioStreamingService } from "../services/AudioStreamingService";
import { PvEngine } from "@picovoice/web-voice-processor/dist/types/types";
import { WebVoiceProcessor } from "@picovoice/web-voice-processor";
import { createSystemMessageService } from "../services/SystemMessageService";
import { Message } from "@shared/types";
import { Conversation } from "./chat/Conversation";
import { getTools, callFunction } from "../integrations/tools";
import { useAppContext, useSettings, useTimers } from "../hooks";
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
  const appContext = useAppContext();
  const appContextRef = useRef(appContext);
  const { settings } = useSettings();
  const { timers } = useTimers();

  useEffect(() => {
    appContextRef.current = appContext;
  }, [appContext]);

  /**
   * Connect to conversation!
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
    // client.sendUserMessageContent([
    //   {
    //     type: `input_text`,
    //     text: `Hello!`,
    //   },
    // ]);
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

  useEffect(() => {
    const client = clientRef.current;
    const instructions = instructionsRef.current;
    // Set instructions
    client.updateSession({
      instructions: instructions.generateSystemMessage(false, "snarky", timers, appContext.location, null),
    });
  }, [appContext.location, appContext.spotify, timers]);

  /**
   * Core RealtimeClient and audio capture setup
   * Set all of our instructions, tools, events and more
   */
  useEffect(() => {
    // Get refs
    const wavStreamPlayer = wavStreamPlayerRef.current;
    const client = clientRef.current;

    // Set transcription, otherwise we don't get user transcriptions back
    client.updateSession({ input_audio_transcription: { model: "whisper-1" } });
    // Activate server-side turn detection
    client.updateSession({ turn_detection: { type: "server_vad" } });

    // Add tools
    const tools = getTools(settings, appContextRef.current);
    for (const tool of tools) {
      client.addTool(tool.function as ToolDefinitionType, async (args: never) => {
        const result = await callFunction(
          { name: tool.function.name, arguments: JSON.stringify(args) },
          appContextRef.current,
        );
        console.log("function result", result);
        return result;
      });
    }

    client.addTool(
      {
        name: "end_conversation",
        description:
          "Ends the current conversation with the user. Use when the user indicates the assistant is no longer needed.",
        parameters: {},
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
    client.on("conversation.item.completed", async ({ item }: any) => {
      const items = client.conversation.getItems();
      setItems(items);
    });
    client.on("server.input_audio_buffer.speech_started", async () => {
      console.log("user speech started");
    });
    client.on("server.input_audio_buffer.speech_stopped", async () => {
      console.log("user speech started");
    });

    setItems(client.conversation.getItems());

    return () => {
      // cleanup; resets to defaults
      client.reset();
    };
  }, [disconnectConversation, settings]);

  const [messages, setMessages] = useState<Message[]>([]);

  useEffect(() => {
    const convertedItems: Message[] = [];
    for (const item of items) {
      if (item.type === "message" && item.status === "completed") {
        convertedItems.push({
          id: item.id,
          role: item.role,
          content: item.formatted.text || item.formatted.transcript || "",
        });
      }
    }
    setMessages(convertedItems);
  }, [items]);

  return (
    <>
      <Conversation chat={messages} deleteMessage={() => {}} />
      <div className={"fixedBottom idle"}>
        <div className="textContainer">
          <div className="buttonContainer">
            {!isConnected && (
              <IconButton area-label="start conversation" color={"error"} onClick={connectConversation}>
                <MicIcon />
              </IconButton>
            )}
            {isConnected && (
              <IconButton area-label="stop conversation" color={"error"} onClick={disconnectConversation}>
                <RecordVoiceOverIcon />
              </IconButton>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
