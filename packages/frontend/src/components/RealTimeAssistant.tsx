import { useEffect, useRef, useCallback, useState } from "react";
import "./MessageBar.css";
import IconButton from "@mui/material/IconButton";
import MicIcon from "@mui/icons-material/Mic";
import RecordVoiceOverIcon from "@mui/icons-material/RecordVoiceOver";
import { RiRobot2Fill } from "react-icons/ri";
import { RealtimeClient } from "@openai/realtime-api-beta";
import { ItemType, ToolDefinitionType } from "@openai/realtime-api-beta/dist/lib/client.js";
import { completionsApiKey, PicoVoiceAccessKey } from "../config";
import { AudioStreamingService } from "../services/AudioStreamingService";
import { PvEngine } from "@picovoice/web-voice-processor/dist/types/types";
import { WebVoiceProcessor } from "@picovoice/web-voice-processor";
import { createSystemMessageService } from "../services/SystemMessageService";
import { Message } from "@shared/types";
import { Conversation } from "./chat/Conversation";
import { getTools, callFunction } from "../integrations/tools";
import { useAppContext, useSettings, useTimers, useVoiceDetection, useWindowFocus } from "../hooks";
import { Settings } from "../contexts/SettingsContext";
import { playSound } from "../utils/audio";
import { AudioVisualizer } from "./chat/AudioVisualizer";
// import { MessageBar } from "./MessageBar";

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
  const audioStreamingServiceRef = useRef(new AudioStreamingService({ sampleRate: 24000 }));
  const clientRef = useRef(
    new RealtimeClient({
      apiKey: completionsApiKey,
      dangerouslyAllowAPIKeyInBrowser: true,
      //      debug: true,
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
  const { documentVisible } = useWindowFocus();
  const [assistantResponding, setAssistantResponding] = useState(false);
  const autoEndConversationRef = useRef(false);
  const assistantRespondingRef = useRef(false);
  const audioBuffersRef = useRef<Int16Array[]>([]);
  const serverCanvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    appContextRef.current = appContext;
  }, [appContext]);

  const {
    isLoaded: isVoiceDetectionLoaded,
    init: initVoiceDetection,
    release: releaseVoiceDetection,
    isListeningForWakeWord,
    wakeWordDetection,
  } = useVoiceDetection(settings.openMic && documentVisible);

  const voiceDetectionInitTriggeredRef = useRef(false);

  useEffect(() => {
    if (PicoVoiceAccessKey.length === 0) {
      return;
    }

    if (!isVoiceDetectionLoaded && !voiceDetectionInitTriggeredRef.current) {
      console.log("Initializing voice detection");
      voiceDetectionInitTriggeredRef.current = true;
      initVoiceDetection(settings.triggerWord, [])
        .then(() => {
          console.log("Voice detection initialized");
        })
        .catch((error) => {
          console.error("Failed to initialize voice detection", error);
        });
    }

    return () => {
      if (isVoiceDetectionLoaded) {
        console.log("Releasing voice detection");
        voiceDetectionInitTriggeredRef.current = false;
        releaseVoiceDetection()
          .then(() => {
            console.log("Voice detection released");
          })
          .catch((error) => {
            console.error("Failed to release voice detection", error);
          });
      }
    };
  }, [initVoiceDetection, releaseVoiceDetection, settings.triggerWord, isVoiceDetectionLoaded]);

  /**
   * Connect to conversation!
   */
  const connectConversation = useCallback(async () => {
    console.log("connecting conversion");
    const client = clientRef.current;
    const audioStreamingService = audioStreamingServiceRef.current;

    // Send the "reduce-volume" custom event
    document.dispatchEvent(new CustomEvent("reduce-volume"));
    playSound("activation");
    setIsConnected(true);

    // Set state variables
    setItems(client.conversation.getItems());

    // Connect to audio output
    await audioStreamingService.connect();

    autoEndConversationRef.current = false;
    assistantRespondingRef.current = false;

    // Connect to realtime API
    await client.connect();
  }, []);

  /**
   * Disconnect and reset conversation state
   */
  const disconnectConversation = useCallback(async () => {
    console.log("disconnecting conversion");
    const client = clientRef.current;
    client.disconnect();

    setIsConnected(false);
    document.dispatchEvent(new CustomEvent("restore-volume"));
  }, []);

  // Effect that is called everytime the wake-word is detected
  useEffect(() => {
    const client = clientRef.current;
    const audioStreamingService = audioStreamingServiceRef.current;
    if (wakeWordDetection) {
      console.log("wake word detected");
      if (client.isConnected()) {
        // Interrupt assistant
        audioStreamingService.interrupt();
        client.cancelResponse("");
      } else {
        connectConversation();
      }
    }
  }, [wakeWordDetection, connectConversation]);

  const audioRecorder = useRef<PvEngine>({
    onmessage: async (event: MessageEvent) => {
      const client = clientRef.current;
      switch (event.data.command) {
        case "process":
          if (!client.isConnected()) {
            // Buffer the audio input until the client is actually conntected
            while (audioBuffersRef.current.length > 100) {
              // Drop audio buffers from the beginning, since we don't want to buffer indefinitely
              audioBuffersRef.current.shift();
              console.log("dropped user audio buffer");
            }
            audioBuffersRef.current.push(event.data.inputFrame);
            break;
          }
          if (client.getTurnDetectionType() === "server_vad" && !assistantRespondingRef.current) {
            while (audioBuffersRef.current.length > 0) {
              // First send the buffered audio chunks
              client.appendInputAudio(audioBuffersRef.current.shift()!);
            }
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

Act like a human, but remember that you aren’t a human and that you can’t do human things in the real world.
Your voice and personality should be warm and engaging, with a lively and playful tone.
If interacting in a non-English language, start by using the standard accent or dialect familiar to the user.
Talk quickly. You should always call a function if you can.

Call the 'end_conversation' function after you have completed your task and when the user no longer requires you.`;
    client.updateSession({ instructions });
  }, [appContext.location, timers]);

  /**
   * Core RealtimeClient and audio capture setup
   * Set all of our instructions, tools, events and more
   */
  const setupClient = useCallback(async (client: RealtimeClient, settings: Settings) => {
    // Get refs
    const audioStreamingService = audioStreamingServiceRef.current;

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

  useEffect(() => {
    let isLoaded = true;

    const audioStreamingService = audioStreamingServiceRef.current;
    const serverCanvas = serverCanvasRef.current;
    let serverCtx: CanvasRenderingContext2D | null = null;
    const render = () => {
      if (isLoaded) {
        if (serverCanvas) {
          if (!serverCanvas.width || !serverCanvas.height) {
            serverCanvas.width = serverCanvas.offsetWidth;
            serverCanvas.height = serverCanvas.offsetHeight;
          }
          serverCtx = serverCtx || serverCanvas.getContext("2d");
          if (serverCtx) {
            serverCtx.clearRect(0, 0, serverCanvas.width, serverCanvas.height);
            const result = audioStreamingService.isConnected()
              ? audioStreamingService.getFrequencies("voice")
              : { values: new Float32Array([0]) };
            AudioVisualizer.drawBars(serverCanvas, serverCtx, result.values, "#999999", 5, 0, 8);
          }
        }
        window.requestAnimationFrame(render);
      }
    };
    render();

    return () => {
      isLoaded = false;
    };
  }, []);

  return (
    <>
      <Conversation chat={messages} deleteMessage={() => { }} />
      <div className={"fixedBottom idle"}>
        <div className="textContainer">
          <div className="buttonContainer">
            {!isConnected && (
              <IconButton
                area-label="start conversation"
                color={isListeningForWakeWord ? "error" : "default"}
                onClick={connectConversation}
              >
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
        <canvas ref={serverCanvasRef} />
      </div>
    </>
  );
}
