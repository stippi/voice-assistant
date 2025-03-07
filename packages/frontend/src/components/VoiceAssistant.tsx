import { EagleProfile } from "@picovoice/eagle-web";
import { useCallback, useEffect, useRef, useState } from "react";
import { useAppContext, useSettings, useRealtimeAssistant, useVoiceAssistant, useVoiceDetection, useWhisperTranscription, useWindowFocus } from "../hooks";
import { Conversation } from "./chat/Conversation";
import { MessageBar } from "./MessageBar";
import { ChatOverlay } from "./overlay/ChatOverlay";
import { PicoVoiceAccessKey } from "../config";
import { indexDbGet } from "../utils/indexDB";

interface Props {
  idle: boolean;
}

export default function VoiceAssistant({ idle }: Props) {
  const { settings } = useSettings();
  const { documentVisible } = useWindowFocus();
  const { responding, awaitSpokenResponse, sendMessage, stopResponding, deleteMessage, messages } = useVoiceAssistant();
  const { isConnected, connectConversation, handleWakeWord, assistantResponding, disconnectConversation } = useRealtimeAssistant();

  // Whisper Transcription Hook for the non-idle mode
  const whisperTranscription = useWhisperTranscription(
    // onTranscriptionStart
    (messageId) => sendMessage(messageId, "", true),
    // onTranscriptionComplete
    (messageId, text) => sendMessage(messageId, text, true),
  );

  const isRecordingRef = useRef(isConnected);
  const respondingRef = useRef(responding);
  const handleWakeWordRef = useRef(handleWakeWord);
  const isIdleRef = useRef(idle);
  const stopRespondingRef = useRef(stopResponding);

  // Update all refs
  useEffect(() => {
    isRecordingRef.current = isConnected || whisperTranscription.isRecording;
    respondingRef.current = responding;
    handleWakeWordRef.current = handleWakeWord;
    isIdleRef.current = idle;
    stopRespondingRef.current = stopResponding;
  }, [isConnected, responding, whisperTranscription, handleWakeWord, idle, stopResponding])

  // Load user speech profiles
  const [speakerProfiles, setSpeakerProfiles] = useState<EagleProfile[] | null>(null);
  const { users } = useAppContext();
  const loadProfiles = async (profileIds: string[]) => {
    console.log("Loading profiles", profileIds);
    const profiles: EagleProfile[] = [];
    for (const id of profileIds) {
      const profileData = await indexDbGet<Uint8Array>(id);
      profiles.push({ bytes: profileData });
    }
    setSpeakerProfiles(profiles);
  };
  useEffect(() => {
    loadProfiles(users.filter((user) => user.voiceProfileId != "").map((user) => user.voiceProfileId))
      .then(() => console.log("User voice profiles loaded"))
      .catch((e) => console.error("Failed to load user profiles", e));
  }, [users]);

  // Initialize voice detection for both normal and idle mode
  const {
    isLoaded: isVoiceDetectionLoaded,
    init: initVoiceDetection,
    release: releaseVoiceDetection,
    isListeningForWakeWord,
    wakeWordDetection,
    voiceDetection,
    start: startVoiceDetection,
    stop: stopVoiceDetection,
  } = useVoiceDetection(settings.openMic && documentVisible);

  const voiceDetectionInitTriggeredRef = useRef(false);

  // Setup voice detection
  useEffect(() => {
    if (PicoVoiceAccessKey.length === 0) {
      return;
    }

    if (!isVoiceDetectionLoaded && speakerProfiles != null && !voiceDetectionInitTriggeredRef.current) {
      console.log("Initializing voice detection");
      voiceDetectionInitTriggeredRef.current = true;
      initVoiceDetection(settings.triggerWord, speakerProfiles)
        .then(() => console.log("Voice detection initialized"))
        .catch((error) => {
          console.error("Failed to initialize voice detection", error);
          voiceDetectionInitTriggeredRef.current = false;
        });
    }

    return () => {
      if (voiceDetectionInitTriggeredRef.current) {
        console.log("Releasing voice detection");
        releaseVoiceDetection()
          .then(() => {
            console.log("Voice detection released");
            voiceDetectionInitTriggeredRef.current = false;
          })
          .catch((error) => console.error("Failed to release voice detection", error));
      }
    };
  }, [initVoiceDetection, releaseVoiceDetection, speakerProfiles, settings.triggerWord, isVoiceDetectionLoaded]);

  const startConversation = useCallback(() => {
    // Start voice detection to monitor for silence
    startVoiceDetection().catch((error) => console.error("Failed to start voice detection", error));
    if (isIdleRef.current) {
      connectConversation();
    } else {
      whisperTranscription.connectConversation();
    }
  }, [connectConversation, whisperTranscription, startVoiceDetection]);

  const stopConversation = useCallback(() => {
    if (isIdleRef.current) {
      disconnectConversation();
    } else {
      whisperTranscription.disconnectConversation();
    }
    // Stop voice detection when recording stops
    stopVoiceDetection().catch((error) => console.error("Failed to stop voice detection", error));
  }, [disconnectConversation, whisperTranscription, stopVoiceDetection]);

  const startConversationRef = useRef(startConversation);
  const stopConversationRef = useRef(stopConversation);
  useEffect(() => {
    startConversationRef.current = startConversation;
    stopConversationRef.current = stopConversation;
  }, [startConversation, stopConversation])

  useEffect(() => {
    if (!voiceDetection || isIdleRef.current) return;

    if (voiceDetection.voiceDetected) {
      whisperTranscription.setVoiceDetected(true);
    }
  }, [voiceDetection, whisperTranscription]);

  // React to silence detection from voice detection hook
  useEffect(() => {
    if (!voiceDetection) return;
    if (!isIdleRef.current && voiceDetection.silenceDetected && isRecordingRef.current) {
      stopConversation();
    }
  }, [voiceDetection, stopConversation]);

  // Handle wake word detection
  useEffect(() => {
    if (wakeWordDetection) {
      if (isIdleRef.current) {
        handleWakeWordRef.current();
      } else {
        if (!isRecordingRef.current) {
          if (respondingRef.current) {
            stopRespondingRef.current();
          }
          startConversationRef.current();
        }
      }
    }
  }, [wakeWordDetection]);

  // Auto-start conversation after assistant has finished speaking
  useEffect(() => {
    if (awaitSpokenResponse && !whisperTranscription.isRecording) {
      startConversation();
    }
  }, [awaitSpokenResponse, whisperTranscription, startConversation]);

  return (
    <>
      <ChatOverlay />
      {!idle && <Conversation chat={messages} deleteMessage={deleteMessage} />}
      <MessageBar
        sendMessage={sendMessage}
        stopResponding={stopResponding}
        responding={responding || assistantResponding}
        idle={idle}
        listening={isListeningForWakeWord}
        isRecording={isConnected || whisperTranscription.isRecording}
        startConversation={startConversation}
        stopConversation={stopConversation}
      />
    </>
  );
}
