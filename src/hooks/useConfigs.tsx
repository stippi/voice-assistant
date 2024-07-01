import { ConfigsContext } from "../contexts/ConfigsContext";
import React from "react";

export default function useConfigs() {
  const context = React.useContext(ConfigsContext);

  if (context === undefined) {
    throw new Error("useConfigs must be used within a ConfigsProvider");
  }

  return context;
}
