import ListItemText from "@mui/material/ListItemText";
import ListItem from "@mui/material/ListItem";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import { IconButton } from "@mui/material";
import { CalendarEvent } from "@shared/types";
import React from "react";

type CalendarEventWithAllDay = CalendarEvent & { isAllDay: boolean };

function splitMultiDayEvents(event: CalendarEvent): CalendarEventWithAllDay[] {
  const startDate = new Date(event.start.dateTime || event.start.date || 0);
  const endDate = new Date(event.end.dateTime || event.end.date || 0);
  const events: CalendarEventWithAllDay[] = [];

  for (let d = new Date(startDate); d < endDate; d.setDate(d.getDate() + 1)) {
    const isFirstDay = d.getTime() === startDate.getTime();
    const isLastDay = new Date(d.getTime() + 24 * 60 * 60 * 1000) > endDate;

    const newEvent: CalendarEventWithAllDay = {
      ...event,
      id: `${event.id}-${d.toISOString().split("T")[0]}`,
      isAllDay: !event.start.dateTime && !event.end.dateTime,
    };

    if (isFirstDay) {
      newEvent.start = event.start;
      if (!isLastDay) {
        newEvent.end = { dateTime: new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59).toISOString() };
      }
    } else if (isLastDay) {
      newEvent.start = { dateTime: new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0).toISOString() };
      newEvent.end = event.end;
    } else {
      newEvent.start = { date: d.toISOString().split("T")[0] };
      newEvent.end = { date: new Date(d.getTime() + 24 * 60 * 60 * 1000).toISOString().split("T")[0] };
      newEvent.isAllDay = true;
    }

    events.push(newEvent);
  }

  return events;
}

function splitAndConsolidateEvents(events: CalendarEvent[]): CalendarEventWithAllDay[] {
  // Split multi-day events into separate events
  const allEvents: CalendarEventWithAllDay[] = events.flatMap(splitMultiDayEvents);
  console.log("all events:", allEvents);

  // Group events by date
  const groupedEvents = allEvents.reduce(
    (acc, event) => {
      const date = event.start.date || event.start.dateTime?.split("T")[0] || "";
      if (!acc[date]) acc[date] = { allDay: [], withTime: [] };
      if (event.isAllDay) {
        acc[date].allDay.push(event);
      } else {
        acc[date].withTime.push(event);
      }
      return acc;
    },
    {} as Record<string, { allDay: CalendarEventWithAllDay[]; withTime: CalendarEventWithAllDay[] }>,
  );

  // Consolidate all-day events and keep events with start and end time separate
  const consolidatedEvents: CalendarEventWithAllDay[] = Object.entries(groupedEvents).flatMap(([date, events]) => {
    const allDayEvent =
      events.allDay.length > 0
        ? [
            {
              id: `allday-${date}`,
              calendarId: "consolidated",
              summary: events.allDay.map((e) => e.summary).join(", "),
              start: { date },
              end: { date: new Date(new Date(date).getTime() + 24 * 60 * 60 * 1000).toISOString().split("T")[0] },
              isAllDay: true,
            },
          ]
        : [];

    return [...allDayEvent, ...events.withTime];
  });

  // Sort events by start time
  consolidatedEvents.sort((a, b) => {
    const aStart = new Date(a.start.dateTime || a.start.date || 0);
    const bStart = new Date(b.start.dateTime || b.start.date || 0);
    return aStart.getTime() - bStart.getTime();
  });

  console.log("consolidated events:", consolidatedEvents);

  return consolidatedEvents;
}

interface MonthDivider {
  type: "month";
  id: string;
  monthAndYear: string;
}

interface EventItem {
  type: "event";
  id: string;
  monthDay: string;
  weekday: string;
  summary: string;
  isAllDay: boolean;
  startTime: string;
  endTime: string;
  uiLink?: string;
}

type ListItem = MonthDivider | EventItem;

const pimpedEventList = (events: CalendarEventWithAllDay[], lang = navigator.language): ListItem[] => {
  const pimpedList: ListItem[] = [];
  let currentMonth: string | null = null;
  let currentDay: string | null = null;

  events.forEach((event) => {
    let startDate: Date;
    let endDate: Date;
    if (event.start.dateTime) {
      startDate = new Date(event.start.dateTime);
    } else if (event.start.date) {
      startDate = new Date(event.start.date);
    } else {
      return;
    }
    if (event.end.dateTime) {
      endDate = new Date(event.end.dateTime);
    } else if (event.end.date) {
      endDate = new Date(event.end.date);
    } else {
      return;
    }
    const monthYear = startDate.toLocaleString(lang, { month: "long", year: "numeric" });

    if (currentMonth !== monthYear) {
      pimpedList.push({
        type: "month",
        id: monthYear,
        monthAndYear: monthYear,
      });
      currentMonth = monthYear;
    }

    const newMonthDay = currentMonth + startDate.getDate().toString();
    let monthDay = startDate.getDate().toString();
    let weekday = startDate.toLocaleString(lang, { weekday: "short" });
    if (currentDay !== newMonthDay) {
      currentDay = newMonthDay;
    } else {
      monthDay = "";
      weekday = "";
    }

    let startString = "";
    let endString = "";
    if (event.start.dateTime && event.end.dateTime) {
      startString = startDate.toLocaleTimeString(lang, { hour: "2-digit", minute: "2-digit" });
      endString = endDate.toLocaleTimeString(lang, { hour: "2-digit", minute: "2-digit" });
    }

    pimpedList.push({
      type: "event",
      id: event.id,
      monthDay,
      weekday,
      summary: event.summary,
      startTime: startString,
      endTime: endString,
      isAllDay: event.isAllDay,
      uiLink: event.htmlLink,
    });
  });

  return pimpedList;
};

function Event({ monthDay, weekday, summary, startTime, endTime, isAllDay, uiLink }: EventProps) {
  const openEvent = () => {
    window.open(uiLink, "_blank");
  };

  return (
    <ListItem
      alignItems={"flex-start"}
      sx={{
        "&:hover .MuiIconButton-root": {
          opacity: 1,
        },
      }}
      secondaryAction={
        uiLink && (
          <IconButton
            aria-label="open event"
            size="small"
            onClick={openEvent}
            sx={{
              opacity: 0,
              transition: "opacity 0.2s ease-in-out",
            }}
          >
            <OpenInNewIcon fontSize="inherit" />
          </IconButton>
        )
      }
    >
      <ListItemText
        style={{ textAlign: "center" }}
        primary={monthDay}
        primaryTypographyProps={{
          fontSize: 18,
          fontWeight: "bold",
          lineHeight: "20px",
          mb: "2px",
        }}
        secondary={weekday}
        secondaryTypographyProps={{
          noWrap: true,
          fontSize: 12,
          lineHeight: "16px",
        }}
      />
      <ListItemText
        primary={summary}
        primaryTypographyProps={{
          fontSize: 15,
          fontWeight: "medium",
          lineHeight: "20px",
          mb: "2px",
          mt: isAllDay ? "2px" : 0,
          whiteSpace: isAllDay ? "wrap" : "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
        secondary={startTime != endTime ? `${startTime} - ${endTime}` : startTime}
        secondaryTypographyProps={{
          noWrap: true,
          fontSize: 12,
          lineHeight: "16px",
        }}
      />
    </ListItem>
  );
}

interface EventProps {
  monthDay: string;
  weekday: string;
  summary: string;
  startTime: string;
  endTime: string;
  isAllDay: boolean;
  uiLink?: string;
}

export const Events = React.memo(({ events }: Props) => {
  const pimpedEvents = pimpedEventList(splitAndConsolidateEvents(events));

  return (
    <>
      {pimpedEvents.map((item /*, index, array*/) => {
        if (item.type === "month") {
          return (
            <ListItem key={item.id} style={{ paddingTop: 2, paddingBottom: 2 }}>
              <div></div>
              <ListItemText
                primary={item.monthAndYear}
                primaryTypographyProps={{
                  fontSize: 13,
                  fontWeight: "bold",
                }}
              />
            </ListItem>
          );
        } else {
          return (
            <Event
              key={item.id}
              monthDay={item.monthDay}
              weekday={item.weekday}
              summary={item.summary}
              startTime={item.startTime}
              endTime={item.endTime}
              isAllDay={item.isAllDay}
              uiLink={item.uiLink}
            />
          );
        }
      })}
    </>
  );
});

interface Props {
  events: CalendarEvent[];
}
