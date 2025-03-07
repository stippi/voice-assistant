import React from "react";
import "./Dashboard.css";
import { ThemeProvider } from "@mui/material/styles";
import { regularTheme, idleTheme } from "./themes";
import AlarmIcon from "@mui/icons-material/Alarm";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import { CollapsibleList } from "./DashboardItem";
import { Timers } from "./timers/Timers";
import { Events } from "./Events";
import { Photos } from "./Photos";
import { SpotifyPlayer } from "./SpotifyPlayer";
import { useGoogleContext, useEvents, useSettings, useTimers } from "../../hooks";

interface Props {
  idle: boolean;
}

export function Dashboard({ idle }: Props) {
  const { timers } = useTimers();
  const { favoritePhotos } = useGoogleContext();
  const { settings } = useSettings();
  const { upcomingEvents, eventsEnabled } = useEvents({ isIdle: idle, maxEvents: 2, soonThresholdMinutes: 60 });

  const hasEvents = upcomingEvents.length > 0;
  const hasPhotos = settings.enableGoogle && settings.enableGooglePhotos && favoritePhotos.length > 0;

  React.useEffect(() => {
    const showDashboard = timers.length > 0 || eventsEnabled || settings.enableSpotify;
    document.documentElement.style.setProperty("--dashboard-width", showDashboard ? "230px" : "0");
  }, [timers, eventsEnabled, settings.enableSpotify]);

  return (
    <ThemeProvider theme={idle ? idleTheme : regularTheme}>
      <div
        className={`dashboard side-column ${idle ? "idle" : ""}`}
        style={{
          display: timers.length > 0 || hasEvents || settings.enableSpotify || hasPhotos ? "flex" : "none",
        }}
      >
        {(hasEvents || (!idle && eventsEnabled)) && (
          <CollapsibleList
            icon={<CalendarMonthIcon style={{ color: "#00c4ff", fontSize: "1.5rem" }} />}
            title="Calendar"
            secondaryTitle={hasEvents ? "Show upcoming events" : "No upcoming events"}
            settingsKey="showUpcomingEvents"
            disableExpand={!hasEvents}
          >
            <Events events={upcomingEvents} />
          </CollapsibleList>
        )}
        {timers.length > 0 && (
          <CollapsibleList
            icon={<AlarmIcon style={{ color: "#ff4d17", fontSize: "1.5rem" }} />}
            title="Alarms"
            secondaryTitle="Show alarms and timers"
            settingsKey="showTimers"
          >
            <Timers />
          </CollapsibleList>
        )}
        {settings.enableSpotify && <SpotifyPlayer idle={idle} />}
        {hasPhotos && <Photos idle={idle} mediaItemIDs={favoritePhotos} />}
      </div>
    </ThemeProvider>
  );
}
