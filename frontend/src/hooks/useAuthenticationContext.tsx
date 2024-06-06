import React from "react";
import {AuthenticationContext} from "../contexts/AuthenticationContext.tsx";

export default function useAuthenticationContext() {
  const context = React.useContext(AuthenticationContext);

  if (context === undefined) {
    throw new Error("useSpotifyContext must be used within a SpotifyContextProvider");
  }

  return context;
}
