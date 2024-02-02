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
};

export type SpotifyContextType = {
  accessToken: string;
  deviceId: string;
  player: Spotify.Player | null;
  playerState: SpotifyPlayerState;
  playTracks: (deviceId: string, trackIds: string[]) => Promise<{ result?: string, error?: string }>;
  pausePlayback: (deviceId: string) => Promise<{ result?: string, error?: string }>;
  skipNext: (deviceId: string) => Promise<{ result?: string, error?: string }>;
  skipPrevious: (deviceId: string) => Promise<{ result?: string, error?: string }>;
  markAsFavorite: (trackId: string) => Promise<{ result?: string, error?: string }>;
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
  },
  playTracks: playTracks,
  pausePlayback: pausePlayback,
  skipNext: skipNext,
  skipPrevious: skipPrevious,
  markAsFavorite: markAsFavorite,
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
  
  return await response.json();
}

function runLoginFlow() {
  // On page load, try to fetch auth code from current browser search URL
  const args = new URLSearchParams(window.location.search);
  const code = args.get('code');
  
  // If we find a code, we're in a callback, do a token exchange
  if (code) {
    console.log("Found code in URL, exchanging for token");
    getToken(code).then(json => {
      console.log("Received access token set", json);
      const newTokenSet: TokenSet = {
        accessToken: json.access_token,
        refreshToken: json.refresh_token,
        expires: Date.now() + json.expires_in * 1000,
      };
      localStorage.setItem("spotify-token-set", JSON.stringify(newTokenSet));
      //setAccessToken(newTokenSet.accessToken);
      
      // Remove code from URL so we can refresh correctly.
      const url = new URL(window.location.href);
      url.searchParams.delete("code");
      
      const updatedUrl = url.search ? url.href : url.href.replace('?', '');
      window.history.replaceState({}, document.title, updatedUrl);
    });
  } else {
    console.log("No code found in URL, redirecting to Spotify authorize");
    redirectToSpotifyAuthorize().then(() => {
      console.log("Redirected to Spotify authorize");
    });
  }
}

async function getAccessToken() {
  const spotifyTokenSet = localStorage.getItem("spotify-token-set");
  if (!spotifyTokenSet) {
    runLoginFlow();
    return "";
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
    runLoginFlow();
    return "";
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

async function markAsFavorite(trackId: string) {
  if (!trackId) {
    return { result: "no track is currently playing" };
  }
  const accessToken = await getAccessToken();
  try {
    const response = await fetch(`https://api.spotify.com/v1/me/tracks?ids=${trackId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
    });
    if (response.ok) {
      return { result: "track marked as favorite" };
    } else {
      return { error: `Spotify API error: ${response.status} ${response.statusText}` };
    }
  } catch (error) {
    return { error: error instanceof Error ? error.message : "unknown error" };
  }
}

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
  });
  
  useEffect(() => {
    if (!enableSpotify) {
      setAccessToken("");
      return;
    }
    
    const runLoginFlow = () => {
      // On page load, try to fetch auth code from current browser search URL
      const args = new URLSearchParams(window.location.search);
      const code = args.get('code');
      
      // If we find a code, we're in a callback, do a token exchange
      if (code) {
        console.log("Found code in URL, exchanging for token");
        getToken(code).then(json => {
          console.log("Received access token set", json);
          const newTokenSet: TokenSet = {
            accessToken: json.access_token,
            refreshToken: json.refresh_token,
            expires: Date.now() + json.expires_in * 1000,
          };
          localStorage.setItem("spotify-token-set", JSON.stringify(newTokenSet));
          setAccessToken(newTokenSet.accessToken);
          
          // Remove code from URL so we can refresh correctly.
          const url = new URL(window.location.href);
          url.searchParams.delete("code");
          
          const updatedUrl = url.search ? url.href : url.href.replace('?', '');
          window.history.replaceState({}, document.title, updatedUrl);
        });
      } else {
        console.log("No code found in URL, redirecting to Spotify authorize");
        redirectToSpotifyAuthorize().then(() => {
          console.log("Redirected to Spotify authorize");
        });
      }
    }

    const spotifyTokenSet = localStorage.getItem("spotify-token-set");
    if (spotifyTokenSet) {
      const tokenSet: TokenSet = JSON.parse(spotifyTokenSet);
      // TODO: Take care of refreshing the access token periodically
      if (tokenSet.expires > Date.now()) {
        setAccessToken(tokenSet.accessToken);
      } else {
        fetch(tokenEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: new URLSearchParams({
            client_id: SpotifyClientId,
            grant_type: 'refresh_token',
            refresh_token: tokenSet.refreshToken
          }),
        }).then(response => {
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          return response.json();
        }).then(json => {
          const newTokenSet: TokenSet = {
            accessToken: json.access_token,
            refreshToken: tokenSet.refreshToken,
            expires: Date.now() + json.expires_in * 1000,
          };
          localStorage.setItem("spotify-token-set", JSON.stringify(newTokenSet));
          setAccessToken(newTokenSet.accessToken);
        }).catch(error => {
          console.error("Error refreshing Spotify token", error);
          runLoginFlow();
        })
      }
    } else {
      runLoginFlow();
    }
  }, [enableSpotify]);
  
  useEffect(() => {
    if (!accessToken) return;
    
    console.log("Got access token. Loading Spotify Web Playback SDK");

    window.onSpotifyWebPlaybackSDKReady = () => {
      const player = new Spotify.Player({
        name: 'Web Playback SDK Quick Start Player',
        getOAuthToken: cb => { cb(accessToken); },
        volume: 0.5
      });
      
      // Ready
      player.addListener('ready', ({ device_id }) => {
        setDeviceId(device_id);
        console.log('Ready with Device ID', device_id);
      });
      
      // Not Ready
      player.addListener('not_ready', ({ device_id }) => {
        setDeviceId("");
        console.log('Device ID has gone offline', device_id);
      });
      
      player.addListener('initialization_error', ({ message }) => {
        console.error(message);
      });
      
      player.addListener('authentication_error', ({ message }) => {
        console.error(message);
      });
      
      player.addListener('account_error', ({ message }) => {
        console.error(message);
      });
      
      player.addListener('player_state_changed', ({ paused, track_window: { current_track }}) => {
        setPlayerState({
          paused: paused,
          trackId: current_track.id || "",
          name: current_track.name,
          artists: current_track.artists.map(artist => artist.name),
          albumName: current_track.album.name,
          coverImageUrl: current_track.album.images[0].url,
        });
      });
      
      player.connect().then(r => {
        console.log("Spotify Player connected", r);
        setPlayer(player);
      });
    }
    
    const apiScript = createScript("https://sdk.scdn.co/spotify-player.js", () => {});
    document.body.appendChild(apiScript);

    return () => {
      document.body.removeChild(apiScript);
    };
  }, [accessToken]);
  
  return (
    <SpotifyContext.Provider
      value={{
        accessToken,
        deviceId,
        player: spotifyPlayer,
        playerState,
        playTracks,
        pausePlayback,
        skipNext,
        skipPrevious,
        markAsFavorite,
      }}>
      {children}
    </SpotifyContext.Provider>
  );
};
