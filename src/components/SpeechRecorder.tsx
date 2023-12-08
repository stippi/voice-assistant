import React, { useState, useEffect, useCallback, useRef } from 'react';

import MicIcon from '@mui/icons-material/Mic';
import RecordVoiceOverIcon from '@mui/icons-material/RecordVoiceOver';
import IconButton from '@mui/material/IconButton';

import OpenAI, { toFile } from 'openai';
import {OpenAiConfig, PicoVoiceAccessKey} from "../secrets";
import useSettings from "../hooks/useSettings";
import {playSound} from "../utils/audio";
import {usePorcupine} from "@picovoice/porcupine-react";
import {BuiltInKeyword} from "@picovoice/porcupine-web";
import { CobraWorker } from "@picovoice/cobra-web";
import { WebVoiceProcessor } from "@picovoice/web-voice-processor";

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

const silenceTimeout = 2500;

const SpeechRecorder = ({sendMessage, setTranscript, defaultMessage, respondingRef, awaitSpokenResponse}: Props) => {
  const [listening, setListening] = useState(false);
  const [conversationOpen, setConversationOpen] = useState(false);
  const [silenceTimer, setSilenceTimer] = useState<number | null>(null);
  
  const shouldRestartRecognition = useRef(false);
  const recognition = useRef<SpeechRecognition | null>(null);
  const cobra = useRef<CobraWorker | null>(null);
  
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
  
  const sendToWhisperAPI = useCallback(async (audioChunks: Blob[]) => {
    console.log(`received ${audioChunks.length} audio chunks`);
    const audioBlob = new Blob(audioChunks, { type: mimeType });
    
    // const blobUrl = URL.createObjectURL(audioBlob);
    //
    // const downloadLink = document.createElement('a');
    // downloadLink.href = blobUrl;
    // downloadLink.download = `audio.${audioExt}`; // Dateiname und Erweiterung anpassen
    // downloadLink.textContent = 'Lade die Audio-Datei herunter';
    //
    // document.body.appendChild(downloadLink);
    
    try {
      playSound('sending');
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
    console.log(`Porcupine loaded: ${isLoaded}, listeing: ${isListening}`);
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
  const voiceDetectedRef = React.useRef(false);
  
  const startRecording = useCallback(() => {
    if (recordingStartedRef.current) {
      return;
    }
    const audioConstraints = {
      echoCancellation: true,
      channelCount: 1,
      autoGainControl: false
    };
    recordingStartedRef.current = true;
    navigator.mediaDevices.getUserMedia({ audio: audioConstraints, video: false })
      .then(stream => {
        voiceDetectedRef.current = false;
        audioChunks.current = [];
        mediaRecorder.current = new MediaRecorder(stream, { mimeType });
        
        mediaRecorder.current.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunks.current.push(event.data);
          }
        };
        
        if (cobra.current) {
          WebVoiceProcessor.subscribe(cobra.current).catch((error) => {
            console.error('failed to subscribe to Cobra', error);
          });
        }
        
        mediaRecorder.current.onstop = () => {
          if (cobra.current) {
            WebVoiceProcessor.unsubscribe(cobra.current).catch((error) => {
              console.error('failed to unsubscribe from Cobra', error);
            });
          }
          stream.getTracks().forEach(track => track.stop());
          console.log(`stopped MediaRecorder, voice detected: ${voiceDetectedRef.current}`);
          if (voiceDetectedRef.current) {
            sendToWhisperRef.current(audioChunks.current).catch(error => {
              console.error('Failed to send audio to Whisper API', error);
            });
          }
        };
        
        console.log('started MediaRecorder, MIME type:', mediaRecorder.current.mimeType);
        mediaRecorder.current.start();
      })
      .catch(error => {
        console.log('Failed to start recorder', error);
      });
  }, []);
  
  const stopRecording = useCallback(() => {
    if (mediaRecorder.current) {
      recordingStartedRef.current = false;
      mediaRecorder.current.stop();
      mediaRecorder.current = null;
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
  
  const conversationOpenRef = React.useRef(conversationOpen);
  const startConversationRef = React.useRef(startConversation);
  React.useEffect(() => {
    conversationOpenRef.current = conversationOpen;
    startConversationRef.current = startConversation;
  }, [conversationOpen, startConversation]);
  
  useEffect(() => {
    if (keywordDetection !== null) {
      console.log('wake word detected:', keywordDetection.label);
      if (!conversationOpenRef.current && keywordDetection.label === BuiltInKeyword.Computer) {
        startConversationRef.current();
      }
    }
  }, [keywordDetection])
  
  useEffect(() => {
    if (PicoVoiceAccessKey.length !== 0) {
      return;
    }
    
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
    
    if (settingsRef.current.openMic) {
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
  }, [silenceTimer, respondingRef, conversationOpen, settings.triggerPhrase, setTranscript, startConversation, defaultMessage, stopConversation, sendMessage]);
  
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
  
  const mutableVoiceProbabilityCallback = React.useCallback((probability: number) => {
    if (probability > 0.7) {
      if (silenceTimer !== null) {
        clearTimeout(silenceTimer);
        setSilenceTimer(null);
      }
      if (!voiceDetectedRef.current) {
        console.log('voice detected');
        voiceDetectedRef.current = true;
      }
    } else {
      if (silenceTimer === null) {
        const timeout = voiceDetectedRef.current ? silenceTimeout / 2 : silenceTimeout;
        const newTimer = window.setTimeout(() => {
          if (conversationOpen) {
            stopConversation();
          }
          setSilenceTimer(null);
        }, timeout);
        setSilenceTimer(newTimer);
      }
    }
  }, [silenceTimer, conversationOpen, stopConversation]);
  
  const voiceProbabilityCallbackRef = React.useRef(mutableVoiceProbabilityCallback);
  React.useEffect(() => {
    voiceProbabilityCallbackRef.current = mutableVoiceProbabilityCallback;
  }, [mutableVoiceProbabilityCallback]);
  
  const voiceProbabilityCallback = React.useCallback((probability: number) => {
    voiceProbabilityCallbackRef.current(probability);
  }, []);
  
  const picoVoiceInitializedRef = React.useRef(false);
  
  useEffect(() => {
    if (PicoVoiceAccessKey.length === 0 || picoVoiceInitializedRef.current) {
      return;
    }
    
    picoVoiceInitializedRef.current = true;
    
    init(
      PicoVoiceAccessKey,
      [BuiltInKeyword.Computer],
      {
        publicPath: "models/porcupine_params.pv",
        customWritePath: "3.0.0_porcupine_params.pv",
      }
    ).then(() => {
      console.log('Porcupine initialized');
    });
    
    CobraWorker.create(
      PicoVoiceAccessKey,
      voiceProbabilityCallback
    ).then((cobraWorker) => {
      console.log('Cobra initialized');
      cobra.current = cobraWorker;
    });
  }, [init])
  
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