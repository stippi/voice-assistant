import React, { useState, useEffect, useCallback, useRef } from 'react';

import MicIcon from '@mui/icons-material/Mic';
import RecordVoiceOverIcon from '@mui/icons-material/RecordVoiceOver';
import IconButton from '@mui/material/IconButton';

import OpenAI, { toFile } from 'openai';
import {OpenAiConfig} from "../secrets.ts";
import {useSettings} from "../contexts/SettingsContext.tsx";

const openai = new OpenAI(OpenAiConfig);

let mimeType: string;
let audioExt: string;

if (MediaRecorder.isTypeSupported('audio/webm')) {
  mimeType = 'audio/webm';
  audioExt = 'webm';
} else if (MediaRecorder.isTypeSupported('audio/mp4')) {
  mimeType = 'audio/mp4';
  audioExt = 'mp4';
} else if (MediaRecorder.isTypeSupported('audio/ogg')) {
  mimeType = 'audio/ogg';
  audioExt = 'ogg';
} else if (MediaRecorder.isTypeSupported('audio/wav')) {
  mimeType = 'audio/wav';
  audioExt = 'wav';
} else {
  console.error('No supported MIME type for MediaRecorder found.');
}

const silenceTimeout = 1500;

const SpeechRecorder = ({sendMessage, setTranscript, defaultMessage, respondingRef}: Props) => {
  const [listening, setListening] = useState(false);
  const [conversationOpen, setConversationOpen] = useState(false);
  const [silenceTimer, setSilenceTimer] = useState<number | null>(null);
  
  const shouldRestartRecognition = useRef(false);
  const recognition = useRef<SpeechRecognition | null>(null);
  
  const { settings } = useSettings();
  const settingsRef = React.useRef(settings);
  
  React.useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);
  
  let mediaRecorder: MediaRecorder;
  let audioChunks: Blob[] = [];
  
  const recordingStartedRef = React.useRef(false);
  
  const startRecording = useCallback(() => {
    navigator.mediaDevices.getUserMedia({ audio: true, video: false })
      .then(stream => {
        recordingStartedRef.current = true;
        audioChunks = [];
        mediaRecorder = new MediaRecorder(stream, { mimeType });
        
        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunks.push(event.data);
          }
        };
        
        mediaRecorder.onstop = () => {
          console.log('stopped MediaRecorder');
          sendToWhisperAPI(audioChunks);
        };
        
        console.log('started MediaRecorder, MIME type:', mediaRecorder.mimeType);
        mediaRecorder.start(1000);
      })
      .catch(error => {
        console.log('Failed to start recorder', error);
      });
  }, []);
  
  const stopRecording = useCallback(() => {
    if (mediaRecorder) {
      recordingStartedRef.current = false;
      mediaRecorder.stop();
    } else {
      console.log('MediaRecorder undefined');
    }
  }, []);
  
  const sendToWhisperAPI = useCallback(async (audioChunks: Blob[]) => {
    const audioBlob = new Blob(audioChunks, { type: mimeType });
    
    try {
      const transcription = await openai.audio.transcriptions.create({
        model: 'whisper-1',
        file: await toFile(audioBlob, `audio.${audioExt}`, { type: mimeType })
      });
      sendMessage(transcription.text, true);
    } catch (error) {
      console.error('Failed to send request to Whisper API', error);
    }
  }, [sendMessage]);
  
  const startConversation = useCallback(() => {
    setConversationOpen(true);
    if (settingsRef.current.useWhisper) {
      startRecording();
    } else {
      console.log('started conversation without recording')
    }
  }, [startRecording]);
  
  const stopConversation = useCallback(() => {
    setConversationOpen(false);
    if (recordingStartedRef.current) {
      stopRecording();
    } else {
      console.log('stopped conversation')
    }
    if (silenceTimer !== null) {
      clearTimeout(silenceTimer);
    }
  }, [stopRecording, silenceTimer]);
  
  useEffect(() => {
    recognition.current = new SpeechRecognition();
    recognition.current.continuous = true;
    recognition.current.interimResults = true;
    recognition.current.lang = 'de-DE';
    
    recognition.current.onstart = () => {
      setListening(true);
      shouldRestartRecognition.current = settings.openMic;
    };
    
    recognition.current.onend = () => {
      setListening(false);
      if (shouldRestartRecognition.current && recognition.current) {
        console.log('restarting speech recognition')
        recognition.current.start();
      }
    };
    
    if (settings.openMic) {
      console.log('starting speech recognition')
      recognition.current.start();
    }
    
    return () => {
      console.log('stopping speech recognition')
      shouldRestartRecognition.current = false;
      if (recognition.current) {
        recognition.current.stop();
      }
    };
  }, [settings]);
  
  const handleResult = useCallback((event: SpeechRecognitionEvent) => {
    if (silenceTimer !== null) {
      clearTimeout(silenceTimer);
    }
    
    let currentTranscript = '';
    
    for (let i = event.resultIndex; i < event.results.length; i++) {
      currentTranscript = event.results[i][0].transcript.trim();
      if (!respondingRef.current) {
        setTranscript(currentTranscript);
      }
      if (/*event.results[i].isFinal
        &&*/ !conversationOpen
        && !respondingRef.current
        && currentTranscript.toLowerCase().includes(settings.triggerPhrase.toLowerCase())) {
        console.log('conversation started by trigger word');
        startConversation();
      }
    }
    
    const newTimer = window.setTimeout(() => {
      if (conversationOpen) {
        const triggerIndex = currentTranscript.toLowerCase().indexOf(settings.triggerPhrase.toLowerCase());
        if (triggerIndex >= 0) {
          currentTranscript = currentTranscript.substring(triggerIndex + settings.triggerPhrase.length).trim();
        }
        console.log(`transcript after silence: '${currentTranscript}'`);
        sendMessage(currentTranscript, true);
        stopConversation();
      }
      setTranscript(defaultMessage);
    }, silenceTimeout);
    setSilenceTimer(newTimer);
  }, [conversationOpen, startConversation, stopConversation, silenceTimer, setTranscript, settings, sendMessage]);
  
  useEffect(() => {
    if (recognition.current) {
      recognition.current.onresult = handleResult;
    }
    
    return () => {
      if (recognition.current) {
        recognition.current.onresult = null;
      }
    };
  }, [handleResult]);
  
  return (
    <div>
      {conversationOpen && <IconButton
        area-label="stop conversation"
        color="error"
        onClick={stopConversation}
      >
        <RecordVoiceOverIcon />
      </IconButton>}
      {!conversationOpen && <IconButton
        area-label="start conversation"
        color={listening ? "error" : "default"}
        onClick={startConversation}
      >
        <MicIcon />
      </IconButton>}
    </div>
  );
};

interface Props {
  sendMessage: (message: string, audible: boolean) => void;
  setTranscript: (transcript: string) => void;
  defaultMessage: string;
  respondingRef: React.MutableRefObject<boolean>;
}

export default SpeechRecorder;