import React, { createContext, ReactNode } from "react";
import { timerService } from "../services/TimerService";
import { Timer } from "@shared/types";

type TimerContextType = {
  timers: Timer[];
  setTimers: (timers: Timer[]) => void;
};

export const TimerContext = createContext<TimerContextType>({
  timers: [],
  setTimers: () => {},
});

export const TimerContextProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [timers, setTimers] = React.useState<Timer[]>([]);

  const setTimersInService = React.useCallback((timers: Timer[]) => {
    timerService.setTimers(timers);
  }, []);

  React.useEffect(() => {
    const listener = {
      timersUpdated(timers: Timer[]) {
        setTimers(() => timers);
      },
    };

    timerService.addListener(listener);

    return () => {
      timerService.removeListener(listener);
    };
  }, [setTimers]);

  return <TimerContext.Provider value={{ timers, setTimers: setTimersInService }}>{children}</TimerContext.Provider>;
};
