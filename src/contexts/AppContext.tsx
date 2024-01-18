import React, {createContext, useState, useEffect, ReactNode} from 'react';
import {Timer} from "../model/timer";

export type AppContextType = {
  timers: Timer[];
  setTimers: React.Dispatch<React.SetStateAction<Timer[]>>;
};

export const AppContext = createContext<AppContextType>({
  timers: [],
  setTimers: () => {},
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
    const savedTimers = getTimers();
    if (JSON.stringify(savedTimers) !== JSON.stringify(timers)) {
      localStorage.setItem('voice-assistant-timers', JSON.stringify(timers));
    }
  }, [timers]);
  
  return (
    <AppContext.Provider value={{ timers, setTimers }}>
      {children}
    </AppContext.Provider>
  );
};
