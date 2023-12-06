
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
