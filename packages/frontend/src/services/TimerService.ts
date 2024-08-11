import { Timer } from "voice-assistant-shared";

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
  private listeners: TimerListener[] = [];

  constructor(private persistence: TimerPersistence = new LocalStorageTimerPersistence()) {
    this.timers = [];
    this.persistence.getTimers().then((timers) => {
      this.timers = timers;
    });
  }

  addTimer(timer: Timer) {
    this.setTimers([...this.timers.filter((t) => t.id !== timer.id), timer]);
  }

  removeTimer(timerId: string) {
    this.setTimers(this.timers.filter((t) => t.id !== timerId));
  }

  setTimers(timers: Timer[]) {
    this.timers = timers;
    this.persistence.setTimers(timers);
    this.listeners.forEach((l) => l.timersUpdated(timers));
  }
}
