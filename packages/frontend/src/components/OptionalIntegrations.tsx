import React, { PropsWithChildren } from "react";
import { GoogleContextProvider } from "../contexts/GoogleContext";
import { ChatsProvider } from "../contexts/ChatsContext";
import { SpotifyContextProvider } from "../contexts/SpotifyContext";
import { MicrosoftContextProvider } from "../contexts/MicrosoftContext";
import { useAppContext, useSettings, useWindowFocus } from "../hooks";

export const OptionalIntegrations: React.FC<PropsWithChildren> = ({ children }) => {
  const { settings } = useSettings();
  const { idle } = useAppContext();

  const idleMode = idle && settings.enableGoogle && settings.enableGooglePhotos;

  const { windowFocused } = useWindowFocus();
  React.useEffect(() => {
    if (windowFocused) {
      document.body.classList.add("window-focused");
    } else {
      document.body.classList.remove("window-focused");
    }
  }, [windowFocused]);

  React.useEffect(() => {
    if (idleMode) {
      document.documentElement.style.overflowY = "hidden";
    } else {
      document.documentElement.style.overflowY = "scroll";
    }
  }, [idleMode]);

  return (
    <ChatsProvider>
      <GoogleContextProvider enable={settings.enableGoogle}>
        <MicrosoftContextProvider enable={settings.enableMicrosoft}>
          <SpotifyContextProvider enable={settings.enableSpotify}>{children}</SpotifyContextProvider>
        </MicrosoftContextProvider>
      </GoogleContextProvider>
    </ChatsProvider>
  );
};
