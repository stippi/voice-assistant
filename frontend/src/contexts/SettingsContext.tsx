import React, {createContext, useState, useEffect, ReactNode} from 'react';
import {BuiltInKeyword} from "@picovoice/porcupine-web";
import useAuthenticationContext from "../hooks/useAuthenticationContext.tsx";
import {fetchWithJWT, fetchWithJWTParsed} from "../utils/fetch.ts";

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
  enableGoogleCalendar: boolean;
  enableGoogleMaps: boolean;
  enableGooglePhotos: boolean;
  enableSpotify: boolean;
  enableMicrosoft: boolean;
  enableNewsApiOrg: boolean;
  enableOpenWeatherMap: boolean;

  showTimers: boolean;
  showUpcomingEvents: boolean;
  showPlaylist: boolean;
  showPhotos: boolean;
}

const defaultSettings: Settings = {
  voice: "onyx",
  personality: "snarky",
  openMic: true,
  expectResponse: true,
  triggerPhrase: "Computer",
  triggerWord: BuiltInKeyword.Computer,
  stopWords: ["Stop", "Cancel", "Nevermind"],
  audioSpeed: 1,
  useWhisper: true,
  transcriptionLanguage: navigator.language,

  enableGoogle: false,
  enableGoogleCalendar: true,
  enableGoogleMaps: true,
  enableGooglePhotos: true,
  enableMicrosoft: false,
  enableSpotify: false,
  enableNewsApiOrg: false,
  enableOpenWeatherMap: true,
  
  showTimers: true,
  showUpcomingEvents: true,
  showPlaylist: false,
  showPhotos: true,
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
  const [settings, setSettings] = useState(defaultSettings);

  const {user} = useAuthenticationContext()

  useEffect(() => {
    fetchWithJWTParsed<Settings>('/api/settings', user)
      .then(setSettings)
      .catch((error) => {
        console.error("An error occurred while loading settings", error);
      });
  }, []);

  useEffect(() => {
    fetchWithJWT('/api/settings', user, {body: JSON.stringify(settings), method: 'PUT', headers: {'Content-Type': 'application/json'}})
      .catch((error) => {
        console.error("An error occurred while loading settings", error);
      });
  }, [settings]);
  
  return (
    <SettingsContext.Provider value={{ settings, setSettings }}>
      {children}
    </SettingsContext.Provider>
  );
};
