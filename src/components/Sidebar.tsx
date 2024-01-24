// import React from "react";
// import AddCircleIcon from '@mui/icons-material/AddCircle';
// import './Sidebar.css'
// import useChats from "../hooks/useChats";
// import {ChatSelection} from "./ChatSelection.tsx";
//
// export function Sidebar() {
//   const { newChat } = useChats();
//   const [expanded, setExpanded] = React.useState(true);
//
//   React.useEffect(() => {
//     const root = document.documentElement;
//     if (expanded) {
//       root.style.setProperty('--sidebar-width', '12vw');
//     } else {
//       root.style.setProperty('--sidebar-width', '0.5rem');
//     }
//   }, [expanded]);
//
//   return (
//     <div className="sidebar">
//       <div
//         className="sidebar-toggle"
//         onClick={() => setExpanded(!expanded)}
//       />
//
//       {expanded && (
//         <div
//           className="chat-item"
//           onClick={() => newChat([])}
//         >
//           <AddCircleIcon fontSize="small"/>
//           New chat
//         </div>
//       )}
//
//       {expanded && (
//         <ChatSelection/>
//       )}
//
//       {expanded && (
//         <div
//           className="chat-item"
//         >
//         Footer
//         </div>)}
//     </div>
//   );
// }


import * as React from 'react';
import Box from '@mui/material/Box';
import { styled, ThemeProvider, createTheme } from '@mui/material/styles';
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
import KeyboardArrowDown from '@mui/icons-material/KeyboardArrowDown';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import Settings from '@mui/icons-material/Settings';
//import QuestionAnswerIcon from '@mui/icons-material/QuestionAnswer';
import useChats from "../hooks/useChats";
import './Sidebar.css'
import {ChatSelection} from "./ChatSelection.tsx";
import {AssistantSettings} from "./AssistantSettings.tsx";

const SidebarList = styled(List)<{ component?: React.ElementType }>({
  '& .MuiListItemButton-root': {
    paddingLeft: 24,
    paddingRight: 24,
  },
  '& .MuiListItemIcon-root': {
    minWidth: 0,
    marginRight: 16,
  },
  '& .MuiSvgIcon-root': {
    fontSize: 20,
  },
});

export function Sidebar() {
  const [open, setOpen] = React.useState(true);
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
    <Box className="sidebar">
      <ThemeProvider
        theme={createTheme({
          components: {
            MuiListItemButton: {
              defaultProps: {
                disableTouchRipple: true,
              },
            },
          },
          palette: {
            mode: 'dark',
            primary: { main: 'rgb(102, 157, 246)' },
            background: { paper: 'rgb(5, 30, 52)' },
          },
        })}
      >
        <Paper elevation={0} sx={{ maxWidth: 256, display: "flex", flexDirection: "column", maxHeight: "100%" }}>
          <SidebarList component="nav" disablePadding>
            <ListItemButton>
              <ListItemIcon sx={{ fontSize: 20 }}>🤖</ListItemIcon>
              <ListItemText
                sx={{ my: 0 }}
                primary="Voice Assistant"
                primaryTypographyProps={{
                  fontSize: 20,
                  fontWeight: 'medium',
                  letterSpacing: 0,
                }}
              />
            </ListItemButton>
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
            <Box
              sx={{
                bgcolor: open ? 'rgba(71, 98, 130, 0.2)' : null,
                pb: open ? 2 : 0,
              }}
            >
              <ListItemButton
                alignItems="flex-start"
                onClick={() => setOpen(!open)}
                sx={{
                  px: 3,
                  pt: 2.5,
                  pb: open ? 0 : 2.5,
                  '&:hover, &:focus': { '& svg': { opacity: open ? 1 : 0 } },
                }}
              >
                <ListItemText
                  primary="Chats"
                  primaryTypographyProps={{
                    fontSize: 15,
                    fontWeight: 'medium',
                    lineHeight: '20px',
                    mb: '2px',
                  }}
                  secondary="Show all conversations"
                  secondaryTypographyProps={{
                    noWrap: true,
                    fontSize: 12,
                    lineHeight: '16px',
                    color: open ? 'rgba(0,0,0,0)' : 'rgba(255,255,255,0.5)',
                  }}
                  sx={{ my: 0 }}
                />
                <KeyboardArrowDown
                  sx={{
                    mr: -1,
                    opacity: 0,
                    transform: open ? 'rotate(-180deg)' : 'rotate(0)',
                    transition: '0.2s',
                  }}
                />
              </ListItemButton>
            </Box>
          </SidebarList>
          {open &&
            <ChatSelection/>
          }
        </Paper>
      </ThemeProvider>
    </Box>
  );
}