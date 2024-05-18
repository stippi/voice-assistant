import React, {useState, useEffect, useCallback, useRef} from 'react';
import MicIcon from '@mui/icons-material/Mic';
import RecordVoiceOverIcon from '@mui/icons-material/RecordVoiceOver';
import IconButton from '@mui/material/IconButton';
import OpenAI, { toFile } from 'openai';
import {EagleProfile} from "@picovoice/eagle-web";
import {speechApiUrl, speechApiKey, PicoVoiceAccessKey} from "../config";
import useSettings from "../hooks/useSettings";
import useWindowFocus from "../hooks/useWindowFocus";
import {playSound} from "../utils/audio";
import {textToLowerCaseWords} from "../utils/textUtils";
import useAppContext from "../hooks/useAppContext";
import {indexDbGet} from "../utils/indexDB";
import {useVoiceDetection} from "../hooks/useVoiceDetection.tsx";

const openai = new OpenAI({
  apiKey: speechApiKey,
  dangerouslyAllowBrowser: true,
  baseURL: speechApiUrl,
});

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



const SpeechRecorder = ({sendMessage, stopResponding, setTranscript, defaultMessage, respondingRef, awaitSpokenResponse}: Props) => {
  const [listening, setListening] = useState(false);
  const [conversationOpen, setConversationOpen] = useState(false);
  const [silenceTimer, setSilenceTimer] = useState<number | null>(null);
  
  const shouldRestartRecognition = useRef(false);
  const recognition = useRef<SpeechRecognition | null>(null);
  
  const sendToWhisperAPI = useCallback(async (audioChunks: Blob[]) => {
    console.log(`received ${audioChunks.length} audio chunks`);
    const audioBlob = new Blob(audioChunks, { type: mimeType });
    
    // const blobUrl = URL.createObjectURL(audioBlob);
    //
    // const downloadLink = document.createElement('a');
    // downloadLink.href = blobUrl;
    // downloadLink.download = `audio.${audioExt}`;
    // downloadLink.textContent = 'Download audio blob';
    //
    // document.body.appendChild(downloadLink);
    
    try {
      playSound('sending');
      sendMessage("", true);
      const transcription = await openai.audio.transcriptions.create({
        model: 'whisper-1',
        language: settingsRef.current.transcriptionLanguage.substring(0, 2),
        file: await toFile(audioBlob, `audio.${audioExt}`, { type: mimeType })
      });
      const words = textToLowerCaseWords(transcription.text);
      const stopWords = settingsRef.current.stopWords.map(word => word.toLowerCase());
      if (words.every(word => stopWords.includes(word))) {
        console.log('conversation cancelled by stop word(s)');
        sendMessage("", false);
      } else {
        sendMessage(transcription.text, true);
      }
    } catch (error) {
      console.error('Failed to send request to Whisper API', error);
    }
  }, [sendMessage]);

  const { settings } = useSettings();
  const settingsRef = React.useRef(settings);
  const sendToWhisperRef = React.useRef(sendToWhisperAPI);
  const isVoiceDetectionLoadedRef = React.useRef(false);
  const {documentVisible} = useWindowFocus();
  
  const {
    isLoaded: isVoiceDetectionLoaded,
    init: initVoiceDetection,
    start: startVoiceDetection,
    stop: stopVoiceDetection,
    release: releaseVoiceDetection,
    isListeningForWakeWord,
    wakeWordDetection,
    voiceDetection,
  } = useVoiceDetection(settings.openMic && documentVisible);
  
  const startVoiceDetectionRef = React.useRef(startVoiceDetection);
  const stopVoiceDetectionRef = React.useRef(stopVoiceDetection);
  
  // Update refs
  useEffect(() => {
    settingsRef.current = settings;
    sendToWhisperRef.current = sendToWhisperAPI;
    isVoiceDetectionLoadedRef.current = isVoiceDetectionLoaded;
    startVoiceDetectionRef.current = startVoiceDetection;
    stopVoiceDetectionRef.current = stopVoiceDetection;
  }, [settings, sendToWhisperAPI, isVoiceDetectionLoaded, startVoiceDetection, stopVoiceDetection]);
  
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
    navigator.mediaDevices.getUserMedia({ audio: audioConstraints, video: false }).then((stream) => {
        voiceDetectedRef.current = false;
        audioChunks.current = [];
        mediaRecorder.current = new MediaRecorder(stream, { mimeType });
        
        mediaRecorder.current.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunks.current.push(event.data);
          }
        };
      
        if (isVoiceDetectionLoadedRef.current) {
          startVoiceDetectionRef.current()
            .then(() => {
              console.log("Voice detection started");
            })
            .catch((error) => {
              console.error("Failed to start Voice detection", error);
            });
        }
        
        mediaRecorder.current.onstop = () => {
          if (isVoiceDetectionLoadedRef.current) {
            stopVoiceDetectionRef.current()
              .then(() => {
                console.log("Voice detection stopped");
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
      }).catch((error) => {
        console.error('Failed to start recorder', error);
      });
  }, []);
  
  const stopRecording = useCallback(() => {
    if (mediaRecorder.current) {
      recordingStartedRef.current = false;
      mediaRecorder.current.stop();
      mediaRecorder.current = null;
    } else {
      console.error('MediaRecorder undefined');
    }
  }, []);
  
  const startConversation = useCallback(() => {
    setConversationOpen(true);
    playSound('activation');
    // Send the "reduce-volume" custom event
    document.dispatchEvent(new CustomEvent('reduce-volume'));
    if (settingsRef.current.useWhisper) {
      startRecording();
    } else {
      console.log('started conversation without recording')
    }
  }, [startRecording]);
  
  const stopConversation = useCallback(() => {
    setConversationOpen(false);
    document.dispatchEvent(new CustomEvent('restore-volume'));
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
  const stopRespondingRef = React.useRef(stopResponding);
  useEffect(() => {
    conversationOpenRef.current = conversationOpen;
    startConversationRef.current = startConversation;
    stopRespondingRef.current = stopResponding;
  }, [conversationOpen, startConversation, stopResponding]);
  
  useEffect(() => {
    if (wakeWordDetection) {
      console.log('wake word detected');
      if (!conversationOpenRef.current) {
        if (respondingRef.current) {
          stopRespondingRef.current(true);
        }
        startConversationRef.current();
      }
    }
  }, [wakeWordDetection, respondingRef])
  
  useEffect(() => {
    if (PicoVoiceAccessKey.length !== 0) {
      return;
    }
    
    recognition.current = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
    recognition.current.continuous = true;
    recognition.current.interimResults = true;
    recognition.current.lang = settingsRef.current.transcriptionLanguage;
    
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
    if (!isVoiceDetectionLoaded && recognition.current && openMicRef.current !== settings.openMic) {
      openMicRef.current = settings.openMic;
      if (settings.openMic) {
        console.log('open mic changed: starting speech recognition')
        recognition.current.start();
      } else {
        console.log('open mic changed: stopping speech recognition')
        recognition.current.stop();
      }
    }
  }, [settings, isVoiceDetectionLoaded]);
  
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
  
  useEffect(() => {
    if (!voiceDetection) return;
    
    if (voiceDetection.voiceDetected) {
      voiceDetectedRef.current = true;
    }
    if (voiceDetection.silenceDetected && conversationOpenRef.current) {
      stopConversation();
    }
  }, [voiceDetection, stopConversation]);
  
  const [speakerProfiles, setSpeakerProfiles] = useState<EagleProfile[] | null>(null);
  const {users} = useAppContext();
  const loadProfiles = async (profileIds: string[]) => {
    console.log("Loading profiles", profileIds);
    const profiles: EagleProfile[] = [];
    for (const id of profileIds) {
      const profileData = await indexDbGet<Uint8Array>(id);
      profiles.push({bytes: profileData});
    }
    setSpeakerProfiles(profiles);
  };
  useEffect(() => {
    loadProfiles(users.filter(user => user.voiceProfileId != "").map(user => user.voiceProfileId))
      .then(() => console.log("User voice profiles loaded"))
      .catch((e) => console.error("Failed to load user profiles", e));
  }, [users]);
  
  const voiceDetectionInitTriggeredRef = useRef(false);
  
  useEffect(() => {
    if (PicoVoiceAccessKey.length === 0) {
      return;
    }
    
    if (!isVoiceDetectionLoaded && speakerProfiles != null && !voiceDetectionInitTriggeredRef.current) {
      console.log('Initializing voice detection');
      voiceDetectionInitTriggeredRef.current = true;
      initVoiceDetection(
        settings.triggerWord,
        speakerProfiles
      ).then(() => {
        console.log('Voice detection initialized');
      }).catch((error) => {
        console.error('Failed to initialize voice detection', error);
      });
    }
    
    return () => {
      if (isVoiceDetectionLoaded) {
        console.log('Releasing voice detection');
        voiceDetectionInitTriggeredRef.current = false;
        releaseVoiceDetection().then(() => {
          console.log('Voice detection released');
        }).catch((error) => {
          console.error('failed to release Voice detection', error);
        });
      }
    }
  }, [initVoiceDetection, releaseVoiceDetection, speakerProfiles, settings.triggerWord, isVoiceDetectionLoaded])
  
  useEffect(() => {
    if (awaitSpokenResponse && !conversationOpen && openMicRef.current) {
      startConversation();
    }
  }, [awaitSpokenResponse, conversationOpen, startConversation]);
  
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
        color={isListeningForWakeWord || listening ? "error" : "default"}
        onClick={startConversation}
      >
        <MicIcon />
      </IconButton>}
    </div>
  );
};

interface Props {
  sendMessage: (message: string, audible: boolean) => void;
  stopResponding: (audible: boolean) => void;
  setTranscript: (transcript: string) => void;
  defaultMessage: string;
  respondingRef: React.MutableRefObject<boolean>;
  awaitSpokenResponse: boolean;
}

export default SpeechRecorder;