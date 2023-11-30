import React from "react";
import './Timers.css'
import useTimers from "../hooks/useTimers";
import {TimerPopup} from "./TimerPopup";

export function Timers() {
  const { timers, setTimers } = useTimers();
  
  React.useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      const updatedTimers = timers.filter(timer => new Date(timer.time) > now);
      if (updatedTimers.length !== timers.length) {
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
