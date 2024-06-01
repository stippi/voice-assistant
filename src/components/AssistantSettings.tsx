import "./AssistantSettings.css";
import {
  Avatar,
  Badge,
  Box,
  Button,
  FormControl,
  FormControlLabel,
  IconButton,
  Input,
  InputLabel,
  MenuItem,
  Popover,
  Select,
  Slider,
  Stack,
  Switch,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableRow,
  Tabs,
  TextField,
} from "@mui/material";
import SpeedIcon from "@mui/icons-material/Speed";
import DeleteIcon from "@mui/icons-material/Delete";
import RecordVoiceOverIcon from "@mui/icons-material/RecordVoiceOver";
import { Voice, Personality, Settings } from "../contexts/SettingsContext";
import useSettings from "../hooks/useSettings";
import { BuiltInKeyword } from "@picovoice/porcupine-web";
import React, { useState } from "react";
import useAppContext from "../hooks/useAppContext";
import AddCircleIcon from "@mui/icons-material/AddCircle";
import { LLMConfigs } from "./LLMConfigs";
import { UserVoiceEnroll } from "./UserVoiceEnroll";
import { User } from "../model/user";

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function CustomTabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`tabpanel-${index}`}
      aria-labelledby={`tab-${index}`}
      {...other}
    >
      {value === index && <Box className="settingsColumn">{children}</Box>}
    </div>
  );
}

function a11yProps(index: number) {
  return {
    id: `tab-${index}`,
    "aria-controls": `tabpanel-${index}`,
  };
}

// async function hashEmail(email: string) {
//   const data = new TextEncoder().encode(email.trim().toLowerCase());
//   const hashed = await crypto.subtle.digest('SHA-256', data);
//   const hashArray = Array.from(new Uint8Array(hashed));
//   return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
// }

function CheckCircleOutlineIcon() {
  return null;
}

const UserList = () => {
  const { users, setUsers } = useAppContext();
  const [enrollingUser, setEnrollingUser] = useState<User | null>(null);
  const [editUserId, setEditUserId] = useState<string>("");
  const [editedName, setEditedName] = useState<string>("");

  const handleNameClick = (user: User) => {
    setEditUserId(user.id);
    setEditedName(user.name);
  };

  const handleNameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setEditedName(event.target.value);
  };

  const handleNameSubmit = () => {
    setUsers(
      users.map((user) =>
        user.id != editUserId ? user : { ...user, name: editedName },
      ),
    );
    setEditUserId("");
    setEditedName("");
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleNameSubmit();
    }
  };

  const onAddUser = () => {
    setUsers([
      {
        id: crypto.randomUUID(),
        name: "<name>",
        email: "",
        picture: "",
        voiceProfileId: "",
      },
      ...users,
    ]);
  };

  return (
    <Box sx={{ width: "100%" }}>
      <TableContainer>
        <Table>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell>
                  <Avatar src={user.picture} />
                </TableCell>
                <TableCell sx={{ minWidth: "10rem" }}>
                  {editUserId === user.id ? (
                    <Input
                      value={editedName}
                      onChange={handleNameChange}
                      onBlur={() => handleNameSubmit()}
                      onKeyDown={onKeyDown}
                      autoFocus
                      fullWidth
                    />
                  ) : (
                    <div
                      style={{
                        width: "100%",
                        minHeight: "24px",
                        padding: "4px 0",
                      }}
                      onClick={() => handleNameClick(user)}
                    >
                      {user.name}
                    </div>
                  )}
                </TableCell>
                <TableCell>
                  <IconButton onClick={() => setEnrollingUser(user)}>
                    {user.voiceProfileId ? (
                      <Badge
                        color="success"
                        badgeContent={<CheckCircleOutlineIcon />}
                      >
                        <RecordVoiceOverIcon color="action" />
                      </Badge>
                    ) : (
                      <RecordVoiceOverIcon />
                    )}
                  </IconButton>
                </TableCell>
                <TableCell>
                  <IconButton
                    onClick={() => {
                      setUsers(
                        users.filter((otherUser) => otherUser.id != user.id),
                      );
                    }}
                  >
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <Box sx={{ display: "flex", justifyContent: "flex-end", p: 2 }}>
        <Button
          startIcon={<AddCircleIcon />}
          onClick={onAddUser}
          variant="contained"
        >
          Add user
        </Button>
      </Box>
      {enrollingUser && (
        <UserVoiceEnroll
          user={enrollingUser}
          setUserVoiceProfileId={(profileId: string) => {
            setUsers(
              users.map((user) =>
                user.id != enrollingUser.id
                  ? user
                  : { ...user, voiceProfileId: profileId },
              ),
            );
            setEnrollingUser(null);
          }}
          onClose={() => setEnrollingUser(null)}
        />
      )}
    </Box>
  );
};

const audioSpeedMarks = [
  {
    value: 0.25,
    label: "0.25",
  },
  {
    value: 1.0,
    label: "1.0",
  },
  {
    value: 2.0,
    label: "2.0",
  },
];

export function AssistantSettings({ anchorEl, onClose }: Props) {
  const { settings, setSettings } = useSettings();

  const open = Boolean(anchorEl);
  const id = open ? "simple-popover" : undefined;

  const [tabIndex, setTabIndex] = useState(0);
  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabIndex(newValue);
  };

  const voices = ["Alloy", "Echo", "Fable", "Onyx", "Nova", "Shimmer"];
  const personalities = [
    "Curious",
    "Professional",
    "Friendly",
    "Peppy",
    "Snarky",
    "Silly",
    "Zen",
  ];
  const triggerWords = [
    "Alexa",
    "Americano",
    "Blueberry",
    "Bumblebee",
    "Computer",
    "Grapefruit",
    "Grasshopper",
    "Hey Google",
    "Hey Siri",
    "Jarvis",
    "Okay Google",
    "Picovoice",
    "Porcupine",
    "Terminator",
  ];
  const integrations: {
    label: string;
    settingsKey: keyof Settings;
    enabled: boolean;
  }[] = [
    { label: "Google", settingsKey: "enableGoogle", enabled: true },
    {
      label: "Google Maps",
      settingsKey: "enableGoogleMaps",
      enabled: settings.enableGoogle,
    },
    {
      label: "Google Calendar",
      settingsKey: "enableGoogleCalendar",
      enabled: settings.enableGoogle,
    },
    {
      label: "Google Photos",
      settingsKey: "enableGooglePhotos",
      enabled: settings.enableGoogle,
    },
    { label: "Microsoft", settingsKey: "enableMicrosoft", enabled: true },
    { label: "Spotify", settingsKey: "enableSpotify", enabled: true },
    { label: "NewsApi", settingsKey: "enableNewsApiOrg", enabled: true },
    {
      label: "OpenWeatherMap",
      settingsKey: "enableOpenWeatherMap",
      enabled: true,
    },
  ];

  return (
    <Popover
      id={id}
      open={open}
      anchorEl={anchorEl}
      onClose={onClose}
      anchorOrigin={{
        vertical: "top",
        horizontal: "right",
      }}
      transformOrigin={{
        vertical: "top",
        horizontal: "left",
      }}
      disableScrollLock={true}
      sx={{ fontSize: "14px", left: "-5px" }}
    >
      <Box style={{ display: "flex", flexDirection: "column" }}>
        <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
          <Tabs
            value={tabIndex}
            onChange={handleTabChange}
            aria-label="assistant settings"
          >
            <Tab label="Assistant" {...a11yProps(0)} />
            <Tab label="Integrations" {...a11yProps(1)} />
            <Tab label="Users" {...a11yProps(2)} />
            <Tab label="Models" {...a11yProps(3)} />
          </Tabs>
        </Box>

        <CustomTabPanel value={tabIndex} index={0}>
          <Stack spacing={2} direction="row" alignItems="center">
            <FormControl>
              <FormControlLabel
                checked={settings.openMic}
                control={<Switch color="primary" />}
                label="Open Mic"
                labelPlacement="end"
                onChange={() =>
                  setSettings({ ...settings, openMic: !settings.openMic })
                }
              />
            </FormControl>
            <FormControl sx={{ m: 1, minWidth: 120, margin: 0 }} size="small">
              <InputLabel>Wake word</InputLabel>
              <Select
                value={settings.triggerWord.valueOf()}
                label="Wake word"
                disabled={!settings.openMic}
                onChange={(event) => {
                  setSettings({
                    ...settings,
                    triggerWord: event.target.value as BuiltInKeyword,
                  });
                }}
              >
                {triggerWords.map((word, index) => (
                  <MenuItem key={index} value={word}>
                    {word}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Stack>
          <FormControl>
            <FormControlLabel
              checked={settings.expectResponse}
              control={<Switch color="primary" />}
              label="Listen when done responding"
              labelPlacement="end"
              onChange={() =>
                setSettings({
                  ...settings,
                  expectResponse: !settings.expectResponse,
                })
              }
            />
          </FormControl>
          <FormControl>
            <FormControlLabel
              checked={settings.useWhisper}
              control={<Switch color="primary" />}
              label="Use Whisper Transcription"
              labelPlacement="end"
              onChange={() =>
                setSettings({ ...settings, useWhisper: !settings.useWhisper })
              }
            />
          </FormControl>
          <TextField
            label="Stop words"
            value={settings.stopWords.join(", ")}
            onChange={(event) =>
              setSettings({
                ...settings,
                stopWords: event.target.value.split(", "),
              })
            }
            helperText="Cancel when all spoken words are in this list"
            variant="filled"
          />
          <TextField
            label="Transcription language"
            value={settings.transcriptionLanguage}
            onChange={(event) =>
              setSettings({
                ...settings,
                transcriptionLanguage: event.target.value,
              })
            }
            helperText="Your language or leave empty"
            variant="filled"
          />
          <FormControl sx={{ m: 1, minWidth: 120, margin: 0 }} size="small">
            <InputLabel>Personality</InputLabel>
            <Select
              value={settings.personality}
              label="Personality"
              onChange={(event) => {
                setSettings({
                  ...settings,
                  personality: event.target.value as Personality,
                });
              }}
            >
              {personalities.map((personality, index) => (
                <MenuItem key={index} value={personality.toLowerCase()}>
                  {personality}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl sx={{ m: 1, minWidth: 120, margin: 0 }} size="small">
            <InputLabel>Voice</InputLabel>
            <Select
              value={settings.voice}
              label="Voice"
              onChange={(event) => {
                setSettings({
                  ...settings,
                  voice: event.target.value as Voice,
                });
              }}
            >
              {voices.map((voice, index) => (
                <MenuItem key={index} value={voice.toLowerCase()}>
                  {voice}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Stack spacing={2} direction="row" sx={{ mb: 1 }} alignItems="center">
            <SpeedIcon />
            <Slider
              aria-label="Custom marks"
              value={settings.audioSpeed}
              onChange={(_event, newValue) =>
                setSettings({ ...settings, audioSpeed: newValue as number })
              }
              min={0.25}
              max={2.0}
              step={0.05}
              valueLabelDisplay="auto"
              marks={audioSpeedMarks}
            />
          </Stack>
        </CustomTabPanel>
        <CustomTabPanel value={tabIndex} index={1}>
          {integrations.map((item) => (
            <FormControl disabled={!item.enabled} key={item.settingsKey}>
              <FormControlLabel
                checked={!!settings[item.settingsKey]}
                control={<Switch color="primary" />}
                label={item.label}
                labelPlacement="end"
                onChange={() =>
                  setSettings({
                    ...settings,
                    [item.settingsKey]: !settings[item.settingsKey],
                  })
                }
              />
            </FormControl>
          ))}
        </CustomTabPanel>
        <CustomTabPanel value={tabIndex} index={2}>
          <UserList />
        </CustomTabPanel>
        <CustomTabPanel value={tabIndex} index={3}>
          <LLMConfigs />
        </CustomTabPanel>
      </Box>
    </Popover>
  );
}

interface Props {
  onClose: () => void;
  anchorEl: HTMLButtonElement | null;
}
