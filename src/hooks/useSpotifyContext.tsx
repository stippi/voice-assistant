import React from "react";
import {SpotifyContext} from "../contexts/SpotifyContext.tsx";

export default function useSpotifyContext() {
  const context = React.useContext(SpotifyContext);

  if (context === undefined) {
    throw new Error("useSpotifyContext must be used within a SpotifyContextProvider");
  }

  return context;
}
