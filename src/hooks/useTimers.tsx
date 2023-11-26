import { TimersContext } from "../contexts/TimersContext";
import React from "react";

export default function useTimers() {
  const context = React.useContext(TimersContext);

  if (context === undefined) {
    throw new Error("useTimers must be used within a TimersProvider");
  }

  return context;
}
