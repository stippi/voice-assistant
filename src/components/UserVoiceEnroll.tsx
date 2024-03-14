import './AssistantSettings.css';
import {
  Box, Button,
  Popover,
  Slider,
  Typography
} from "@mui/material";
import {User} from "../model/user.ts";
import useEagleEnrollContext from "../hooks/useEagleEnrollContext.tsx";
import {EagleProfile} from "@picovoice/eagle-web";
import {indexDbPut} from "../utils/indexDB.ts";

export function UserVoiceEnroll({user, anchorEl, onClose}: Props) {
  const open = Boolean(anchorEl);
  const id = open ? 'simple-popover' : undefined;
  const {loaded, enrolling, start, feedback, percentage} = useEagleEnrollContext();
  
  const saveProfile = (profile: EagleProfile) => {
    indexDbPut<Uint8Array>(`voice-profile-${user.id}`, profile.bytes).then(() => {
      console.log("User voice profile saved");
    })
  };
  
  const startEnrollment = async () => {
    await start(saveProfile);
    console.log(`Started enrolling the voice of user "${user.name}".`);
  };
  
  return (
    <Popover
      id={id}
      open={open}
      anchorEl={anchorEl}
      onClose={onClose}
      anchorOrigin={{
        vertical: 'top',
        horizontal: 'right',
      }}
      transformOrigin={{
        vertical: 'top',
        horizontal: 'left',
      }}
      disableScrollLock={true}
      sx={{fontSize: "14px", left: "-5px"}}
    >
      <Box sx={{display: "flex", flexDirection: "column"}}>
        {loaded ? (
          <Button disabled={enrolling} onClick={startEnrollment}>Start</Button>
          ) : (
          <Typography>Loading...</Typography>
        )}
        {enrolling && (
          <>
            <Slider
              aria-label="Enrollment percentage"
              value={percentage}
              min={0}
              max={100}
              step={5}
              valueLabelDisplay="auto"
            />
            <Typography>{feedback}</Typography>
          </>
        )}
      </Box>
    </Popover>
  );
}

interface Props {
  user: User;
  onClose: () => void;
  anchorEl: HTMLButtonElement | null;
}
