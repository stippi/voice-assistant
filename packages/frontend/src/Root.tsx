import { BrowserRouter as Router } from "react-router-dom";
import { SettingsProvider } from "./contexts/SettingsContext";
import { App } from "./App";
import { ConfigsProvider } from "./contexts/ConfigsContext";
import { WindowFocusProvider } from "./contexts/WindowFocusContext";
import { AppContextProvider } from "./contexts/AppContext";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import { TimerContextProvider } from "./contexts/TimerContext";

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

export default function Root() {
  return (
    <ThemeProvider theme={theme}>
      <WindowFocusProvider>
        <AppContextProvider>
          <TimerContextProvider>
            <SettingsProvider>
              <ConfigsProvider>
                <Router>
                  <App />
                </Router>
              </ConfigsProvider>
            </SettingsProvider>
          </TimerContextProvider>
        </AppContextProvider>
      </WindowFocusProvider>
    </ThemeProvider>
  );
}
