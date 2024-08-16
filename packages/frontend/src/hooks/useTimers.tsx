import React from "react";
import { TimerContext } from "../contexts/TimerContext.tsx";

export default function useTimers() {
  const context = React.useContext(TimerContext);

  if (context === undefined) {
    throw new Error("useTimers must be used within a TimerContextProvider");
  }

  return context;
}
