import React from "react";
import './Dashboard.css'
import Paper from "@mui/material/Paper";
import {styled} from "@mui/material/styles";
import List from "@mui/material/List";
import Divider from "@mui/material/Divider";
import useAppContext from "../hooks/useAppContext.tsx";
import useGoogleContext from "../hooks/useGoogleContext.tsx";
import {KeyboardArrowDown} from "@mui/icons-material";
import {Box, ListItemButton } from "@mui/material";
import ListItemText from "@mui/material/ListItemText";
import {Settings} from "../contexts/SettingsContext.tsx";
import useSettings from "../hooks/useSettings.tsx";
import {Timers} from "./Timers.tsx";
import {Events} from "./Events.tsx";

const DashboardList = styled(List)<{ component?: React.ElementType }>({
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

function CollapsibleList({title, secondaryTitle, settingsKey, children}: DashboardItemProps) {
  
  const {settings, setSettings} = useSettings();
  const open = settings[settingsKey];

  return <Box
    sx={{
      paddingTop: 0,
      paddingBottom: 0,
      bgcolor: open ? 'rgba(71, 98, 130, 0.2)' : null,
    }}
  >
    <ListItemButton
      alignItems="flex-start"
      onMouseDown={(e) => e.preventDefault()}
      onClick={() => setSettings({...settings, [settingsKey]: !open})}
      sx={{
        px: 3,
        pt: 2.5,
        pb: open ? 0 : 2.5,
        '&:hover, &:focus': { '& svg': { opacity: open ? 1 : 0 } },
      }}
    >
      <ListItemText
        primary={title}
        primaryTypographyProps={{
          fontSize: 15,
          fontWeight: 'medium',
          lineHeight: '20px',
          mb: '2px',
        }}
        secondary={secondaryTitle}
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
    {open && children}
  </Box>
}

interface DashboardItemProps {
  title: string;
  secondaryTitle: string;
  settingsKey: keyof Settings;
  children: React.ReactNode;
}

export function Dashboard() {
  const {timers} = useAppContext();
  const {upcomingEvents} = useGoogleContext();
  const {settings} = useSettings();
  
  React.useEffect(() => {
    const showDashboard = timers.length > 0 || upcomingEvents.length > 0;
    document.documentElement.style.setProperty('--timer-width', showDashboard ? '230px' : '0');

  }, [timers, upcomingEvents]);
  
  return (
    <Paper
      className="dashboard"
      elevation={3}
      style={{
        display: timers.length > 0 || (settings.enableGoogle && upcomingEvents.length > 0) ? "flex" : "none"
      }}
    >
      <DashboardList style={{paddingTop: 0, paddingBottom: 0}}>
        {settings.enableGoogle && upcomingEvents.length > 0 && (
          <>
            <CollapsibleList
              title="Next events"
              secondaryTitle="Click to show upcoming events"
              settingsKey="showUpcomingEvents">
              <Events/>
            </CollapsibleList>
            <Divider/>
          </>
        )}
        {timers.length > 0 && (
          <CollapsibleList
            title="Timers & alarms"
            secondaryTitle="Click to show alarms and timers"
            settingsKey="showTimers">
            <Timers/>
          </CollapsibleList>
        )}
      </DashboardList>
    </Paper>
  );
}
