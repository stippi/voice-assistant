import React from "react";
import { calculateTimeLeft, formatDateRelativeToToday } from "../utils/timeFormat.ts";
import ListItem from "@mui/material/ListItem";
import { IconButton } from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import { SoundWaves } from "./SoundWaves.tsx";
import ListItemIcon from "@mui/material/ListItemIcon";
import HourglassTopIcon from "@mui/icons-material/HourglassTop";
import AlarmIcon from "@mui/icons-material/Alarm";
import ListItemText from "@mui/material/ListItemText";
import { Timer } from "@shared/types";
import useTimers from "../hooks/useTimers.tsx";

function padWithZero(n: number) {
  return n < 10 ? `0${n}` : `${n}`;
}

interface Props {
  timer: Timer;
  removeTimer: () => void;
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
        "&:hover .MuiIconButton-root": {
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
            transition: "opacity 0.2s ease-in-out",
          }}
        >
          <DeleteIcon fontSize="inherit" />
        </IconButton>
      }
    >
      <ListItemIcon sx={{ fontSize: 20, position: "relative" }}>
        {timer.type === "countdown" ? <HourglassTopIcon fontSize="inherit" /> : <AlarmIcon fontSize="inherit" />}
        {timer.ringing === true && <SoundWaves />}
      </ListItemIcon>
      <ListItemText
        sx={{ my: 0 }}
        primary={
          timer.type === "countdown"
            ? `${timeLeft.hours}:${padWithZero(timeLeft.minutes)}:${padWithZero(timeLeft.seconds)}`
            : formatDateRelativeToToday(timer.time)
        }
        primaryTypographyProps={{
          fontSize: 15,
          fontWeight: "medium",
          lineHeight: "20px",
          mb: "2px",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
        secondary={timer.title}
        secondaryTypographyProps={{
          noWrap: true,
          fontSize: 12,
          lineHeight: "16px",
        }}
      />
    </ListItem>
  );
}

export function Timers() {
  const { timers, setTimers } = useTimers();

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
