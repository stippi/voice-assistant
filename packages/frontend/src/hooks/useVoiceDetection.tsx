import { EagleProfile } from "@picovoice/eagle-web";
import { usePorcupine } from "@picovoice/porcupine-react";
import { BuiltInKeyword, PorcupineDetection } from "@picovoice/porcupine-web";
import { WebVoiceProcessor } from "@picovoice/web-voice-processor";
import { PvEngine } from "@picovoice/web-voice-processor/dist/types/types";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { useCobraWorker, useEagleWorker, useSilenceDetector } from ".";
import { PicoVoiceAccessKey } from "../config.ts";
import { RollingAudioCapture } from "../utils/rollingAudioCapture.ts";

export type VoiceDetection = {
  voiceDetected: boolean;
  silenceDetected: boolean;
  userDetected: number;
};

export function useVoiceDetection(enableWakeWord: boolean): {
  isLoaded: boolean;
  init: (wakeWord: BuiltInKeyword, speakerProfiles: EagleProfile[]) => Promise<void>;
  start: () => Promise<void>;
  stop: () => Promise<void>;
  release: () => Promise<void>;
  isListeningForWakeWord: boolean;
  wakeWordDetection: PorcupineDetection | null;
  voiceDetection: VoiceDetection | null;
} {
  const [subscribed, setSubscribed] = useState(false);
  const [voiceDetection, setVoiceDetection] = useState<VoiceDetection | null>(null);
  const voiceDetectedRef = useRef(false);
  const lastSilenceCheckRef = useRef(new Date().getTime());

  const {
    keywordDetection,
    isLoaded: isPorcupineLoaded,
    isListening,
    //    error,
    init: initPorcupine,
    start: startPorcupine,
    stop: stopPorcupine,
    release: releasePorcupine,
  } = usePorcupine();

  const voiceProbabilityCallback = React.useCallback((probability: number) => {
    const now = new Date().getTime();
    if (probability > 0.7) {
      if (!voiceDetectedRef.current) {
        voiceDetectedRef.current = true;
        console.log("voice detected");
        setVoiceDetection((current) => ({
          voiceDetected: true,
          silenceDetected: false,
          userDetected: current ? current.userDetected : -1,
        }));
      }
      lastSilenceCheckRef.current = now;
    } else {
      // Shorten the silence timeout when voice was detected after starting the recording
      const timeout = voiceDetectedRef.current ? 1750 : 2500;
      if (now - lastSilenceCheckRef.current > timeout) {
        console.log("silence detected");
        setVoiceDetection((current) => ({
          voiceDetected: current ? current.voiceDetected : false,
          silenceDetected: true,
          userDetected: current ? current.userDetected : -1,
        }));
      }
    }
  }, []);

  const speakerScoresCallback = React.useCallback((scores: number[]) => {
    // TODO: Do something with it
    console.log("speaker scores", scores);
  }, []);

  // Start Porcupine wake word detection depending on settings and whether it is loaded
  useEffect(() => {
    console.log(`isPorcupineLoaded: ${isPorcupineLoaded}, enableWakeWord: ${enableWakeWord}, isListening: ${isListening}`);
    if (isPorcupineLoaded && enableWakeWord && !isListening) {
      console.log("starting wake-word detection");
      startPorcupine().catch((error) => {
        console.log("failed to start Porcupine wake-word detection", error);
      });
    }
    if (isPorcupineLoaded && !enableWakeWord && isListening) {
      console.log("stopping wake-word detection");
      stopPorcupine().catch((error) => {
        console.log("failed to stop Porcupine wake-word detection", error);
      });
    }
  }, [startPorcupine, stopPorcupine, enableWakeWord, isListening, isPorcupineLoaded]);

  const rollingAudioCapture = useRef(new RollingAudioCapture({ maxBuffers: 10 }));

  const rollingAudioEngine = useRef<PvEngine>({
    onmessage: async (event: MessageEvent) => {
      switch (event.data.command) {
        case "process":
          rollingAudioCapture.current.appendBuffer(event.data.inputFrame);
          break;
      }
    },
  });

  // Subscribe the rolling audio engine to the WebVoiceProcessor when listing for the wake word.
  useEffect(() => {
    if (isListening && !subscribed) {
      console.log("subscribing to web voice engine");
      WebVoiceProcessor.subscribe(rollingAudioEngine.current);
      setSubscribed(true);
    }
    if (!isListening && subscribed) {
      console.log("unsubscribing from web voice engine");
      WebVoiceProcessor.unsubscribe(rollingAudioEngine.current);
      setSubscribed(false);
    }
  }, [isListening, subscribed]);

  const {
    isLoaded: isEagleLoaded,
    init: initEagle,
    start: startEagle,
    stop: stopEagle,
    release: releaseEagle,
  } = useEagleWorker();

  const {
    isLoaded: isCobraLoaded,
    init: initCobra,
    start: startCobra,
    stop: stopCobra,
    release: releaseCobra,
  } = useCobraWorker();

  const {
    start: startSilenceDetection,
    stop: stopSilenceDetection,
  } = useSilenceDetector({ onLevelChange: voiceProbabilityCallback });

  const start = useCallback(async () => {
    if (isEagleLoaded) {
      await startEagle();
    }
    if (isCobraLoaded) {
      await startCobra();
    } else {
      console.log("Cobra not available, falling back to silence detection");
      await startSilenceDetection();
    }
    voiceDetectedRef.current = false;
    lastSilenceCheckRef.current = new Date().getTime();
    setVoiceDetection({
      voiceDetected: false,
      silenceDetected: false,
      userDetected: -1,
    });
  }, [isEagleLoaded, isCobraLoaded, startCobra, startEagle, startSilenceDetection]);

  const stop = useCallback(async () => {
    if (isCobraLoaded) {
      await stopCobra();
    } else {
      await stopSilenceDetection();
    }
    if (isEagleLoaded) {
      await stopEagle();
    }
    setVoiceDetection(null);
  }, [isEagleLoaded, isCobraLoaded, stopCobra, stopEagle, stopSilenceDetection]);

  const init = useCallback(
    async (wakeWord: BuiltInKeyword, speakerProfiles: EagleProfile[]) => {
      try {
        console.log("initializing Porcupine");
        await initPorcupine(PicoVoiceAccessKey, wakeWord, {
          publicPath: "/models/porcupine_params.pv",
          customWritePath: "3.0.0_porcupine_params.pv",
        });
        console.log("initializing Eagle");
        if (speakerProfiles.length > 0) {
          await initEagle(
            PicoVoiceAccessKey,
            {
              publicPath: "/models/eagle_params.pv",
            },
            speakerProfiles,
            speakerScoresCallback,
          );
        }
        console.log("initializing Cobra");
        await initCobra(PicoVoiceAccessKey, voiceProbabilityCallback);
      } catch (e) {
        console.log("Error initializing voice detection", e);
      }
    },
    [initPorcupine, initEagle, initCobra, voiceProbabilityCallback, speakerScoresCallback],
  );

  const release = useCallback(async () => {
    await stop();
    if (isPorcupineLoaded) {
      await releasePorcupine();
    }
    if (isCobraLoaded) {
      await releaseCobra();
    }
    if (isEagleLoaded) {
      await releaseEagle();
    }
  }, [
    stop,
    isPorcupineLoaded,
    isCobraLoaded,
    isEagleLoaded,
    //subscribed,
    releasePorcupine,
    releaseCobra,
    releaseEagle,
  ]);

  return {
    isLoaded: isPorcupineLoaded,
    init,
    start,
    stop,
    release,
    isListeningForWakeWord: isListening,
    wakeWordDetection: keywordDetection,
    voiceDetection,
  };
}
