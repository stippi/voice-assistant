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
import { useAppContext, useGoogleContext, useMicrosoftContext, useSettings, useTimers } from "../../hooks";

export function Dashboard() {
  const { idle } = useAppContext();
  const { timers } = useTimers();
  const { upcomingEvents: upcomingGoogleEvents, favoritePhotos } = useGoogleContext();
  const { upcomingEvents: upcomingMicrosoftEvents } = useMicrosoftContext();
  const { settings } = useSettings();

  const upcomingEvents = [];
  if (settings.enableGoogle && settings.enableGoogleCalendar) {
    upcomingEvents.push(...(upcomingGoogleEvents || []));
  }
  if (settings.enableMicrosoft) {
    upcomingEvents.push(...(upcomingMicrosoftEvents || []));
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
    document.documentElement.style.setProperty("--dashboard-width", showDashboard ? "230px" : "0");
  }, [timers, hasEvents, settings.enableSpotify]);

  return (
    <ThemeProvider theme={idle ? idleTheme : regularTheme}>
      <div
        className="dashboard side-column"
        style={{
          display: timers.length > 0 || hasEvents || settings.enableSpotify || hasPhotos ? "flex" : "none",
        }}
      >
        {hasEvents && (
          <CollapsibleList
            icon={<CalendarMonthIcon style={{ color: "#00c4ff", fontSize: "1.5rem" }} />}
            title="Calendar"
            secondaryTitle="Show upcoming events"
            settingsKey="showUpcomingEvents"
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
