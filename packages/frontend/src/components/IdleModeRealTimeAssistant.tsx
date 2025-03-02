import MicIcon from "@mui/icons-material/Mic";
import RecordVoiceOverIcon from "@mui/icons-material/RecordVoiceOver";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import { PorcupineDetection } from "@picovoice/porcupine-web";
import { useEffect, useState } from "react";
import { RiRobot2Fill } from "react-icons/ri";
import { useRealtimeAssistant } from "../hooks/useRealtimeAssistant";
import { Conversation } from "./chat/Conversation";
import "./MessageBar.css";

interface Props {
  wakeWordDetection: PorcupineDetection | null;
  isActive: boolean;
}

export default function IdleModeRealTimeAssistant({ wakeWordDetection, isActive }: Props) {
  const {
    messages,
    isConnected,
    assistantResponding,
    handleWakeWord,
    connectConversation,
    disconnectConversation,
    audioStreamingService,
  } = useRealtimeAssistant();

  // Handle wake word detection - activate only in idle mode
  useEffect(() => {
    if (wakeWordDetection && isActive) {
      handleWakeWord();
    }
  }, [wakeWordDetection, handleWakeWord, isActive]);

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
      const newFreqs = Array(5)
        .fill(0)
        .map((_, i) => {
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

  // Disconnect when component is deactivated
  useEffect(() => {
    if (!isActive && isConnected) {
      disconnectConversation();
    }
  }, [isActive, isConnected, disconnectConversation]);

  if (!isActive) {
    return null;
  }

  return (
    <>
      {isConnected && <Conversation chat={messages} deleteMessage={() => {}} />}
      <div className={"fixedBottom idle"}>
        <div className="textContainer">
          <div className="buttonContainer">
            <Box sx={{ position: "relative", display: "inline-flex", justifyContent: "center", alignItems: "center" }}>
              {frequencies.map((intensity, i) => (
                <Box
                  key={i}
                  sx={{
                    position: "absolute",
                    borderRadius: "50%",
                    transition: "opacity 0.1s ease-out",
                    pointerEvents: "none",
                    inset: `${-8 - i * 8}px`,
                    border: `6px solid rgba(255, 255, 255, ${intensity * (0.8 - i * 0.1)})`,
                  }}
                />
              ))}
              {!isConnected && (
                <IconButton area-label="start conversation" color="error" onClick={connectConversation}>
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
