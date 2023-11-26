import React, {createContext, useContext, useState, useEffect, ReactNode} from 'react';

export type Timer = {
  name: string;
  type: "CountDown" | "Time";
  time: Date;
}

let initialTimers: Timer[] = [];

const savedTimers = localStorage.getItem('voice-assistant-timers');
if (savedTimers) {
  initialTimers = JSON.parse(savedTimers);
}

type TimersContextType = {
  timers: Timer[];
  setTimers: React.Dispatch<React.SetStateAction<Timer[]>>;
};

const TimersContext = createContext<TimersContextType>({
  timers: [],
  setTimers: () => {},
});

export const TimersProvider: React.FC<{children: ReactNode}>  = ({ children }) => {
  const [timers, setTimers] = useState(initialTimers);
  
  useEffect(() => {
    localStorage.setItem('voice-assistant-timers', JSON.stringify(timers));
  }, [timers]);
  
  return (
    <TimersContext.Provider value={{ timers, setTimers }}>
      {children}
    </TimersContext.Provider>
  );
};

export const useTimers = () => {
  return useContext(TimersContext);
};
