import {PvEngine} from "@picovoice/web-voice-processor/dist/types/types";
import {useCallback, useEffect, useRef, useState} from "react";
import {
  EagleProfile,
  EagleProfiler,
  EagleProfilerEnrollFeedback,
  EagleProfilerEnrollResult
} from "@picovoice/eagle-web";
import {WebVoiceProcessor} from "@picovoice/web-voice-processor";

function getFeedbackMessage(feedback: EagleProfilerEnrollFeedback): string {
  switch (feedback) {
    case EagleProfilerEnrollFeedback.AUDIO_TOO_SHORT:
      return "Insufficient audio length";
    case EagleProfilerEnrollFeedback.UNKNOWN_SPEAKER:
      return "Different speaker detected in audio";
    case EagleProfilerEnrollFeedback.NO_VOICE_FOUND:
      return "Unable to detect voice in audio";
    case EagleProfilerEnrollFeedback.QUALITY_ISSUE:
      return "Audio quality too low to use for enrollment";
    default:
      return "Enrolling speaker...";
  }
}

export function useEagleProfiler(): {
  isLoaded: boolean,
  init: (
    accessKey: string,
    model: {publicPath: string}
  ) => Promise<void>,
  start: (saveProfile: (profile: EagleProfile) => void) => Promise<void>,
  stop: () => Promise<void>,
  release: () => Promise<void>,
  enrolling: boolean,
  percentage: number,
  feedback: string,
} {
  const eagleRef = useRef<EagleProfiler | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [enrolling, setEnrolling] = useState(false);
  const [percentage, setPercentage] = useState<number>(0);
  const [feedback, setFeedback] = useState("");
  
  const init = useCallback(async (
    accessKey: string,
    model: {publicPath: string}
  ) => {
    try {
      if (!eagleRef.current) {
        eagleRef.current = await EagleProfiler.create(
          accessKey,
          model
        );
        setIsLoaded(true);
      }
    } catch (e) {
      console.error(e);
    }
  }, []);
  
  const micEnrollEngine = useRef<PvEngine | null>(null);
  
  const start = useCallback(async (saveProfile: (profile: EagleProfile) => void): Promise<void> => {
    if (!eagleRef.current) return;
    
    try {
      await eagleRef.current.reset();
    } catch (e) {
      console.error("Failed to reset Eagle Profiler", e);
      return;
    }
    
    let audioData: Int16Array[] = [];
    
    micEnrollEngine.current = {
      onmessage: async (event: MessageEvent) => {
        if (!eagleRef.current) return;
        
        switch (event.data.command) {
          case "process":
            audioData.push(event.data.inputFrame);
            if (audioData.length * 512 >= eagleRef.current.minEnrollSamples) {
              let result: EagleProfilerEnrollResult;
              try {
                const frames = new Int16Array(audioData.length * 512);
                for (let i = 0; i < audioData.length; i++) {
                  frames.set(audioData[i], i * 512);
                }
                audioData = [];
                result = await eagleRef.current.enroll(frames);
              } catch (e) {
                console.error("Failed to enroll", e);
                return;
              }
              
              setFeedback(getFeedbackMessage(result.feedback));
              setPercentage(result.percentage);
              
              if (result.percentage === 100) {
                if (micEnrollEngine.current) {
                  await WebVoiceProcessor.unsubscribe(micEnrollEngine.current);
                }
                setEnrolling(false);
                setFeedback("");
                setPercentage(0);
                try {
                  const profile = await eagleRef.current.export();
                  console.log("Enrollment for speaker complete.");
                  saveProfile(profile);
                } catch (e) {
                  console.error("Failed to enroll speaker", e);
                }
              }
            }
            break;
        }
      }
    }
    
    try {
      await WebVoiceProcessor.subscribe(micEnrollEngine.current);
      setFeedback("");
      setPercentage(0);
      setEnrolling(true);
    } catch (e) {
      console.error("Failed to subscribe to WebVoiceProcessor", e);
      return;
    }
  }, []);
  
  const stop = useCallback(async (): Promise<void> => {
    try {
      if (!eagleRef.current) {
        console.error("Eagle Profiler has not been initialized or has been released");
        return;
      }
      if (micEnrollEngine.current) {
        await WebVoiceProcessor.unsubscribe(micEnrollEngine.current);
      }
    } catch (e) {
      console.error("Error stopping Eagle Profiler", e)
    }
  }, []);
  
  const release = useCallback(async (): Promise<void> => {
    if (eagleRef.current) {
      await stop();
      await eagleRef.current.release();
      eagleRef.current = null;
      console.log("Eagle Profiler released");
      
      setIsLoaded(false);
    }
  }, [stop]);
  
  useEffect(() => () => {
    if (micEnrollEngine.current) {
      WebVoiceProcessor.unsubscribe(micEnrollEngine.current).catch(e => console.log(e));
    }
    if (eagleRef.current) {
      eagleRef.current.release();
      console.log("Eagle Profiler released");
      eagleRef.current = null;
    }
  }, []);
  
  return {
    isLoaded,
    init,
    start,
    stop,
    release,
    enrolling,
    percentage,
    feedback
  };
}
