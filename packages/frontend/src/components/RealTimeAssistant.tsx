import { useRef, useEffect } from "react";
import "./MessageBar.css";
import IconButton from "@mui/material/IconButton";
import MicIcon from "@mui/icons-material/Mic";
import RecordVoiceOverIcon from "@mui/icons-material/RecordVoiceOver";
import { RiRobot2Fill } from "react-icons/ri";
import { PicoVoiceAccessKey } from "../config";
import { Conversation } from "./chat/Conversation";
import { useSettings, useVoiceDetection, useWindowFocus } from "../hooks";
import { AudioVisualizer } from "./chat/AudioVisualizer";
const VisualizerCanvas = {
  position: "absolute",
  left: "50%",
  top: "50%",
  transform: "translate(-50%, -50%)",
  width: "120px",
  height: "120px",
  pointerEvents: "none",
} as const;
import { useRealtimeAssistant } from "../hooks/useRealtimeAssistant";

export default function RealtimeAssistant() {
  const {
    messages,
    isConnected,
    assistantResponding,
    handleWakeWord,
    connectConversation,
    disconnectConversation,
    audioStreamingService
  } = useRealtimeAssistant();

  const { settings } = useSettings();
  const { documentVisible } = useWindowFocus();
  const serverCanvasRef = useRef<HTMLCanvasElement>(null);

  // Initialize voice detection
  const {
    isLoaded: isVoiceDetectionLoaded,
    init: initVoiceDetection,
    release: releaseVoiceDetection,
    isListeningForWakeWord,
    wakeWordDetection,
  } = useVoiceDetection(settings.openMic && documentVisible);

  const voiceDetectionInitTriggeredRef = useRef(false);

  // Setup voice detection
  useEffect(() => {
    if (PicoVoiceAccessKey.length === 0) {
      return;
    }

    if (!isVoiceDetectionLoaded && !voiceDetectionInitTriggeredRef.current) {
      console.log("Initializing voice detection");
      voiceDetectionInitTriggeredRef.current = true;
      initVoiceDetection(settings.triggerWord, [])
        .then(() => console.log("Voice detection initialized"))
        .catch((error) => console.error("Failed to initialize voice detection", error));
    }

    return () => {
      if (isVoiceDetectionLoaded) {
        console.log("Releasing voice detection");
        voiceDetectionInitTriggeredRef.current = false;
        releaseVoiceDetection()
          .then(() => console.log("Voice detection released"))
          .catch((error) => console.error("Failed to release voice detection", error));
      }
    };
  }, [initVoiceDetection, releaseVoiceDetection, settings.triggerWord, isVoiceDetectionLoaded]);

  // Handle wake word detection
  useEffect(() => {
    if (wakeWordDetection) {
      handleWakeWord();
    }
  }, [wakeWordDetection, handleWakeWord]);

  // Audio visualization
  useEffect(() => {
    let isLoaded = true;
    const serverCanvas = serverCanvasRef.current;
    let serverCtx: CanvasRenderingContext2D | null = null;

    const render = () => {
      if (isLoaded && serverCanvas) {
        if (!serverCanvas.width || !serverCanvas.height) {
          serverCanvas.width = serverCanvas.offsetWidth;
          serverCanvas.height = serverCanvas.offsetHeight;
        }

        serverCtx = serverCtx || serverCanvas.getContext("2d");
        if (serverCtx) {
          const centerX = serverCanvas.width / 2;
          const centerY = serverCanvas.height / 2;
          serverCtx.clearRect(0, 0, serverCanvas.width, serverCanvas.height);

          const result = audioStreamingService.isConnected()
            ? audioStreamingService.getFrequencies("voice")
            : { values: new Float32Array([0]) };

          AudioVisualizer.drawCircularBars(
            serverCtx,
            result.values,
            "rgba(153, 153, 153, 0.5)", // Translucent gray
            centerX,
            centerY,
            20, // Inner radius around the mic icon
            Math.min(centerX, centerY) - 5, // Outer radius
            32 // Number of bars
          );
        }
        window.requestAnimationFrame(render);
      }
    };
    render();

    return () => {
      isLoaded = false;
    };
  }, [audioStreamingService]);

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
        <canvas ref={serverCanvasRef} style={VisualizerCanvas} />
      </div>
    </>
  );
}
