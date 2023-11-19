import React, { createContext, useContext, useState, useEffect } from 'react';

export type Voice = "alloy" | "echo" | "fable" | "onyx" | "nova" | "shimmer";

export type Personality = "curious" | "professional" | "friendly" | "peppy" | "snarky" | "silly" | "zen";

export type Settings = {
  voice: Voice;
  personality: Personality;
  openMic: boolean;
  triggerPhrase: string;
  audioSpeed: number;
  useWhisper: boolean;
}

const defaultSettings: Settings = {
  voice: "onyx",
  personality: "snarky",
  openMic: true,
  triggerPhrase: "Computer",
  audioSpeed: 1,
  useWhisper: true,
}
let initialSettings = defaultSettings;

const savedSettings = localStorage.getItem('voice-assistant-settings');
if (savedSettings) {
  initialSettings = JSON.parse(savedSettings);
  for (const key in defaultSettings) {
    if (!initialSettings.hasOwnProperty(key)) {
      initialSettings[key] = defaultSettings[key];
    }
  }
}

type SettingsContextType = {
  settings: Settings;
  setSettings: React.Dispatch<React.SetStateAction<Settings>>;
};

const SettingsContext = createContext<SettingsContextType>({
  settings: defaultSettings,
  setSettings: () => {},
});

export const SettingsProvider = ({ children }) => {
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

export const useSettings = () => {
  return useContext(SettingsContext);
};