import {useEffect, useState} from "react";
import {getTimers} from "../utils/timers";
import {Timer} from "../model/timer";

export default function useTimers() {
  const [timers, setTimers] = useState(getTimers());

  useEffect(() => {
    const savedTimers = getTimers();
    if (JSON.stringify(savedTimers) !== JSON.stringify(timers)) {
      setTimers(savedTimers);
    }
  }, [timers]);

  return {
    timers,
    setTimers: (newTimers: Timer[]) => {
      setTimers(newTimers);
      localStorage.setItem('voice-assistant-timers', JSON.stringify(newTimers));
    }
  };
}
