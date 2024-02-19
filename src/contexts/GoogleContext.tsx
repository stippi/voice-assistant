import React, {createContext, useState, useEffect, ReactNode} from 'react';
import {GoogleApiKey} from "../secrets.ts";
import {createScript} from "../utils/createScript.ts";
import {loginFlow} from "../integrations/google.ts";

export type GoogleContextType = {
  apiLoaded: boolean;
  loggedIn: boolean;
  upcomingEvents: gapi.client.calendar.Event[];
};

export const GoogleContext = createContext<GoogleContextType>({
  apiLoaded: false,
  loggedIn: false,
  upcomingEvents: []
});

interface Props {
  children: ReactNode
  enableGoogle: boolean
}

export const GoogleContextProvider: React.FC<Props>  = ({ enableGoogle, children }) => {
  const [apiLoaded, setApiLoaded] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  
  useEffect(() => {
    if (!enableGoogle) return;

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
  }, [enableGoogle]);

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
  
  const [upcomingEvents, setUpcomingEvents] = useState<gapi.client.calendar.Event[]>([]);
  useEffect(() => {
    if (!loggedIn) return;
    fetchUpcomingEvents();
    const interval = setInterval(async () => {
      loginFlow.getAccessToken().then(accessToken => {
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
    window.addEventListener('refresh-upcoming-events', fetchUpcomingEvents);
    
    return () => {
      window.removeEventListener('refresh-upcoming-events', fetchUpcomingEvents);
    };
  }, []);
  
  return (
    <GoogleContext.Provider
      value={{
        apiLoaded,
        loggedIn,
        upcomingEvents,
      }}>
      {children}
    </GoogleContext.Provider>
  );
};
