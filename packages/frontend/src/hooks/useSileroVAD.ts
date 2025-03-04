import { useCallback, useEffect, useRef, useState } from "react";
import { WebVoiceProcessor } from "@picovoice/web-voice-processor";
import { PvEngine } from "@picovoice/web-voice-processor/dist/types/types";

// Type definitions for Silero VAD Worker
interface SileroVADWorker {
  create: (options: SileroVADOptions, callback: VoiceProbabilityCallback) => Promise<SileroVADWorker>;
  process: (audioFrame: Int16Array) => void;
  terminate: () => void;
}

interface SileroVADOptions {
  threshold?: number;    // Voice detection threshold (default: 0.5)
  minSpeechFrames?: number; // Minimum number of speech frames to trigger detection (default: 2)
  silenceFrames?: number;  // Number of silence frames before silence is detected (default: 5)
  modelUrl?: string;    // URL to the Silero VAD model
}

type VoiceProbabilityCallback = (probability: number) => void;

// Helper function to create a Web Worker for Silero VAD
const createSileroVADWorker = (
  options: SileroVADOptions,
  callback: VoiceProbabilityCallback
): Promise<SileroVADWorker> => {
  return new Promise((resolve, reject) => {
    // This worker code would need to be placed in a separate file
    // and loaded via URL.createObjectURL or served as a static asset
    const workerCode = `
      // Worker implementation for Silero VAD
      // This is a simplified example and would need to be replaced
      // with the actual Silero VAD WASM implementation

      // In a real implementation, you would:
      // 1. Load the Silero model using TensorFlow.js or ONNX runtime
      // 2. Process audio frames and compute speech probabilities
      // 3. Return the results to the main thread

      let model = null;
      let threshold = 0.5;
      let minSpeechFrames = 2;
      let silenceFrames = 5;

      self.onmessage = async (e) => {
        if (e.data.command === 'init') {
          // Initialize with options
          threshold = e.data.options.threshold || threshold;
          minSpeechFrames = e.data.options.minSpeechFrames || minSpeechFrames;
          silenceFrames = e.data.options.silenceFrames || silenceFrames;

          try {
            // In a real implementation, load the model here
            // model = await tf.loadGraphModel(e.data.options.modelUrl);

            // For now, we'll just simulate model loading
            console.log("Silero VAD model initialized");
            self.postMessage({ status: 'ready' });
          } catch (error) {
            self.postMessage({ status: 'error', error: error.message });
          }
        } else if (e.data.command === 'process') {
          // Process audio frame
          const audioFrame = e.data.frame;

          // In a real implementation, run inference on the model
          // const tensor = tf.tensor(audioFrame);
          // const prediction = model.predict(tensor);
          // const probability = prediction.dataSync()[0];

          // For now, we'll just simulate detection with random values
          // This should be replaced with actual model inference
          const probability = Math.random() > 0.8 ? 0.9 : 0.1;

          self.postMessage({
            status: 'result',
            probability: probability
          });
        } else if (e.data.command === 'terminate') {
          // Clean up resources
          if (model) {
            // model.dispose();
          }
          self.close();
        }
      };
    `;

    // Create a blob URL for the worker
    const blob = new Blob([workerCode], { type: 'application/javascript' });
    const workerUrl = URL.createObjectURL(blob);
    const worker = new Worker(workerUrl);

    // Set up worker message handling
    worker.onmessage = (e) => {
      if (e.data.status === 'ready') {
        // Worker is ready, resolve the promise
        resolve({
          create: async () => Promise.resolve(worker as unknown as SileroVADWorker),
          process: (audioFrame: Int16Array) => {
            worker.postMessage({
              command: 'process',
              frame: audioFrame
            });
          },
          terminate: () => {
            worker.postMessage({ command: 'terminate' });
            URL.revokeObjectURL(workerUrl);
          }
        } as SileroVADWorker);
      } else if (e.data.status === 'result') {
        // Process detection result
        callback(e.data.probability);
      } else if (e.data.status === 'error') {
        // Handle error
        reject(new Error(e.data.error));
      }
    };

    // Initialize the worker
    worker.postMessage({
      command: 'init',
      options: options
    });
  });
};

// Create a processor that can be used with WebVoiceProcessor
class SileroVADProcessor implements PvEngine {
  private sileroWorker: SileroVADWorker | null = null;

  constructor(worker: SileroVADWorker) {
    this.sileroWorker = worker;
  }

  // Required by WebVoiceProcessor
  onmessage(event: MessageEvent): void {
    if (event.data.command === 'process') {
      if (this.sileroWorker) {
        this.sileroWorker.process(event.data.inputFrame);
      }
    }
  }

  terminate(): void {
    if (this.sileroWorker) {
      this.sileroWorker.terminate();
      this.sileroWorker = null;
    }
  }
}

// The hook that can be used as a replacement for useCobraWorker
export function useSileroVAD(): {
  isLoaded: boolean,
  init: (
    voiceProbabilityCallback: (probability: number) => void,
    options?: SileroVADOptions
  ) => Promise<void>,
  start: () => Promise<void>,
  stop: () => Promise<void>,
  release: () => Promise<void>,
} {
  const processorRef = useRef<SileroVADProcessor | null>(null);
  const workerRef = useRef<SileroVADWorker | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  const init = useCallback(async (
    voiceProbabilityCallback: (probability: number) => void,
    options: SileroVADOptions = {}
  ) => {
    if (workerRef.current) {
      console.error("Silero VAD worker already initialized. Call release() first.");
      return;
    }

    try {
      // Create the worker with default or custom options
      const defaultOptions: SileroVADOptions = {
        threshold: 0.5,
        minSpeechFrames: 2,
        silenceFrames: 5,
        modelUrl: '/models/silero_vad.onnx', // Path to your model file
        ...options
      };

      workerRef.current = await createSileroVADWorker(
        defaultOptions,
        voiceProbabilityCallback
      );

      processorRef.current = new SileroVADProcessor(workerRef.current);
      setIsLoaded(true);
    } catch (e) {
      console.error("Error initializing Silero VAD:", e);
    }
  }, []);

  const start = useCallback(async (): Promise<void> => {
    try {
      if (!processorRef.current) {
        console.error("Silero VAD has not been initialized or has been released");
        return;
      }

      await WebVoiceProcessor.subscribe(processorRef.current);
    } catch (e) {
      console.error("Error starting Silero VAD worker", e);
    }
  }, []);

  const stop = useCallback(async (): Promise<void> => {
    try {
      if (!processorRef.current) {
        console.error("Silero VAD has not been initialized or has been released");
        return;
      }

      await WebVoiceProcessor.unsubscribe(processorRef.current);
    } catch (e) {
      console.error("Error stopping Silero VAD worker", e);
    }
  }, []);

  const release = useCallback(async (): Promise<void> => {
    if (processorRef.current) {
      await stop();
      processorRef.current.terminate();
      processorRef.current = null;
      workerRef.current = null;
      setIsLoaded(false);
    }
  }, [stop]);

  // Clean up on unmount
  useEffect(() => () => {
    if (processorRef.current) {
      WebVoiceProcessor.unsubscribe(processorRef.current).catch(e => console.error(e));
      processorRef.current.terminate();
      processorRef.current = null;
      workerRef.current = null;
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
