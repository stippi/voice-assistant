import {
  Box,
  Button,
  CircularProgress,
  CircularProgressProps,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Typography
} from "@mui/material";
import {EagleProfile} from "@picovoice/eagle-web";
import {User} from "../model/user";
import {indexDbPut} from "../utils/indexDB";
import {useEagleProfiler} from "../hooks/useEagleProfiler.tsx";
import {useEffect} from "react";
import {PicoVoiceAccessKey} from "../config.ts";

function CircularProgressWithLabel(
  props: CircularProgressProps & { value: number },
) {
  return (
    <Box sx={{ position: 'relative', display: 'inline-flex', fontSize: "24px" }}>
      <CircularProgress variant="determinate" {...props} size={100} thickness={6}/>
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
          fontSize="inherit"
          component="div"
          color="text.secondary"
        >{`${Math.round(props.value)}%`}</Typography>
      </Box>
    </Box>
  );
}

export function UserVoiceEnroll({user, setUserVoiceProfileId, onClose}: Props) {
  const {isLoaded, init, start, stop, enrolling, feedback, percentage} = useEagleProfiler();
  
  useEffect(() => {
    init(
      PicoVoiceAccessKey, {
        publicPath: "models/eagle_params.pv"
      }).then(() => {
      console.log("Eagle Profiler initialized");
    });
  }, [init]);
  
  const saveProfile = (profile: EagleProfile) => {
    const profileId = `voice-profile-${user.id}`;
    indexDbPut<Uint8Array>(profileId, profile.bytes)
      .then(() => {
        console.log("User voice profile saved");
        setUserVoiceProfileId(profileId);
      }).catch((e) => {
        console.error("Failed to save user voice profile", e);
      });
  };
  
  const startEnrollment = async () => {
    await start(saveProfile);
    console.log(`Started enrolling the voice of user "${user.name}".`);
  };
  
  return (
    <Dialog
      open={true}
      onClose={onClose}
      sx={{
        '& .MuiDialog-paper': { width: '400px', height: '300px' }
      }}
    >
      <DialogTitle>{`Create a Voice Profile for ${user.name}`}</DialogTitle>
      <DialogContent>
        {isLoaded && !enrolling && (
          <DialogContentText>
            Press Start and keep speaking until the circle closes.
          </DialogContentText>
        )}
        {!isLoaded && (
          <DialogContentText>
            Loading...
          </DialogContentText>
        )}
        {enrolling && (
          <DialogContentText>{feedback}</DialogContentText>
        )}
        {isLoaded && (
          <Box
            sx={{
              top: 24,
              left: 0,
              bottom: 0,
              right: 0,
              position: 'absolute',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <CircularProgressWithLabel value={percentage} />
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={async () => {
          await stop();
          onClose();
        }}>Cancel</Button>
        <Button disabled={enrolling} onClick={startEnrollment}>Start</Button>
      </DialogActions>
    </Dialog>
  );
}

interface Props {
  user: User;
  setUserVoiceProfileId: (id: string) => void;
  onClose: () => void;
}
