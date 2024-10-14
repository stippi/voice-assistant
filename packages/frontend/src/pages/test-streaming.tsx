import React, { useState, useEffect, useCallback, useRef } from "react";
import { AudioStreamingService } from "../services/AudioStreamingService";

const TestStreaming: React.FC = () => {
  const [audioService, setAudioService] = useState<AudioStreamingService | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const isPlayingRef = useRef(false);
  const audioContextRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    const service = new AudioStreamingService();
    service
      .connect()
      .then(() => {
        setAudioService(service);
        audioContextRef.current = service.getAudioContext();
      })
      .catch((error) => {
        console.error("Failed to connect AudioStreamingService:", error);
      });

    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  const generateSineWave = useCallback((frequency: number, duration: number) => {
    const sampleRate = 44100;
    const samples = duration * sampleRate;
    const buffer = new Int16Array(samples);
    for (let i = 0; i < samples; i++) {
      buffer[i] = Math.sin((2 * Math.PI * frequency * i) / sampleRate) * 0x7fff;
    }
    return buffer;
  }, []);

  const playAudio = useCallback(() => {
    if (isPlayingRef.current && audioService) {
      const sineWave = generateSineWave(440, 0.1); // 440 Hz, 0.1 second
      audioService.add16BitPCM(sineWave);
      requestAnimationFrame(playAudio);
    }
  }, [audioService, generateSineWave]);

  const toggleAudio = useCallback(() => {
    if (!audioService) return;

    const newIsPlaying = !isPlaying;
    setIsPlaying(newIsPlaying);
    isPlayingRef.current = newIsPlaying;

    if (newIsPlaying) {
      playAudio();
    } else {
      audioService.interrupt().catch((error) => {
        console.error("Failed to interrupt audio:", error);
      });
    }
  }, [audioService, isPlaying, playAudio]);

  return (
    <div>
      <h1>Audio Streaming Test</h1>
      <button onClick={toggleAudio} disabled={!audioService}>
        {isPlaying ? "Stop" : "Play"} Sine Wave
      </button>
      {!audioService && <p>Initializing audio service...</p>}
      <p>
        {isPlaying
          ? "Playing continuous sine wave. Listen for any clicks or pops."
          : "Click Play to start the sine wave."}
      </p>
    </div>
  );
};

export default TestStreaming;
