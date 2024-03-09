import React, {createContext, useState, useEffect, ReactNode} from 'react';
import {Timer} from "../model/timer";
import {GeoLocation} from "../model/location";
import useLocation from "../hooks/useLocation";
import {SearchResult} from "../integrations/spotify";
import {User} from "../model/user.ts";

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
  users: User[];
  setUsers: React.Dispatch<React.SetStateAction<User[]>>;
  timers: Timer[];
  setTimers: React.Dispatch<React.SetStateAction<Timer[]>>;
  location: GeoLocation | undefined;
  spotify: Spotify | undefined;
  setSpotify: (spotify: Spotify | undefined) => void;
  idle: boolean;
  setIdle: (idle: boolean) => void;
};

export const AppContext = createContext<AppContextType>({
  users: [],
  setUsers: () => {},
  timers: [],
  setTimers: () => {},
  location: undefined,
  spotify: undefined,
  setSpotify: () => {},
  idle: false,
  setIdle: () => {}
});

function getStorageItem<T>(key: string, fallback: T): T {
  const item = localStorage.getItem(key);
  if (item) {
    return JSON.parse(item);
  }
  return fallback;
}

const initialUsers = getStorageItem<User[]>('voice-assistant-users', []);
const initialTimers = getStorageItem<Timer[]>('voice-assistant-timers', []);

export const AppContextProvider: React.FC<{children: ReactNode}>  = ({ children }) => {
  const [users, setUsers] = useState(initialUsers);
  useEffect(() => {
    localStorage.setItem('voice-assistant-users', JSON.stringify(users));
  }, [users]);
  
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
      }, 5000);
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
    <AppContext.Provider value={{ users, setUsers, timers, setTimers, location, spotify, setSpotify, idle, setIdle }}>
      {children}
    </AppContext.Provider>
  );
};
