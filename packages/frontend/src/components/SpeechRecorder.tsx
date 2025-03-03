// packages/frontend/src/components/SpeechRecorder.tsx
import MicIcon from "@mui/icons-material/Mic";
import RecordVoiceOverIcon from "@mui/icons-material/RecordVoiceOver";
import IconButton from "@mui/material/IconButton";
import { PorcupineDetection } from "@picovoice/porcupine-web";
import { useCallback, useEffect, useRef } from "react";
import { VoiceDetection } from "../hooks";

interface ConversationControls {
  isRecording: boolean;
  connectConversation: () => void;
  disconnectConversation: () => void;
}

interface Props {
  stopResponding: (audible: boolean) => void;
  setTranscript: (transcript: string) => void;
  defaultMessage: string;
  responding: boolean;
  awaitSpokenResponse: boolean;
  listening: boolean;
  wakeWordDetection: PorcupineDetection | null;
  voiceDetection: VoiceDetection | null;
  // Conversation controls - passed in from parent
  conversationControls: ConversationControls;
  // Voice detection controls
  startVoiceDetection: () => Promise<void>;
  stopVoiceDetection: () => Promise<void>;
}

const SpeechRecorder = ({
  stopResponding,
  setTranscript,
  defaultMessage,
  responding,
  awaitSpokenResponse,
  listening,
  wakeWordDetection,
  voiceDetection,
  conversationControls,
  startVoiceDetection,
  stopVoiceDetection,
}: Props) => {
  const { isRecording, connectConversation, disconnectConversation } = conversationControls;
  const respondingRef = useRef(responding);

  useEffect(() => {
    respondingRef.current = responding;
  }, [responding]);

  const startConversation = useCallback(() => {
    // Start voice detection to monitor for silence
    startVoiceDetection().catch((error) => console.error("Failed to start voice detection", error));
    connectConversation();
  }, [connectConversation, startVoiceDetection]);

  const stopConversation = useCallback(() => {
    disconnectConversation();
    // Stop voice detection when recording stops
    stopVoiceDetection().catch((error) => console.error("Failed to stop voice detection", error));
    // Reset transcript
    setTranscript(defaultMessage);
  }, [disconnectConversation, stopVoiceDetection, setTranscript, defaultMessage]);

  const isRecordingRef = useRef(isRecording);
  const startConversationRef = useRef(startConversation);
  const stopRespondingRef = useRef(stopResponding);

  useEffect(() => {
    isRecordingRef.current = isRecording;
    startConversationRef.current = startConversation;
    stopRespondingRef.current = stopResponding;
  }, [isRecording, startConversation, stopResponding]);

  // React to external wakeWordDetection
  useEffect(() => {
    if (wakeWordDetection) {
      console.log("wake word detected in SpeechRecorder");
      if (!isRecordingRef.current) {
        if (respondingRef.current) {
          stopRespondingRef.current(true);
        }
        startConversationRef.current();
      }
    }
  }, [wakeWordDetection]);

  // React to silence detection from voice detection hook
  useEffect(() => {
    if (isRecording && voiceDetection?.silenceDetected) {
      console.log("silence detected in SpeechRecorder, stopping conversation");
      if (voiceDetection.voiceDetected) {
        // Only stop if voice was first detected (avoid stopping right after starting)
        stopConversation();
      }
    }
  }, [voiceDetection, isRecording, stopConversation]);

  // Auto-start conversation after assistant has finished speaking
  useEffect(() => {
    if (awaitSpokenResponse && !isRecording) {
      startConversation();
    }
  }, [awaitSpokenResponse, isRecording, startConversation]);

  return (
    <div>
      {isRecording && (
        <IconButton area-label="stop conversation" color="error" onClick={stopConversation}>
          <RecordVoiceOverIcon />
        </IconButton>
      )}
      {!isRecording && (
        <IconButton area-label="start conversation" color={listening ? "error" : "default"} onClick={startConversation}>
          <MicIcon />
        </IconButton>
      )}
    </div>
  );
};

export default SpeechRecorder;
