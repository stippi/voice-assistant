import React from "react";
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
import {useSettings, Voice} from "../contexts/SettingsContext.tsx";

export function Settings({}: Props) {
  
  const { settings, setSettings } = useSettings();
  
  const [open, setOpen] = React.useState(false);
  
  const voices = ["Alloy", "Echo", "Fable", "Onyx", "Nova", "Shimmer"];
  const handleChange = (event: SelectChangeEvent) => {
    setSettings({ ...settings, voice: event.target.value as Voice });
  };
  
  return (
    <div className="fixedTopRight">
      <div className="settingsContainer">
        {open && (<div className="settingsMenu">
          <FormControl>
            <FormControlLabel
              checked={settings.openMic}
              control={<Switch color="primary" />}
              label="Open Mic"
              labelPlacement="end"
              onChange={() => setSettings({ ...settings, openMic: !settings.openMic })}
            />
          </FormControl>
          <FormControl sx={{ m: 1, minWidth: 120, margin: 0 }} size="small">
            <InputLabel>Voice</InputLabel>
            <Select
              value={settings.voice}
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
}