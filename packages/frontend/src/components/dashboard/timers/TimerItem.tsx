import React from "react";
import { calculateTimeLeft, formatDateRelativeToToday } from "../../../utils/timeFormat";
import ListItem from "@mui/material/ListItem";
import { IconButton } from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import { SoundWaves } from "./SoundWaves.tsx";
import ListItemIcon from "@mui/material/ListItemIcon";
import HourglassTopIcon from "@mui/icons-material/HourglassTop";
import AlarmIcon from "@mui/icons-material/Alarm";
import ListItemText from "@mui/material/ListItemText";
import { Timer } from "@shared/types";

function padWithZero(n: number) {
  return n < 10 ? `0${n}` : `${n}`;
}

interface Props {
  timer: Timer;
  removeTimer: () => void;
}

export const TimerItem = React.memo(({ timer, removeTimer }: Props) => {
  const [timeLeft, setTimeLeft] = React.useState(() => calculateTimeLeft(timer.time));

  React.useEffect(() => {
    const interval = window.setInterval(() => {
      setTimeLeft(() => {
        const newTimeLeft = calculateTimeLeft(timer.time);
        if (newTimeLeft.difference <= 0) {
          clearInterval(interval);
        }
        return newTimeLeft;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [timer.time]);

  const formattedTime = React.useMemo(() => {
    if (timer.type === "countdown") {
      return `${timeLeft.hours}:${padWithZero(timeLeft.minutes)}:${padWithZero(timeLeft.seconds)}`;
    }
    return formatDateRelativeToToday(timer.time);
  }, [timer.type, timer.time, timeLeft]);

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
        {timer.ringing && <SoundWaves />}
      </ListItemIcon>
      <ListItemText
        sx={{ my: 0 }}
        primary={formattedTime}
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
});
