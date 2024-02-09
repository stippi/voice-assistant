//import Divider from "@mui/material/Divider";
import useGoogleContext from "../hooks/useGoogleContext.tsx";
import ListItemText from "@mui/material/ListItemText";
import ListItem from "@mui/material/ListItem";
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import {IconButton} from "@mui/material";
import React from "react";

interface MonthDivider {
  type: 'month';
  id: string;
  monthAndYear: string;
}

interface EventItem {
  type: 'event';
  id: string;
  monthDay: string;
  weekday: string;
  summary: string;
  startTime: string;
  endTime: string;
  uiLink: string;
}

type ListItem = MonthDivider | EventItem;

const pimpedEventList = (events: gapi.client.calendar.Event[], lang = navigator.language): ListItem[] => {
  const pimpedList: ListItem[] = [];
  let currentMonth: string | null = null;
  let currentDay: string | null = null;
  
  events.forEach(event => {
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
    const monthYear = startDate.toLocaleString(lang, { month: 'long', year: 'numeric' });
    
    if (currentMonth !== monthYear) {
      pimpedList.push({
        type: 'month',
        id: monthYear,
        monthAndYear: monthYear,
      });
      currentMonth = monthYear;
    }
    
    const newMonthDay = currentMonth + startDate.getDate().toString();
    let monthDay = startDate.getDate().toString();
    let weekday = startDate.toLocaleString(lang, { weekday: 'short' });
    if (currentDay !== newMonthDay) {
      currentDay = newMonthDay;
    } else {
      monthDay = '';
      weekday = '';
    }
    
    let startString = "";
    let endString = "";
    if (event.start.dateTime && event.end.dateTime) {
      startString = startDate.toLocaleTimeString(lang, { hour: '2-digit', minute: '2-digit' });
      endString = endDate.toLocaleTimeString(lang, { hour: '2-digit', minute: '2-digit' });
    }
    
    pimpedList.push({
      type: 'event',
      id: event.id,
      monthDay,
      weekday,
      summary: event.summary,
      startTime: startString,
      endTime: endString,
      uiLink: event.htmlLink,
    });
  });
  
  return pimpedList;
};

function Event({monthDay, weekday, summary, startTime, endTime, uiLink}: EventProps) {
  const openEvent = () => {
    window.open(uiLink, '_blank');
  }
  
  return (
    <ListItem
      alignItems={"flex-start"}
      sx={{
        '&:hover .MuiIconButton-root': {
          opacity: 1,
        },
      }}
      secondaryAction={
        <IconButton
          aria-label="open event"
          size="small"
          onClick={openEvent}
          sx={{
            opacity: 0,
            transition: 'opacity 0.2s ease-in-out',
          }}
        >
          <OpenInNewIcon fontSize="inherit" />
        </IconButton>
      }
    >
      <ListItemText
        style={{textAlign: 'center'}}
        primary={monthDay}
        primaryTypographyProps={{
          fontSize: 18,
          fontWeight: 'bold',
          lineHeight: '20px',
          mb: '2px',
        }}
        secondary={weekday}
        secondaryTypographyProps={{
          noWrap: true,
          fontSize: 12,
          lineHeight: '16px'
        }}
      />
      <ListItemText
        primary={summary}
        primaryTypographyProps={{
          fontSize: 15,
          fontWeight: 'medium',
          lineHeight: '20px',
          mb: '2px',
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis"
        }}
        secondary={startTime != endTime ? `${startTime} - ${endTime}` : startTime}
        secondaryTypographyProps={{
          noWrap: true,
          fontSize: 12,
          lineHeight: '16px'
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
  uiLink: string;
}

export function Events() {
  const { upcomingEvents } = useGoogleContext();
  const pimpedEvents = pimpedEventList(upcomingEvents);
  
  return (
    <>
      {pimpedEvents.map((item/*, index, array*/) => {
        if (item.type === 'month') {
          return <div key={item.id}>
            <ListItem style={{paddingTop: 2, paddingBottom: 2}}>
              <div></div>
              <ListItemText
                primary={item.monthAndYear}
                primaryTypographyProps={{
                  fontSize: 13,
                  fontWeight: 'bold'
                }}
              />
            </ListItem>
          </div>
        } else {
          return <div key={item.id}>
            <Event
              monthDay={item.monthDay}
              weekday={item.weekday}
              summary={item.summary}
              startTime={item.startTime}
              endTime={item.endTime}
              uiLink={item.uiLink}
            />
            {/*{index < array.length - 1 && <Divider />}*/}
          </div>
        }
      })}
    </>
  );
}
