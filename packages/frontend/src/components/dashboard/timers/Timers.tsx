import useTimers from "../../../hooks/useTimers";
import { TimerItem } from "./TimerItem";

export function Timers() {
  const { timers, setTimers } = useTimers();

  return (
    <>
      {timers.map((timer) => (
        <div key={timer.id}>
          <TimerItem
            timer={timer}
            removeTimer={() => {
              setTimers(timers.filter((t) => t.id !== timer.id));
            }}
          />
        </div>
      ))}
    </>
  );
}
