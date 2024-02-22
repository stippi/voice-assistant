import React, {createContext, useState, useEffect, ReactNode} from 'react';
import {loginFlow} from "../integrations/microsoft.ts";
import {CalendarEvent, EventTime} from "../model/event.ts";

export type MicrosoftContextType = {
  accessToken: string;
  upcomingEvents: CalendarEvent[];
};

export const MicrosoftContext = createContext<MicrosoftContextType>({
  accessToken: "",
  upcomingEvents: []
});

interface Props {
  children: ReactNode
  enable: boolean
}

export const MicrosoftContextProvider: React.FC<Props>  = ({ enable, children }) => {
  const [accessToken, setAccessToken] = useState("");
  
  useEffect(() => {
    if (!enable) return;
    loginFlow.getAccessToken().then(accessToken => {
      setAccessToken(accessToken);
    });
  }, [enable]);
  
  const [upcomingEvents, setUpcomingEvents] = useState<CalendarEvent[]>([]);
  
  const fetchUpcomingEvents = async () => {
    const accessToken = await loginFlow.getAccessToken();
    const url = "https://graph.microsoft.com/v1.0/me/calendar/events?$top=5&$select=subject,start,end,location";
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    })
    if (!response.ok) {
      throw new Error(`Failed to fetch upcoming events: ${response.status} ${response.statusText}`);
    }

    interface GraphEvent {
      id: string;
      start: EventTime;
      end: EventTime;
      subject: string;
    }
    
    const result: { value: GraphEvent[] } = await response.json();
    setUpcomingEvents(result.value.map((event) => ({
      id: event.id,
      start: event.start,
      end: event.end,
      summary: event.subject,
    })));
  }
  
  useEffect(() => {
    if (!accessToken) return;
    fetchUpcomingEvents().catch((error) => {
      console.error("Error fetching upcoming events from Microsoft", error);
    });
    const interval = setInterval(async () => {
      const accessToken = await loginFlow.getAccessToken(true);
      setAccessToken(accessToken);
      await fetchUpcomingEvents();
    }, 1000 * 60 * 15);
    return () => clearInterval(interval);
  }, [accessToken]);
  
  useEffect(() => {
    window.addEventListener('refresh-upcoming-events', fetchUpcomingEvents);
    
    return () => {
      window.removeEventListener('refresh-upcoming-events', fetchUpcomingEvents);
    };
  }, []);
  
  return (
    <MicrosoftContext.Provider
      value={{
        accessToken,
        upcomingEvents
      }}>
      {children}
    </MicrosoftContext.Provider>
  );
};
