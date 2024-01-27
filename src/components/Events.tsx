import Divider from "@mui/material/Divider";
import useGoogleContext from "../hooks/useGoogleContext.tsx";
import ListItemText from "@mui/material/ListItemText";
import ListItem from "@mui/material/ListItem";

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
}

type ListItem = MonthDivider | EventItem;

const pimpedEventList = (events: gapi.client.calendar.Event[], lang = navigator.language): ListItem[] => {
  const pimpedList: ListItem[] = [];
  let currentMonth: string | null = null;
  
  events.forEach(event => {
    if (!event.start.dateTime || !event.end.dateTime) {
      return;
    }
    const startDate = new Date(event.start.dateTime);
    const endDate = new Date(event.end.dateTime);
    const monthYear = startDate.toLocaleString(lang, { month: 'long', year: 'numeric' });
    
    if (currentMonth !== monthYear) {
      pimpedList.push({
        type: 'month',
        id: monthYear,
        monthAndYear: monthYear,
      });
      currentMonth = monthYear;
    }
    
    pimpedList.push({
      type: 'event',
      id: event.id,
      monthDay: startDate.getDate().toString(),
      weekday: startDate.toLocaleString(lang, { weekday: 'short' }),
      summary: event.summary,
      startTime: startDate.toLocaleTimeString(lang, { hour: '2-digit', minute: '2-digit' }),
      endTime: endDate.toLocaleTimeString(lang, { hour: '2-digit', minute: '2-digit' }),
    });
  });
  
  return pimpedList;
};

function Event({monthDay, weekday, summary, startTime, endTime}: EventProps) {
  return <ListItem alignItems={"flex-start"} >
    <ListItemText
      style={{flex: 'none', width: '40px', marginRight: '4px', textAlign: 'center'}}
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
      }}
      secondary={`${startTime} - ${endTime}`}
      secondaryTypographyProps={{
        noWrap: true,
        fontSize: 12,
        lineHeight: '16px'
      }}
    />
  </ListItem>
}

interface EventProps {
  monthDay: string;
  weekday: string;
  summary: string;
  startTime: string;
  endTime: string;
}

export function Events() {
  const { upcomingEvents } = useGoogleContext();
  const pimpedEvents = pimpedEventList(upcomingEvents);
  
  return (
    <>
      {pimpedEvents.map((item, index, array) => {
        if (item.type === 'month') {
          return <div key={item.id}>
            <ListItem style={{paddingTop: 2, paddingBottom: 2, paddingLeft: 24}}>
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
            />
            {index < array.length - 1 && <Divider />}
          </div>
        }
      })}
    </>
  );
}