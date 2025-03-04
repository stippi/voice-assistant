import OpenAI, { toFile } from "openai";
import { useCallback, useRef, useState } from "react";
import { transcriptionApiKey, transcriptionApiUrl, transcriptionModel } from "../config";
import { createPerformanceTrackingService } from "../services/PerformanceTrackingService";
import { playSound } from "../utils/audio";
import { textToLowerCaseWords } from "../utils/textUtils";
import { useSettings } from "./useSettings";

// Determine supported mime type
let mimeType: string;
let audioExt: string;

if (MediaRecorder.isTypeSupported("audio/webm")) {
  mimeType = "audio/webm";
  audioExt = "webm";
} else if (MediaRecorder.isTypeSupported("audio/mp4")) {
  mimeType = "audio/mp4";
  audioExt = "mp4";
} else if (MediaRecorder.isTypeSupported("audio/ogg")) {
  mimeType = "audio/ogg";
  audioExt = "ogg";
} else if (MediaRecorder.isTypeSupported("audio/wav")) {
  mimeType = "audio/wav";
  audioExt = "wav";
} else {
  console.error("No supported MIME type for MediaRecorder found.");
}

const openai = new OpenAI({
  apiKey: transcriptionApiKey,
  dangerouslyAllowBrowser: true,
  baseURL: transcriptionApiUrl,
});

export function useWhisperTranscription(
  onTranscriptionStart: (messageId: string) => void,
  onTranscriptionComplete: (messageId: string, text: string) => void,
) {
  const [isRecording, setIsRecording] = useState(false);
  const { settings } = useSettings();
  const settingsRef = useRef(settings);
  const performanceTrackingService = useRef(createPerformanceTrackingService());

  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);
  const recordingStartedRef = useRef(false);
  const voiceDetectedRef = useRef(false);

  const connectConversation = useCallback(() => {
    if (recordingStartedRef.current) return;

    setIsRecording(true);
    playSound("activation");
    document.dispatchEvent(new CustomEvent("reduce-volume"));

    const audioConstraints = {
      echoCancellation: true,
      channelCount: 1,
      autoGainControl: true,
    };

    recordingStartedRef.current = true;
    voiceDetectedRef.current = false;
    audioChunks.current = [];

    navigator.mediaDevices
      .getUserMedia({ audio: audioConstraints, video: false })
      .then((stream) => {
        mediaRecorder.current = new MediaRecorder(stream, { mimeType });

        mediaRecorder.current.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunks.current.push(event.data);
          }
        };

        mediaRecorder.current.onstop = async () => {
          stream.getTracks().forEach((track) => track.stop());
          console.log(`stopped MediaRecorder, voice detected: ${voiceDetectedRef.current}`);

          if (voiceDetectedRef.current) {
            const audioBlob = new Blob(audioChunks.current, { type: mimeType });
            const userMessageId = crypto.randomUUID();

            // const blobUrl = URL.createObjectURL(audioBlob);

            // const downloadLink = document.createElement("a");
            // downloadLink.href = blobUrl;
            // downloadLink.download = `audio.${audioExt}`;
            // downloadLink.textContent = "Download audio blob";

            // document.body.appendChild(downloadLink);

            performanceTrackingService.current.trackTimestamp(
              userMessageId,
              "transcription-started",
              new Date().getTime(),
            );

            onTranscriptionStart(userMessageId);

            openai.audio.transcriptions
              .create({
                model: transcriptionModel || "whisper-1",
                language: settingsRef.current.transcriptionLanguage.substring(0, 2),
                file: await toFile(audioBlob, `audio.${audioExt}`, {
                  type: mimeType,
                }),
              })
              .then((transcription) => {
                performanceTrackingService.current.trackTimestamp(
                  userMessageId,
                  "transcription-finished",
                  new Date().getTime(),
                );

                const words = textToLowerCaseWords(transcription.text);
                const stopWords = settingsRef.current.stopWords.map((word) => word.toLowerCase());

                if (words.every((word) => stopWords.includes(word))) {
                  console.log("conversation cancelled by stop word(s)");
                  onTranscriptionComplete(userMessageId, "");
                } else {
                  onTranscriptionComplete(userMessageId, transcription.text);
                }
              })
              .catch((error) => {
                console.error("Failed to send request to Whisper API", error);
                onTranscriptionComplete(userMessageId, "");
              });
          }
        };

        console.log("started MediaRecorder, MIME type:", mediaRecorder.current.mimeType);
        mediaRecorder.current.start();
      })
      .catch((error) => {
        console.error("Failed to start recorder", error);
        recordingStartedRef.current = false;
        setIsRecording(false);
      });
  }, [onTranscriptionStart, onTranscriptionComplete]);

  const disconnectConversation = useCallback(() => {
    if (!recordingStartedRef.current) return;

    if (mediaRecorder.current) {
      recordingStartedRef.current = false;
      mediaRecorder.current.stop();
      mediaRecorder.current = null;
    }

    document.dispatchEvent(new CustomEvent("restore-volume"));
    setIsRecording(false);
  }, []);

  const setVoiceDetected = useCallback((detected: boolean) => {
    voiceDetectedRef.current = detected;
  }, []);

  return {
    isRecording,
    connectConversation,
    disconnectConversation,
    setVoiceDetected,
  };
}
