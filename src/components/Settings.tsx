import React, {MutableRefObject} from "react";
import './Settings.css';
import {
  FormControl,
  FormControlLabel,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  SelectChangeEvent, Switch
} from "@mui/material";
import SettingsIcon from '@mui/icons-material/Settings';

type Voice = "alloy" | "echo" | "fable" | "onyx" | "nova" | "shimmer";

export function Settings({ voiceRef, openMic, setOpenMic }: Props) {
  
  const [open, setOpen] = React.useState(false);
  const [voice, setVoice] = React.useState<Voice>(voiceRef.current);
  
  const voices = ["Alloy", "Echo", "Fable", "Onyx", "Nova", "Shimmer"];
  const handleChange = (event: SelectChangeEvent) => {
    voiceRef.current = event.target.value as Voice;
    setVoice(voiceRef.current);
  };
  
  return (
    <div className="fixedTopRight">
      <div className="settingsContainer">
        {open && (<div className="settingsMenu">
          <FormControl>
            <FormControlLabel
              checked={openMic}
              control={<Switch color="primary" />}
              label="Open Mic"
              labelPlacement="end"
              onChange={() => setOpenMic(!openMic)}
            />
          </FormControl>
          <FormControl sx={{ m: 1, minWidth: 120, margin: 0 }} size="small">
            <InputLabel>Voice</InputLabel>
            <Select
              value={voice}
              label="Voice"
              onChange={handleChange}
            >
              {voices.map((voice, index) => (
                <MenuItem key={index} value={voice.toLowerCase()}>{voice}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </div>)
        }
        <IconButton
          className="sendButton"
          aria-label="send message"
          onMouseDown={(event) => {
            event.preventDefault();
            setOpen(!open);
          }}
        >
          <SettingsIcon />
        </IconButton>
      </div>
    </div>
  );
}

interface Props {
  voiceRef: MutableRefObject<Voice>;
  openMic: boolean;
  setOpenMic: (openMic: boolean) => void;
}