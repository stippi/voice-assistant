import React from "react";
import './Timers.css'
import useTimers from "../hooks/useTimers";
import {TimerPopup} from "./TimerPopup";
import {playSound} from "../utils/audio.ts";

function isSameSecond(date1: Date, date2: Date): boolean {
  date1.setMilliseconds(0);
  date2.setMilliseconds(0);
  
  return date1.getTime() === date2.getTime();
}

export function Timers() {
  const { timers, setTimers } = useTimers();
  
  React.useEffect(() => {
    const interval = window.setInterval(() => {
      if (timers.length === 0) {
        return;
      }
      const now = new Date();
      const updatedTimers = timers
        .map(timer => isSameSecond(new Date(timer.time), now) ? {...timer, ringing: true} : timer)
        .filter(timer => timer.ringing === true || new Date(timer.time) > now);
      if (timers.length != updatedTimers.length ||
        !timers.every((timer, index) => timer.ringing === updatedTimers[index].ringing)) {
        setTimers(updatedTimers);
      }
    }, 1000);
    
    let timeout = -1;
    if (timers.length > 0) {
      const nextDate = timers
        .map(timer => new Date(timer.time))
        .reduce((minDate, date) => {
          return date < minDate ? date : minDate;
        });
      const now = new Date();
      const waitTime = nextDate.getTime() - now.getTime();
      if (waitTime >= 0) {
        timeout = window.setTimeout(() => {
          const audio = playSound("alarm");
          audio.addEventListener("ended", () => {
            // audio.currentTime = 0;
            // audio.play().catch((error) => {
            //   console.log("Failed to play sound (repeat: ", error);
            // });
            audio.remove();
            setTimers(timers.map(timer => ({...timer, ringing: false})));
          });
        }, waitTime);
      }
    }
    return () => {
      window.clearInterval(interval);
      window.clearTimeout(timeout);
    }
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
