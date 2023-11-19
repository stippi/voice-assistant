import React from "react";
import './Settings.css';
import {
  FormControl,
  FormControlLabel,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Slider,
  Stack,
  Switch,
  TextField
} from "@mui/material";
import SettingsIcon from '@mui/icons-material/Settings';
import SpeedIcon from '@mui/icons-material/Speed';
import {useSettings, Voice} from "../contexts/SettingsContext.tsx";

const audioSpeedMarks = [
  {
    value: -2,
    label: '-2',
  },
  {
    value: 1,
    label: '1',
  },
  {
    value: 2,
    label: '2',
  },
];

export function Settings({}: Props) {
  
  const { settings, setSettings } = useSettings();
  
  const [open, setOpen] = React.useState(false);
  
  const voices = ["Alloy", "Echo", "Fable", "Onyx", "Nova", "Shimmer"];
  
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
          <TextField
            label="Trigger phrase"
            value={settings.triggerPhrase}
            onChange={(event) => setSettings({ ...settings, triggerPhrase: event.target.value })}
            helperText="Use something reliably recognized"
            variant="filled"
          />
          <FormControl sx={{ m: 1, minWidth: 120, margin: 0 }} size="small">
            <InputLabel>Voice</InputLabel>
            <Select
              value={settings.voice}
              label="Voice"
              onChange={(event) => {setSettings({ ...settings, voice: event.target.value as Voice });}}
            >
              {voices.map((voice, index) => (
                <MenuItem key={index} value={voice.toLowerCase()}>{voice}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <Stack spacing={2} direction="row" sx={{ mb: 1 }} alignItems="center">
            <Slider
              aria-label="Custom marks"
              value={settings.audioSpeed}
              onChange={(event, newValue) => setSettings({ ...settings, audioSpeed: newValue as number })}
              min={-2}
              max={2}
              valueLabelDisplay="auto"
              marks={audioSpeedMarks}
            />
            <SpeedIcon />
          </Stack>
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