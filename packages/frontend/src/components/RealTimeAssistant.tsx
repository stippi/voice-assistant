import { useRef, useEffect, useState } from "react";
import "./MessageBar.css";
import IconButton from "@mui/material/IconButton";
import MicIcon from "@mui/icons-material/Mic";
import RecordVoiceOverIcon from "@mui/icons-material/RecordVoiceOver";
import { RiRobot2Fill } from "react-icons/ri";
import Box from '@mui/material/Box';
import { PicoVoiceAccessKey } from "../config";
import { Conversation } from "./chat/Conversation";
import { useSettings, useVoiceDetection, useWindowFocus } from "../hooks";
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

  const [frequencies, setFrequencies] = useState<number[]>([0, 0, 0, 0, 0]);

  // Audio visualization
  useEffect(() => {
    let isActive = true;

    const updateFrequencies = () => {
      if (!isActive) return;

      const result = audioStreamingService.isConnected()
        ? audioStreamingService.getFrequencies("voice")
        : { values: new Float32Array([0]) };

      // Divide the frequency spectrum into 5 bands
      const bandSize = Math.floor(result.values.length / 5);
      const newFreqs = Array(5).fill(0).map((_, i) => {
        const start = i * bandSize;
        const end = start + bandSize;
        const bandValues = result.values.slice(start, end);
        return Math.max(...bandValues);
      });

      setFrequencies(newFreqs);
      requestAnimationFrame(updateFrequencies);
    };

    updateFrequencies();
    return () => {
      isActive = false;
    };
  }, [audioStreamingService]);

  return (
    <>
      <Conversation chat={messages} deleteMessage={() => { }} />
      <div className={"fixedBottom idle"}>
        <div className="textContainer">
          <div className="buttonContainer">
            <Box sx={{ position: 'relative', display: 'inline-flex', justifyContent: 'center', alignItems: 'center' }}>
              {frequencies.map((intensity, i) => (
                <Box
                  key={i}
                  sx={{
                    position: 'absolute',
                    borderRadius: '50%',
                    transition: 'opacity 0.1s ease-out',
                    pointerEvents: 'none',
                    inset: `${-8 - (i * 8)}px`,
                    border: `6px solid rgba(255, 255, 255, ${intensity * (0.8 - (i * 0.1))})`,
                  }}
                />
              ))}
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
            </Box>
          </div>
        </div>
      </div>
    </>
  );
}
