import React from "react";
import { useGoogleContext } from "./useGoogleContext";
import { useMicrosoftContext } from "./useMicrosoftContext";
import { useSettings } from "./useSettings";
import { CalendarEvent } from "@shared/types";

function isEventSoon(event: CalendarEvent, threshold: number): boolean {
  const now = new Date();
  const eventStart = new Date(event.start.dateTime || event.start.date || 0);
  const diffInMinutes = (eventStart.getTime() - now.getTime()) / (1000 * 60);
  return diffInMinutes > 0 && diffInMinutes <= threshold;
}

function filterEvents(
  events: CalendarEvent[],
  maxDays: number,
  maxEvents: number,
  isIdle: boolean,
  soonThresholdMinutes: number,
): CalendarEvent[] {
  const now = new Date();
  const maxDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + maxDays);

  return events
    .filter((event) => {
      const eventStart = new Date(event.start.dateTime || event.start.date || 0);
      if (isIdle) {
        return isEventSoon(event, soonThresholdMinutes);
      }
      return eventStart < maxDate;
    })
    .sort((a, b) => {
      const aStart = new Date(a.start.dateTime || a.start.date || 0);
      const bStart = new Date(b.start.dateTime || b.start.date || 0);
      return aStart.getTime() - bStart.getTime();
    })
    .slice(0, maxEvents);
}

interface Props {
  isIdle: boolean;
  maxEvents: number;
  soonThresholdMinutes: number;
}

export function useEvents({ isIdle, maxEvents, soonThresholdMinutes }: Props) {
  const { upcomingEvents: upcomingGoogleEvents } = useGoogleContext();
  const { upcomingEvents: upcomingMicrosoftEvents } = useMicrosoftContext();
  const { settings } = useSettings();

  const upcomingEvents = React.useMemo(() => {
    const events = [];
    if (settings.enableGoogle && settings.enableGoogleCalendar) {
      events.push(...(upcomingGoogleEvents || []));
    }
    if (settings.enableMicrosoft) {
      events.push(...(upcomingMicrosoftEvents || []));
    }
    return events.sort((a, b) => {
      const aStart = a.start.dateTime || a.start.date || "";
      const bStart = b.start.dateTime || b.start.date || "";
      return aStart.localeCompare(bStart);
    });
  }, [
    settings.enableGoogle,
    settings.enableGoogleCalendar,
    settings.enableMicrosoft,
    upcomingGoogleEvents,
    upcomingMicrosoftEvents,
  ]);

  return filterEvents(upcomingEvents, 2, maxEvents, isIdle, soonThresholdMinutes);
}
