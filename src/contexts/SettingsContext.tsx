import React, { createContext, useContext, useState, useEffect } from 'react';

export type Voice = "alloy" | "echo" | "fable" | "onyx" | "nova" | "shimmer";

export type Settings = {
  voice: Voice;
  openMic: boolean;
  triggerPhrase: string;
  audioSpeed?: number;
}

const defaultSettings: Settings = {
  voice: "onyx",
  openMic: true,
  triggerPhrase: "computer",
  audioSpeed: 1,
}
let initialSettings = defaultSettings;

const savedSettings = localStorage.getItem('voice-assistant-settings');
if (savedSettings) {
  initialSettings = JSON.parse(savedSettings);
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
  console.log("SettingsProvider rendered");
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