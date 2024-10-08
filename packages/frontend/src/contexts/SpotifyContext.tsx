import React, { createContext, ReactNode, useEffect, useState } from "react";
import { SpotifyPlayerState, spotifyService } from "../services/SpotifyService";

export type SpotifyContextType = {
  playerState: SpotifyPlayerState;
  connected: boolean;
  resumePlayback: () => Promise<void>;
  pausePlayback: () => Promise<void>;
  skipNext: () => Promise<void>;
  skipPrevious: () => Promise<void>;
  seek: (value: number) => Promise<void>;
};

const defaultPlayerState = {
  paused: true,
  trackId: "",
  name: "",
  artists: [],
  albumName: "",
  coverImageUrl: "",
  uiLink: "",
  position: 0,
  duration: 0,
  canSkipPrevious: false,
  canSkipNext: false,
  previousTracks: [],
  nextTracks: [],
};

export const SpotifyContext = createContext<SpotifyContextType>({
  playerState: defaultPlayerState,
  connected: false,
  resumePlayback: async () => {},
  pausePlayback: async () => {},
  skipNext: async () => {},
  skipPrevious: async () => {},
  seek: async () => {},
});

interface Props {
  children: ReactNode;
  enable: boolean;
}

export const SpotifyContextProvider: React.FC<Props> = ({ enable, children }) => {
  const [playerState, setPlayerState] = useState<SpotifyPlayerState>(defaultPlayerState);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const listener = {
      playerStateChanged: (state: SpotifyPlayerState | null) => {
        setPlayerState(state || defaultPlayerState);
      },
      deviceIdChanged: () => {},
      connectedChanged: (connected: boolean) => {
        setConnected(connected);
      },
    };
    spotifyService.addListener(listener);
    spotifyService.setEnabled(enable);
    return () => {
      spotifyService.removeListener(listener);
    };
  }, [enable]);

  useEffect(() => {
    if (!enable) return;

    const updatePosition = () => {
      spotifyService.getPlaybackState().then((state) => {
        if (!state) {
          return;
        }
        if (!state.paused) {
          setPlayerState((current) => ({
            ...current,
            position: state.position / 1000,
            duration: state.duration / 1000,
          }));
        }
      });
    };
    const positionInterval = window.setInterval(updatePosition, 1000);

    return () => {
      clearInterval(positionInterval);
    };
  }, [enable]);

  useEffect(() => {
    // Reduce the volume while the user is speaking
    let volume = 0.5;
    spotifyService.getVolume().then((v) => (volume = v));
    const reduceVolume = async () => {
      volume = await spotifyService.getVolume();
      await spotifyService.setVolume(0.075);
    };
    const restoreVolume = async () => {
      await spotifyService.setVolume(volume);
    };
    document.addEventListener("reduce-volume", reduceVolume);
    document.addEventListener("restore-volume", restoreVolume);
    return () => {
      document.removeEventListener("reduce-volume", reduceVolume);
      document.removeEventListener("restore-volume", restoreVolume);
    };
  }, []);
  return (
    <SpotifyContext.Provider
      value={{
        playerState,
        connected,
        resumePlayback: async () => {
          spotifyService.resumePlayback(spotifyService.getDeviceID());
        },
        pausePlayback: async () => {
          spotifyService.pausePlayback(spotifyService.getDeviceID());
        },
        skipNext: async () => {
          spotifyService.skipNext(spotifyService.getDeviceID());
        },
        skipPrevious: async () => {
          spotifyService.skipPrevious(spotifyService.getDeviceID());
        },
        seek: async (value: number) => {
          spotifyService.seek(value);
        },
      }}
    >
      {children}
    </SpotifyContext.Provider>
  );
};
