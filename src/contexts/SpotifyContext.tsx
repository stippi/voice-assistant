import React, {createContext, ReactNode, useEffect, useState} from 'react';
import {SpotifyClientId} from "../secrets";
import {createScript} from "../utils/createScript";

const redirectUrl = "http://localhost:5173"; // your redirect URL - must be localhost URL and/or HTTPS

const authorizationEndpoint = "https://accounts.spotify.com/authorize";
const tokenEndpoint = "https://accounts.spotify.com/api/token";
const scopes = [
  'user-read-private',
  'user-read-email',
  'user-read-playback-state',
  'user-modify-playback-state',
  'user-library-modify',
  'streaming',
  'playlist-read-private',
  'playlist-read-collaborative',
].join(' ');

type SpotifyPlayerState = {
  paused: boolean;
  trackId: string;
  name: string;
  artists: string[];
  albumName: string;
  coverImageUrl: string;
  position: number,
  duration: number,
  canSkipPrevious: boolean,
  canSkipNext: boolean,
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
    position: 0,
    duration: 0,
    canSkipPrevious: false,
    canSkipNext: false,
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

type TokenSet = {
  accessToken: string;
  refreshToken: string;
  expires: number;
};

async function redirectToSpotifyAuthorize() {
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const randomValues = crypto.getRandomValues(new Uint8Array(64));
  const codeVerifier = randomValues.reduce((acc, x) => acc + possible[x % possible.length], "");
  const data = new TextEncoder().encode(codeVerifier);
  const hashed = await crypto.subtle.digest('SHA-256', data);
  
  const codeChallengeBase64 = btoa(String.fromCharCode(...new Uint8Array(hashed)))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
  
  window.localStorage.setItem('spotify-code-verifier', codeVerifier);
  
  const authUrl = new URL(authorizationEndpoint)
  const params = {
    response_type: 'code',
    client_id: SpotifyClientId,
    scope: scopes,
    code_challenge_method: 'S256',
    code_challenge: codeChallengeBase64,
    redirect_uri: redirectUrl,
  };
  
  authUrl.search = new URLSearchParams(params).toString();
  // Redirect the user to the authorization server for login
  window.location.href = authUrl.toString();
}

// Spotify API Calls
async function getToken(code: string) {
  const codeVerifier = localStorage.getItem('spotify-code-verifier') || "";
  
  const response = await fetch(tokenEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: SpotifyClientId,
      grant_type: 'authorization_code',
      code: code,
      redirect_uri: redirectUrl,
      code_verifier: codeVerifier,
    }),
  });
  if (!response.ok) {
    throw new Error(`Failed to exchange code to access token. HTTP status: ${response.status}`);
  }
  return await response.json();
}

async function runLoginFlow() {
  // On page load, try to fetch auth code from current browser search URL
  const args = new URLSearchParams(window.location.search);
  const code = args.get('code');
  if (!code) {
    console.log("no code found in URL, redirecting to Spotify authorize");
    await redirectToSpotifyAuthorize();
    return "";
  }
  // If we find a code, we're in a callback, do a token exchange
  console.log("found code in URL, exchanging for Spotify access token");
  try {
    const json = await getToken(code);
    console.log("received Spotify access token set");
    const newTokenSet: TokenSet = {
      accessToken: json.access_token,
      refreshToken: json.refresh_token,
      expires: Date.now() + json.expires_in * 1000,
    };
    localStorage.setItem("spotify-token-set", JSON.stringify(newTokenSet));
    
    // Remove code from URL so we can refresh correctly.
    const url = new URL(window.location.href);
    url.searchParams.delete("code");
    
    const updatedUrl = url.search ? url.href : url.href.replace('?', '');
    window.history.replaceState({}, document.title, updatedUrl);
    
    return newTokenSet.accessToken;
  } catch (error) {
    console.error("Failed to exchange code for token", error);
    await redirectToSpotifyAuthorize();
    return "";
  }
}

async function getAccessToken() {
  const spotifyTokenSet = localStorage.getItem("spotify-token-set");
  if (!spotifyTokenSet) {
    return await runLoginFlow();
  }
  const tokenSet: TokenSet = JSON.parse(spotifyTokenSet);
  if (tokenSet.expires > Date.now()) {
    return tokenSet.accessToken;
  }
  // Try to refresh the access token, it may fail if the refresh token has expired, too.
  const response = await fetch(tokenEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      client_id: SpotifyClientId,
      grant_type: 'refresh_token',
      refresh_token: tokenSet.refreshToken
    }),
  });
  if (!response.ok) {
    // If we failed to refresh the token, re-run the login flow
    return await runLoginFlow();
  }
  const json = await response.json();
  const newTokenSet: TokenSet = {
    accessToken: json.access_token,
    refreshToken: tokenSet.refreshToken,
    expires: Date.now() + json.expires_in * 1000,
  };
  localStorage.setItem("spotify-token-set", JSON.stringify(newTokenSet));
  return newTokenSet.accessToken;
}

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
};

async function search(query: string, types: string[], limit: number = 5, market: string = "from_token"): Promise<SearchResult> {
  const accessToken = await getAccessToken();
  const queryParams = new URLSearchParams();
  queryParams.append("q", query);
  queryParams.append("type", types.join(","));
  queryParams.append("market", market);
  queryParams.append("limit", limit.toString());
  const url = `https://api.spotify.com/v1/search?${queryParams.toString()}`;
  try {
    const response = await fetch(url, {
      headers: {
        "Authorization": `Bearer ${accessToken}`
      }
    });
    if (response.ok) {
      const responseResult: SearchResult = await response.json();
      if (responseResult.error) {
        return responseResult;
      }
      const result: SearchResult = {};
      if (responseResult.tracks) {
        result.tracks = { items: responseResult.tracks.items.map(item => ({
          id: item.id,
          name: item.name,
          artists: item.artists.map(artist => ({ id: artist.id, name: artist.name })),
          album: { name: item.album.name, id: item.album.id }
        }))};
      }
      if (responseResult.artists) {
        result.artists = { items: responseResult.artists.items.map(item => ({
          id: item.id,
          name: item.name
        }))};
      }
      return result;
    } else {
      return { error: `Spotify API error: ${response.status} ${response.statusText}` };
    }
  } catch (error) {
    return { error: error instanceof Error ? error.message : "unknown error" };
  }
}

async function playTracks(deviceId: string, trackIds: string[]) {
  const accessToken = await getAccessToken();
  try {
    const options: RequestInit = {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
    }
    if (trackIds.length > 0) {
      options.body = JSON.stringify({ uris: trackIds.map(id => `spotify:track:${id}`) });
    }
    const response = await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`, options);
    if (response.ok) {
      return { result: "playback started" };
    } else {
      return { error: `Spotify API error: ${response.status} ${response.statusText}` };
    }
  } catch (error) {
    return { error: error instanceof Error ? error.message : "unknown error" };
  }
}

async function playTopTracks(deviceId: string, artist: string) {
  const result = await search(artist, ["artist"], 1);
  if (result.error) {
    return result;
  }
  if (!result.artists) {
    return { error: "No artist found" };
  }
  const accessToken = await getAccessToken();
  const artistId = result.artists.items[0].id;
  const url = `https://api.spotify.com/v1/artists/${artistId}/top-tracks?limit=20&market=from_token`;
  try {
    const response = await fetch(url, {
      headers: {
        "Authorization": `Bearer ${accessToken}`
      }
    });
    const tracks: {tracks: {id: string}[]} = await response.json();
    const trackIds = tracks.tracks.map((track) => track.id);
    return playTracks(deviceId, trackIds);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "unknown error" };
  }
}

async function pausePlayback(deviceId: string) {
  const accessToken = await getAccessToken();
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
async function skipNext(deviceId: string) {
  const accessToken = await getAccessToken();
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

async function skipPrevious(deviceId: string) {
  const accessToken = await getAccessToken();
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


export const SpotifyContextProvider: React.FC<Props>  = ({ enableSpotify, children }) => {
  const [accessToken, setAccessToken] = useState("");
  const [deviceId, setDeviceId] = useState("");
  const [spotifyPlayer, setPlayer] = React.useState<Spotify.Player | null>(null);
  const [playerState, setPlayerState] = useState<SpotifyPlayerState>({
    paused: true,
    trackId: "",
    name: "",
    artists: [],
    albumName: "",
    coverImageUrl: "",
    position: 0,
    duration: 0,
    canSkipPrevious: false,
    canSkipNext: false,
  });
  
  useEffect(() => {
    if (!enableSpotify) {
      setAccessToken("");
      return;
    }
    getAccessToken().then(token => setAccessToken(token));
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
    const playerStateChangedListener = ({ paused, disallows, track_window: { current_track }, position, duration }: Spotify.PlaybackState) => {
      setPlayerState({
        paused: paused,
        trackId: current_track.id || "",
        name: current_track.name,
        artists: current_track.artists.map(artist => artist.name),
        albumName: current_track.album.name,
        coverImageUrl: current_track.album.images[0].url,
        duration: duration / 1000,
        position: position / 1000,
        canSkipPrevious: !disallows?.skipping_prev,
        canSkipNext: !disallows?.skipping_next,
      });
    }
    
    const updatePosition = () => {
      if (!playerRef.current) return;
      playerRef.current.getCurrentState().then(state => {
        if (!state) {
          return;
        }
        setPlayerState(current => ({ ...current, position: state.position / 1000, duration: state.duration / 1000}))
      });
    };
    const positionInterval = window.setInterval(updatePosition, 1000);
    
    window.onSpotifyWebPlaybackSDKReady = () => {
      if (!playerRef.current) {
        console.log("creating Spotify player");
        playerRef.current = new Spotify.Player({
          name: 'Voice Assistant',
          getOAuthToken: cb => {
            getAccessToken().then(accessToken => cb(accessToken));
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
      
      playerRef.current.connect().then(r => {
        console.log("Spotify Player connected", r);
        setPlayer(playerRef.current);
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
      const newToken = await getAccessToken();
      setAccessToken(newToken);
    }, 1000 * 60 * 15);
    return () => clearInterval(interval);
  }, [accessToken]);
  
  return (
    <SpotifyContext.Provider
      value={{
        accessToken,
        deviceId,
        player: spotifyPlayer,
        playerState,
        search,
        playTracks,
        playTopTracks,
        pausePlayback,
        skipNext,
        skipPrevious,
      }}>
      {children}
    </SpotifyContext.Provider>
  );
};