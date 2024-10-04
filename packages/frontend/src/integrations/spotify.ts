import { LoginFlow } from "../utils/loginFlow";
import { SpotifyClientId } from "../config";
import { randomizeArray } from "../utils/randomizeArray";

export const loginFlow = new LoginFlow({
  authorizationEndpoint: "https://accounts.spotify.com/authorize",
  additionalParams: {},
  tokenEndpoint: "https://accounts.spotify.com/api/token",
  additionalTokenParams: {},
  callbackPath: "/spotify-callback",
  clientId: SpotifyClientId,
  scopes: [
    "user-read-private",
    "user-read-email",
    "user-read-playback-state",
    "user-modify-playback-state",
    "user-library-modify",
    "streaming",
    "playlist-read-private",
    "playlist-read-collaborative",
  ],
  storagePrefix: "spotify",
});

type Item = {
  id: string;
  name: string;
};

type TrackItem = {
  id: string;
  name: string;
  artists: Item[];
  album: Item;
};

export type SearchResult = {
  error?: string;
  tracks?: {
    items: TrackItem[];
  };
  artists?: {
    items: Item[];
  };
  albums?: {
    items: Item[];
  };
  playlists?: {
    items: Item[];
  };
  shows?: {
    items: Item[];
  };
  episodes?: {
    items: Item[];
  };
};

async function callApi<T>(url: string, options: RequestInit = {}, expectResponse = true): Promise<T> {
  const accessToken = await loginFlow.getAccessToken();
  options.headers = {
    ...options.headers,
    Authorization: `Bearer ${accessToken}`,
  };
  const response = await fetch(url, options);
  if (response.ok) {
    if (!expectResponse) {
      return {} as T;
    }
    return await response.json();
  } else {
    throw new Error(`Spotify API error: ${response.status} ${response.statusText}`);
  }
}

export async function search(
  query: string,
  types: string[],
  limit: number = 5,
  market: string = "from_token",
): Promise<SearchResult> {
  const queryParams = new URLSearchParams();
  queryParams.append("q", query);
  queryParams.append("type", types.join(","));
  queryParams.append("market", market);
  queryParams.append("limit", limit.toString());
  const response = await callApi<SearchResult>(`https://api.spotify.com/v1/search?${queryParams.toString()}`);
  if (response.error) {
    return response;
  }
  const result: SearchResult = {};
  if (response.tracks) {
    result.tracks = {
      items: response.tracks.items.map((item) => ({
        id: item.id,
        name: item.name,
        artists: item.artists.map((artist) => ({ id: artist.id, name: artist.name })),
        album: { name: item.album.name, id: item.album.id },
      })),
    };
  }
  if (response.artists) {
    result.artists = {
      items: response.artists.items.map((item) => ({
        id: item.id,
        name: item.name,
      })),
    };
  }
  if (response.albums) {
    result.albums = {
      items: response.albums.items.map((item) => ({
        id: item.id,
        name: item.name,
      })),
    };
  }
  if (response.playlists) {
    result.playlists = {
      items: response.playlists.items.map((item) => ({
        id: item.id,
        name: item.name,
      })),
    };
  }
  if (response.shows) {
    result.shows = {
      items: response.shows.items.map((item) => ({
        id: item.id,
        name: item.name,
      })),
    };
  }
  if (response.episodes) {
    result.episodes = {
      items: response.episodes.items.map((item) => ({
        id: item.id,
        name: item.name,
      })),
    };
  }
  return result;
}

export async function play(deviceId: string, trackIds: string[], contextUri?: string): Promise<void> {
  const options: RequestInit = {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
  };
  if (contextUri && contextUri.startsWith("spotify:track:")) {
    // Be forgiving to the LLM and play the track if it's a track uri
    trackIds.push(contextUri.substring("spotify:track:".length));
  }
  if (trackIds.length > 0) {
    options.body = JSON.stringify({ uris: trackIds.map((id) => `spotify:track:${id}`) });
  } else if (contextUri) {
    options.body = JSON.stringify({ context_uri: contextUri });
  }
  await callApi<void>(`https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`, options, false);
}

export async function playTopTracks(deviceId: string, artists: string[]): Promise<void> {
  const trackIds: string[] = [];
  for (const artist of artists) {
    const result = await search(artist, ["artist"], 1);
    if (result.error) {
      console.warn(`failed to find artist ${artist}`, result.error);
      continue;
    }
    if (!result.artists) {
      console.warn(`Did not find artist id for ${artist}`);
      continue;
    }
    const artistId = result.artists.items[0].id;
    const url = `https://api.spotify.com/v1/artists/${artistId}/top-tracks?limit=20&market=from_token`;
    const response = await callApi<{ tracks: { id: string }[] }>(url);
    trackIds.push(...response.tracks.map((track) => track.id));
  }
  randomizeArray(trackIds);
  await play(deviceId, trackIds);
}

export async function pausePlayback(deviceId: string): Promise<void> {
  const options: RequestInit = { method: "PUT" };
  await callApi<void>(`https://api.spotify.com/v1/me/player/pause?device_id=${deviceId}`, options, false);
}

export async function addToFavorites(trackIds: string[]): Promise<void> {
  if (!trackIds || trackIds.length === 0) {
    throw new Error("no track(s) provided");
  }
  const queryParams = new URLSearchParams();
  queryParams.append("ids", trackIds.join(","));
  const options = { method: "PUT" };
  await callApi<void>(`https://api.spotify.com/v1/me/tracks?ids=${queryParams.toString()}`, options, false);
}

export async function removeFromFavorites(trackIds: string[]): Promise<void> {
  if (!trackIds || trackIds.length === 0) {
    throw new Error("no track(s) provided");
  }
  const options = {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      ids: trackIds,
    }),
  };
  await callApi<void>(`https://api.spotify.com/v1/me/tracks`, options, false);
}

export async function isContainedInFavorites(trackIds: string[]): Promise<boolean[]> {
  const queryParams = new URLSearchParams();
  queryParams.append("ids", trackIds.join(","));
  return await callApi<boolean[]>(`https://api.spotify.com/v1/me/tracks/contains'?${queryParams.toString()}`, {}, true);
}

export async function skipNext(deviceId: string): Promise<void> {
  const options = { method: "POST" };
  await callApi<void>(`https://api.spotify.com/v1/me/player/next?device_id=${deviceId}`, options, false);
}

export async function skipPrevious(deviceId: string): Promise<void> {
  const options = { method: "POST" };
  await callApi<void>(`https://api.spotify.com/v1/me/player/previous?device_id=${deviceId}`, options, false);
}

export type SpotifyDevice = {
  id: string;
  is_active: boolean;
  is_private_session: boolean;
  is_restricted: boolean;
  name: string;
  type: string;
  volume_percent: number;
};

export async function getDevices(): Promise<SpotifyDevice[]> {
  type DevicesResponse = {
    devices: SpotifyDevice[];
  };

  const result = await callApi<DevicesResponse>(`https://api.spotify.com/v1/me/player/devices`);
  return result.devices;
}
