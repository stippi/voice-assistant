import {useCallback, useEffect, useRef, useState} from "react";
import {WebVoiceProcessor} from "@picovoice/web-voice-processor";
import {CobraWorker} from "@picovoice/cobra-web";

export function useCobraWorker(): {
  isLoaded: boolean,
  init: (
    accessKey: string,
    voiceProbabilityCallback: (probability: number) => void
  ) => Promise<void>,
  start: () => Promise<void>,
  stop: () => Promise<void>,
  release: () => Promise<void>,
} {
  const cobraRef = useRef<CobraWorker | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  
  const init = useCallback(async (
    accessKey: string,
    voiceProbabilityCallback: (probability: number) => void
  ) => {
    if (cobraRef.current) {
      console.error("Eagle worker already initialized. Call release() first.");
      return;
    }
    try {
      cobraRef.current = await CobraWorker.create(
        accessKey,
        voiceProbabilityCallback
      );
      setIsLoaded(true);
    } catch (e) {
      console.error(e);
    }
  }, []);
  
  const start = useCallback(async (): Promise<void> => {
    try {
      if (!cobraRef.current) {
        console.error("Cobra has not been initialized or has been released");
        return;
      }
      
      await WebVoiceProcessor.subscribe(cobraRef.current);
    } catch (e) {
      console.error("Error starting Cobra worker", e);
    }
  }, []);
  
  const stop = useCallback(async (): Promise<void> => {
    try {
      if (!cobraRef.current) {
        console.error("Cobra has not been initialized or has been released");
        return;
      }
      await WebVoiceProcessor.unsubscribe(cobraRef.current);
    } catch (e) {
      console.error("Error stopping Eagle worker", e)
    }
  }, []);
  
  const release = useCallback(async (): Promise<void> => {
    if (cobraRef.current) {
      await stop();
      cobraRef.current.terminate();
      cobraRef.current = null;
      
      setIsLoaded(false);
    }
  }, [stop]);
  
  useEffect(() => () => {
    if (cobraRef.current) {
      WebVoiceProcessor.unsubscribe(cobraRef.current).catch(e => console.log(e));
      cobraRef.current.terminate();
      cobraRef.current = null;
    }
  }, []);
  
  return {
    isLoaded,
    init,
    start,
    stop,
    release,
  };
}
