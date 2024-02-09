import * as React from 'react';
import Box from '@mui/material/Box';
import {styled, createTheme, ThemeProvider} from '@mui/material/styles';
import Divider from '@mui/material/Divider';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Paper from '@mui/material/Paper';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import ArrowRight from '@mui/icons-material/ArrowRight';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import Settings from '@mui/icons-material/Settings';
import useChats from "../hooks/useChats";
import './Sidebar.css'
import {ChatSelection} from "./ChatSelection.tsx";
import {AssistantSettings} from "./AssistantSettings.tsx";
import {RiRobot2Fill} from "react-icons/ri";

const SidebarList = styled(List)<{ component?: React.ElementType }>({
  '& .MuiListItemButton-root': {
    paddingLeft: 16,
    paddingRight: 16,
  },
  '& .MuiListItemIcon-root': {
    minWidth: 0,
    marginRight: 12,
  },
  '& .MuiSvgIcon-root': {
    fontSize: 20,
  },
});

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
        root: {
          paddingLeft: '16px!important'
        },
        input: {
          paddingTop: '8px',
          paddingBottom: '8px',
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
    mode: 'dark',
    primary: {
      main: 'rgb(58,166,255)'
    },
    text: {
      primary: 'rgb(235, 235, 241)',
    },
    background: {
      paper: 'rgb(14,32,49)'
    },
  }
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
  
  // const settingsOpen = Boolean(anchorEl);
  
  return (
    <ThemeProvider theme={theme}>
      <Box className="sidebar">
        <Paper
          elevation={0}
          sx={{
            display: "flex",
            flexDirection: "column",
            maxHeight: "100%",
            overscrollBehavior: "contain"
        }}
        >
          <SidebarList component="nav" disablePadding>
            <ListItem
              sx={{
                color: 'rgb(255, 143, 16)',
              }}
            >
              <ListItemIcon
                sx={{
                  color: 'inherit',
                  fontSize: 20
                }}
              >
                <RiRobot2Fill />
              </ListItemIcon>
              <ListItemText
                sx={{
                  my: 0,
                  textShadow: '0 0 8px rgba(255, 143, 16, 0.2)'
              }}
                primary="Voice Assistant"
                primaryTypographyProps={{
                  fontFamily: "KomikaAxis",
                  fontSize: 18,
                  fontWeight: 'medium',
                  paddingBottom: '3px',
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
                    color: 'primary',
                    fontWeight: 'medium',
                    variant: 'body2',
                  }}
                />
              </ListItemButton>
              <Tooltip title="Assistant Settings">
                <IconButton
                  size="large"
                  sx={{
                    '& svg': {
                      color: 'rgba(255,255,255,0.8)',
                      transition: '0.2s',
                      transform: 'translateX(0) rotate(0)',
                    },
                    '&:hover, &:focus': {
                      bgcolor: 'unset',
                      '& svg:first-of-type': {
                        transform: 'translateX(-4px) rotate(-20deg)',
                      },
                      '& svg:last-of-type': {
                        right: 0,
                        opacity: 1,
                      },
                    },
                    '&::after': {
                      content: '""',
                      position: 'absolute',
                      height: '80%',
                      display: 'block',
                      left: 0,
                      width: '1px',
                      bgcolor: 'divider',
                    },
                  }}
                  onMouseDown={handleClick}
                >
                  <Settings />
                  <ArrowRight sx={{ position: 'absolute', right: 4, opacity: 0 }} />
                </IconButton>
              </Tooltip>
              <AssistantSettings anchorEl={anchorEl} onClose={handleClose}/>
            </ListItem>
            <Divider />
          </SidebarList>
          <ChatSelection/>
        </Paper>
      </Box>
    </ThemeProvider>
  );
}