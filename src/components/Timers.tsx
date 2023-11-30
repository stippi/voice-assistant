import React from "react";
import './Timers.css'
import useTimers from "../hooks/useTimers";
import {TimerPopup} from "./TimerPopup";

function isSameSecond(date1: Date, date2: Date): boolean {
  date1.setMilliseconds(0);
  date2.setMilliseconds(0);
  
  return date1.getTime() === date2.getTime();
}

export function Timers() {
  const { timers, setTimers } = useTimers();
  
  React.useEffect(() => {
    const interval = setInterval(() => {
      if (timers.length === 0) {
        return;
      }
      const now = new Date();
      const updatedTimers = timers
        .map(timer => isSameSecond(new Date(timer.time), now) ? {...timer, ringing: true} : timer)
        .filter(timer => timer.ringing === true || new Date(timer.time) > now);
      if (!updatedTimers.every((timer, index) => timer.ringing === timers[index].ringing)) {
        setTimers(updatedTimers);
      }
    }, 1000);
    
    return () => clearInterval(interval);
  }, [timers, setTimers]);
  
  return (
    <div className="timers">
      {timers.map((timer, index) => (
        <TimerPopup
          key={index}
          timer={timer}
          removeTimer={() => {
            const newTimers = [...timers];
            newTimers.splice(index, 1);
            setTimers(newTimers);
          }}
        />
      ))}
    </div>
  );
}
