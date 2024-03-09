import './App.css';
import {GoogleContextProvider} from "./contexts/GoogleContext";
import {SettingsProvider} from "./contexts/SettingsContext";
import VoiceAssistant from "./components/VoiceAssistant";
import {ChatsProvider} from "./contexts/ChatsContext";
import {Sidebar} from "./components/Sidebar";
import {WindowFocusProvider} from "./contexts/WindowFocusContext";
import {AppContextProvider} from "./contexts/AppContext";
import {createTheme, ThemeProvider} from '@mui/material/styles';
import useSettings from "./hooks/useSettings";
import {Dashboard} from "./components/Dashboard.tsx";
import {SpotifyContextProvider} from "./contexts/SpotifyContext.tsx";
import {MicrosoftContextProvider} from "./contexts/MicrosoftContext.tsx";
import useAppContext from "./hooks/useAppContext.tsx";

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
          fontSize: '14px'
        }
      }
    },
    MuiFormLabel: {
      styleOverrides: {
        root: {
          fontSize: '14px'
        }
      }
    },
    MuiFormHelperText: {
      styleOverrides: {
        root: {
          fontSize: '11px'
        }
      }
    },
    MuiInputBase: {
      styleOverrides: {
        input: {
          fontSize: '14px'
        }
      }
    },
    MuiMenuItem: {
      styleOverrides: {
        root: {
          fontSize: '14px'
        }
      }
    },
    MuiSlider: {
      styleOverrides: {
        markLabel: {
          fontSize: '14px'
        }
      }
    },
  },
  palette: {
    mode: 'light',
    primary: {
      main: 'rgb(102, 157, 246)'
    },
    text: {
      primary: 'rgb(40, 40, 40)',
    },
    background: {
      paper: 'rgb(235, 235, 235)'
    },
  }
});

function AssistantWithOptionalIntegrations() {
  const {settings} = useSettings();
  const {idle} = useAppContext();
  
  const idleMode = idle && settings.enableGooglePhotos;
  
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
          <SettingsProvider>
            <AssistantWithOptionalIntegrations />
          </SettingsProvider>
        </AppContextProvider>
      </WindowFocusProvider>
    </ThemeProvider>
  );
}
