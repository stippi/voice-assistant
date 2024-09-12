import "./App.css";
import React from "react";
import { GoogleContextProvider } from "./contexts/GoogleContext";
import { SettingsProvider } from "./contexts/SettingsContext";
import VoiceAssistant from "./components/VoiceAssistant";
import { ChatsProvider } from "./contexts/ChatsContext";
import { ConfigsProvider } from "./contexts/ConfigsContext";
import { Sidebar } from "./components/sidebar/Sidebar";
import { WindowFocusProvider } from "./contexts/WindowFocusContext";
import { AppContextProvider } from "./contexts/AppContext";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import { Dashboard } from "./components/dashboard/Dashboard";
import { SpotifyContextProvider } from "./contexts/SpotifyContext";
import { MicrosoftContextProvider } from "./contexts/MicrosoftContext";
import { TimerContextProvider } from "./contexts/TimerContext";
import { useAppContext, useSettings, useWindowFocus } from "./hooks";

const theme = createTheme({
  components: {
    MuiListItemButton: {
      defaultProps: {
        disableTouchRipple: true,
      },
    },
    MuiFormControlLabel: {
      styleOverrides: {
        label: {
          fontSize: "14px",
        },
      },
    },
    MuiFormLabel: {
      styleOverrides: {
        root: {
          fontSize: "14px",
        },
      },
    },
    MuiFormHelperText: {
      styleOverrides: {
        root: {
          fontSize: "11px",
        },
      },
    },
    MuiInputBase: {
      styleOverrides: {
        input: {
          fontSize: "14px",
        },
      },
    },
    MuiMenuItem: {
      styleOverrides: {
        root: {
          fontSize: "14px",
        },
      },
    },
    MuiSlider: {
      styleOverrides: {
        markLabel: {
          fontSize: "14px",
        },
      },
    },
  },
  palette: {
    mode: "light",
    primary: {
      main: "rgb(102, 157, 246)",
    },
    text: {
      primary: "rgb(40, 40, 40)",
    },
    background: {
      paper: "rgb(235, 235, 235)",
    },
  },
});

function AssistantWithOptionalIntegrations() {
  const { settings } = useSettings();
  const { idle } = useAppContext();

  const idleMode = idle && settings.enableGoogle && settings.enableGooglePhotos;

  const { windowFocused } = useWindowFocus();
  React.useEffect(() => {
    if (windowFocused) {
      document.body.classList.add("window-focused");
    } else {
      document.body.classList.remove("window-focused");
    }
  }, [windowFocused]);

  React.useEffect(() => {
    if (idle && settings.enableGoogle && settings.enableGooglePhotos) {
      document.documentElement.style.overflowY = "hidden";
    } else {
      document.documentElement.style.overflowY = "scroll";
    }
  }, [idle, settings.enableGoogle, settings.enableGooglePhotos]);

  return (
    <ChatsProvider>
      <GoogleContextProvider enable={settings.enableGoogle}>
        <MicrosoftContextProvider enable={settings.enableMicrosoft}>
          <SpotifyContextProvider enable={settings.enableSpotify}>
            {!idleMode && <Sidebar />}
            <VoiceAssistant idle={idleMode} />
            <Dashboard />
          </SpotifyContextProvider>
        </MicrosoftContextProvider>
      </GoogleContextProvider>
    </ChatsProvider>
  );
}

export default function App() {
  return (
    <ThemeProvider theme={theme}>
      <WindowFocusProvider>
        <AppContextProvider>
          <TimerContextProvider>
            <SettingsProvider>
              <ConfigsProvider>
                <AssistantWithOptionalIntegrations />
              </ConfigsProvider>
            </SettingsProvider>
          </TimerContextProvider>
        </AppContextProvider>
      </WindowFocusProvider>
    </ThemeProvider>
  );
}
