import { useCallback, useEffect, useRef, useState } from "react";
import { WebVoiceProcessor } from "@picovoice/web-voice-processor";
import { PvEngine } from "@picovoice/web-voice-processor/dist/types/types";

// Options for the Silence Detector
interface SilenceDetectorOptions {
  // Threshold for audio detection (RMS)
  threshold?: number;
  // Number of frames that must be below threshold to detect silence
  silenceFrames?: number;
  // Number of frames that must be above threshold to detect audio
  audioFrames?: number;
  // Callback function that returns the current audio level (0-1)
  onLevelChange?: (level: number) => void;
  // Callback function that is called when the state changes
  onStateChange?: (isSilent: boolean) => void;
}

// Root Mean Square calculation - measures average volume
function calculateRMS(buffer: Int16Array): number {
  let sum = 0;

  // Calculate square sum of all samples
  for (let i = 0; i < buffer.length; i++) {
    // Normalize to values between -1 and 1
    const sample = buffer[i] / 32768;
    sum += sample * sample;
  }

  // Calculate square root of average
  const rms = Math.sqrt(sum / buffer.length);
  return rms;
}

export function useSilenceDetector(options: SilenceDetectorOptions = {}) {
  const [isActive, setIsActive] = useState<boolean>(false);
  const [isSilent, setIsSilent] = useState<boolean>(true);
  const [currentLevel, setCurrentLevel] = useState<number>(0);

  // Default values for options
  const threshold = options.threshold ?? 0.01;  // ~-40dB
  const silenceFrames = options.silenceFrames ?? 5;  // approx. 250ms at 20ms frames
  const audioFrames = options.audioFrames ?? 2;  // approx. 40ms at 20ms frames

  // Counter for consecutive frames
  const silenceFrameCount = useRef<number>(0);
  const audioFrameCount = useRef<number>(0);

  // Reference to the engine
  const engineRef = useRef<PvEngine | null>(null);

  // Create engine instance
  useEffect(() => {
    // Create new engine instance that reacts to audio frames
    engineRef.current = {
      onmessage: (event: MessageEvent) => {
        if (event.data.command === "process") {
          const audioFrame: Int16Array = event.data.inputFrame;

          // Calculate RMS of frame
          const rms = calculateRMS(audioFrame);

          // Set current level and call optional callback
          setCurrentLevel(rms);
          options.onLevelChange?.(rms);

          // Detect silence or audio
          if (rms < threshold) {
            // Frame is below threshold (silent)
            silenceFrameCount.current++;
            audioFrameCount.current = 0;

            // If enough silent frames detected, set status to "silent"
            if (silenceFrameCount.current >= silenceFrames && !isSilent) {
              setIsSilent(true);
              options.onStateChange?.(true);
            }
          } else {
            // Frame is above threshold (audio)
            audioFrameCount.current++;
            silenceFrameCount.current = 0;

            // If enough audio frames detected, set status to "not silent"
            if (audioFrameCount.current >= audioFrames && isSilent) {
              setIsSilent(false);
              options.onStateChange?.(false);
            }
          }
        }
      }
    };

    // Cleanup on unmount
    return () => {
      if (isActive && engineRef.current) {
        WebVoiceProcessor.unsubscribe(engineRef.current).catch(e => console.error(e));
      }
      engineRef.current = null;
    };
  }, [threshold, silenceFrames, audioFrames, isSilent, isActive, options]);

  // Function to start detection
  const start = useCallback(async () => {
    if (!engineRef.current) {
      console.error("Silence detector engine is not initialized");
      return;
    }

    try {
      // Initialize WebVoiceProcessor and subscribe engine
      await WebVoiceProcessor.subscribe(engineRef.current);
      setIsActive(true);

      // Reset counters
      silenceFrameCount.current = 0;
      audioFrameCount.current = 0;
    } catch (e) {
      console.error("Error starting silence detector:", e);
    }
  }, []);

  // Function to stop detection
  const stop = useCallback(async () => {
    if (!engineRef.current || !isActive) {
      return;
    }

    try {
      await WebVoiceProcessor.unsubscribe(engineRef.current);
      setIsActive(false);
    } catch (e) {
      console.error("Error stopping silence detector:", e);
    }
  }, [isActive]);

  return {
    isActive,
    isSilent,
    currentLevel,
    start,
    stop
  };
}
