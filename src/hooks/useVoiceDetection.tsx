import {PvEngine} from "@picovoice/web-voice-processor/dist/types/types";
import React, {useCallback, useEffect, useRef, useState} from "react";
import {EagleProfile, EagleWorker} from "@picovoice/eagle-web";
import {WebVoiceProcessor} from "@picovoice/web-voice-processor";
import {RollingAudioCapture} from "../utils/rollingAudioCapture.ts";
import {useEagleWorker} from "./useEagleWorker.tsx";
import {PicoVoiceAccessKey} from "../config.ts";
import {useCobraWorker} from "./useCobraWorker.tsx";

export function useVoiceDetection(): {
  isLoaded: boolean,
  init: (speakerProfiles: EagleProfile[]) => Promise<void>,
  start: () => Promise<void>,
  stop: () => Promise<void>,
  release: () => Promise<void>
} {
  const [isLoaded, setIsLoaded] = useState(false);
  
  const {
    isLoaded: isEagleLoaded,
    init: initEagle,
    start: startEagle,
    stop: stopEagle,
    release: releaseEagle,
    scores: eagleScores,
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
  
  const init = useCallback(async (speakerProfiles: EagleProfile[]) => {
    try {
      // ...
      await initEagle(PicoVoiceAccessKey, { publicPath: "/public/models/eagle_params.pv"}, speakerProfiles);
      await initCobra(PicoVoiceAccessKey, voiceProbabilityCallback);
      await WebVoiceProcessor.subscribe(rollingAudioEngine.current);
      setIsLoaded(true);
    } catch (e) {
      console.error(e);
    }
  }, [initCobra, initEagle, voiceProbabilityCallback]);
  
  const start = useCallback(async (): Promise<void> => {
    try {
      await startEagle();
      await startCobra();
    } catch (e) {
      console.error("Error starting voice detection", e);
    }
  }, [startCobra, startEagle]);
  
  const stop = useCallback(async (): Promise<void> => {
    try {
      await stopCobra();
      await stopEagle();
    } catch (e) {
      console.error("Error stopping voice detection", e)
    }
  }, [stopCobra, stopEagle]);
  
  const release = useCallback(async (): Promise<void> => {
    await stop();
    await releaseCobra();
    await releaseEagle();
    await WebVoiceProcessor.unsubscribe(rollingAudioEngine.current);
    setIsLoaded(false);
  }, [releaseCobra, releaseEagle, stop]);
  
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
    release
  };
}
