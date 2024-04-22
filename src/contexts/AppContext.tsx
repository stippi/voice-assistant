import React, {createContext, useState, useEffect, ReactNode} from 'react';
import {Timer} from "../model/timer";
import {GeoLocation} from "../model/location";
import useLocation from "../hooks/useLocation";
import {SearchResult} from "../integrations/spotify";

export type Spotify = {
  player: Spotify.Player;
  accessToken: string;
  deviceId: string;
  search: (query: string, types: string[], limit?: number, market?: string) => Promise<SearchResult>;
  play: (deviceId: string, trackIds: string[], contextUri?: string) => Promise<{ result?: string, error?: string }>;
  playTopTracks: (deviceId: string, artists: string[]) => Promise<{ result?: string, error?: string }>;
  pausePlayback: (deviceId: string) => Promise<{ result?: string, error?: string }>;
};

export type AppContextType = {
  timers: Timer[];
  setTimers: React.Dispatch<React.SetStateAction<Timer[]>>;
  location: GeoLocation | undefined;
  spotify: Spotify | undefined;
  setSpotify: (spotify: Spotify | undefined) => void;
  idle: boolean;
  setIdle: (idle: boolean) => void;
};

export const AppContext = createContext<AppContextType>({
  timers: [],
  setTimers: () => {},
  location: undefined,
  spotify: undefined,
  setSpotify: () => {},
  idle: false,
  setIdle: () => {}
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
  
  const [idle, setIdle] = useState(false);
  
  useEffect(() => {
    let inactivityTimeout: number;
    function resetInactivityTimeout() {
      setIdle(false);
      clearTimeout(inactivityTimeout);
      inactivityTimeout = window.setTimeout(() => {
        setIdle(true);
      }, 30000);
    }

    document.addEventListener('mousemove', resetInactivityTimeout);
    document.addEventListener('keydown', resetInactivityTimeout);
    document.addEventListener('touchstart', resetInactivityTimeout);

    resetInactivityTimeout();
  
    return () => {
      document.removeEventListener('mousemove', resetInactivityTimeout);
      document.removeEventListener('keydown', resetInactivityTimeout);
      document.removeEventListener('touchstart', resetInactivityTimeout);
      clearTimeout(inactivityTimeout);
    };
  }, []);
  
  return (
    <AppContext.Provider value={{ timers, setTimers, location, spotify, setSpotify, idle, setIdle }}>
      {children}
    </AppContext.Provider>
  );
};
