import React from "react";
import './Dashboard.css'
import Paper from "@mui/material/Paper";
import {styled, ThemeProvider, createTheme} from "@mui/material/styles";
import List from "@mui/material/List";
import useAppContext from "../hooks/useAppContext.tsx";
import useGoogleContext from "../hooks/useGoogleContext.tsx";
import {KeyboardArrowDown} from "@mui/icons-material";
import AlarmIcon from '@mui/icons-material/Alarm';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import RadioIcon from '@mui/icons-material/Radio';
import {Box, ListItemButton} from "@mui/material";
import ListItemText from "@mui/material/ListItemText";
import {Settings} from "../contexts/SettingsContext.tsx";
import useSettings from "../hooks/useSettings.tsx";
import {Timers} from "./Timers.tsx";
import {Events} from "./Events.tsx";
import ListItemIcon from "@mui/material/ListItemIcon";
import MediaControlCard from "./MediaControlCard.tsx";
import useSpotifyContext from "../hooks/useSpotifyContext.tsx";

const DashboardList = styled(List)<{ component?: React.ElementType }>({
  '& .MuiListItemButton-root': {
    paddingLeft: 16,
    paddingRight: 16,
    paddingTop: 2,
    paddingBottom: 2,
    display: 'grid',
    gridTemplateColumns: '32px 1fr 32px',
    alignItems: 'start',
    gap: '0 8px',
  },
  '& .MuiListItem-root': {
    paddingLeft: 16,
    paddingRight: 16,
    paddingTop: 2,
    paddingBottom: 2,
    display: 'grid',
    gridTemplateColumns: '32px 1fr 32px',
    alignItems: 'start',
    gap: '0 8px',
  },
  '& .MuiListItemIcon-root': {
    minWidth: 0,
    justifySelf: 'center',
  },
  '& .MuiSvgIcon-root': {
    fontSize: 20,
    marginRight: 0,
    justifySelf: 'center',
  },
});

function CollapsibleList({title, icon, secondaryTitle, settingsKey, children}: DashboardItemProps) {
  const {settings, setSettings} = useSettings();
  const open = settings[settingsKey];

  return (
    <Paper elevation={1} style={{display: "flex"}}>
      <DashboardList style={{paddingTop: 0, paddingBottom: 0, width: '100%'}}>
        <Box
          sx={{
            paddingTop: 0,
            paddingBottom: open ? 1 : 0
          }}
        >
          <ListItemButton
            className="listItemGrid"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => setSettings({...settings, [settingsKey]: !open})}
            sx={{
              //'&:hover, &:focus': { '& svg': { opacity: open ? 1 : 0 } },
            }}
            style={{paddingTop: 16, paddingBottom: open ? 0 : 16}}
          >
            <ListItemIcon style={{marginTop: 0}}>
              {icon}
            </ListItemIcon>
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
                color: open ? 'rgba(0,0,0,0)' : 'rgba(0,0,0,0.5)',
              }}
              sx={{ my: 0 }}
            />
            <KeyboardArrowDown
              sx={{
                mr: -1,
                //opacity: 0,
                transform: open ? 'rotate(-180deg)' : 'rotate(0)',
                transition: '0.2s',
              }}
            />
          </ListItemButton>
          {open && children}
        </Box>
      </DashboardList>
    </Paper>
  );
}

interface DashboardItemProps {
  icon: React.ReactNode;
  title: string;
  secondaryTitle: string;
  settingsKey: keyof Settings;
  children: React.ReactNode;
}

const theme = createTheme({
  components: {
    MuiListItemButton: {
      defaultProps: {
        disableTouchRipple: true,
      }
    }
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

export function Dashboard() {
  const {timers} = useAppContext();
  const {upcomingEvents} = useGoogleContext();
  const {settings} = useSettings();
  const {playerState, deviceId, playTracks, pausePlayback, skipNext, skipPrevious, markAsFavorite} = useSpotifyContext();
  
  React.useEffect(() => {
    const showDashboard = timers.length > 0 || upcomingEvents.length > 0;
    document.documentElement.style.setProperty('--timer-width', showDashboard ? '230px' : '0');

  }, [timers, upcomingEvents]);
  
  return (
    <ThemeProvider theme={theme}>
      <div
        className="dashboard"
        style={{
            display: timers.length > 0 || (settings.enableGoogle && upcomingEvents.length > 0) ? "flex" : "none"
        }}
      >
        {settings.enableGoogle && upcomingEvents.length > 0 && (
          <CollapsibleList
            icon={<CalendarMonthIcon style={{color: "#00c4ff", fontSize: "1.5rem"}}/>}
            title="Events"
            secondaryTitle="Show upcoming events"
            settingsKey="showUpcomingEvents">
            <Events/>
          </CollapsibleList>
        )}
        {timers.length > 0 && (
          <CollapsibleList
            icon={<AlarmIcon style={{color: "#ff4d17", fontSize: "1.5rem"}}/>}
            title="Alarms"
            secondaryTitle="Show alarms and timers"
            settingsKey="showTimers">
            <Timers/>
          </CollapsibleList>
        )}
        {settings.enableSpotify && (
          <MediaControlCard
            title={playerState.name}
            artist={playerState.artists.join(", ")}
            albumUrl={playerState.coverImageUrl}
            skipPrevious={async () => skipPrevious(deviceId)}
            skipNext={async () => skipNext(deviceId)}
            togglePlay={async () => {
              if (playerState.paused) {
                await playTracks(deviceId, []);
              } else {
                await pausePlayback(deviceId);
              }
            }}
            markFavorite={async () => markAsFavorite(playerState.trackId)}
            playing={!playerState.paused}
          />
        )}
      </div>
    </ThemeProvider>
  );
}
