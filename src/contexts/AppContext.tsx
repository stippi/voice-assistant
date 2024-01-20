import React, {createContext, useState, useEffect, ReactNode} from 'react';
import {Timer} from "../model/timer";
import {GeoLocation} from "../model/location.ts";
import useLocation from "../hooks/useLocation.tsx";

export type AppContextType = {
  timers: Timer[];
  setTimers: React.Dispatch<React.SetStateAction<Timer[]>>;
  location: GeoLocation | undefined;
};

export const AppContext = createContext<AppContextType>({
  timers: [],
  setTimers: () => {},
  location: undefined,
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
  
  return (
    <AppContext.Provider value={{ timers, setTimers, location }}>
      {children}
    </AppContext.Provider>
  );
};
