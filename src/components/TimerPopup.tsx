import React from "react";
import './TimerPopup.css';
import HourglassTopIcon from '@mui/icons-material/HourglassTop';
import AlarmIcon from '@mui/icons-material/Alarm';
import DeleteIcon from '@mui/icons-material/Delete';
import {Timer} from "../model/timer";
import {calculateTimeLeft, formatDateRelativeToToday} from "../utils/timeFormat.ts";
import {SoundWaves} from "./SoundWaves.tsx";
import {IconButton} from "@mui/material";
import ListItem from "@mui/material/ListItem";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";

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
    <ListItem
      secondaryAction={
        <IconButton aria-label="delete" size="small" onClick={removeTimer}>
          <DeleteIcon fontSize="inherit"/>
        </IconButton>
      }
    >
      {timer.ringing === true && <SoundWaves />}
      <ListItemIcon sx={{ fontSize: 20 }}>
        {timer.type === "countdown" ? <HourglassTopIcon /> : <AlarmIcon />}
      </ListItemIcon>
      <ListItemText
        sx={{ my: 0 }}
        primary={timer.type === "countdown" ?
          `${timeLeft.hours}:${padWithZero(timeLeft.minutes)}:${padWithZero(timeLeft.seconds)}`
          : formatDateRelativeToToday(timer.time)}
        primaryTypographyProps={{
          fontSize: 15,
          fontWeight: 'medium',
          lineHeight: '20px',
          mb: '2px',
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis"
        }}
        secondary={timer.title}
        secondaryTypographyProps={{
          noWrap: true,
          fontSize: 12,
          lineHeight: '16px'
        }}
      />
    </ListItem>
  );
};

interface Props {
  timer: Timer
  removeTimer: () => void
}
