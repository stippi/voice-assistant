import {Timer} from "../model/timer";

export function getTimers(): Timer[] {
  const savedTimers = localStorage.getItem('voice-assistant-timers');
  if (savedTimers) {
    return JSON.parse(savedTimers);
  }
  return [];
}

export function setTimers(timers: Timer[]) {
  localStorage.setItem('voice-assistant-timers', JSON.stringify(timers));
}
