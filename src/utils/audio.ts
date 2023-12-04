
const sounds = {
  activation: {
    file: "activation-beep-01.wav",
    audio: null as HTMLAudioElement | null
  },
  alarm: {
    file: "alarm-beep-01.wav",
    audio: null as HTMLAudioElement | null
  }
};

export function playSound(sound: keyof typeof sounds): HTMLAudioElement {
  if (sounds[sound] === undefined) {
    throw new Error(`Unknown sound ${sound}`);
  }
  const entry = sounds[sound];
  if (entry.audio === null) {
    entry.audio = new Audio(`/sounds/${entry.file}`);
  }
  entry.audio.currentTime = 0;
  entry.audio.play().catch(() => {
    console.log(`Failed to play sound ${sound}`);
  });
  return entry.audio;
}

let audioContext: AudioContext | null = null;

export function getAudioContext() {
  if (!audioContext || audioContext.state === 'closed') {
    audioContext = new AudioContext();
  }
  return audioContext;
}

export async function measureVolume(audioBlob: Blob) {
  const audioContext = getAudioContext();
  const arrayBuffer = await audioBlob.arrayBuffer();
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
  
  const rawData = audioBuffer.getChannelData(0);
  
  let sum = 0;
  let chunkSum = 0;
  let count = 0;
  const chunkSize = 44100;
  
  for (let i = 0; i < rawData.length; i++) {
    chunkSum += Math.abs(rawData[i]);
    count++;
    
    if (count >= chunkSize) {
      sum += Math.sqrt(chunkSum / count);
      chunkSum = 0;
      count = 0;
    }
  }
  
  if (count > 0) {
    sum += Math.sqrt(chunkSum / count);
  }
  
  // Return the RMS. This is an "average" of the amplitude of the waveform.
  return Math.sqrt(sum / Math.ceil(rawData.length / chunkSize));
}
