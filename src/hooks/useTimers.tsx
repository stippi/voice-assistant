import {getTimers, setTimers} from "../utils/timers.ts";

export default function useTimers() {
  const timers = getTimers();

  return {
    timers,
    setTimers
  };
}
