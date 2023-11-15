import React, { useState, useEffect, useCallback, useRef } from 'react';
import './SpeechRecorder.css';

import MicIcon from '@mui/icons-material/Mic';
import RecordVoiceOverIcon from '@mui/icons-material/RecordVoiceOver';
import IconButton from '@mui/material/IconButton';

import OpenAI, { toFile } from 'openai';
import OpenAIConfig from "./../OpenAIConfig.ts";

const openai = new OpenAI(OpenAIConfig);

const mimeType = 'audio/webm';

const SpeechRecorder = ({sendMessage, setTranscript, defaultMessage}: Props) => {
  const [listening, setListening] = useState(false);
  const [conversationOpen, setConversationOpen] = useState(false);
  const [silenceTimer, setSilenceTimer] = useState<number | null>(null);
  
  const shouldRestartRecognition = useRef(false);
  const recognition = useRef(null);
  
  let mediaRecorder;
  let audioChunks = [];
  
  const startRecording = useCallback(() => {
    navigator.mediaDevices.getUserMedia({ audio: true, video: false })
      .then(stream => {
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
      mediaRecorder.stop();
    } else {
      console.log('MediaRecorder undefined');
    }
  }, []);
  
  const sendToWhisperAPI = useCallback(async (audioChunks) => {
    const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
    
    try {
      const transcription = await openai.audio.transcriptions.create({
        model: 'whisper-1',
        file: await toFile(audioBlob, 'audio.webm', { type: mimeType })
      });
      sendMessage(transcription.text);
    } catch (error) {
      console.error('Failed to send request to Whisper API', error);
    }
  }, [sendMessage]);
  
  const startConversation = useCallback(() => {
    setConversationOpen(true);
    startRecording();
  }, [startRecording]);
  
  const stopConversation = useCallback(() => {
    setConversationOpen(false);
    stopRecording();
    if (silenceTimer !== null) {
      clearTimeout(silenceTimer);
    }
  }, [stopRecording, silenceTimer]);
  
  useEffect(() => {
    recognition.current = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
    recognition.current.continuous = true;
    recognition.current.interimResults = true;
    recognition.current.lang = 'de-DE';
    
    recognition.current.onstart = () => {
      setListening(true);
      shouldRestartRecognition.current = true;
    };
    
    recognition.current.onend = () => {
      setListening(false);
      if (shouldRestartRecognition.current) {
        console.log('restarting speech recognition')
        recognition.current.start();
      }
    };
    
    console.log('starting speech recognition')
    recognition.current.start();
    
    return () => {
      console.log('stopping speech recognition')
      shouldRestartRecognition.current = false;
      recognition.current.stop();
    };
  }, []);
  
  const handleResult = useCallback((event) => {
    if (silenceTimer !== null) {
      clearTimeout(silenceTimer);
    }
    
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const currentTranscript = event.results[i][0].transcript.trim();
      setTranscript(currentTranscript);
      if (event.results[i].isFinal
        && !conversationOpen
        && currentTranscript.toLowerCase().includes('hallo computer')) {
        startConversation();
      }
    }
    
    const newTimer = setTimeout(() => {
      if (conversationOpen) {
        stopConversation();
      }
      setTranscript(defaultMessage);
    }, 3000);
    setSilenceTimer(newTimer);
  }, [conversationOpen, startConversation, stopConversation, silenceTimer, setTranscript]);
  
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
        color={listening ? "error" : "secondary"}
        onClick={stopConversation}
      >
        <RecordVoiceOverIcon />
      </IconButton>}
      {!conversationOpen && <IconButton
        area-label="start conversation"
        color={listening ? "error" : "secondary"}
        onClick={startConversation}
      >
        <MicIcon />
      </IconButton>}
    </div>
  );
};

interface Props {
  sendMessage: (message: string) => void;
  setTranscript: (transcript: string) => void;
  defaultMessage: string;
}

export default SpeechRecorder;