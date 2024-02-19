import {LoginFlow} from "../utils/loginFlow.ts";
import {SpotifyClientId} from "../secrets.ts";
import {randomizeArray} from "../utils/randomizeArray.ts";

export const loginFlow = new LoginFlow({
  authorizationEndpoint: "https://accounts.spotify.com/authorize",
  additionalParams: {},
  tokenEndpoint: "https://accounts.spotify.com/api/token",
  additionalTokenParams: {},
  callbackPath: "/spotify-callback",
  clientId: SpotifyClientId,
  scopes: [
    'user-read-private',
    'user-read-email',
    'user-read-playback-state',
    'user-modify-playback-state',
    'user-library-modify',
    'streaming',
    'playlist-read-private',
    'playlist-read-collaborative',
  ],
  storagePrefix: "spotify"
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

export async function search(query: string, types: string[], limit: number = 5, market: string = "from_token"): Promise<SearchResult> {
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

export type Result = { result: string } | { error: string };

export async function play(deviceId: string, trackIds: string[], contextUri?: string): Promise<Result> {
  try {
    const options: RequestInit = {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
    }
    if (contextUri && contextUri.startsWith("spotify:track:")) {
      // Be forgiving to the LLM and play the track if it's a track uri
      trackIds.push(contextUri.substring("spotify:track:".length));
    }
    if (trackIds.length > 0) {
      options.body = JSON.stringify({ uris: trackIds.map(id => `spotify:track:${id}`) });
    } else if (contextUri) {
      options.body = JSON.stringify({ context_uri: contextUri });
    }
    await callApi<void>(`https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`, options, false);
    return { result: "playback started" };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "unknown error" };
  }
}

export async function playTopTracks(deviceId: string, artists: string[]): Promise<Result> {
  try {
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
      const response = await callApi<{tracks: {id: string}[]}>(url);
      trackIds.push(...response.tracks.map((track) => track.id));
    }
    randomizeArray(trackIds);
    return play(deviceId, trackIds);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "unknown error" };
  }
}

export async function pausePlayback(deviceId: string): Promise<Result> {
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
export async function skipNext(deviceId: string): Promise<Result> {
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

export async function skipPrevious(deviceId: string): Promise<Result> {
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

export async function getDevices() {
  try {
    type DevicesResponse = {
      "devices" : {
        "id" : string,
        "is_active" : boolean,
        "is_private_session": boolean,
        "is_restricted" : boolean,
        "name" : string,
        "type" : string,
        "volume_percent" : number
      }[]
    }

    return await callApi<DevicesResponse>(`https://api.spotify.com/v1/me/player/devices`);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "unknown error" };
  }
}
