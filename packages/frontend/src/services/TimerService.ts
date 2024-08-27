import { Timer } from "voice-assistant-shared";
import { playSound } from "../utils/audio.ts";

interface TimerPersistence {
  setTimers: (timers: Timer[]) => Promise<void>;
  getTimers: () => Promise<Timer[]>;
}

class LocalStorageTimerPersistence implements TimerPersistence {
  async setTimers(timers: Timer[]): Promise<void> {
    localStorage.setItem("voice-assistant-timers", JSON.stringify(timers));
  }

  async getTimers(): Promise<Timer[]> {
    const timers = localStorage.getItem("voice-assistant-timers");
    return timers ? JSON.parse(timers) : [];
  }
}

interface TimerListener {
  timersUpdated: (timers: Timer[]) => void;
}

export class TimerService {
  private timers: Timer[];
  private listeners: TimerListener[];
  private persistence: TimerPersistence;
  private interval = -1;
  private timeout = -1;

  constructor(persistence: TimerPersistence = new LocalStorageTimerPersistence()) {
    this.timers = [];
    this.listeners = [];
    this.persistence = persistence;
    this.persistence.getTimers().then((timers) => {
      this.setTimers(timers);
    });
  }

  addTimer(timer: Timer) {
    this.setTimers([...this.timers.filter((t) => t.id !== timer.id), timer]);
  }

  removeTimer(timerId: string) {
    this.setTimers(this.timers.filter((t) => t.id !== timerId));
  }

  addListener(listener: TimerListener) {
    this.listeners.push(listener);
    listener.timersUpdated([...this.timers]);
  }

  removeListener(listener: TimerListener) {
    this.listeners = this.listeners.filter((l) => l !== listener);
  }

  setTimers(timers: Timer[]) {
    this.timers = timers;
    this.persistence.setTimers(timers);
    this.listeners.forEach((l) => l.timersUpdated([...timers]));
    this.checkTimers();
  }

  getTimers(): Timer[] {
    return this.timers;
  }

  private isSameSecond(date1: Date, date2: Date): boolean {
    date1.setMilliseconds(0);
    date2.setMilliseconds(0);

    return date1.getTime() === date2.getTime();
  }

  private checkTimers() {
    window.clearInterval(this.interval);
    window.clearTimeout(this.timeout);

    this.interval = window.setInterval(() => {
      if (this.timers.length === 0) {
        return;
      }
      const now = new Date();
      const updatedTimers = this.timers
        .map((timer) => (this.isSameSecond(new Date(timer.time), now) ? { ...timer, ringing: true } : timer))
        .filter((timer) => timer.ringing === true || new Date(timer.time) > now);
      if (
        this.timers.length != updatedTimers.length ||
        !this.timers.every((timer, index) => timer.ringing === updatedTimers[index].ringing)
      ) {
        this.setTimers(updatedTimers);
      }
    }, 1000);

    this.timeout = -1;
    if (this.timers.length > 0) {
      const nextDate = this.timers
        .map((timer) => new Date(timer.time))
        .reduce((minDate, date) => {
          return date < minDate ? date : minDate;
        });
      const now = new Date();
      const waitTime = nextDate.getTime() - now.getTime();
      if (waitTime >= 0) {
        this.timeout = window.setTimeout(() => {
          const audio = playSound("alarm");
          audio.addEventListener("ended", () => {
            // audio.currentTime = 0;
            // audio.play().catch((error) => {
            //   console.log("Failed to play sound (repeat: ", error);
            // });
            audio.remove();
            this.setTimers(this.timers.map((timer) => ({ ...timer, ringing: false })));
          });
        }, waitTime);
      }
    }
  }
}

export const timerService = new TimerService();
