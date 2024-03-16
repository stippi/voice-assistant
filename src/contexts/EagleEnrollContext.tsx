import React, {createContext, useState, useEffect, ReactNode, useCallback, useRef} from 'react';
import {
  EagleProfile,
  EagleProfiler,
  EagleProfilerEnrollFeedback,
  EagleProfilerEnrollResult
} from "@picovoice/eagle-web";
import {WebVoiceProcessor} from '@picovoice/web-voice-processor';
import {PicoVoiceAccessKey} from "../config";
import {PvEngine} from '@picovoice/web-voice-processor/dist/types/types';

export type EagleEnrollContextType = {
  loaded: boolean
  enrolling: boolean
  percentage: number
  feedback: string
  start: (saveProfile: (profile: EagleProfile) => void) => Promise<void>
};

export const EagleEnrollContext = createContext<EagleEnrollContextType>({
  loaded: false,
  enrolling: false,
  percentage: 0,
  feedback: "",
  start: async () => {},
});

interface Props {
  children: ReactNode
}

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

export const EagleEnrollContextProvider: React.FC<Props>  = ({ children }) => {
  const [loaded, setLoaded] = useState(false);
  const [enrolling, setEnrolling] = useState(false);
  const [percentage, setPercentage] = useState(0);
  const [feedback, setFeedback] = useState("");

  const profilerRef = useRef<EagleProfiler>();
  
  useEffect(() => {
    EagleProfiler.create(
      PicoVoiceAccessKey,
      {
        publicPath: "models/eagle_params.pv"
      }).then(profiler => {
        profilerRef.current = profiler;
        setLoaded(true);
      });
    return () => {
      if (profilerRef.current) {
        profilerRef.current.release();
        profilerRef.current = undefined;
        setLoaded(false);
      }
    }
  }, []);
  
  const start = useCallback(async (saveProfile: (profile: EagleProfile) => void) => {
    if (!profilerRef.current) return;
    
    try {
      await profilerRef.current.reset();
    } catch (e) {
      console.error("Failed to reset EagleProfiler", e);
      return;
    }
    
    let audioData: Int16Array[] = [];
    
    const micEnrollEngine: PvEngine = {
      onmessage: async (event: MessageEvent) => {
        if (!profilerRef.current) return;
        
        switch (event.data.command) {
          case "process":
            audioData.push(event.data.inputFrame);
            if (audioData.length * 512 >= profilerRef.current.minEnrollSamples) {
              let result: EagleProfilerEnrollResult;
              try {
                const frames = new Int16Array(audioData.length * 512);
                for (let i = 0; i < audioData.length; i++) {
                  frames.set(audioData[i], i * 512);
                }
                audioData = [];
                result = await profilerRef.current.enroll(frames);
              } catch (e) {
                console.error("Failed to enroll", e);
                return;
              }
              
              setFeedback(getFeedbackMessage(result.feedback));
              setPercentage(result.percentage);

              if (result.percentage === 100) {
                await WebVoiceProcessor.unsubscribe(micEnrollEngine);
                setEnrolling(false);
                setFeedback("");
                setPercentage(0);
                try {
                  const profile = await profilerRef.current.export();
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
      await WebVoiceProcessor.subscribe(micEnrollEngine);
      setFeedback("");
      setPercentage(0);
      setEnrolling(true);
    } catch (e) {
      console.error("Failed to subscribe to WebVoiceProcessor", e);
      return;
    }
  }, []);
  
  return (
    <EagleEnrollContext.Provider
      value={{
        loaded,
        enrolling,
        percentage,
        feedback,
        start,
      }}>
      {children}
    </EagleEnrollContext.Provider>
  );
};
