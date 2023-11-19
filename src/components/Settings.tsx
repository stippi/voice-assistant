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
    value: 0.25,
    label: '0.25',
  },
  {
    value: 1.0,
    label: '1.0',
  },
  {
    value: 2.0,
    label: '2.0',
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
          <FormControl>
            <FormControlLabel
              checked={settings.useWhisper}
              control={<Switch color="primary" />}
              label="Use Whipser Transcription"
              labelPlacement="end"
              onChange={() => setSettings({ ...settings, useWhisper: !settings.useWhisper })}
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
            <SpeedIcon/>
            <Slider
              aria-label="Custom marks"
              value={settings.audioSpeed}
              onChange={(event, newValue) => setSettings({ ...settings, audioSpeed: newValue as number })}
              min={0.25}
              max={2.0}
              step={0.05}
              valueLabelDisplay="auto"
              marks={audioSpeedMarks}
            />
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