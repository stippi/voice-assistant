import {PvEngine} from "@picovoice/web-voice-processor/dist/types/types";
import React, {useCallback, useEffect, useRef, useState} from "react";
import {EagleProfile} from "@picovoice/eagle-web";
import {WebVoiceProcessor} from "@picovoice/web-voice-processor";
import {RollingAudioCapture} from "../utils/rollingAudioCapture.ts";
import {useEagleWorker} from "./useEagleWorker.tsx";
import {PicoVoiceAccessKey} from "../config.ts";
import {useCobraWorker} from "./useCobraWorker.tsx";
import {usePorcupine} from "@picovoice/porcupine-react";
import {BuiltInKeyword} from "@picovoice/porcupine-web";

export function useVoiceDetection(enableWakeWord: boolean): {
  isLoaded: boolean,
  init: (wakeWord: BuiltInKeyword, speakerProfiles: EagleProfile[]) => Promise<void>,
  start: () => Promise<void>,
  stop: () => Promise<void>,
  release: () => Promise<void>,
  isListeningForWakeWord: boolean,
  wakeWordDetected: boolean,
} {
  const [isLoaded, setIsLoaded] = useState(false);
  
  const {
    keywordDetection,
    isLoaded: isPorcupineLoaded,
    isListening,
//    error,
    init: initPorcupine,
    start: startPorcupine,
    stop: stopPorcupine,
    release: releasePorcupine
  } = usePorcupine();
  
  // Start Porcupine wake word detection depending on settings and whether it is loaded
  useEffect(() => {
    if (isPorcupineLoaded && enableWakeWord && !isListening) {
      console.log('starting wake-word detection');
      startPorcupine().catch((error) => {
        console.log("failed to start Porcupine wake-word detection", error);
      });
    }
    return () => {
      if (isListening) {
        console.log('stopping wake-word detection');
        stopPorcupine().catch((error) => {
          console.log("failed to stop Porcupine wake-word detection", error);
        });
      }
    }
  }, [startPorcupine, stopPorcupine, enableWakeWord, isListening, isPorcupineLoaded])
  
  const {
    isLoaded: isEagleLoaded,
    init: initEagle,
    start: startEagle,
    stop: stopEagle,
    release: releaseEagle
  } = useEagleWorker();
  
  const {
    isLoaded: isCobraLoaded,
    init: initCobra,
    start: startCobra,
    stop: stopCobra,
    release: releaseCobra,
  } = useCobraWorker();
  
  const voiceProbabilityCallback = React.useCallback((probability: number) => {
    // TODO: Do something with it
    console.log("voice probability", probability);
  }, []);
  
  const speakerScoresCallback = React.useCallback((scores: number[]) => {
    // TODO: Do something with it
    console.log("speaker scores", scores);
  }, []);
  
  const rollingAudioCapture = useRef(new RollingAudioCapture({maxBuffers: 10}));
  
  const rollingAudioEngine = useRef<PvEngine>({
    onmessage: async (event: MessageEvent) => {
      switch (event.data.command) {
        case "process":
          rollingAudioCapture.current.appendBuffer(event.data.inputFrame);
          break;
      }
    }
  });
  
  const init = useCallback(async (wakeWord: BuiltInKeyword, speakerProfiles: EagleProfile[]) => {
    await initPorcupine(
      PicoVoiceAccessKey,
      wakeWord,
      {
        publicPath: "/public/models/porcupine_params.pv",
        customWritePath: "3.0.0_porcupine_params.pv",
      }
    );
    await initEagle(
      PicoVoiceAccessKey,
      {
        publicPath: "/public/models/eagle_params.pv"
      },
      speakerProfiles,
      speakerScoresCallback
    );
    await initCobra(PicoVoiceAccessKey, voiceProbabilityCallback);
    await WebVoiceProcessor.subscribe(rollingAudioEngine.current);
  }, [initPorcupine, initCobra, initEagle, voiceProbabilityCallback, speakerScoresCallback]);
  
  useEffect(() => {
    setIsLoaded(isPorcupineLoaded && isEagleLoaded && isCobraLoaded);
  }, [isPorcupineLoaded, isEagleLoaded, isCobraLoaded])
  
  const start = useCallback(async () => {
    await startEagle();
    await startCobra();
  }, [startCobra, startEagle]);
  
  const stop = useCallback(async () => {
    await stopCobra();
    await stopEagle();
  }, [stopCobra, stopEagle]);
  
  const release = useCallback(async () => {
    await stop();
    await releasePorcupine();
    await releaseCobra();
    await releaseEagle();
    await WebVoiceProcessor.unsubscribe(rollingAudioEngine.current);
    setIsLoaded(false);
  }, [releasePorcupine, releaseCobra, releaseEagle, stop]);
  
  useEffect(() => () => {
    if (isLoaded) {
      WebVoiceProcessor.unsubscribe(rollingAudioEngine.current).catch(e => console.log(e));
      release().catch(e => console.log(e));
    }
  }, [isLoaded, release]);
  
  return {
    isLoaded,
    init,
    start,
    stop,
    release,
    isListeningForWakeWord: isListening,
    wakeWordDetected: !!keywordDetection
  };
}
