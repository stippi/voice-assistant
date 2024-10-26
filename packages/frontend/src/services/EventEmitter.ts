/** Base type for the event map */
export type EventMap = {
  [K: string]: unknown[];
};

type EventKey<T extends EventMap> = keyof T;
type EventCallback<T extends EventMap, K extends EventKey<T>> = (...args: T[K]) => void;

export class EventEmitter<T extends EventMap> {
  private events: {
    [K in EventKey<T>]?: EventCallback<T, K>[];
  } = {};

  on<K extends EventKey<T>>(event: K, callback: EventCallback<T, K>): void {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event]?.push(callback);
  }

  off<K extends EventKey<T>>(event: K, callback: EventCallback<T, K>): void {
    if (!this.events[event]) return;
    this.events[event] = this.events[event]?.filter((cb) => cb !== callback) as EventCallback<T, K>[];
  }

  emit<K extends EventKey<T>>(event: K, ...args: T[K]): void {
    if (!this.events[event]) return;
    this.events[event]?.forEach((callback) => {
      callback(...args);
    });
  }

  removeAllListeners(event?: EventKey<T>): void {
    if (event) {
      delete this.events[event];
    } else {
      this.events = {};
    }
  }
}
