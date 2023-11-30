import React from "react";
import './TimerPopup.css';
import AvTimerIcon from '@mui/icons-material/AvTimer';
import AlarmIcon from '@mui/icons-material/Alarm';
import DeleteIcon from '@mui/icons-material/Delete';
import {Timer} from "../model/timer";
import {calculateTimeLeft, formatDateRelativeToToday} from "../utils/timeFormat.ts";
import {SoundWaves} from "./SoundWaves.tsx";
import {IconButton} from "@mui/material";

function padWithZero(n: number) {
  return n < 10 ? `0${n}` : `${n}`;
}

export const TimerPopup = ({ timer, removeTimer }: Props) => {
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
      {timer.ringing === true && <SoundWaves />}
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
      <div className="timer-remove">
        <IconButton aria-label="delete" size="small" onClick={removeTimer}>
          <DeleteIcon fontSize="inherit" sx={{color: "#fff"}}/>
        </IconButton>
      </div>
    </div>
  );
};

interface Props {
  timer: Timer
  removeTimer: () => void
}
