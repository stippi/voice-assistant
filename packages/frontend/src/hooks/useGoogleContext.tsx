import { GoogleContext } from "../contexts/GoogleContext";
import React from "react";

export function useGoogleContext() {
  const context = React.useContext(GoogleContext);

  if (context === undefined) {
    throw new Error("useGoogleContext must be used within a GoogleContextProvider");
  }

  return context;
}
