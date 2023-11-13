import React, { useState, useEffect, useCallback } from 'react';
import OpenAI, { toFile } from 'openai';
import OpenAIConfig from "./OpenAIConfig.ts";

const openai = new OpenAI(OpenAIConfig);

let mediaRecorder: MediaRecorder;
let audioChunks: Blob[] = [];
const mimeType = 'audio/webm';

let sendToWhisperAPI: (audioChunks: Blob[]) => Promise<void>;

const startRecording = () => {
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
};

const stopRecording = () => {
  if (mediaRecorder) {
    mediaRecorder.stop();
  } else {
    console.log('MediaRecorder undefined');
  }
};

const App = () => {
  const [listening, setListening] = React.useState(false);
  const [conversationOpen, setConversationOpen] = React.useState(false);
  const [transcript, setTranscript] = React.useState('');
  const [message, setMessage] = React.useState('');
  
  const startConversation = () => {
    setConversationOpen(true);
    startRecording();
  }
  
  const stopConversation = () => {
    setConversationOpen(false);
    stopRecording();
  }
  
  sendToWhisperAPI = async (audioChunks: Blob[]) => {
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
  };
  
  React.useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'de-DE';
    
    recognition.onstart = () => {
      setListening(true);
    };
    
    recognition.onresult = (event) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript.trim();
        if (event.results[i].isFinal) {
          if (transcript.toLowerCase().includes('hallo computer')) {
            startConversation();
          }
          setTranscript(transcript);
        } else {
          setTranscript(transcript);
        }
      }
    };
    
    recognition.onend = () => {
      setListening(false);
    };
    
    recognition.start();
    
    return () => {
      recognition.stop();
    };
  }, []);
  
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