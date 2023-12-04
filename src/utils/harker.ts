// Copied from https://github.com/muaz-khan/WebRTC-Experiment/blob/master/hark/hark.js and converted to TypeScript
// original source code is taken from:
// https://github.com/SimpleWebRTC/hark
// copyright goes to &yet team
// edited by Muaz Khan for RTCMultiConnection.js

import {getAudioContext} from "./audio";

type Options = {
  smoothing?: number;
  interval?: number;
  threshold?: number,
  history?: number
}

type EventMap = {
  'volume_change': (volume: number, threshold: number) => void;
  'speaking': () => void;
  'stopped_speaking': () => void;
};

type Harker = {
  setThreshold: (t: number) => void;
  setInterval: (i: number) => void;
  stop: () => void;
  on: <K extends keyof EventMap>(event: K, callback: EventMap[K]) => void;
}

export function hark(stream: MediaStream, options: Options): Harker {
  // eslint-disable-next-line @typescript-eslint/ban-types
  const events: Partial<Record<keyof EventMap, Function>> = {};
  
  const emit = <K extends keyof EventMap>(eventType: K, ...args: Parameters<EventMap[K]>) => {
    events[eventType]?.(...args);
  };
  
  // make it not break in non-supported browsers
  if (!window.AudioContext) return {
    setThreshold: () => {},
    setInterval: () => {},
    stop: () => {},
    on: () => {}
  };
  
  options = options || {};
  // Config
  const smoothing = options.smoothing || 0.1;
  let interval = options.interval || 500;
  let threshold = options.threshold || -75;
  const history = options.history || 5;
  
  let running = true;
  
  // Setup Audio Context
  const globalAudioContext = getAudioContext();
  
  const gainNode = globalAudioContext.createGain();
  gainNode.connect(globalAudioContext.destination);
  // don't play for self
  gainNode.gain.value = 0;
  
  const analyser = globalAudioContext.createAnalyser();
  analyser.fftSize = 512;
  //analyser.smoothingTimeConstant = smoothing;
  const fftBins = new Float32Array(analyser.fftSize);
  
  //WebRTC Stream
  const sourceNode = globalAudioContext.createMediaStreamSource(stream);
  
  sourceNode.connect(analyser);
  analyser.connect(globalAudioContext.destination);
  
  // Assume already speaking mode, fill history with 1s
  let speaking = true;
  const speakingHistory: number[] = [];
  for (let i = 0; i < history; i++) {
    speakingHistory.push(1);
  }
  
  // Poll the analyser node to determine if speaking and emit events if changed
  const looper = function () {
    setTimeout(function () {
      
      //check if stop has been called
      if (!running) {
        console.log('Harker loop stopped');
        return;
      }
      
      const currentVolume = getMaxVolume(analyser, fftBins);
      
      emit('volume_change', currentVolume, threshold);
      
      speakingHistory.shift();
      if (currentVolume < threshold) {
        speakingHistory.push(0);
        const sumHistory = speakingHistory.reduce((a, b) => a + b, 0);
        if (speaking && sumHistory === 0) {
          speaking = false;
          emit('stopped_speaking');
        }
      } else {
        speakingHistory.push(1);
        if (!speaking && speakingHistory.some(val => val === 1)) {
          speaking = true;
          emit('speaking');
        }
      }
      
      looper();
    }, interval);
  };
  looper();
  
  function getMaxVolume(analyser: AnalyserNode, fftBins : Float32Array) {
    let maxVolume = -Infinity;
    analyser.getFloatFrequencyData(fftBins);
    
    for (let i = 4, ii = fftBins.length; i < ii; i++) {
      if (fftBins[i] > maxVolume && fftBins[i] < 0) {
        maxVolume = fftBins[i];
      }
    }
    
    return maxVolume;
  }
  
  return {
    setThreshold: function (t: number) {
      threshold = t;
    },
    
    setInterval: function (i: number) {
      interval = i;
    },
    
    stop: function () {
      running = false;
      emit('volume_change', -100, threshold);
      if (speaking) {
        speaking = false;
        emit('stopped_speaking');
      }
    },
    
    on: <K extends keyof EventMap>(event: K, callback: EventMap[K]) => {
      events[event] = callback;
    }
  }
}