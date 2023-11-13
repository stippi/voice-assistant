import React, { useState, useEffect, useCallback } from 'react';
import OpenAI, { toFile } from 'openai';
import OpenAIConfig from "./OpenAIConfig.ts";

const openai = new OpenAI(OpenAIConfig);

const mimeType = 'audio/webm';

const App = () => {
  const [listening, setListening] = useState(false);
  const [conversationOpen, setConversationOpen] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [message, setMessage] = useState('');
  const [silenceTimer, setSilenceTimer] = useState<number | null>(null);
  
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
      
      console.log(transcription.text);
      setMessage(transcription.text);
    } catch (error) {
      console.error('Failed to send request to Whisper API', error);
    }
  }, []);
  
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
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'de-DE';
    
    recognition.onstart = () => {
      setListening(true);
    };
    
    recognition.onresult = (event) => {
      if (silenceTimer !== null) {
        clearTimeout(silenceTimer);
      }
      
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const currentTranscript = event.results[i][0].transcript.trim();
        setTranscript(currentTranscript);
        if (event.results[i].isFinal && currentTranscript.toLowerCase().includes('hallo computer')) {
          startConversation();
        }
      }
      
      if (conversationOpen) {
        const newTimer = setTimeout(() => {
          stopConversation();
        }, 3000);
        setSilenceTimer(newTimer);
      }
    };
    
    recognition.onend = () => {
      setListening(false);
    };
    
    recognition.start();
    
    return () => {
      recognition.stop();
      if (silenceTimer !== null) {
        clearTimeout(silenceTimer);
      }
    };
  }, [startConversation, stopConversation, conversationOpen, silenceTimer]);
  
  return (
    <div>
      <h1>{listening ? 'Listening...' : 'Ready'}</h1>
      <p>{transcript}</p>
      <button onClick={startConversation} disabled={conversationOpen}>Start Conversation</button>
      <button onClick={stopConversation} disabled={!conversationOpen}>Get Transcript</button>
      <p>{message}</p>
    </div>
  );
};

export default App;