import React from "react";
import './MessageCard.css';

import {Timer} from "../contexts/TimersContext";

export const TimerPopup = ({ timer }: Props) => {
  const [time, setTime] = React.useState("");
  
  React.useEffect(() => {
    setTimeout(() => {
      
    }, 1000);
  });

  return (
    <div className="timer">
      <div className="name">{timer.name}</div>
      <div className="time">{time}</div>
    </div>
  );
});

interface Props {
  timer: Timer
}
