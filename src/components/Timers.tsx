import React from "react";
import {playSound} from "../utils/audio.ts";
import useAppContext from "../hooks/useAppContext.tsx";
import {calculateTimeLeft, formatDateRelativeToToday} from "../utils/timeFormat.ts";
import ListItem from "@mui/material/ListItem";
import {IconButton} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import {SoundWaves} from "./SoundWaves.tsx";
import ListItemIcon from "@mui/material/ListItemIcon";
import HourglassTopIcon from "@mui/icons-material/HourglassTop";
import AlarmIcon from "@mui/icons-material/Alarm";
import ListItemText from "@mui/material/ListItemText";
import {Timer} from "../model/timer.ts";

function padWithZero(n: number) {
  return n < 10 ? `0${n}` : `${n}`;
}

function TimerItem({ timer, removeTimer }: Props) {
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
      sx={{
        '&:hover .MuiIconButton-root': {
          opacity: 1,
        },
      }}
      secondaryAction={
        <IconButton
          aria-label="delete"
          size="small"
          onClick={removeTimer}
          sx={{
            opacity: 0,
            transition: 'opacity 0.2s ease-in-out',
          }}
        >
          <DeleteIcon fontSize="inherit"/>
        </IconButton>
      }
    >
      {timer.ringing === true && <SoundWaves />}
      <ListItemIcon sx={{ fontSize: 20 }}>
        {timer.type === "countdown" ? <HourglassTopIcon fontSize="inherit" /> : <AlarmIcon fontSize="inherit" />}
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
}

interface Props {
  timer: Timer
  removeTimer: () => void
}

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
      {timers.map((timer, index) => (
        <div key={timer.id}>
          <TimerItem
            timer={timer}
            removeTimer={() => {
              const newTimers = [...timers];
              newTimers.splice(index, 1);
              setTimers(newTimers);
            }}
          />
        </div>
      ))}
    </>
  );
}
