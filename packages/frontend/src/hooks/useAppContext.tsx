import { AppContext } from "../contexts/AppContext";
import React from "react";

export function useAppContext() {
  const context = React.useContext(AppContext);

  if (context === undefined) {
    throw new Error("useAppContext must be used within a AppContextProvider");
  }

  return context;
}
