import React, {createContext, ReactNode, useEffect, useState} from 'react';
import {SpotifyClientId} from "../secrets";
import {createScript} from "../utils/createScript";
import {LoginFlow} from "../utils/loginFlow.ts";

type Track = {
  id: string;
  name: string;
  artists: string[];
  album: string;
  uiLink: string;
};

type SpotifyPlayerState = {
  paused: boolean;
  trackId: string;
  name: string;
  artists: string[];
  albumName: string;
  coverImageUrl: string;
  uiLink: string,
  position: number,
  duration: number,
  canSkipPrevious: boolean,
  canSkipNext: boolean,
  previousTracks: Track[],
  nextTracks: Track[],
};

export type SpotifyContextType = {
  accessToken: string;
  deviceId: string;
  player: Spotify.Player | null;
  playerState: SpotifyPlayerState;
  search: (query: string, types: string[], limit?: number, market?: string) => Promise<SearchResult>;
  playTracks: (deviceId: string, trackIds: string[]) => Promise<{ result?: string, error?: string }>;
  playTopTracks: (deviceId: string, artist: string) => Promise<{ result?: string, error?: string }>;
  pausePlayback: (deviceId: string) => Promise<{ result?: string, error?: string }>;
  skipNext: (deviceId: string) => Promise<{ result?: string, error?: string }>;
  skipPrevious: (deviceId: string) => Promise<{ result?: string, error?: string }>;
 // markAsFavorite: (trackId: string) => Promise<{ result?: string, error?: string }>;
};

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
  playTracks: playTracks,
  playTopTracks: playTopTracks,
  pausePlayback: pausePlayback,
  skipNext: skipNext,
  skipPrevious: skipPrevious,
//  markAsFavorite: markAsFavorite,
});

interface Props {
  children: ReactNode
  enableSpotify: boolean
}

const loginFlow = new LoginFlow(
  "http://localhost:5173/spotify-callback",
  "https://accounts.spotify.com/authorize",
  {},
  "https://accounts.spotify.com/api/token",
  {},
  "/spotify-callback",
  SpotifyClientId,
  [
    'user-read-private',
    'user-read-email',
    'user-read-playback-state',
    'user-modify-playback-state',
    'user-library-modify',
    'streaming',
    'playlist-read-private',
    'playlist-read-collaborative',
  ],
  "spotify"
);

export type SearchResult = {
  error?: string;
  tracks?: {
    items: {
      id: string;
      name: string;
      artists: { name: string, id: string }[];
      album: { name: string, id: string };
    }[];
  };
  artists?: {
    items: { name: string, id: string }[];
  };
  albums?: {
    items: { name: string, id: string }[];
  };
  playlists?: {
    items: { name: string, id: string }[];
  };
  shows?: {
    items: { name: string, id: string }[];
  };
  episodes?: {
    items: { name: string, id: string }[];
  };
};

async function callApi<T>(url: string, options: RequestInit = {}, expectResponse = true): Promise<T> {
  const accessToken = await loginFlow.getAccessToken();
  options.headers = {
    ...options.headers,
    "Authorization": `Bearer ${accessToken}`
  }
  const response = await fetch(url, options);
  if (response.ok) {
    if (!expectResponse) {
      return {} as T
    }
    return await response.json();
  } else {
    throw new Error(`Spotify API error: ${response.status} ${response.statusText}`);
  }
}

async function search(query: string, types: string[], limit: number = 5, market: string = "from_token"): Promise<SearchResult> {
  const queryParams = new URLSearchParams();
  queryParams.append("q", query);
  queryParams.append("type", types.join(","));
  queryParams.append("market", market);
  queryParams.append("limit", limit.toString());
  const url = `https://api.spotify.com/v1/search?${queryParams.toString()}`;
  try {
    const response = await callApi<SearchResult>(url);
    if (response.error) {
      return response;
    }
    const result: SearchResult = {};
    if (response.tracks) {
      result.tracks = { items: response.tracks.items.map(item => ({
        id: item.id,
        name: item.name,
        artists: item.artists.map(artist => ({ id: artist.id, name: artist.name })),
        album: { name: item.album.name, id: item.album.id }
      }))};
    }
    if (response.artists) {
      result.artists = { items: response.artists.items.map(item => ({
        id: item.id,
        name: item.name
      }))};
    }
    if (response.albums) {
      result.albums = { items: response.albums.items.map(item => ({
        id: item.id,
        name: item.name
      }))};
    }
    if (response.playlists) {
      result.playlists = { items: response.playlists.items.map(item => ({
        id: item.id,
        name: item.name
      }))};
    }
    if (response.shows) {
      result.shows = { items: response.shows.items.map(item => ({
        id: item.id,
        name: item.name
      }))};
    }
    if (response.episodes) {
      result.episodes = { items: response.episodes.items.map(item => ({
        id: item.id,
        name: item.name
      }))};
    }
    return result;
  } catch (error) {
    return { error: error instanceof Error ? error.message : "unknown error" };
  }
}

type Result = { result: string } | { error: string };

async function playTracks(deviceId: string, trackIds: string[]): Promise<Result> {
  try {
    const options: RequestInit = {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
    }
    if (trackIds.length > 0) {
      options.body = JSON.stringify({ uris: trackIds.map(id => `spotify:track:${id}`) });
    }
    await callApi<void>(`https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`, options, false);
    return { result: "playback started" };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "unknown error" };
  }
}

async function playTopTracks(deviceId: string, artist: string): Promise<Result> {
  const result = await search(artist, ["artist"], 1);
  if (result.error) {
    return { error: result.error };
  }
  if (!result.artists) {
    return { error: "No artist found" };
  }
  try {
    const artistId = result.artists.items[0].id;
    const url = `https://api.spotify.com/v1/artists/${artistId}/top-tracks?limit=20&market=from_token`;
    const response = await callApi<{tracks: {id: string}[]}>(url);
    const trackIds = response.tracks.map((track) => track.id);
    return playTracks(deviceId, trackIds);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "unknown error" };
  }
}

async function pausePlayback(deviceId: string): Promise<Result> {
  const accessToken = await loginFlow.getAccessToken();
  try {
    const response = await fetch(`https://api.spotify.com/v1/me/player/pause?device_id=${deviceId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
    });
    if (response.ok) {
      return { result: "playback paused" };
    } else {
      return { error: `Spotify API error: ${response.status} ${response.statusText}` };
    }
  } catch (error) {
    return { error: error instanceof Error ? error.message : "unknown error" };
  }
}

// async function addToFavorites(trackIds: string[]) {
//   if (!trackIds) {
//     return { result: "no track is currently playing" };
//   }
//   const accessToken = await getAccessToken();
//   try {
//     const queryParams = new URLSearchParams();
//     queryParams.append("ids", trackIds.join(","));
//     const response = await fetch(`https://api.spotify.com/v1/me/tracks?ids=${queryParams.toString()}`, {
//       method: 'PUT',
//       headers: {
//         'Content-Type': 'application/json',
//         'Authorization': `Bearer ${accessToken}`
//       },
//     });
//     if (response.ok) {
//       return { result: "track(s) added to favorites" };
//     } else {
//       return { error: `Spotify API error: ${response.status} ${response.statusText}` };
//     }
//   } catch (error) {
//     return { error: error instanceof Error ? error.message : "unknown error" };
//   }
// }
//
// async function removedFromFavorites(trackIds: string[]) {
//   if (!trackIds) {
//     return { result: "no track is currently playing" };
//   }
//   const accessToken = await getAccessToken();
//   try {
//     const response = await fetch(`https://api.spotify.com/v1/me/tracks`, {
//       method: 'DELETE',
//       headers: {
//         'Content-Type': 'application/json',
//         'Authorization': `Bearer ${accessToken}`
//       },
//       body: JSON.stringify({
//         ids: trackIds
//       })
//     });
//     if (response.ok) {
//       return { result: "track(s) removed from favorites" };
//     } else {
//       return { error: `Spotify API error: ${response.status} ${response.statusText}` };
//     }
//   } catch (error) {
//     return { error: error instanceof Error ? error.message : "unknown error" };
//   }
// }
//
// async function isContainedInFavorites(trackIds: string[]) {
//   const accessToken = await getAccessToken();
//   const queryParams = new URLSearchParams();
//   queryParams.append("ids", trackIds.join(","));
//   const url = `https://api.spotify.com'/v1/me/tracks/contains'?${queryParams.toString()}`;
//   try {
//     const response = await fetch(url, {
//       headers: {
//         "Authorization": `Bearer ${accessToken}`
//       }
//     });
//     if (response.ok) {
//       return await response.json();
//     } else {
//       return { error: `Spotify API error: ${response.status} ${response.statusText}` };
//     }
//   } catch (error) {
//     return { error: error instanceof Error ? error.message : "unknown error" };
//   }
// }
//
async function skipNext(deviceId: string): Promise<Result> {
  const accessToken = await loginFlow.getAccessToken();
  try {
    const response = await fetch(`https://api.spotify.com/v1/me/player/next?device_id=${deviceId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
    });
    if (response.ok) {
      return { result: "skipped next" };
    } else {
      return { error: `Spotify API error: ${response.status} ${response.statusText}` };
    }
  } catch (error) {
    return { error: error instanceof Error ? error.message : "unknown error" };
  }
}

async function skipPrevious(deviceId: string): Promise<Result> {
  const accessToken = await loginFlow.getAccessToken();
  try {
    const response = await fetch(`https://api.spotify.com/v1/me/player/previous?device_id=${deviceId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
    });
    if (response.ok) {
      return { result: "skipped previous" };
    } else {
      return { error: `Spotify API error: ${response.status} ${response.statusText}` };
    }
  } catch (error) {
    return { error: error instanceof Error ? error.message : "unknown error" };
  }
}

// async function getDevices() {
//   try {
//     type DevicesResponse = {
//       "devices" : {
//         "id" : string,
//         "is_active" : boolean,
//         "is_private_session": boolean,
//         "is_restricted" : boolean,
//         "name" : string,
//         "type" : string,
//         "volume_percent" : number
//       }[]
//     }
//
//     return await callApi<DevicesResponse>(`https://api.spotify.com/v1/me/player/devices`);
//   } catch (error) {
//     return { error: error instanceof Error ? error.message : "unknown error" };
//   }
// }

export const SpotifyContextProvider: React.FC<Props>  = ({ enableSpotify, children }) => {
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
    if (!enableSpotify) {
      setAccessToken("");
      return;
    }
    loginFlow.getAccessToken().then(token => setAccessToken(token));
  }, [enableSpotify]);
  
  const playerRef = React.useRef<Spotify.Player | null>(null);
  
  useEffect(() => {
    if (!enableSpotify) return;
    
    const readyListener = ({ device_id }: { device_id: string }) => {
      setDeviceId(device_id);
      console.log('Spotify ready with device ID', device_id);
    };
    const notReadyListener = ({ device_id }: { device_id: string }) => {
      setDeviceId("");
      console.log('Spotify device ID has gone offline', device_id);
    };
    const initializationErrorListener = ({ message }: { message: string }) => {
      console.error(message);
    };
    const authenticationErrorListener = ({ message }: { message: string }) => {
      console.error(message);
    };
    const accountErrorListener = ({ message }: { message: string }) => {
      console.error(message);
    }
    const playerStateChangedListener = ({paused, disallows, track_window: { current_track, previous_tracks, next_tracks }, position, duration }: Spotify.PlaybackState) => {
      setPlayerState({
        paused: paused,
        trackId: current_track.id || "",
        name: current_track.name,
        artists: current_track.artists.map(artist => artist.name),
        albumName: current_track.album.name,
        uiLink: current_track.uri,
        coverImageUrl: current_track.album.images[0].url,
        duration: duration / 1000,
        position: position / 1000,
        canSkipPrevious: !disallows?.skipping_prev,
        canSkipNext: !disallows?.skipping_next,
        previousTracks: previous_tracks.map(track => ({
          id: track.id || "",
          name: track.name,
          artists: track.artists.map(artist => artist.name),
          album: track.album.name,
          uiLink: track.uri
        })),
        nextTracks: next_tracks.map(track => ({
          id: track.id || "",
          name: track.name,
          artists: track.artists.map(artist => artist.name),
          album: track.album.name,
          uiLink: track.uri
        })),
      });
    }
    
    const updatePosition = () => {
      if (!playerRef.current) return;
      playerRef.current.getCurrentState().then(state => {
        if (!state) {
          setConnected(connected => {
            if (connected) {
              console.log("lost connection to Spotify player");
            }
            return false;
          });
          return;
        }
        setConnected(true);
        if (!state.paused) {
          setPlayerState(current => ({...current, position: state.position / 1000, duration: state.duration / 1000}))
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
        playerRef.current = new Spotify.Player({
          name: 'Voice Assistant',
          getOAuthToken: cb => {
            loginFlow.getAccessToken().then(accessToken => cb(accessToken));
          },
          volume: 0.5
        });
      }
      
      // Attach listeners
      playerRef.current.addListener('ready', readyListener);
      playerRef.current.addListener('not_ready', notReadyListener);
      playerRef.current.addListener('initialization_error', initializationErrorListener);
      playerRef.current.addListener('authentication_error', authenticationErrorListener);
      playerRef.current.addListener('account_error', accountErrorListener);
      playerRef.current.addListener('player_state_changed', playerStateChangedListener);
      
      playerRef.current.connect().then(result => {
        if (result) {
          setPlayer(playerRef.current);
        } else {
          console.error("Spotify player could not connect");
          setPlayer(null);
        }
      });
    }
    
    const apiScript = createScript("https://sdk.scdn.co/spotify-player.js", () => {});
    document.body.appendChild(apiScript);

    return () => {
      clearInterval(positionInterval);
      if (playerRef.current) {
        console.log("Disconnecting Spotify Player");
        // Detach listeners
        playerRef.current.removeListener('ready', readyListener);
        playerRef.current.removeListener('not_ready', notReadyListener);
        playerRef.current.removeListener('initialization_error', initializationErrorListener);
        playerRef.current.removeListener('authentication_error', authenticationErrorListener);
        playerRef.current.removeListener('account_error', accountErrorListener);
        playerRef.current.removeListener('player_state_changed', playerStateChangedListener);
        
        playerRef.current.disconnect();
      }
      setPlayer(null);
      window.onSpotifyWebPlaybackSDKReady = () => {};
      document.body.removeChild(apiScript);
    };
  }, [enableSpotify]);
  
  // Refresh access token every 15 minutes
  useEffect(() => {
    if (!accessToken) return;
    const interval = setInterval(async () => {
      const newToken = await loginFlow.getAccessToken(true);
      setAccessToken(newToken);
    }, 1000 * 60 * 15);
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
  
  const performConnected = React.useCallback(async (deviceId: string, callback: () => Promise<Result>) => {
    if (deviceId === ourDeviceId) {
      if (!spotifyPlayer) {
        return { error: "Spotify player not ready" };
      }
      if (!connected) {
        console.log("connecting Spotify player");
        if (!(await spotifyPlayer.connect())) {
          return { error: "Spotify player could not connect" };
        }
        // TODO: Now we may have a new device ID, but the caller past the old one
      }
    }
    return callback();
  }, [spotifyPlayer, connected, ourDeviceId]);
  
  const playTracksConnected = React.useCallback(async (deviceId: string, trackIds: string[]): Promise<Result> => {
    return performConnected(deviceId, async () => playTracks(deviceId, trackIds));
  }, [performConnected]);

  const playTopTracksConnected = React.useCallback(async (deviceId: string, artist: string): Promise<Result> => {
    return performConnected(deviceId, async () => playTopTracks(deviceId, artist));
  }, [performConnected]);
  
  const pausePlaybackConnected = React.useCallback(async (deviceId: string): Promise<Result> => {
    if (deviceId === ourDeviceId) {
      if (!spotifyPlayer) {
        return { error: "Spotify player not ready" };
      }
      await spotifyPlayer.pause();
      return { result: "playback paused" };
    }
    return pausePlayback(deviceId);
  }, [spotifyPlayer, ourDeviceId]);

  const skipNextConnected = React.useCallback(async (deviceId: string): Promise<Result> => {
    if (deviceId === ourDeviceId) {
      if (!spotifyPlayer) {
        return { error: "Spotify player not ready" };
      }
      await spotifyPlayer.nextTrack();
      return { result: "playing next track" };
    }
    return skipNext(deviceId);
  }, [spotifyPlayer, ourDeviceId]);
  
  const skipPreviousConnected = React.useCallback(async (deviceId: string): Promise<Result> => {
    if (deviceId === ourDeviceId) {
      if (!spotifyPlayer) {
        return { error: "Spotify player not ready" };
      }
      await spotifyPlayer.previousTrack();
      return { result: "playing previous track" };
    }
    return skipPrevious(deviceId);
  }, [spotifyPlayer, ourDeviceId]);
  
  return (
    <SpotifyContext.Provider
      value={{
        accessToken,
        deviceId: ourDeviceId,
        player: spotifyPlayer,
        playerState,
        search,
        playTracks: playTracksConnected,
        playTopTracks: playTopTracksConnected,
        pausePlayback: pausePlaybackConnected,
        skipNext: skipNextConnected,
        skipPrevious: skipPreviousConnected,
      }}>
      {children}
    </SpotifyContext.Provider>
  );
};
