import React, { PropsWithChildren, useRef } from "react";
import { GoogleContextProvider } from "../contexts/GoogleContext";
import { ChatsProvider } from "../contexts/ChatsContext";
import { SpotifyContextProvider } from "../contexts/SpotifyContext";
import { MicrosoftContextProvider } from "../contexts/MicrosoftContext";
import { useAppContext, useSettings, useWindowFocus } from "../hooks";

export const OptionalIntegrations: React.FC<PropsWithChildren> = ({ children }) => {
  const { settings } = useSettings();
  const { idle } = useAppContext();

  const idleMode = idle && settings.enableGoogle && settings.enableGooglePhotos;
  
  // Reference to store the mouse inactivity timeout
  const mouseTimeoutRef = useRef<number | null>(null);

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
  
  // Handle mouse cursor visibility in idle mode
  React.useEffect(() => {
    const handleMouseMove = () => {
      // Show cursor when mouse moves
      document.body.style.cursor = "auto";
      
      // Clear any existing timeout
      if (mouseTimeoutRef.current !== null) {
        window.clearTimeout(mouseTimeoutRef.current);
      }
      
      // Set a new timeout to hide cursor after 5 seconds of inactivity
      if (idleMode) {
        mouseTimeoutRef.current = window.setTimeout(() => {
          document.body.style.cursor = "none";
        }, 5000);
      }
    };
    
    if (idleMode) {
      // Initial state: hide cursor
      document.body.style.cursor = "none";
      
      // Add event listener for mouse movement
      document.addEventListener("mousemove", handleMouseMove);
    } else {
      // Reset cursor style when exiting idle mode
      document.body.style.cursor = "auto";
      
      // Clear any existing timeout
      if (mouseTimeoutRef.current !== null) {
        window.clearTimeout(mouseTimeoutRef.current);
        mouseTimeoutRef.current = null;
      }
    }
    
    // Cleanup function
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      if (mouseTimeoutRef.current !== null) {
        window.clearTimeout(mouseTimeoutRef.current);
        mouseTimeoutRef.current = null;
      }
    };
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
