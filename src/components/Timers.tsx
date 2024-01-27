import React from "react";
import {TimerPopup} from "./TimerPopup";
import {playSound} from "../utils/audio.ts";
import useAppContext from "../hooks/useAppContext.tsx";
import Divider from "@mui/material/Divider";

function isSameSecond(date1: Date, date2: Date): boolean {
  date1.setMilliseconds(0);
  date2.setMilliseconds(0);
  
  return date1.getTime() === date2.getTime();
}

export function Timers() {
  const { timers, setTimers } = useAppContext();
  
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
    <>
      {timers.map((timer, index, array) => (
        <div key={timer.id}>
          <TimerPopup
            timer={timer}
            removeTimer={() => {
              const newTimers = [...timers];
              newTimers.splice(index, 1);
              setTimers(newTimers);
            }}
          />
          {index < array.length - 1 && <Divider />}
        </div>
      ))}
    </>
  );
}
