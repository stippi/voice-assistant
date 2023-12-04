import React from "react";
import {getTimers} from "../utils/timers.ts";
import {Timer} from "../model/timer.ts";

// export default function useTimers() {
//   const timers = getTimers();
//
//   return {
//     timers,
//     setTimers
//   };
// }

export default function useTimers() {
  const [timers, setTimers] = React.useState(getTimers());

  React.useEffect(() => {
    const savedTimers = getTimers();
    if (JSON.stringify(savedTimers) !== JSON.stringify(timers)) {
      setTimers(savedTimers);
    }
  });

  return {
    timers,
    setTimers: (newTimers: Timer[]) => {
      setTimers(newTimers);
      localStorage.setItem('voice-assistant-timers', JSON.stringify(newTimers));
    }
  };
}
