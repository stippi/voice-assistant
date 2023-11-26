import './Timers.css'
import {useTimers} from "../contexts/TimersContext";
import {TimerPopup} from "./TimerPopup";

export function Timers() {
  const {timers} = useTimers();

  return <div className="timers">
    {timers && timers
      .map((timer, index) => (
        <TimerPopup
          key={index}
          timer={timer}
        />
      ))
    }
  </div>
}
