import React, {createContext, useState, useEffect, ReactNode} from 'react';
import {GoogleClientId, GoogleApiKey} from "../secrets.ts";
import {createScript} from "../utils/createScript.ts";

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

type TokenSet = {
  accessToken: string;
  expires: number;
};

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
    
    const storedTokenSet = localStorage.getItem("google-token-set");
    if (storedTokenSet) {
      const tokenSet: TokenSet = JSON.parse(storedTokenSet);
      if (tokenSet.expires > Date.now()) {
        console.log("Using stored Google API access token");
        gapi.client.setToken({access_token: tokenSet.accessToken});
        setLoggedIn(true);
      }
    }
    
    const accountsScript = createScript("https://accounts.google.com/gsi/client", () => {
      const tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: GoogleClientId,
        scope: "https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/contacts.readonly",
        prompt: "",
        callback: (tokenResponse: google.accounts.oauth2.TokenResponse): void => {
          console.log("Google API client logged in");
          gapi.client.setToken(tokenResponse);
          const tokenSet: TokenSet = {
            accessToken: tokenResponse.access_token,
            expires: Date.now() + Number.parseInt(tokenResponse.expires_in) * 1000,
          }
          localStorage.setItem("google-token-set", JSON.stringify(tokenSet));
          setLoggedIn(true);
        },
      });
      if (gapi.client.getToken() === null) {
        console.log("Requesting Google API access token");
        tokenClient.requestAccessToken({ prompt: "consent" });
      }
    });

    document.body.appendChild(accountsScript);

    return () => {
      document.body.removeChild(accountsScript);
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
      console.log("Upcoming events:", events);
      setUpcomingEvents(events);
    });
  }
  
  const [upcomingEvents, setUpcomingEvents] = useState<gapi.client.calendar.Event[]>([]);
  useEffect(() => {
    if (loggedIn) {
      fetchUpcomingEvents();
    }
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
