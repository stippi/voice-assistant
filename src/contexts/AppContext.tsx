import React, {createContext, useState, useEffect, ReactNode} from 'react';
import {Timer} from "../model/timer";
import {GeoLocation} from "../model/location.ts";
import useLocation from "../hooks/useLocation.tsx";

export type Spotify = {
  player: Spotify.Player;
  accessToken: string;
  deviceId: string;
  playTracks: (deviceId: string, trackIds: string[]) => Promise<{ result?: string, error?: string }>;
  pausePlayback: (deviceId: string) => Promise<{ result?: string, error?: string }>;
};

export type AppContextType = {
  timers: Timer[];
  setTimers: React.Dispatch<React.SetStateAction<Timer[]>>;
  location: GeoLocation | undefined;
  spotify: Spotify | undefined;
  setSpotify: (spotify: Spotify | undefined) => void;
};

export const AppContext = createContext<AppContextType>({
  timers: [],
  setTimers: () => {},
  location: undefined,
  spotify: undefined,
  setSpotify: () => {},
});

function getTimers(): Timer[] {
  const savedTimers = localStorage.getItem('voice-assistant-timers');
  if (savedTimers) {
    return JSON.parse(savedTimers);
  }
  return [];
}

const initialTimers = getTimers();

export const AppContextProvider: React.FC<{children: ReactNode}>  = ({ children }) => {
  const [timers, setTimers] = useState(initialTimers);
  
  useEffect(() => {
    localStorage.setItem('voice-assistant-timers', JSON.stringify(timers));
  }, [timers]);
  
  const {location} = useLocation();
  
  const [spotify, setSpotify] = useState<Spotify | undefined>(undefined);
  
  return (
    <AppContext.Provider value={{ timers, setTimers, location, spotify, setSpotify }}>
      {children}
    </AppContext.Provider>
  );
};
