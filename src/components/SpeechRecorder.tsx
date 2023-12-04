import React, { useState, useEffect, useCallback, useRef } from 'react';

import MicIcon from '@mui/icons-material/Mic';
import RecordVoiceOverIcon from '@mui/icons-material/RecordVoiceOver';
import IconButton from '@mui/material/IconButton';

import OpenAI, { toFile } from 'openai';
import {OpenAiConfig, PorcupineAccessKey} from "../secrets";
import useSettings from "../hooks/useSettings";
import {playSound, getAudioContext} from "../utils/audio";
import {usePorcupine} from "@picovoice/porcupine-react";
import {BuiltInKeyword} from "@picovoice/porcupine-web";

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

const SpeechRecorder = ({sendMessage, setTranscript, defaultMessage, respondingRef, awaitSpokenResponse}: Props) => {
  const [listening, setListening] = useState(false);
  const [conversationOpen, setConversationOpen] = useState(false);
  const [silenceTimer, setSilenceTimer] = useState<number | null>(null);
  
  const shouldRestartRecognition = useRef(false);
  const recognition = useRef<SpeechRecognition | null>(null);
  
  const {
    keywordDetection,
    isLoaded,
    isListening,
//    error,
    init,
    start,
    stop,
//    release
  } = usePorcupine();
  
  useEffect(() => {
    if (PorcupineAccessKey.length === 0) {
      return;
    }
    
    init(
      PorcupineAccessKey,
      [BuiltInKeyword.Computer],
      {
        publicPath: "models/porcupine_params.pv",
        customWritePath: "3.0.0_porcupine_params.pv",
      }
    ).then(() => {
      console.log('Porcupine initialized');
    });
  }, [init])
  
  const sendToWhisperAPI = useCallback(async (audioChunks: Blob[]) => {
    // console.log(`received ${audioChunks.length} audio chunks`);
    // if (audioChunks.length > 4) {
    //   const partialBlob = new Blob(audioChunks.slice(2, 2 + (audioChunks.length + 1) / 2), { type: mimeType })
    //   const avgVolumePartial = await measureVolume(partialBlob);
    //   console.log(`average volume of partial blob: ${avgVolumePartial}`);
    // }

    const audioBlob = new Blob(audioChunks, { type: mimeType });
    
    // const avgVolume = await measureVolume(audioBlob);
    // if (avgVolume < 0.2) {
    //   console.log(`silence threshold not reached (${avgVolume}), not sending to Whisper API`);
    //   return;
    // } else {
    //   console.log(`silence threshold reached (${avgVolume}), sending to Whisper API`);
    // }

    try {
      const transcription = await openai.audio.transcriptions.create({
        model: 'whisper-1',
        language: 'de', // TODO: make configurable
        file: await toFile(audioBlob, `audio.${audioExt}`, { type: mimeType })
      });
      sendMessage(transcription.text, true);
    } catch (error) {
      console.error('Failed to send request to Whisper API', error);
    }
  }, [sendMessage]);

  const { settings } = useSettings();
  const settingsRef = React.useRef(settings);
  const sendToWhisperRef = React.useRef(sendToWhisperAPI);
  const isPorcupineLoadedRef = React.useRef(isLoaded);
  
  // Update refs
  React.useEffect(() => {
    settingsRef.current = settings;
    sendToWhisperRef.current = sendToWhisperAPI;
    isPorcupineLoadedRef.current = isLoaded;
  }, [settings, sendToWhisperAPI, isLoaded]);
  
  // Start Porcupine wake word detection depending on settings and whether it is loaded
  useEffect(() => {
    if (isLoaded && settings.openMic && !isListening) {
      console.log('starting wake-word detection');
      start().catch((error) => {
        console.log("failed to start Porcupine wake-word detection", error);
      });
    }
    return () => {
      if (isListening) {
        console.log('stopping wake-word detection');
        stop().catch((error) => {
          console.log("failed to stop Porcupine wake-word detection", error);
        });
      }
    }
  }, [start, stop, isListening, isLoaded, settings])

  const mediaRecorder = React.useRef<MediaRecorder | null>(null);
  const audioChunks  = React.useRef<Blob[]>([]);
  
  const recordingStartedRef = React.useRef(false);
  
  const startRecording = useCallback(() => {
    const audioConstraints = {
      echoCancellation: true,
      noiseSuppression: true,
      channelCount: 1,
      autoGainControl: false
    };
    navigator.mediaDevices.getUserMedia({ audio: audioConstraints, video: false })
      .then(stream => {
        recordingStartedRef.current = true;
        audioChunks.current = [];
        mediaRecorder.current = new MediaRecorder(stream, { mimeType });
        
        mediaRecorder.current.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunks.current.push(event.data);
          }
        };
        
        // Setup analysis
        const audioContext = getAudioContext();
        const audioStreamSource = audioContext.createMediaStreamSource(stream);
        const analyser = audioContext.createAnalyser();
        analyser.minDecibels = -40;
        audioStreamSource.connect(analyser);
        const bufferLength = analyser.frequencyBinCount;
        const domainData = new Uint8Array(bufferLength);
        
        // Silence detection loop
        const time = new Date();
        let lastDetectedTime = time.getTime();
        let anySoundDetected = false;
        const detectSound = () => {
          if (!recordingStartedRef.current) {
            return;
          }
          
          const currentTime = new Date().getTime();
          if (currentTime > lastDetectedTime + 2500) {
            console.log("silence detected");
            stopConversation();
            return;
          }
          
          // Sound detection:
          analyser.getByteFrequencyData(domainData);
          for (let i = 0; i < bufferLength; i++) {
            if (domainData[i] > 0) {
              anySoundDetected = true;
              lastDetectedTime = new Date().getTime();
            }
          }
          
          // Continue the loop
          window.requestAnimationFrame(detectSound);
        };

        window.requestAnimationFrame(detectSound);
        
        mediaRecorder.current.onstop = () => {
          // analyser.disconnect();
          // audioContext.close().then(() => {
          //   console.log("audio context closed");
          // });
          stream.getTracks().forEach(track => track.stop());
          console.log(`stopped MediaRecorder, sound detected: ${anySoundDetected}`);
          if (anySoundDetected) {
            sendToWhisperRef.current(audioChunks.current).catch(error => {
              console.error('Failed to send audio to Whisper API', error);
            });
          }
        };
        
        console.log('started MediaRecorder, MIME type:', mediaRecorder.current.mimeType);
        mediaRecorder.current.start(1000);
      })
      .catch(error => {
        console.log('Failed to start recorder', error);
      });
  }, []);
  
  const stopRecording = useCallback(() => {
    if (mediaRecorder.current) {
      recordingStartedRef.current = false;
      mediaRecorder.current.stop();
    } else {
      console.log('MediaRecorder undefined');
    }
  }, []);
  
  const startConversation = useCallback(() => {
    setConversationOpen(true);
    playSound('activation');
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
    if (keywordDetection !== null) {
      startConversation();
    }
  }, [keywordDetection, startConversation])
  
  useEffect(() => {
    recognition.current = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
    recognition.current.continuous = true;
    recognition.current.interimResults = true;
    recognition.current.lang = 'de-DE'; // TODO: Make configurable
    
    recognition.current.onstart = () => {
      setListening(true);
      shouldRestartRecognition.current = settingsRef.current.openMic;
    };
    
    recognition.current.onend = () => {
      setListening(false);
      if (shouldRestartRecognition.current && recognition.current && settingsRef.current.openMic) {
        console.log('restarting speech recognition');
        recognition.current.start();
      }
    };
    
    if (settingsRef.current.openMic && !isPorcupineLoadedRef.current) {
      console.log('starting speech recognition');
      recognition.current.start();
    }
    
    return () => {
      console.log('stopping speech recognition')
      shouldRestartRecognition.current = false;
      if (recognition.current) {
        recognition.current.stop();
      }
    };
  }, []);
  
  const openMicRef = React.useRef(settings.openMic);
  
  useEffect(() => {
    if (!isLoaded && recognition.current && openMicRef.current !== settings.openMic) {
      openMicRef.current = settings.openMic;
      if (settings.openMic) {
        console.log('open mic changed: starting speech recognition')
        recognition.current.start();
      } else {
        console.log('open mic changed: stopping speech recognition')
        recognition.current.stop();
      }
    }
  }, [settings, isLoaded]);
  
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
        if (!settingsRef.current.useWhisper) {
          console.log(`transcript after silence: '${currentTranscript}'`);
          sendMessage(currentTranscript, true);
        }
        stopConversation();
      }
      setTranscript(defaultMessage);
    }, silenceTimeout);
    setSilenceTimer(newTimer);
  }, [
    conversationOpen,
    startConversation,
    stopConversation,
    silenceTimer,
    setTranscript,
    settings,
    sendMessage,
    defaultMessage
  ]);
  
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
  
  if (awaitSpokenResponse && !conversationOpen) {
    startConversation();
  }
  
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
        color={isListening || listening ? "error" : "default"}
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
  awaitSpokenResponse: boolean;
}

export default SpeechRecorder;