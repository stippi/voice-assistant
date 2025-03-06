import { EagleProfile } from "@picovoice/eagle-web";
import { useEffect, useRef, useState } from "react";
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
  const { isConnected, connectConversation, assistantResponding, disconnectConversation } = useRealtimeAssistant();

  // Realtime controls for the idle mode
  const realtimeControls = {
    isRecording: isConnected,
    connectConversation,
    disconnectConversation,
  };

  // Whisper Transcription Hook for the non-idle mode
  const whisperTranscription = useWhisperTranscription(
    // onTranscriptionStart
    (messageId) => sendMessage(messageId, "", true),
    // onTranscriptionComplete
    (messageId, text) => sendMessage(messageId, text, true),
  );
  const conversationControls = idle ? realtimeControls : whisperTranscription;

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

  useEffect(() => {
    if (!voiceDetection || idle) return;

    if (voiceDetection.voiceDetected) {
      whisperTranscription.setVoiceDetected(true);
    }
  }, [voiceDetection, whisperTranscription, idle]);

  return (
    <>
      <ChatOverlay />
      {!idle && <Conversation chat={messages} deleteMessage={deleteMessage} />}
      <MessageBar
        sendMessage={sendMessage}
        stopResponding={stopResponding}
        responding={responding || assistantResponding}
        awaitSpokenResponse={awaitSpokenResponse}
        idle={idle}
        listening={isListeningForWakeWord}
        wakeWordDetection={wakeWordDetection}
        voiceDetection={voiceDetection}
        startVoiceDetection={startVoiceDetection}
        stopVoiceDetection={stopVoiceDetection}
        conversationControls={conversationControls}
      />
    </>
  );
}
