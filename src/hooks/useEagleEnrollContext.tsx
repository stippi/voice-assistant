import { EagleEnrollContext } from "../contexts/EagleEnrollContext";
import React from "react";

export default function useEagleEnrollContext() {
  const context = React.useContext(EagleEnrollContext);

  if (context === undefined) {
    throw new Error("useEagleEnrollContext must be used within a EagleEnrollContextProvider");
  }

  return context;
}
