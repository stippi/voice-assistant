import {
  Box, Button, CircularProgress, CircularProgressProps,
  Popover,
  Typography
} from "@mui/material";
import {EagleProfile} from "@picovoice/eagle-web";
import useEagleEnrollContext from "../hooks/useEagleEnrollContext";
import {User} from "../model/user";
import {indexDbPut} from "../utils/indexDB";

function CircularProgressWithLabel(
  props: CircularProgressProps & { value: number },
) {
  return (
    <Box sx={{ position: 'relative', display: 'inline-flex' }}>
      <CircularProgress variant="determinate" {...props} />
      <Box
        sx={{
          top: 0,
          left: 0,
          bottom: 0,
          right: 0,
          position: 'absolute',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Typography
          variant="caption"
          component="div"
          color="text.secondary"
        >{`${Math.round(props.value)}%`}</Typography>
      </Box>
    </Box>
  );
}

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
        vertical: 'bottom',
        horizontal: 'left',
      }}
      transformOrigin={{
        vertical: 'top',
        horizontal: 'right',
      }}
      disableScrollLock={true}
      sx={{fontSize: "14px"}}
    >
      <Box sx={{display: "flex", flexDirection: "column", minWidth: "20vw", minHeight: "20vh"}}>
        {loaded && !enrolling && (
          <Typography>Press Start and keep speaking until your voice is enrolled.</Typography>
        )}
        {enrolling && (
          <>
            <Typography>{feedback}</Typography>
            <CircularProgressWithLabel value={percentage} />
          </>
        )}
        {loaded ? (
          <Button disabled={enrolling} onClick={startEnrollment}>Start</Button>
        ) : (
          <Typography>Loading...</Typography>
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
