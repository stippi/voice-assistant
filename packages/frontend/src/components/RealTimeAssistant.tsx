import { useEffect, useRef, useCallback, useState } from "react";
import "./MessageBar.css";
import IconButton from "@mui/material/IconButton";
import MicIcon from "@mui/icons-material/Mic";
import RecordVoiceOverIcon from "@mui/icons-material/RecordVoiceOver";
import { RiRobot2Fill } from "react-icons/ri";
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
import { Settings } from "../contexts/SettingsContext";
// import { Conversation } from "./chat/Conversation";
// import { MessageBar } from "./MessageBar";
// import { useVoiceAssistant } from "../hooks";

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

export default function RealtimeAssistant() {
  const wavStreamPlayerRef = useRef(new AudioStreamingService({ sampleRate: 24000 }));
  const clientRef = useRef(
    new RealtimeClient({
      apiKey: completionsApiKey,
      dangerouslyAllowAPIKeyInBrowser: true,
      //p      debug: true,
    }),
  );
  const systemMessageServiceRef = useRef(createSystemMessageService());

  const [items, setItems] = useState<ItemType[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const appContext = useAppContext();
  const appContextRef = useRef(appContext);
  const { settings } = useSettings();
  const { timers } = useTimers();
  const [assistantResponding, setAssistantResponding] = useState(false);
  const autoEndConversationRef = useRef(false);
  const assistantRespondingRef = useRef(false);

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
    setItems(client.conversation.getItems());

    // Connect to microphone
    //    await wavRecorder.begin();

    // Connect to audio output
    await wavStreamPlayer.connect();

    autoEndConversationRef.current = false;
    assistantRespondingRef.current = false;

    // Connect to realtime API
    await client.connect();
    setIsConnected(true);
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
          if (client.getTurnDetectionType() === "server_vad" && !assistantRespondingRef.current) {
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

  const [currentlyPlayingTrackId, setCurrentlyPlayingTrackId] = useState<string | null>(null);

  useEffect(() => {
    const wavStreamPlayer = wavStreamPlayerRef.current;

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

    wavStreamPlayer.on("trackFinished", handleTrackFinished);

    return () => {
      wavStreamPlayer.off("trackFinished", handleTrackFinished);
    };
  }, [currentlyPlayingTrackId, disconnectConversation]);

  // const deleteConversationItem = useCallback(async (id: string) => {
  //   const client = clientRef.current;
  //   client.deleteItem(id);
  // }, []);

  /* Set instructions */
  useEffect(() => {
    const client = clientRef.current;
    let instructions = systemMessageServiceRef.current.generateSystemMessage(
      false,
      "snarky",
      timers,
      appContext.location,
      null,
    );
    instructions += `
## Important

Make sure to use the 'end_conversation' tool after you have completed your task and when the user no longer requires you.`;
    client.updateSession({ instructions });
  }, [appContext.location, timers]);

  /**
   * Core RealtimeClient and audio capture setup
   * Set all of our instructions, tools, events and more
   */
  const setupClient = useCallback(async (client: RealtimeClient, settings: Settings) => {
    // Get refs
    const wavStreamPlayer = wavStreamPlayerRef.current;

    // Set transcription, otherwise we don't get user transcriptions back
    client.updateSession({
      input_audio_transcription: { model: "whisper-1" },
    });
    // Activate server-side turn detection
    client.updateSession({
      turn_detection: {
        type: "server_vad",
        threshold: 0.5,
        prefix_padding_ms: 300,
        silence_duration_ms: 200,
      },
    });

    // Add tools
    const tools = await getTools(settings);
    for (const tool of tools) {
      console.log(`adding tool "${tool.function.name}"`);
      client.addTool(tool.function as ToolDefinitionType, async (args: never) => {
        const result = await callFunction({ name: tool.function.name, arguments: JSON.stringify(args) });
        console.log("function result", result);
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
        console.log("calling function:", "end_conversation");
        autoEndConversationRef.current = true;
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
    client.on("conversation.updated", async ({ item, delta }: RealtimeEvent) => {
      const items = client.conversation.getItems();
      if (delta?.audio) {
        wavStreamPlayer.add16BitPCM(delta.audio, item.id);
        setCurrentlyPlayingTrackId(item.id);
      }
      // if (item.status === "completed" && item.formatted.audio?.length) {
      //   const wavFile = await WavRecorder.decode(item.formatted.audio, 24000, 24000);
      //   item.formatted.file = wavFile;
      // }
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
          console.log("response.created", JSON.stringify(event.event, null, 2));
          setAssistantResponding(true);
          assistantRespondingRef.current = true;
          break;
        case "response.done":
          console.log("response.done", JSON.stringify(event.event, null, 2));
          break;
      }
    });
  }, []);

  useEffect(() => {
    const client = clientRef.current;
    setupClient(client, settings).then(() => {
      setItems(client.conversation.getItems());
    });

    return () => {
      // cleanup; resets to defaults
      client.reset();
    };
  }, [settings, setupClient]);

  const [messages, setMessages] = useState<Message[]>([]);

  useEffect(() => {
    const convertedItems: Message[] = [];
    for (const item of items) {
      if (item.type === "message" /* && item.status === "completed"*/) {
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
            {isConnected && !assistantResponding && (
              <IconButton area-label="stop conversation" color={"error"} onClick={disconnectConversation}>
                <RecordVoiceOverIcon />
              </IconButton>
            )}
            {isConnected && assistantResponding && (
              <IconButton area-label="stop conversation" onClick={disconnectConversation}>
                <RiRobot2Fill />
              </IconButton>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
