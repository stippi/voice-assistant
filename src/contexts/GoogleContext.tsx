import React, {createContext, useState, useEffect, ReactNode} from 'react';
import {GoogleApiKey} from "../config";
import {createScript} from "../utils/createScript";
import {fetchFavoritePhotos, loginFlow, MediaItem} from "../integrations/google";
import {CalendarEvent} from "../model/event";

export type GoogleContextType = {
  apiLoaded: boolean;
  loggedIn: boolean;
  upcomingEvents: CalendarEvent[];
  favoritePhotos: MediaItem[];
};

export const GoogleContext = createContext<GoogleContextType>({
  apiLoaded: false,
  loggedIn: false,
  upcomingEvents: [],
  favoritePhotos: []
});

interface Props {
  children: ReactNode
  enable: boolean
}

export const GoogleContextProvider: React.FC<Props>  = ({ enable, children }) => {
  const [apiLoaded, setApiLoaded] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const [upcomingEvents, setUpcomingEvents] = useState<CalendarEvent[]>([]);
  const [favoritePhotos, setFavoritePhotos] = useState<MediaItem[]>([]);
  
  useEffect(() => {
    if (!enable) return;

    const apiScript = createScript("https://apis.google.com/js/api.js", () => {
      // Initialize gapi
      gapi.load('client:auth2', () => {
        console.log("Google API client loaded");
        gapi.client.init({
          apiKey: GoogleApiKey,
          // Add calendar and people APIs to discovery list
          discoveryDocs: [
            "https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest",
            "https://www.googleapis.com/discovery/v1/apis/people/v1/rest"
          ],
        }).then(() => {
          console.log("Google API client initialized");
          setApiLoaded(true);
        }).catch((error) => {
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
    
    loginFlow.getAccessToken().then(accessToken => {
      gapi.client.setToken({access_token: accessToken});
      setLoggedIn(true);
    }).catch(() => {
      gapi.client.setToken(null);
      setLoggedIn(false);
    });
    
    return () => {
    }
  }, [apiLoaded]);
  
  const fetchUpcomingEvents = () => {
    gapi.client.calendar.events.list({
      calendarId: "primary",
      timeMin: new Date().toISOString(),
      showDeleted: false,
      singleEvents: true,
      maxResults: 5,
      orderBy: "startTime",
    }).then((response) => {
      const events = response.result.items;
      setUpcomingEvents(events);
    });
  }
  
  useEffect(() => {
    if (!loggedIn) return;
    fetchUpcomingEvents();
    fetchFavoritePhotos(100).then(photos => {
      setFavoritePhotos(photos);
    });
    const interval = setInterval(async () => {
      loginFlow.getAccessToken(true).then(accessToken => {
        gapi.client.setToken({access_token: accessToken});
        setLoggedIn(true);
        fetchUpcomingEvents();
      }).catch(() => {
        gapi.client.setToken(null);
        setLoggedIn(false);
      });
    }, 1000 * 60 * 15);
    return () => clearInterval(interval);
  }, [loggedIn]);
  
  useEffect(() => {
    if (!loggedIn) return;
    window.addEventListener('refresh-upcoming-events', fetchUpcomingEvents);
    
    return () => {
      window.removeEventListener('refresh-upcoming-events', fetchUpcomingEvents);
    };
  }, [loggedIn]);
  
  return (
    <GoogleContext.Provider
      value={{
        apiLoaded,
        loggedIn,
        upcomingEvents,
        favoritePhotos
      }}>
      {children}
    </GoogleContext.Provider>
  );
};
