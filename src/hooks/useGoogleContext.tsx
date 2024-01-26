import { GoogleContext } from "../contexts/GoogleContext";
import React from "react";

export default function useGoogleContext() {
  const context = React.useContext(GoogleContext);

  if (context === undefined) {
    throw new Error("useAppContext must be used within a GoogleContextProvider");
  }

  return context;
}
