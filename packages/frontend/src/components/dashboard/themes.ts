import { createTheme } from "@mui/material/styles";

export const regularTheme = createTheme({
  components: {
    MuiListItemButton: {
      defaultProps: {
        disableTouchRipple: true,
      },
    },
    MuiListItemText: {
      defaultProps: {
        primaryTypographyProps: {
          style: {
            fontSize: 15,
            fontWeight: "medium",
            lineHeight: "20px",
          },
          mb: "2px",
        },
        secondaryTypographyProps: {
          style: {
            fontSize: 12,
            lineHeight: "16px",
          },
          noWrap: true,
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

export const idleTheme = createTheme({
  components: {
    MuiListItemButton: {
      defaultProps: {
        disableTouchRipple: true,
      },
    },
    MuiListItemText: {
      defaultProps: {
        primaryTypographyProps: {
          style: {
            fontSize: 20,
            fontWeight: "medium",
            lineHeight: "26px",
            //textShadow: "1px 1px 2px rgba(0,0,0,0.3)",
          },
          mb: "4px",
        },
        secondaryTypographyProps: {
          style: {
            fontSize: 16,
            lineHeight: "20px",
            //textShadow: "1px 1px 2px rgba(0,0,0,0.2)",
          },
          noWrap: true,
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundColor: "rgba(0, 0, 0, 0.6)",
          backdropFilter: "blur(1px)",
          WebkitBackdropFilter: "blur(1px)",
        },
      },
    },
  },
  palette: {
    mode: "dark",
    primary: {
      main: "rgb(102, 157, 246)",
    },
    text: {
      primary: "rgb(245, 245, 245)",
    },
    background: {
      paper: "rgba(0, 0, 0, 0.6)",
    },
  },
});
