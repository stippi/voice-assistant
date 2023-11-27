import React from "react";
import './TimerPopup.css';
import AvTimerIcon from '@mui/icons-material/AvTimer';
import AlarmIcon from '@mui/icons-material/Alarm';
import {Timer} from "../model/timer";
import {calculateTimeLeft, formatDateRelativeToToday} from "../utils/timeFormat.ts";

function padWithZero(n: number) {
  return n < 10 ? `0${n}` : `${n}`;
}

export const TimerPopup = ({ timer }: Props) => {
  const [timeLeft, setTimeLeft] = React.useState(calculateTimeLeft(timer.time));
  
  React.useEffect(() => {
    const interval = window.setInterval(() => {
      const newTimeLeft = calculateTimeLeft(timer.time);
      setTimeLeft(newTimeLeft);
      if (newTimeLeft.difference <= 0) {
        clearInterval(interval);
      }
    }, 1000);
    
    // Cleanup interval
    return () => clearInterval(interval);
  }, [timer]);
  
  return (
    <div className="timer">
      <div className="timer-icon">
        {timer.type === "countdown" ? <AvTimerIcon /> : <AlarmIcon />}
      </div>
      <div className="timer-info">
        <div className="timer-name">{timer.title}</div>
        <div className="timer-time">
          {timer.type === "countdown" ?
            `${timeLeft.hours}:${padWithZero(timeLeft.minutes)}:${padWithZero(timeLeft.seconds)}`
            : formatDateRelativeToToday(timer.time)}
        </div>
      </div>
    </div>
  );
};

interface Props {
  timer: Timer
}
