import { SettingsContext } from "../contexts/SettingsContext";
import React from "react";

export default function useSettings() {
  const context = React.useContext(SettingsContext);

  if (context === undefined) {
    throw new Error("useSettings must be used within a SettingsProvider");
  }

  return context;
}
