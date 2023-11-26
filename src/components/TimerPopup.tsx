import React from "react";
import './TimerPopup.css';

import {Timer} from "../contexts/TimersContext";

type TimeLeft = {
  difference: number;
  hours: number;
  minutes: number;
  seconds: number;
}

const calculateTimeLeft = (targetTime: string | number | Date): TimeLeft => {
  const difference = +new Date(targetTime) - +new Date();
  let timeLeft: TimeLeft = {
    difference: difference,
    hours: 0,
    minutes: 0,
    seconds: 0,
  };
  
  if (difference > 0) {
    timeLeft = {
      difference: difference,
      hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
      minutes: Math.floor((difference / 1000 / 60) % 60),
      seconds: Math.floor((difference / 1000) % 60),
    };
  }
  
  return timeLeft;
};

const padWithZero = (n: number) => {
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
      <div className="name">{timer.title}</div>
      <div className="time">
        {timeLeft.hours}:{padWithZero(timeLeft.minutes)}:{padWithZero(timeLeft.seconds)}
      </div>
    </div>
  );
};

interface Props {
  timer: Timer
}
