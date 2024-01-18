import './App.css';
import {SettingsProvider} from "./contexts/SettingsContext";
import VoiceAssistant from "./components/VoiceAssistant";
import {ChatsProvider} from "./contexts/ChatsContext";
import {Sidebar} from "./components/Sidebar";
import {WindowFocusProvider} from "./contexts/WindowFocusContext";
import {AppContextProvider} from "./contexts/AppContext";
import { createTheme, ThemeProvider } from '@mui/material';

const theme = createTheme({
  components: {
    MuiListItemButton: {
      styleOverrides: {
        root: {
          "&.Mui-selected": {
            backgroundColor: "#eaeaea",
          },
          "&.Mui-selected:hover": {
            backgroundColor: "#eaeaea",
          },
          "&:hover": {
            backgroundColor: "#e5e5e5",
          },
        }
      },
    },
    MuiListItemSecondaryAction: {
      styleOverrides: {
        root: {
          background: "linear-gradient(to right, rgba(0, 0, 0, 0) 0%, #eaeaea 30%);",
        },
      },
    }
  },
});

export default function App() {
  return (
    <ThemeProvider theme={theme}>
      <WindowFocusProvider>
        <AppContextProvider>
          <SettingsProvider>
            <ChatsProvider>
              <Sidebar />
              <VoiceAssistant />
            </ChatsProvider>
          </SettingsProvider>
        </AppContextProvider>
      </WindowFocusProvider>
    </ThemeProvider>
  );
}
