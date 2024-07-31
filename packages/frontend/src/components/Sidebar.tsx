import * as React from "react";
import { styled, createTheme, ThemeProvider } from "@mui/material/styles";
import {
  Box,
  Divider,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Paper,
  Stack,
  Tooltip,
} from "@mui/material";
import AddCircleIcon from "@mui/icons-material/AddCircle";
import ArrowRight from "@mui/icons-material/ArrowRight";
import SaveAltIcon from "@mui/icons-material/SaveAlt";
import Settings from "@mui/icons-material/Settings";
import useChats from "../hooks/useChats";
import "./Sidebar.css";
import { ChatSelection } from "./ChatSelection";
import { AssistantSettings } from "./AssistantSettings";
import { RiRobot2Fill } from "react-icons/ri";

const SidebarList = styled(List)<{ component?: React.ElementType }>({
  "& .MuiListItemButton-root": {
    paddingLeft: 16,
    paddingRight: 16,
  },
  "& .MuiListItemIcon-root": {
    minWidth: 0,
    marginRight: 12,
  },
  "& .MuiSvgIcon-root": {
    fontSize: 20,
  },
});

const DownloadChatsButton: React.FC = () => {
  const { downloadChats } = useChats();
  return (
    <Tooltip title="Download all chats">
      <IconButton onClick={downloadChats} sx={{ fontSize: "1rem" }}>
        <SaveAltIcon sx={{ fontSize: "inherit" }} />
      </IconButton>
    </Tooltip>
  );
};

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
        root: {
          paddingLeft: "16px!important",
        },
        input: {
          paddingTop: "8px",
          paddingBottom: "8px",
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
    mode: "dark",
    primary: {
      main: "rgb(58,166,255)",
    },
    text: {
      primary: "rgb(235, 235, 241)",
    },
    background: {
      paper: "rgb(10, 30, 49)",
    },
  },
});

export function Sidebar() {
  const { newChat } = useChats();
  const [anchorEl, setAnchorEl] = React.useState<HTMLButtonElement | null>(null);

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  return (
    <ThemeProvider theme={theme}>
      <Box className="sidebar">
        <Paper
          elevation={0}
          sx={{
            display: "flex",
            flexDirection: "column",
            height: "100%",
            bgcolor: "background.paper",
            overscrollBehavior: "contain",
          }}
        >
          {/* Fixed top section */}
          <Box>
            <SidebarList component="nav" disablePadding>
              <ListItem
                sx={{
                  color: "rgb(255, 143, 16)",
                }}
              >
                <ListItemIcon
                  sx={{
                    color: "inherit",
                    fontSize: 20,
                  }}
                >
                  <RiRobot2Fill />
                </ListItemIcon>
                <ListItemText
                  sx={{
                    my: 0,
                    textShadow: "0 0 8px rgba(255, 143, 16, 0.2)",
                  }}
                  primary="Voice Assistant"
                  primaryTypographyProps={{
                    fontFamily: "KomikaAxis",
                    fontSize: 18,
                    fontWeight: "medium",
                    paddingBottom: "3px",
                    letterSpacing: 0,
                  }}
                />
              </ListItem>
              <Divider />
              <ListItem component="div" disablePadding>
                <ListItemButton sx={{ height: 56 }} onClick={() => newChat([])}>
                  <ListItemIcon>
                    <AddCircleIcon color="primary" />
                  </ListItemIcon>
                  <ListItemText
                    primary="New chat"
                    primaryTypographyProps={{
                      color: "primary",
                      fontWeight: "medium",
                      variant: "body2",
                    }}
                  />
                </ListItemButton>
                <Tooltip title="Assistant Settings">
                  <IconButton
                    size="large"
                    sx={{
                      "& svg": {
                        color: "rgba(255,255,255,0.8)",
                        transition: "0.2s",
                        transform: "translateX(0) rotate(0)",
                      },
                      "&:hover, &:focus": {
                        bgcolor: "unset",
                        "& svg:first-of-type": {
                          transform: "translateX(-4px) rotate(-20deg)",
                        },
                        "& svg:last-of-type": {
                          right: 0,
                          opacity: 1,
                        },
                      },
                      "&::after": {
                        content: '""',
                        position: "absolute",
                        height: "80%",
                        display: "block",
                        left: 0,
                        width: "1px",
                        bgcolor: "divider",
                      },
                    }}
                    onMouseDown={handleClick}
                  >
                    <Settings />
                    <ArrowRight sx={{ position: "absolute", right: 4, opacity: 0 }} />
                  </IconButton>
                </Tooltip>
                <AssistantSettings anchorEl={anchorEl} onClose={handleClose} />
              </ListItem>
            </SidebarList>
            <Divider />
          </Box>

          {/* Scrollable middle section */}
          <Box sx={{ flexGrow: 1, overflow: "auto" }}>
            <ChatSelection />
          </Box>

          {/* Fixed bottom section */}
          <Box>
            <Divider />
            <Box sx={{ p: 1 }}>
              <Stack flexDirection="row" justifyContent="flex-end">
                <DownloadChatsButton />
              </Stack>
            </Box>
          </Box>
        </Paper>
      </Box>
    </ThemeProvider>
  );
}
