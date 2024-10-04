import React, { createContext, ReactNode, useEffect, useState } from "react";
import { createScript } from "../utils/createScript";
import {
  loginFlow,
  search,
  play,
  playTopTracks,
  pausePlayback,
  skipNext,
  skipPrevious,
  addToFavorites,
  removeFromFavorites,
  isContainedInFavorites,
  getDevices,
  SearchResult,
  SpotifyDevice,
} from "../integrations/spotify";

type Track = {
  id: string;
  name: string;
  artists: string[];
  album: string;
  uiLink: string;
};

export type SpotifyPlayerState = {
  paused: boolean;
  trackId: string;
  name: string;
  artists: string[];
  albumName: string;
  coverImageUrl: string;
  uiLink: string;
  position: number;
  duration: number;
  canSkipPrevious: boolean;
  canSkipNext: boolean;
  previousTracks: Track[];
  nextTracks: Track[];
};

export type SpotifyContextType = {
  accessToken: string;
  deviceId: string;
  player: Spotify.Player | null;
  playerState: SpotifyPlayerState;
  search: (query: string, types: string[], limit?: number, market?: string) => Promise<SearchResult>;
  play: (deviceId: string, trackIds: string[], contextUri?: string) => Promise<void>;
  playTopTracks: (deviceId: string, artists: string[]) => Promise<void>;
  pausePlayback: (deviceId: string) => Promise<void>;
  skipNext: (deviceId: string) => Promise<void>;
  skipPrevious: (deviceId: string) => Promise<void>;
  markAsFavorite: (trackId: string, isFavorite: boolean) => Promise<void>;
  isFavorite: (trackId: string) => Promise<boolean>;
};

async function markAsFavorite(trackId: string, isFavorite: boolean) {
  if (isFavorite) {
    await addToFavorites([trackId]);
  } else {
    await removeFromFavorites([trackId]);
  }
}

async function isFavorite(trackId: string) {
  return (await isContainedInFavorites([trackId]))[0];
}

export const SpotifyContext = createContext<SpotifyContextType>({
  accessToken: "",
  deviceId: "",
  player: null,
  playerState: {
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
  },
  search: search,
  play: play,
  playTopTracks: playTopTracks,
  pausePlayback: pausePlayback,
  skipNext: skipNext,
  skipPrevious: skipPrevious,
  markAsFavorite: markAsFavorite,
  isFavorite: isFavorite,
});

interface Props {
  children: ReactNode;
  enable: boolean;
}

export const SpotifyContextProvider: React.FC<Props> = ({ enable, children }) => {
  const [accessToken, setAccessToken] = useState("");
  const [ourDeviceId, setDeviceId] = useState("");
  const [spotifyPlayer, setPlayer] = React.useState<Spotify.Player | null>(null);
  const [playerState, setPlayerState] = useState<SpotifyPlayerState>({
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
  });
  //const [idleTime, setIdleTime] = useState(0);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!enable) {
      setAccessToken("");
      return;
    }
    loginFlow.getAccessToken().then((token) => setAccessToken(token));
  }, [enable]);

  const playerRef = React.useRef<Spotify.Player | null>(null);

  const createSpotifyPlayer = React.useCallback(() => {
    const readyListener = ({ device_id }: { device_id: string }) => {
      setDeviceId(device_id);
      console.log("Spotify ready with device ID", device_id);
    };
    const notReadyListener = ({ device_id }: { device_id: string }) => {
      setDeviceId("");
      console.log("Spotify device ID has gone offline", device_id);
    };
    const errorListener = ({ message }: { message: string }) => {
      console.error(message);
    };
    const playerStateChangedListener = ({
      paused,
      disallows,
      track_window: { current_track, previous_tracks, next_tracks },
      position,
      duration,
    }: Spotify.PlaybackState) => {
      setPlayerState({
        paused: paused,
        trackId: current_track.id || "",
        name: current_track.name,
        artists: current_track.artists.map((artist) => artist.name),
        albumName: current_track.album.name,
        uiLink: current_track.uri,
        coverImageUrl: current_track.album.images[0].url,
        duration: duration / 1000,
        position: position / 1000,
        canSkipPrevious: !disallows?.skipping_prev,
        canSkipNext: !disallows?.skipping_next,
        previousTracks: previous_tracks.map((track) => ({
          id: track.id || "",
          name: track.name,
          artists: track.artists.map((artist) => artist.name),
          album: track.album.name,
          uiLink: track.uri,
        })),
        nextTracks: next_tracks.map((track) => ({
          id: track.id || "",
          name: track.name,
          artists: track.artists.map((artist) => artist.name),
          album: track.album.name,
          uiLink: track.uri,
        })),
      });
    };

    playerRef.current = new Spotify.Player({
      name: "Voice Assistant",
      getOAuthToken: (callback) => {
        console.log("Spotify player requesting access token");
        loginFlow.getAccessToken().then((accessToken) => callback(accessToken));
      },
      volume: 0.5,
    });

    // Attach listeners
    playerRef.current.addListener("ready", readyListener);
    playerRef.current.addListener("not_ready", notReadyListener);
    playerRef.current.addListener("initialization_error", errorListener);
    playerRef.current.addListener("authentication_error", errorListener);
    playerRef.current.addListener("account_error", errorListener);
    playerRef.current.addListener("player_state_changed", playerStateChangedListener);
    playerRef.current.addListener("playback_error", errorListener);

    playerRef.current.connect().then((result) => {
      if (result) {
        setPlayer(playerRef.current);
      } else {
        console.error("Spotify player could not connect");
        setPlayer(null);
      }
    });
  }, []);

  useEffect(() => {
    if (!enable) return;

    const updatePosition = () => {
      if (!playerRef.current) return;
      playerRef.current.getCurrentState().then((state) => {
        if (!state) {
          setConnected((connected) => {
            if (connected) {
              console.log("lost connection to Spotify player");
            }
            return false;
          });
          return;
        }
        setConnected(true);
        if (!state.paused) {
          setPlayerState((current) => ({
            ...current,
            position: state.position / 1000,
            duration: state.duration / 1000,
          }));
          //setIdleTime(0);
        } else {
          //setIdleTime(current => current + 1);
        }
      });
    };
    const positionInterval = window.setInterval(updatePosition, 1000);

    window.onSpotifyWebPlaybackSDKReady = () => {
      if (!playerRef.current) {
        console.log("creating Spotify player");
        createSpotifyPlayer();
      }
    };

    if (!playerRef.current) {
      const apiScript = createScript("https://sdk.scdn.co/spotify-player.js", () => {});
      document.body.appendChild(apiScript);
    } else {
      window.onSpotifyWebPlaybackSDKReady();
    }

    return () => {
      clearInterval(positionInterval);
      if (playerRef.current) {
        console.log("Disconnecting Spotify Player");
        playerRef.current.disconnect();
        playerRef.current = null;
      }
      setPlayer(null);
    };
  }, [enable, createSpotifyPlayer]);

  useEffect(() => {
    const interval = setInterval(
      async () => {
        const devices = await getDevices();
        const isContained = devices.some((device: SpotifyDevice) => {
          return device.id === ourDeviceId;
        });
        if (!isContained) {
          console.warn("Spotify player not in devices list on server");
          createSpotifyPlayer();
        }
      },
      1000 * 60 * 2,
    );
    return () => clearInterval(interval);
  }, [ourDeviceId, createSpotifyPlayer]);

  // Refresh access token every 15 minutes
  useEffect(() => {
    if (!accessToken) return;
    const interval = setInterval(
      async () => {
        const newToken = await loginFlow.getAccessToken(true);
        setAccessToken(newToken);
      },
      1000 * 60 * 15,
    );
    return () => clearInterval(interval);
  }, [accessToken]);

  // Disconnect Spotify player after 20 seconds of inactivity
  // useEffect(() => {
  //   if (connected && idleTime > 20) {
  //     if (spotifyPlayer) {
  //       console.log("disconnecting idle Spotify player");
  //       spotifyPlayer.disconnect();
  //       setIdleTime(0);
  //     }
  //   }
  // }, [connected, spotifyPlayer, idleTime]);

  useEffect(() => {
    // Reduce the volume while the user is speaking
    let volume = 0.5;
    if (spotifyPlayer) {
      spotifyPlayer.getVolume().then((v) => (volume = v));
    }
    const reduceVolume = async () => {
      if (spotifyPlayer) {
        volume = await spotifyPlayer.getVolume();
        await spotifyPlayer.setVolume(0.075);
      }
    };
    const restoreVolume = async () => {
      if (spotifyPlayer) {
        await spotifyPlayer.setVolume(volume);
      }
    };
    document.addEventListener("reduce-volume", reduceVolume);
    document.addEventListener("restore-volume", restoreVolume);
    return () => {
      document.removeEventListener("reduce-volume", reduceVolume);
      document.removeEventListener("restore-volume", restoreVolume);
    };
  }, [spotifyPlayer]);

  const performConnected = React.useCallback(
    async (deviceId: string, callback: () => Promise<void>) => {
      if (deviceId === ourDeviceId) {
        if (!spotifyPlayer) {
          throw new Error("Spotify player not ready");
        }
        if (!connected) {
          console.log("connecting Spotify player");
          if (!(await spotifyPlayer.connect())) {
            throw new Error("Spotify player could not connect");
          }
          // TODO: Now we may have a new device ID, but the caller past the old one
        }
      }
      return callback();
    },
    [spotifyPlayer, connected, ourDeviceId],
  );

  const playConnected = React.useCallback(
    async (deviceId: string, trackIds: string[], contextUri?: string): Promise<void> => {
      await performConnected(deviceId, async () => play(deviceId, trackIds, contextUri));
    },
    [performConnected],
  );

  const playTopTracksConnected = React.useCallback(
    async (deviceId: string, artists: string[]): Promise<void> => {
      await performConnected(deviceId, async () => playTopTracks(deviceId, artists));
    },
    [performConnected],
  );

  const pausePlaybackConnected = React.useCallback(
    async (deviceId: string): Promise<void> => {
      if (deviceId === ourDeviceId) {
        if (!spotifyPlayer) {
          throw new Error("Spotify player not ready");
        }
        await spotifyPlayer.pause();
      }
      await pausePlayback(deviceId);
    },
    [spotifyPlayer, ourDeviceId],
  );

  const skipNextConnected = React.useCallback(
    async (deviceId: string): Promise<void> => {
      if (deviceId === ourDeviceId) {
        if (!spotifyPlayer) {
          throw new Error("Spotify player not ready");
        }
        await spotifyPlayer.nextTrack();
      }
      await skipNext(deviceId);
    },
    [spotifyPlayer, ourDeviceId],
  );

  const skipPreviousConnected = React.useCallback(
    async (deviceId: string): Promise<void> => {
      if (deviceId === ourDeviceId) {
        if (!spotifyPlayer) {
          throw new Error("Spotify player not ready");
        }
        await spotifyPlayer.previousTrack();
      }
      await skipPrevious(deviceId);
    },
    [spotifyPlayer, ourDeviceId],
  );

  return (
    <SpotifyContext.Provider
      value={{
        accessToken,
        deviceId: ourDeviceId,
        player: spotifyPlayer,
        playerState,
        search,
        play: playConnected,
        playTopTracks: playTopTracksConnected,
        pausePlayback: pausePlaybackConnected,
        skipNext: skipNextConnected,
        skipPrevious: skipPreviousConnected,
        markAsFavorite: markAsFavorite,
        isFavorite: isFavorite,
      }}
    >
      {children}
    </SpotifyContext.Provider>
  );
};
