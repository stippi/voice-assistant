import { MicrosoftContext } from "../contexts/MicrosoftContext";
import React from "react";

export default function useMicrosoftContext() {
  const context = React.useContext(MicrosoftContext);

  if (context === undefined) {
    throw new Error("useMicrosoftContext must be used within a MicrosoftContextProvider");
  }

  return context;
}
