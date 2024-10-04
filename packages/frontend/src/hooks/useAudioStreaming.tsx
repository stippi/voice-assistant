import { useState, useEffect } from "react";
import { AudioStreamingService } from "../services/AudioStreamingService";

export function useAudioStreaming() {
  const [service, setService] = useState<AudioStreamingService | null>(null);

  useEffect(() => {
    const audioService = new AudioStreamingService();
    audioService.initialize().then(() => {
      setService(audioService);
    });

    return () => {
      audioService.close();
    };
  }, []);

  const pushAudioBuffer = (buffer: Float32Array) => {
    service?.pushAudioBuffer(buffer);
  };

  return {
    isReady: !!service,
    pushAudioBuffer,
    start: () => service?.start(),
    stop: () => service?.stop(),
  };
}
