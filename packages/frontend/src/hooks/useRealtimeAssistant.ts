import { RealtimeClient } from "@openai/realtime-api-beta";
import { ItemType, ToolDefinitionType } from "@openai/realtime-api-beta/dist/lib/client.js";
import { WebVoiceProcessor } from "@picovoice/web-voice-processor";
import { PvEngine } from "@picovoice/web-voice-processor/dist/types/types";
import { Message } from "@shared/types";
import { useCallback, useEffect, useRef, useState } from "react";
import { completionsApiKey } from "../config";
import { Settings } from "../contexts/SettingsContext";
import { useAppContext, useSettings, useTimers } from "../hooks";
import { callFunction, getTools } from "../integrations/tools";
import { AudioStreamingService } from "../services/AudioStreamingService";
import { createSystemMessageService } from "../services/SystemMessageService";
import { playSound } from "../utils/audio";

type RealtimeEvent = {
  item: ItemType;
  delta?: { audio: Int16Array | Int16Array };
};

type ClientEvent = {
  time: string;
  source: "client" | "server";
  event: {
    type: string;
  };
};

export function useRealtimeAssistant() {
  // Core services
  const audioStreamingServiceRef = useRef(new AudioStreamingService({ sampleRate: 24000 }));
  const clientRef = useRef(
    new RealtimeClient({
      apiKey: completionsApiKey,
      dangerouslyAllowAPIKeyInBrowser: true,
    }),
  );
  const systemMessageServiceRef = useRef(createSystemMessageService());

  // State
  const [items, setItems] = useState<ItemType[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [assistantResponding, setAssistantResponding] = useState(false);
  const [currentlyPlayingTrackId, setCurrentlyPlayingTrackId] = useState<string | null>(null);

  // Refs for state tracking
  const appContext = useAppContext();
  const appContextRef = useRef(appContext);
  const { settings } = useSettings();
  const { timers } = useTimers();
  const autoEndConversationRef = useRef(false);
  const assistantRespondingRef = useRef(false);
  const audioBuffersRef = useRef<Int16Array[]>([]);

  useEffect(() => {
    appContextRef.current = appContext;
  }, [appContext]);

  // Audio recorder setup
  const audioRecorder = useRef<PvEngine>({
    onmessage: async (event: MessageEvent) => {
      const client = clientRef.current;
      switch (event.data.command) {
        case "process":
          if (!client.isConnected()) {
            while (audioBuffersRef.current.length > 100) {
              audioBuffersRef.current.shift();
              console.log("dropped user audio buffer");
            }
            audioBuffersRef.current.push(event.data.inputFrame);
            break;
          }
          if (client.getTurnDetectionType() === "server_vad" && !assistantRespondingRef.current) {
            while (audioBuffersRef.current.length > 0) {
              client.appendInputAudio(audioBuffersRef.current.shift()!);
            }
            client.appendInputAudio(event.data.inputFrame);
          }
          break;
      }
    },
  });

  // Connect to conversation
  const connectConversation = useCallback(async () => {
    console.log("connecting conversation");
    const client = clientRef.current;
    const audioStreamingService = audioStreamingServiceRef.current;

    document.dispatchEvent(new CustomEvent("reduce-volume"));
    playSound("activation");
    setIsConnected(true);

    setItems(client.conversation.getItems());

    await audioStreamingService.connect();

    autoEndConversationRef.current = false;
    assistantRespondingRef.current = false;

    await client.realtime.connect({ model: "gpt-4o-mini-realtime-preview-2024-12-17" });
    client.updateSession({
      voice: "shimmer", //settings.voice // Use the voice setting from user preferences
    });
  }, []); // [settings.voice]);

  // Disconnect conversation
  const disconnectConversation = useCallback(async () => {
    console.log("disconnecting conversation");
    const client = clientRef.current;
    if (client.isConnected()) {
      client.disconnect();
    }

    setIsConnected(false);
    document.dispatchEvent(new CustomEvent("restore-volume"));
  }, []);

  // Audio recorder subscription
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

  // Handle track completion
  useEffect(() => {
    const audioStreamingService = audioStreamingServiceRef.current;

    const handleTrackFinished = (trackId: string) => {
      if (trackId === currentlyPlayingTrackId) {
        setCurrentlyPlayingTrackId(null);
        setAssistantResponding(false);
        assistantRespondingRef.current = false;
      }
      if (autoEndConversationRef.current) {
        autoEndConversationRef.current = false;
        disconnectConversation();
      }
    };

    audioStreamingService.on("trackFinished", handleTrackFinished);
    return () => {
      audioStreamingService.off("trackFinished", handleTrackFinished);
    };
  }, [currentlyPlayingTrackId, disconnectConversation]);

  // Set system instructions
  useEffect(() => {
    const client = clientRef.current;
    let instructions = systemMessageServiceRef.current.generateSystemMessage(
      false,
      settings.personality, // Use the personality setting from user preferences
      timers,
      appContext.location,
      null,
    );
    instructions += `
## Important

Act like a human, but remember that you aren't a human and that you can't do human things in the real world.
Your voice and personality should be warm and engaging, with a lively and playful tone.
If interacting in a non-English language, start by using the standard accent or dialect familiar to the user.
Talk quickly. You should always call a function if you can.

Call the 'end_conversation' function after you have completed your task and when the user no longer requires you.`;
    client.updateSession({ instructions });
  }, [appContext.location, timers, settings.personality]);

  // Setup client
  const setupClient = useCallback(async (client: RealtimeClient, settings: Settings) => {
    const audioStreamingService = audioStreamingServiceRef.current;

    client.updateSession({
      input_audio_transcription: { model: "whisper-1" },
    });

    client.updateSession({
      turn_detection: {
        type: "server_vad",
        threshold: 0.5,
        prefix_padding_ms: 300,
        silence_duration_ms: 200,
      },
    });

    const tools = await getTools(settings);
    for (const tool of tools) {
      console.log(`adding tool "${tool.function.name}"`);
      client.addTool(tool.function as ToolDefinitionType, async (args: never) => {
        const result = await callFunction({ name: tool.function.name, arguments: JSON.stringify(args) });
        return result;
      });
    }

    client.addTool(
      {
        name: "end_conversation",
        description:
          "Ends the current conversation with the user. Use when the task is done or the user indicates the assistant is no longer needed.",
        parameters: {},
      },
      async () => {
        console.log("calling function: end_conversation");
        autoEndConversationRef.current = true;
        return { ok: true };
      },
    );

    client.on("error", (event: never) => console.error(event));

    client.on("conversation.interrupted", async () => {
      const trackSampleOffset = await audioStreamingService.interrupt();
      if (trackSampleOffset?.trackId) {
        const { trackId, offset } = trackSampleOffset;
        client.cancelResponse(trackId, offset);
      }
    });

    client.on("conversation.updated", async ({ item, delta }: RealtimeEvent) => {
      const items = client.conversation.getItems();
      if (delta?.audio) {
        audioStreamingService.add16BitPCM(delta.audio, item.id);
        setCurrentlyPlayingTrackId(item.id);
      }
      setItems(items);
    });

    client.on("conversation.item.completed", async () => {
      const items = client.conversation.getItems();
      setItems(items);
    });

    client.on("realtime.event", async (event: ClientEvent) => {
      const { type } = event.event;
      switch (type) {
        case "response.created":
          setAssistantResponding(true);
          assistantRespondingRef.current = true;
          break;
        case "response.done":
          break;
      }
    });
  }, []);

  // Initialize client
  useEffect(() => {
    const client = clientRef.current;
    setupClient(client, settings).then(() => {
      setItems(client.conversation.getItems());
    });

    return () => {
      if (client.isConnected()) {
        client.disconnect();
      }
      client.reset();
    };
  }, [settings, setupClient]);

  // Convert items to messages
  useEffect(() => {
    const convertedItems: Message[] = [];
    for (const item of items) {
      if (item.type === "message") {
        convertedItems.push({
          id: item.id,
          role: item.role,
          content: item.formatted.text || item.formatted.transcript || "",
        });
      }
      if (item.type === "function_call" && item.status === "completed") {
        convertedItems.push({
          id: item.id,
          role: "assistant",
          content: null,
          tool_calls: [
            {
              id: item.call_id,
              type: "function",
              function: {
                name: item.name,
                arguments: item.arguments,
              },
            },
          ],
        });
      }
    }
    setMessages(convertedItems);
  }, [items]);

  // Handle wake word detection
  const handleWakeWord = useCallback(() => {
    const client = clientRef.current;
    const audioStreamingService = audioStreamingServiceRef.current;

    console.log("wake word detected");
    if (client.isConnected()) {
      // Interrupt assistant
      audioStreamingService.interrupt();
      client.cancelResponse("");
    } else {
      connectConversation();
    }
  }, [connectConversation]);

  return {
    messages,
    isConnected,
    assistantResponding,
    handleWakeWord,
    connectConversation,
    disconnectConversation,
    audioStreamingService: audioStreamingServiceRef.current,
  };
}
