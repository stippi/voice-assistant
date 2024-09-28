import React, { createContext, useState, useEffect, ReactNode } from "react";
import { GoogleApiKey } from "../config";
import { createScript } from "../utils/createScript";
import { fetchFavoritePhotos, loginFlow } from "../integrations/google";
import { CalendarEvent } from "@shared/types";
import { indexDbGet, indexDbPut } from "../utils/indexDB";

export type GoogleContextType = {
  apiLoaded: boolean;
  loggedIn: boolean;
  upcomingEvents: CalendarEvent[];
  favoritePhotos: string[];
};

export const GoogleContext = createContext<GoogleContextType>({
  apiLoaded: false,
  loggedIn: false,
  upcomingEvents: [],
  favoritePhotos: [],
});

interface Props {
  children: ReactNode;
  enable: boolean;
}

async function fetchCalendarList() {
  const response = await gapi.client.calendar.calendarList.list();
  return response.result.items.filter((c) => !c.id.includes("weeknum@group.v.calendar.google.com"));
}

async function fetchUpcomingEvents(): Promise<CalendarEvent[]> {
  const calendars = await fetchCalendarList();
  const now = new Date();
  now.setHours(0, 0, 0, 0); // Set to midnight of the current day
  const timeMin = now.toISOString();

  const eventPromises = calendars.map((calendar) =>
    gapi.client.calendar.events.list({
      calendarId: calendar.id,
      timeMin: timeMin,
      showDeleted: false,
      singleEvents: true,
      maxResults: 10,
      orderBy: "startTime",
    }),
  );

  const eventResponses = await Promise.all(eventPromises);

  const allEvents: CalendarEvent[] = eventResponses.flatMap((response, index) =>
    (response.result.items || []).map((item) => ({
      ...item,
      calendarId: calendars[index].id,
    })),
  );

  allEvents.sort((a, b) => {
    const aStart = new Date(a.start.dateTime || a.start.date || 0);
    const bStart = new Date(b.start.dateTime || b.start.date || 0);
    return aStart.getTime() - bStart.getTime();
  });

  return allEvents;
}

export const GoogleContextProvider: React.FC<Props> = ({ enable, children }) => {
  const [apiLoaded, setApiLoaded] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const [upcomingEvents, setUpcomingEvents] = useState<CalendarEvent[]>([]);
  const [favoritePhotos, setFavoritePhotos] = useState<string[]>([]);

  useEffect(() => {
    if (!enable) return;

    const apiScript = createScript("https://apis.google.com/js/api.js", () => {
      // Initialize gapi
      gapi.load("client:auth2", () => {
        console.log("Google API client loaded");
        gapi.client
          .init({
            apiKey: GoogleApiKey,
            // Add calendar and people APIs to discovery list
            discoveryDocs: [
              "https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest",
              "https://www.googleapis.com/discovery/v1/apis/people/v1/rest",
            ],
          })
          .then(() => {
            console.log("Google API client initialized");
            setApiLoaded(true);
          })
          .catch((error) => {
            console.error("Error loading Google API client", error);
          });
      });
    });

    document.body.appendChild(apiScript);

    return () => {
      document.body.removeChild(apiScript);
    };
  }, [enable]);

  useEffect(() => {
    if (!apiLoaded) return;

    loginFlow
      .getAccessToken()
      .then((accessToken) => {
        gapi.client.setToken({ access_token: accessToken });
        setLoggedIn(true);
      })
      .catch(() => {
        gapi.client.setToken(null);
        setLoggedIn(false);
      });

    return () => {};
  }, [apiLoaded]);

  const fetchAndSetUpcomingEvents = React.useCallback(async () => {
    try {
      const allEvents = await fetchUpcomingEvents();
      setUpcomingEvents(allEvents.slice(0, 20));
    } catch (error) {
      console.error("Error fetching upcoming events:", error);
    }
  }, []);

  const getFavoritePhotos = async (maxResults: number) => {
    let favoritePhotos: string[] = [];
    const favoritePhotosLastFetchTime = await indexDbGet<string>("favorite-photos-last-fetch-time");
    if (favoritePhotosLastFetchTime) {
      const lastFetchTime = new Date(favoritePhotosLastFetchTime);
      const now = new Date();
      if (now.getTime() - lastFetchTime.getTime() < 1000 * 60 * 60 * 24 * 3) {
        favoritePhotos = (await indexDbGet<string[]>("favorite-photo-ids")) || [];
        console.log(`Using ${favoritePhotos.length} cached favorite photos`);
      }
    }
    if (favoritePhotos.length === 0) {
      console.log("Fetching favorite photos");
      favoritePhotos = (await fetchFavoritePhotos(maxResults)).map((mediaItem) => mediaItem.id);
      await indexDbPut("favorite-photos-last-fetch-time", new Date().toISOString());
      await indexDbPut("favorite-photo-ids", favoritePhotos);
    }
    return favoritePhotos;
  };

  useEffect(() => {
    if (!loggedIn) return;
    fetchAndSetUpcomingEvents();
    getFavoritePhotos(3000).then((favoritePhotos) => {
      setFavoritePhotos(favoritePhotos);
    });
    const interval = setInterval(
      async () => {
        loginFlow
          .getAccessToken(true)
          .then((accessToken) => {
            gapi.client.setToken({ access_token: accessToken });
            setLoggedIn(true);
            fetchAndSetUpcomingEvents();
          })
          .catch((error) => {
            console.log("Error refreshing access token", error);
            gapi.client.setToken(null);
            setLoggedIn(false);
          });
      },
      1000 * 60 * 15,
    );
    return () => clearInterval(interval);
  }, [loggedIn, fetchAndSetUpcomingEvents]);

  useEffect(() => {
    if (!loggedIn) return;
    window.addEventListener("refresh-upcoming-events", fetchAndSetUpcomingEvents);

    return () => {
      window.removeEventListener("refresh-upcoming-events", fetchAndSetUpcomingEvents);
    };
  }, [loggedIn, fetchAndSetUpcomingEvents]);

  return (
    <GoogleContext.Provider
      value={{
        apiLoaded,
        loggedIn,
        upcomingEvents,
        favoritePhotos,
      }}
    >
      {children}
    </GoogleContext.Provider>
  );
};
