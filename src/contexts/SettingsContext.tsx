import React, {createContext, useState, useEffect, ReactNode} from 'react';

export type Voice = "alloy" | "echo" | "fable" | "onyx" | "nova" | "shimmer";

export type Personality = "curious" | "professional" | "friendly" | "peppy" | "snarky" | "silly" | "zen";

export type Settings = {
  voice: Voice;
  personality: Personality;
  openMic: boolean;
  triggerPhrase: string;
  stopWords: string[];
  audioSpeed: number;
  useWhisper: boolean;
}

const defaultSettings: Settings = {
  voice: "onyx",
  personality: "snarky",
  openMic: true,
  triggerPhrase: "Computer",
  stopWords: ["stop", "cancel", "nevermind", "stopp", "abbrechen"],
  audioSpeed: 1,
  useWhisper: true,
}
let initialSettings = defaultSettings;

const savedSettings = localStorage.getItem('voice-assistant-settings');
if (savedSettings) {
  initialSettings = JSON.parse(savedSettings);
  for (const key in defaultSettings) {
    if (!Object.prototype.hasOwnProperty.call(initialSettings, key)) {
      // @ts-expect-error - I don't want to have multiple sources of truth for what is in the settings object
      initialSettings[key] = defaultSettings[key];
    }
  }
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
