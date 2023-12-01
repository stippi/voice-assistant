
export type TimeLeft = {
  difference: number;
  hours: number;
  minutes: number;
  seconds: number;
}

export function calculateTimeLeft(targetTime: string | number | Date): TimeLeft {
  const difference = +new Date(targetTime) - +new Date();
  let timeLeft: TimeLeft = {
    difference: difference,
    hours: 0,
    minutes: 0,
    seconds: 0,
  };
  
  if (difference > 0) {
    timeLeft = {
      difference: difference,
      hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
      minutes: Math.floor((difference / 1000 / 60) % 60),
      seconds: Math.floor((difference / 1000) % 60),
    };
  }
  
  return timeLeft;
}

export function formatDateRelativeToToday(date: string | number | Date) {
  const now = new Date();
  const target = new Date(date);
  
  const dateFormatOptions: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'long', day: 'numeric' };
  const timeFormatOptions: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit' };
  
  if (now.toDateString() === target.toDateString()) {
    return `${target.toLocaleTimeString([], timeFormatOptions)}`;
  }
  
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (tomorrow.toDateString() === target.toDateString()) {
    return `Tomorrow ${target.toLocaleTimeString([], timeFormatOptions)}`;
  }
  
  return `${target.toLocaleDateString([], dateFormatOptions)} at ${target.toLocaleTimeString([], timeFormatOptions)}`;
}

export function getRelativeTimeString(date: Date | number, lang = navigator.language): string {
  // Allow dates or times to be passed
  const timeMs = typeof date === "number" ? date : date.getTime();
  
  // Get the amount of seconds between the given date and now
  const deltaSeconds = Math.round((timeMs - Date.now()) / 1000);
  
  // Array representing one minute, hour, day, week, month, etc. in seconds
  const cutoffs = [60, 3600, 86400, 86400 * 7, 86400 * 30, 86400 * 365, Infinity];
  
  // Array equivalent to the above but in the string representation of the units
  const units: Intl.RelativeTimeFormatUnit[] = ["second", "minute", "hour", "day", "week", "month", "year"];
  
  // Grab the ideal cutoff unit
  const unitIndex = cutoffs.findIndex(cutoff => cutoff > Math.abs(deltaSeconds));
  
  // Get the divisor to divide from the seconds. E.g. if our unit is "day" our divisor
  // is one day in seconds, so we can divide our seconds by this to get the # of days
  const divisor = unitIndex ? cutoffs[unitIndex - 1] : 1;
  
  // Intl.RelativeTimeFormat do its magic
  const rtf = new Intl.RelativeTimeFormat(lang, { numeric: "auto" });
  return rtf.format(Math.floor(deltaSeconds / divisor), units[unitIndex]);
}

export function addIsoDurationToDate(date: Date, isoDuration: string) {
  const matches = isoDuration.match(/P(?:(\d+)Y)?(?:(\d+)M)?(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (matches === null) {
    return date;
  }
  const parts = matches.slice(1);
  
  const [years, months, days, hours, minutes, seconds] = parts.map(part => parseInt(part, 10) || 0);
  
  date.setFullYear(date.getFullYear() + years);
  date.setMonth(date.getMonth() + months);
  date.setDate(date.getDate() + days);
  date.setHours(date.getHours() + hours);
  date.setMinutes(date.getMinutes() + minutes);
  date.setSeconds(date.getSeconds() + seconds);
  
  return new Date(date);
}