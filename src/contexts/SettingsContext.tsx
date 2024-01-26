import React, {createContext, useState, useEffect, ReactNode} from 'react';
import {BuiltInKeyword} from "@picovoice/porcupine-web";

export type Voice = "alloy" | "echo" | "fable" | "onyx" | "nova" | "shimmer";

export type Personality = "curious" | "professional" | "friendly" | "peppy" | "snarky" | "silly" | "zen";

export type Settings = {
  voice: Voice;
  personality: Personality;
  openMic: boolean;
  expectResponse: boolean;
  triggerPhrase: string;
  triggerWord: BuiltInKeyword;
  stopWords: string[];
  audioSpeed: number;
  useWhisper: boolean;
  transcriptionLanguage: string;
  
  enableGoogle: boolean;
}

const defaultSettings: Settings = {
  voice: "onyx",
  personality: "snarky",
  openMic: true,
  expectResponse: true,
  triggerPhrase: "Computer",
  triggerWord: BuiltInKeyword.Computer,
  stopWords: ["Stopp", "Abbrechen"],
  audioSpeed: 1,
  useWhisper: true,
  transcriptionLanguage: navigator.language,

  enableGoogle: false,
}
let initialSettings = defaultSettings;

const savedSettings = localStorage.getItem('voice-assistant-settings');
if (savedSettings) {
  const parsedSettings: Partial<Settings> = JSON.parse(savedSettings);
  initialSettings = { ...defaultSettings, ...parsedSettings };
}

type SettingsContextType = {
  settings: Settings;
  setSettings: React.Dispatch<React.SetStateAction<Settings>>;
};

export const SettingsContext = createContext<SettingsContextType>({
  settings: defaultSettings,
  setSettings: () => {},
});

export const SettingsProvider: React.FC<{children: ReactNode}>  = ({ children }) => {
  const [settings, setSettings] = useState(initialSettings);
  
  useEffect(() => {
    localStorage.setItem('voice-assistant-settings', JSON.stringify(settings));
  }, [settings]);
  
  return (
    <SettingsContext.Provider value={{ settings, setSettings }}>
      {children}
    </SettingsContext.Provider>
  );
};
