import {PvEngine} from "@picovoice/web-voice-processor/dist/types/types";
import {useCallback, useEffect, useRef, useState} from "react";
import {EagleProfile, EagleWorker} from "@picovoice/eagle-web";
import {WebVoiceProcessor} from "@picovoice/web-voice-processor";

export function useEagleWorker(): {
  isLoaded: boolean,
  init: (
    accessKey: string,
    model: {publicPath: string},
    speakerProfiles: EagleProfile | EagleProfile[],
    speakerScoreCallback: (scores: number[]) => void
  ) => Promise<void>,
  start: () => Promise<void>,
  stop: () => Promise<void>,
  release: () => Promise<void>
} {
  const eagleRef = useRef<EagleWorker | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const speakerScoreCallbackRef = useRef<(scores: number[]) => void>(() => {});
  
  const init = useCallback(async (
    accessKey: string,
    model: {publicPath: string},
    speakerProfiles: EagleProfile | EagleProfile[],
    speakerScoreCallback: (scores: number[]) => void
  ) => {
    if (eagleRef.current) {
      console.error("Eagle worker already initialized. Call release() first.");
      return;
    }
    speakerScoreCallbackRef.current = speakerScoreCallback;
    try {
      eagleRef.current = await EagleWorker.create(
        accessKey,
        model,
        speakerProfiles,
      );
      setIsLoaded(true);
    } catch (e) {
      console.error(e);
    }
  }, []);
  
  const micDetectEngine = useRef<PvEngine>({
    onmessage: async (event: MessageEvent) => {
      if (!eagleRef.current) return;
      
      switch (event.data.command) {
        case "process":
          try {
            console.log("Eagle processing");
            const scores = await eagleRef.current.process(event.data.inputFrame);
            console.log("Updating scores", scores);
            speakerScoreCallbackRef.current(scores);
          } catch (e) {
            console.log("Error processing audio data with Eagle");
            return;
          }
          break;
      }
    }
  });
  
  const start = useCallback(async (): Promise<void> => {
    try {
      if (!eagleRef.current) {
        console.error("Eagle has not been initialized or has been released");
        return;
      }
      
      await WebVoiceProcessor.subscribe(micDetectEngine.current);
    } catch (e) {
      console.error("Error starting Eagle worker", e);
    }
  }, []);
  
  const stop = useCallback(async (): Promise<void> => {
    try {
      if (!eagleRef.current) {
        console.error("Eagle has not been initialized or has been released");
        return;
      }
      await WebVoiceProcessor.unsubscribe(micDetectEngine.current);
    } catch (e) {
      console.error("Error stopping Eagle worker", e)
    }
  }, []);
  
  const release = useCallback(async (): Promise<void> => {
    if (eagleRef.current) {
      await stop();
      eagleRef.current.terminate();
      eagleRef.current = null;
      
      setIsLoaded(false);
    }
  }, [stop]);
  
  useEffect(() => () => {
    if (eagleRef.current) {
      WebVoiceProcessor.unsubscribe(micDetectEngine.current).catch(e => console.log(e));
      eagleRef.current.terminate();
      eagleRef.current = null;
    }
  }, []);
  
  return {
    isLoaded,
    init,
    start,
    stop,
    release
  };
}
