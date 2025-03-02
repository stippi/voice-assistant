import MicIcon from "@mui/icons-material/Mic";
import RecordVoiceOverIcon from "@mui/icons-material/RecordVoiceOver";
import IconButton from "@mui/material/IconButton";
import { PorcupineDetection } from "@picovoice/porcupine-web";
import OpenAI, { toFile } from "openai";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { transcriptionApiKey, transcriptionApiUrl, transcriptionModel } from "../config";
import { useSettings, VoiceDetection } from "../hooks";
import { createPerformanceTrackingService } from "../services/PerformanceTrackingService";
import { playSound } from "../utils/audio";
import { textToLowerCaseWords } from "../utils/textUtils";

const openai = new OpenAI({
  apiKey: transcriptionApiKey,
  dangerouslyAllowBrowser: true,
  baseURL: transcriptionApiUrl,
});

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

interface Props {
  sendMessage: (id: string, message: string, audible: boolean) => void;
  stopResponding: (audible: boolean) => void;
  setTranscript: (transcript: string) => void;
  defaultMessage: string;
  responding: boolean;
  awaitSpokenResponse: boolean;
  listening: boolean;
  wakeWordDetection: PorcupineDetection | null;
  voiceDetection: VoiceDetection | null;
  startVoiceDetection: () => Promise<void>;
  stopVoiceDetection: () => Promise<void>;
}

const SpeechRecorder = ({
  sendMessage,
  stopResponding,
  setTranscript,
  defaultMessage,
  responding,
  awaitSpokenResponse,
  listening,
  wakeWordDetection,
  voiceDetection,
  startVoiceDetection,
  stopVoiceDetection,
}: Props) => {
  const [conversationOpen, setConversationOpen] = useState(false);

  const performanceTrackingServiceRef = useRef(createPerformanceTrackingService());

  const sendToWhisperAPI = useCallback(
    async (audioChunks: Blob[]) => {
      console.log(`received ${audioChunks.length} audio chunks`);
      const audioBlob = new Blob(audioChunks, { type: mimeType });

      // const blobUrl = URL.createObjectURL(audioBlob);

      // const downloadLink = document.createElement("a");
      // downloadLink.href = blobUrl;
      // downloadLink.download = `audio.${audioExt}`;
      // downloadLink.textContent = "Download audio blob";

      // document.body.appendChild(downloadLink);

      try {
        playSound("sending");
        const userMessageId = crypto.randomUUID();
        performanceTrackingServiceRef.current.trackTimestamp(
          userMessageId,
          "transcription-started",
          new Date().getTime(),
        );
        sendMessage(userMessageId, "", true);
        const transcription = await openai.audio.transcriptions.create({
          model: transcriptionModel || "whisper-1",
          language: settingsRef.current.transcriptionLanguage.substring(0, 2),
          file: await toFile(audioBlob, `audio.${audioExt}`, {
            type: mimeType,
          }),
        });
        performanceTrackingServiceRef.current.trackTimestamp(
          userMessageId,
          "transcription-finished",
          new Date().getTime(),
        );
        const words = textToLowerCaseWords(transcription.text);
        const stopWords = settingsRef.current.stopWords.map((word) => word.toLowerCase());
        if (words.every((word) => stopWords.includes(word))) {
          console.log("conversation cancelled by stop word(s)");
          sendMessage(userMessageId, "", false);
        } else {
          sendMessage(userMessageId, transcription.text, true);
        }
      } catch (error) {
        console.error("Failed to send request to Whisper API", error);
      }
    },
    [sendMessage],
  );

  const { settings } = useSettings();
  const settingsRef = React.useRef(settings);
  const sendToWhisperRef = React.useRef(sendToWhisperAPI);
  const respondingRef = React.useRef(responding);

  useEffect(() => {
    respondingRef.current = responding;
  }, [responding]);

  // Update refs
  useEffect(() => {
    settingsRef.current = settings;
    sendToWhisperRef.current = sendToWhisperAPI;
  }, [settings, sendToWhisperAPI]);

  const mediaRecorder = React.useRef<MediaRecorder | null>(null);
  const audioChunks = React.useRef<Blob[]>([]);

  const recordingStartedRef = React.useRef(false);
  const voiceDetectedRef = React.useRef(false);

  const startRecording = useCallback(() => {
    if (recordingStartedRef.current) {
      return;
    }
    const audioConstraints = {
      echoCancellation: true,
      channelCount: 1,
      autoGainControl: false,
    };
    recordingStartedRef.current = true;
    navigator.mediaDevices
      .getUserMedia({ audio: audioConstraints, video: false })
      .then((stream) => {
        voiceDetectedRef.current = false;
        audioChunks.current = [];
        mediaRecorder.current = new MediaRecorder(stream, { mimeType });

        mediaRecorder.current.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunks.current.push(event.data);
          }
        };

        mediaRecorder.current.onstop = () => {
          stream.getTracks().forEach((track) => track.stop());
          console.log(`stopped MediaRecorder, voice detected: ${voiceDetectedRef.current}`);
          if (voiceDetectedRef.current) {
            sendToWhisperRef.current(audioChunks.current).catch((error) => {
              console.error("Failed to send audio to Whisper API", error);
            });
          }
        };

        console.log("started MediaRecorder, MIME type:", mediaRecorder.current.mimeType);
        mediaRecorder.current.start();
      })
      .catch((error) => {
        console.error("Failed to start recorder", error);
      });
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorder.current) {
      recordingStartedRef.current = false;
      mediaRecorder.current.stop();
      mediaRecorder.current = null;
    } else {
      console.error("MediaRecorder undefined");
    }
  }, []);

  const startConversation = useCallback(() => {
    setConversationOpen(true);
    playSound("activation");
    // Send the "reduce-volume" custom event
    document.dispatchEvent(new CustomEvent("reduce-volume"));
    if (settingsRef.current.useWhisper) {
      // Start voice detection to monitor for silence
      startVoiceDetection().catch((error) => console.error("Failed to start voice detection", error));
      startRecording();
    } else {
      console.log("started conversation without recording");
    }
  }, [startRecording, startVoiceDetection]);

  const stopConversation = useCallback(() => {
    setConversationOpen(false);
    document.dispatchEvent(new CustomEvent("restore-volume"));
    if (recordingStartedRef.current) {
      stopRecording();
      // Stop voice detection when recording stops
      stopVoiceDetection().catch((error) => console.error("Failed to stop voice detection", error));
    } else {
      console.log("stopped conversation");
    }
    // Reset transcript
    setTranscript(defaultMessage);
  }, [stopRecording, stopVoiceDetection, setTranscript, defaultMessage]);

  const conversationOpenRef = React.useRef(conversationOpen);
  const startConversationRef = React.useRef(startConversation);
  const stopRespondingRef = React.useRef(stopResponding);

  useEffect(() => {
    conversationOpenRef.current = conversationOpen;
    startConversationRef.current = startConversation;
    stopRespondingRef.current = stopResponding;
  }, [conversationOpen, startConversation, stopResponding]);

  // React to external wakeWordDetection
  useEffect(() => {
    if (wakeWordDetection) {
      console.log("wake word detected in SpeechRecorder");
      if (!conversationOpenRef.current) {
        if (respondingRef.current) {
          stopRespondingRef.current(true);
        }
        startConversationRef.current();
      }
    }
  }, [wakeWordDetection]);

  // React to silence detection from voice detection hook
  useEffect(() => {
    if (conversationOpen && voiceDetection?.silenceDetected) {
      console.log("silence detected in SpeechRecorder, stopping conversation");
      if (voiceDetection.voiceDetected) {
        // Only stop if voice was first detected (avoid stopping right after starting)
        stopConversation();
      }
    } else if (conversationOpen && voiceDetection?.voiceDetected) {
      voiceDetectedRef.current = true;
    }
  }, [voiceDetection, conversationOpen, stopConversation]);

  // Auto-start conversation after assistant has finished speaking
  useEffect(() => {
    if (awaitSpokenResponse && !conversationOpen) {
      startConversation();
    }
  }, [awaitSpokenResponse, conversationOpen, startConversation]);

  return (
    <div>
      {conversationOpen && (
        <IconButton area-label="stop conversation" color="error" onClick={stopConversation}>
          <RecordVoiceOverIcon />
        </IconButton>
      )}
      {!conversationOpen && (
        <IconButton area-label="start conversation" color={listening ? "error" : "default"} onClick={startConversation}>
          <MicIcon />
        </IconButton>
      )}
    </div>
  );
};

export default SpeechRecorder;
