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
import HeadphonesIcon from '@mui/icons-material/Headphones';
import {Box, ListItemButton, SxProps} from "@mui/material";
import ListItemText from "@mui/material/ListItemText";
import {Settings} from "../contexts/SettingsContext.tsx";
import useSettings from "../hooks/useSettings.tsx";
import {Timers} from "./Timers.tsx";
import {Events} from "./Events.tsx";
import ListItemIcon from "@mui/material/ListItemIcon";
import {CurrentSong, PlaybackControls, PositionControls} from "./MusicControls";
import useSpotifyContext from "../hooks/useSpotifyContext";
import {MusicPlaylist} from "./MusicPlaylist.tsx";
import ListItem from "@mui/material/ListItem";
import IconButton from "@mui/material/IconButton";
import Divider from "@mui/material/Divider";
import useMicrosoftContext from "../hooks/useMicrosoftContext.tsx";
import {Photos} from "./Photos.tsx";
import {Theme} from "@emotion/react";
import {gridConfig} from "./dashboardGridConfig.ts";

const DashboardList = styled(List)<{ component?: React.ElementType }>({
  '& .MuiList-root': {
    overflow: 'auto'
  },
  '& .MuiListItemButton-root': {
    ...gridConfig,
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
});

export function ExpandButton({open, sx, id}: { open: boolean, sx?: SxProps<Theme>, id?: string }) {
  return <KeyboardArrowDown
    key={id}
    sx={{
      ...sx,
      mr: -1,
      color: 'rgba(0,0,0,1)',
      transform: open ? 'rotate(-180deg)' : 'rotate(0)',
      transition: '0.2s',
      fontSize: 20,
      marginRight: 0,
      justifySelf: 'center',
    }}
  />
}

export function CollapsibleList(
  {
    header,
    title,
    icon,
    secondaryTitle,
    settingsKey,
    children,
    disableExpand,
    hideList,
    sx,
    expandKey,
    onMouseEnter,
    onMouseLeave
  }: DashboardItemProps
) {
  const {settings, setSettings} = useSettings();
  const open = settings[settingsKey];
  const toggleExpand = () => setSettings({...settings, [settingsKey]: !open});

  const iconContent = () => {
    if (icon) {
      return (
        <ListItemIcon style={{marginTop: 0}}>
          {icon}
        </ListItemIcon>
      );
    } else {
      return <div />;
    }
  }
  const titleContent = () => {
    if (typeof title === 'string') {
      return (
        <ListItemText
          primary={title}
          primaryTypographyProps={{
            fontSize: 15,
            fontWeight: 'medium',
            lineHeight: '20px',
            mb: '2px',
          }}
          secondary={!header ? secondaryTitle : null}
          secondaryTypographyProps={{
            noWrap: true,
            fontSize: 12,
            lineHeight: '16px',
            color: !disableExpand && open ? 'rgba(0,0,0,0)' : 'rgba(0,0,0,0.5)',
          }}
          sx={{ my: 0 }}
        />
      );
    } else {
      return title;
    }
  }
  const expandContent = () => {
    if (!disableExpand) {
      return <ExpandButton open={!!open} id={expandKey}/>;
    }
  }
  
  return (
    <Paper
      elevation={1}
      sx={{
        ...sx,
        display: "flex",
        flexDirection: "column",
      }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {header}
      {!hideList && (
        <DashboardList style={{paddingTop: 0, paddingBottom: 0, width: '100%'}}>
          <Box
            sx={{
              paddingTop: 0,
              paddingBottom: open && !disableExpand ? 1 : 0
            }}
          >
            {disableExpand || typeof title !== "string" ? (
              <ListItem
                style={{
                  paddingTop: header ? 4 : 16,
                  paddingBottom: header ? 4 : 16
                }}
              >
                {iconContent()}
                {titleContent()}
                {!disableExpand && (
                  <IconButton onClick={toggleExpand} style={{height: 32, width: 32}}>
                    {expandContent()}
                  </IconButton>)
                }
              </ListItem>
            ) : (
              <ListItemButton
                onMouseDown={(e) => e.preventDefault()}
                onClick={toggleExpand}
                sx={{
                  //'&:hover, &:focus': { '& svg': { opacity: open ? 1 : 0 } },
                }}
                style={{
                  paddingTop: header ? 4 : 16,
                  paddingBottom: open ? 0 : header ? 4 : 16
                }}
              >
                {iconContent()}
                {titleContent()}
                {expandContent()}
              </ListItemButton>
            )}
            {open && children}
          </Box>
        </DashboardList>
      )}
    </Paper>
  );
}

interface DashboardItemProps {
  icon?: React.ReactNode;
  header?: React.ReactNode;
  title: string | React.ReactNode;
  secondaryTitle: string;
  settingsKey: keyof Settings;
  children?: React.ReactNode;
  disableExpand?: boolean;
  hideList?: boolean;
  sx?: SxProps<Theme>;
  expandKey?: string;
  onMouseEnter?: (event: React.MouseEvent<HTMLElement>) => void;
  onMouseLeave?: (event: React.MouseEvent<HTMLElement>) => void;
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

function MusicList() {
  const {player, playerState, deviceId, play, pausePlayback, skipNext, skipPrevious} = useSpotifyContext();
  return (
    <CollapsibleList
      header={playerState.trackId && (
        <Box sx={{paddingLeft: 2, paddingRight: 2, paddingTop: 2}}>
          <CurrentSong
            title={playerState.name}
            artist={playerState.artists.join(", ")}
            albumTitle={playerState.albumName}
            albumCoverUrl={playerState.coverImageUrl}
          />
          <PositionControls
            position={playerState.position}
            duration={playerState.duration}
            setPosition={async (value: number) => {
              if (player) {
                await player.seek(value * 1000);
              }
            }}
          />
        </Box>
      )}
      icon={playerState.trackId ? (
        <div />
      ) : (
        <HeadphonesIcon style={{color: "#00ce41", fontSize: "1.5rem"}}/>
      )}
      title={!playerState.trackId ? "Music" : (
        <PlaybackControls
          skipPrevious={async () => skipPrevious(deviceId)}
          skipNext={async () => skipNext(deviceId)}
          canSkipPrevious={playerState.canSkipPrevious}
          canSkipNext={playerState.canSkipNext}
          togglePlay={async () => {
            if (playerState.paused) {
              await play(deviceId, []);
            } else {
              await pausePlayback(deviceId);
            }
          }}
          playing={!playerState.paused}
        />
      )}
      secondaryTitle={playerState.trackId ? "Show playlist" : "No music is currently streaming"}
      settingsKey="showPlaylist"
      disableExpand={!playerState.trackId}
    >
      {playerState.trackId && <Divider />}
      <MusicPlaylist/>
    </CollapsibleList>
  );
}

export function Dashboard() {
  const {timers, idle} = useAppContext();
  const {upcomingEvents: upcomingGoogleEvents, favoritePhotos} = useGoogleContext();
  const {upcomingEvents: upcomingMicrosoftEvents} = useMicrosoftContext();
  const {settings} = useSettings();
  
  const upcomingEvents = [];
  if (settings.enableGoogle && settings.enableGoogleCalendar) {
    upcomingEvents.push(...upcomingGoogleEvents || []);
  }
  if (settings.enableMicrosoft) {
    upcomingEvents.push(...upcomingMicrosoftEvents || []);
  }
  upcomingEvents.sort((a, b) => {
    const aStart = a.start.dateTime || a.start.date || "";
    const bStart = b.start.dateTime || b.start.date || "";
    return aStart.localeCompare(bStart);
  });
  const hasEvents = upcomingEvents.length > 0;
  const hasPhotos = settings.enableGoogle && settings.enableGooglePhotos && favoritePhotos.length > 0;
  
  React.useEffect(() => {
    const showDashboard = timers.length > 0 || hasEvents || settings.enableSpotify;
    document.documentElement.style.setProperty('--dashboard-width', showDashboard ? '230px' : '0');
  }, [timers, hasEvents, settings.enableSpotify]);
  
  return (
    <ThemeProvider theme={theme}>
      <div
        className="dashboard side-column"
        style={{
          display: timers.length > 0 || hasEvents || settings.enableSpotify || hasPhotos ? "flex" : "none"
        }}
      >
        {hasEvents && (
          <CollapsibleList
            icon={<CalendarMonthIcon style={{color: "#00c4ff", fontSize: "1.5rem"}}/>}
            title="Calendar"
            secondaryTitle="Show upcoming events"
            settingsKey="showUpcomingEvents">
            <Events events={upcomingEvents}/>
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
          <MusicList/>
        )}
        {hasPhotos && (
          <Photos idle={idle} mediaItemIDs={favoritePhotos} />
        )}
      </div>
    </ThemeProvider>
  );
}
