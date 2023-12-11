import React from "react";
import './Settings.css';
import {
  FormControl,
  FormControlLabel,
  IconButton,
  InputLabel,
  MenuItem, Popover,
  Select,
  Slider,
  Stack,
  Switch,
  TextField
} from "@mui/material";
import SettingsIcon from '@mui/icons-material/Settings';
import SpeedIcon from '@mui/icons-material/Speed';
import {Voice, Personality} from "../contexts/SettingsContext";
import useSettings from "../hooks/useSettings";

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

export function Settings() {
  
  const { settings, setSettings } = useSettings();
  
  const [anchorEl, setAnchorEl] = React.useState<HTMLButtonElement | null | undefined>(null);
  
  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    setAnchorEl(event.currentTarget);
  };
  
  const handleClose = () => {
    setAnchorEl(null);
  };
  
  const open = Boolean(anchorEl);
  const id = open ? 'simple-popover' : undefined;
  
  const voices = ["Alloy", "Echo", "Fable", "Onyx", "Nova", "Shimmer"];
  const personalities = ["Curious", "Professional", "Friendly", "Peppy", "Snarky", "Silly", "Zen"];
  
  return (
    <div className={`fixedTopRight ${open ? 'open' : ''}`}>
      <div className="settingsContainer">
        <IconButton
          size="small"
          aria-label="open settings"
          aria-describedby={id}
          onMouseDown={handleClick}
        >
          <SettingsIcon />
        </IconButton>
        <Popover
          id={id}
          open={open}
          anchorEl={anchorEl}
          onClose={handleClose}
          anchorOrigin={{
            vertical: 'top',
            horizontal: 'right',
          }}
          transformOrigin={{
            vertical: 'top',
            horizontal: 'right',
          }}
          disableScrollLock={true}
        >
          <div className="settingsMenu">
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
                label="Use Whisper Transcription"
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
            <TextField
              label="Stop words"
              value={settings.stopWords.join(", ")}
              onChange={(event) => setSettings({ ...settings, stopWords: event.target.value.split(", ") })}
              helperText="Cancel when all spoken words are in this list"
              variant="filled"
            />
            <TextField
              label="Transcription language"
              value={settings.transcriptionLanguage}
              onChange={(event) => setSettings({ ...settings, transcriptionLanguage: event.target.value })}
              helperText="Your language or leave empty"
              variant="filled"
            />
            <FormControl sx={{ m: 1, minWidth: 120, margin: 0 }} size="small">
              <InputLabel>Personality</InputLabel>
              <Select
                value={settings.personality}
                label="Personality"
                onChange={(event) => {setSettings({ ...settings, personality: event.target.value as Personality });}}
              >
                {personalities.map((personality, index) => (
                  <MenuItem key={index} value={personality.toLowerCase()}>{personality}</MenuItem>
                ))}
              </Select>
            </FormControl>
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
                onChange={(_event, newValue) => setSettings({ ...settings, audioSpeed: newValue as number })}
                min={0.25}
                max={2.0}
                step={0.05}
                valueLabelDisplay="auto"
                marks={audioSpeedMarks}
              />
            </Stack>
          </div>
        </Popover>
      </div>
    </div>
  );
}
