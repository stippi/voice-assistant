import { EagleProfile } from "@picovoice/eagle-web";
import { useEffect, useRef, useState } from "react";
import IdleModeRealTimeAssistant from "../components/IdleModeRealTimeAssistant";
import { OptionalIntegrations } from "../components/OptionalIntegrations";
import VoiceAssistant from "../components/VoiceAssistant";
import { Dashboard } from "../components/dashboard/Dashboard";
import { Sidebar } from "../components/sidebar/Sidebar";
import { PicoVoiceAccessKey } from "../config";
import { useAppContext, useSettings, useVoiceDetection, useWindowFocus } from "../hooks";
import { indexDbGet } from "../utils/indexDB";

export default function DefaultPage() {
  const { settings } = useSettings();
  const { idle } = useAppContext();
  const { documentVisible } = useWindowFocus();

  const idleMode = idle && settings.enableGoogle && settings.enableGooglePhotos;

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
  }, [initVoiceDetection, releaseVoiceDetection, speakerProfiles, settings.triggerWord, isVoiceDetectionLoaded]);

  return (
    <OptionalIntegrations>
      <Sidebar />
      <VoiceAssistant
        idle={idleMode}
        listening={isListeningForWakeWord}
        wakeWordDetection={wakeWordDetection}
        voiceDetection={voiceDetection}
        startVoiceDetection={startVoiceDetection}
        stopVoiceDetection={stopVoiceDetection}
      />
      <IdleModeRealTimeAssistant wakeWordDetection={wakeWordDetection} isActive={idleMode} />
      <Dashboard />
    </OptionalIntegrations>
  );
}
