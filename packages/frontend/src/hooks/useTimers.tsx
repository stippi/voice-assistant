import { timerService } from "../services/TimerService";
import { Timer } from "voice-assistant-shared";
import React from "react";

export default function useTimers() {
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

  return { timers, setTimers: setTimersInService };
}
