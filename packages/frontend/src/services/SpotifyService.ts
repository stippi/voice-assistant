import { LoginFlow } from "../utils/loginFlow";
import { SpotifyClientId } from "../config";
import { randomizeArray, createScript } from "../utils";

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

export type SpotifyDevice = {
  id: string;
  is_active: boolean;
  is_private_session: boolean;
  is_restricted: boolean;
  name: string;
  type: string;
  volume_percent: number;
};

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

interface SpotifyListener {
  playerStateChanged: (state: SpotifyPlayerState | null) => void;
  deviceIdChanged: (deviceId: string) => void;
  connectedChanged: (connected: boolean) => void;
}

export class SpotifyService {
  private enabled = false;
  private tokenRefreshInterval = 0;
  private loginFlow: LoginFlow;
  private listeners: SpotifyListener[] = [];
  private player: Spotify.Player | null = null;
  private deviceId: string = "";
  private connected: boolean = false;

  constructor() {
    this.loginFlow = new LoginFlow({
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
  }

  setEnabled(enabled: boolean) {
    if (this.enabled !== enabled) {
      this.enabled = enabled;
      if (enabled) {
        this.tokenRefreshInterval = window.setInterval(
          async () => {
            await this.loginFlow.getAccessToken(true);
          },
          15 * 60 * 1000,
        );
        this.initializePlayer();
      } else {
        window.clearInterval(this.tokenRefreshInterval);
        this.disconnect();
      }
    }
  }

  isEnabled() {
    return this.enabled;
  }

  getDeviceID() {
    return this.deviceId;
  }

  addListener(listener: SpotifyListener) {
    this.listeners.push(listener);
    if (this.player) {
      this.player.getCurrentState().then((state) => listener.playerStateChanged(this.createPlayerState(state)));
    } else {
      listener.playerStateChanged(this.createPlayerState(null));
    }
    listener.connectedChanged(this.connected);
    listener.deviceIdChanged(this.deviceId);
  }

  removeListener(listener: SpotifyListener) {
    this.listeners = this.listeners.filter((l) => l !== listener);
  }

  private initializePlayer(): Promise<void> {
    return new Promise((resolve, reject) => {
      window.onSpotifyWebPlaybackSDKReady = () => {
        if (!this.player) {
          console.log("creating Spotify player");
          this.player = new Spotify.Player({
            name: "Voice Assistant",
            getOAuthToken: (callback) => {
              console.log("Spotify player requesting access token");
              this.loginFlow.getAccessToken().then((accessToken) => callback(accessToken));
            },
            volume: 0.5,
          });
        }

        this.attachListeners(resolve);

        this.player
          .connect()
          .then((result) => {
            if (!result) {
              console.error("Spotify player could not connect");
              this.player = null;
              reject(new Error("Spotify player could not connect"));
            }
          })
          .catch((error) => {
            reject(error);
          });
      };

      if (!this.player) {
        const apiScript = createScript("https://sdk.scdn.co/spotify-player.js", () => {});
        document.body.appendChild(apiScript);
      } else {
        this.player = null;
        this.deviceId = "";
        window.onSpotifyWebPlaybackSDKReady();
      }
    });
  }

  private setDeviceId(deviceId: string) {
    if (this.deviceId != deviceId) {
      this.deviceId = deviceId;
      this.listeners.forEach((l) => l.deviceIdChanged(deviceId));
    }
  }

  private setConnected(connected: boolean) {
    if (this.connected != connected) {
      this.connected = connected;
      this.listeners.forEach((l) => l.connectedChanged(connected));
    }
  }

  async getPlaybackState(): Promise<Spotify.PlaybackState | null> {
    if (this.player) {
      return this.player.getCurrentState();
    }
    return null;
  }

  private createPlayerState(state: Spotify.PlaybackState | null): SpotifyPlayerState | null {
    if (state === null) return null;
    return {
      paused: state.paused,
      trackId: state.track_window.current_track.id || "",
      name: state.track_window.current_track.name || "",
      artists: state.track_window.current_track.artists.map((artist) => artist.name) || [],
      albumName: state.track_window.current_track.album.name || "",
      uiLink: state.track_window.current_track.uri || "",
      coverImageUrl: state.track_window.current_track.album.images[0].url || "",
      duration: state.duration / 1000,
      position: state.position / 1000,
      canSkipPrevious: !state.disallows?.skipping_prev,
      canSkipNext: !state.disallows?.skipping_next,
      previousTracks: state.track_window.previous_tracks.map((track) => ({
        id: track.id || "",
        name: track.name,
        artists: track.artists.map((artist) => artist.name),
        album: track.album.name,
        uiLink: track.uri,
      })),
      nextTracks: state.track_window.next_tracks.map((track) => ({
        id: track.id || "",
        name: track.name,
        artists: track.artists.map((artist) => artist.name),
        album: track.album.name,
        uiLink: track.uri,
      })),
    };
  }

  private attachListeners(readyCallback: (value: void | PromiseLike<void>) => void) {
    if (!this.player) return;

    this.player.addListener("ready", ({ device_id }) => {
      this.setDeviceId(device_id);
      console.log("Spotify ready with device ID", device_id);
      readyCallback();
    });

    this.player.addListener("not_ready", ({ device_id }) => {
      this.setDeviceId("");
      console.log("Spotify device ID has gone offline", device_id);
    });

    this.player.addListener("player_state_changed", (state) => {
      if (!state) {
        this.setConnected(false);
        console.log("lost connection to Spotify player");
      } else {
        this.setConnected(true);
      }

      const playerState = this.createPlayerState(state);
      this.listeners.forEach((l) => l.playerStateChanged(playerState));
    });
  }

  async callApi<T>(url: string, options: RequestInit = {}, expectResponse = true): Promise<T> {
    const accessToken = await this.loginFlow.getAccessToken();
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

  async search(
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
    const response = await this.callApi<SearchResult>(`https://api.spotify.com/v1/search?${queryParams.toString()}`);
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

  async addToFavorites(trackIds: string[]): Promise<void> {
    if (!trackIds || trackIds.length === 0) {
      throw new Error("no track(s) provided");
    }
    const queryParams = new URLSearchParams();
    queryParams.append("ids", trackIds.join(","));
    const options = { method: "PUT" };
    await this.callApi<void>(`https://api.spotify.com/v1/me/tracks?ids=${queryParams.toString()}`, options, false);
  }

  async removeFromFavorites(trackIds: string[]): Promise<void> {
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
    await this.callApi<void>(`https://api.spotify.com/v1/me/tracks`, options, false);
  }

  async isContainedInFavorites(trackIds: string[]): Promise<boolean[]> {
    const queryParams = new URLSearchParams();
    queryParams.append("ids", trackIds.join(","));
    return await this.callApi<boolean[]>(
      `https://api.spotify.com/v1/me/tracks/contains'?${queryParams.toString()}`,
      {},
      true,
    );
  }

  async validatePlayer(deviceId: string): Promise<boolean> {
    if (!this.deviceId || this.deviceId !== deviceId) return false;
    if (!(await this.isPlayerInDevices())) {
      await this.initializePlayer();
    }
    return this.player != null;
  }

  async performOnPlayer(deviceId: string, callback: () => Promise<void | undefined>): Promise<boolean> {
    if (await this.validatePlayer(deviceId)) {
      await callback();
      return true;
    }
    return false;
  }

  async play(deviceId: string, trackIds: string[], contextUri?: string): Promise<void> {
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
    await this.validatePlayer(deviceId);
    return this.callApi<void>(`https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`, options, false);
  }

  async playTopTracks(deviceId: string, artists: string[]): Promise<void> {
    const trackIds: string[] = [];
    for (const artist of artists) {
      const result = await this.search(artist, ["artist"], 1);
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
      const response = await this.callApi<{ tracks: { id: string }[] }>(url);
      trackIds.push(...response.tracks.map((track) => track.id));
    }
    randomizeArray(trackIds);
    return this.play(deviceId, trackIds);
  }

  async pausePlayback(deviceId: string): Promise<void> {
    const handled = await this.performOnPlayer(deviceId, async () => {
      return this.player?.pause();
    });
    if (handled) return;
    const options: RequestInit = { method: "PUT" };
    return this.callApi<void>(`https://api.spotify.com/v1/me/player/pause?device_id=${deviceId}`, options, false);
  }

  async resumePlayback(deviceId: string): Promise<void> {
    const handled = await this.performOnPlayer(deviceId, async () => {
      return this.player?.resume();
    });
    if (handled) return;
    const options: RequestInit = { method: "PUT" };
    return this.callApi<void>(`https://api.spotify.com/v1/me/player/resume?device_id=${deviceId}`, options, false);
  }

  async skipNext(deviceId: string): Promise<void> {
    const handled = await this.performOnPlayer(deviceId, async () => {
      return this.player?.nextTrack();
    });
    if (handled) return;
    const options = { method: "POST" };
    return this.callApi<void>(`https://api.spotify.com/v1/me/player/next?device_id=${deviceId}`, options, false);
  }

  async skipPrevious(deviceId: string): Promise<void> {
    const handled = await this.performOnPlayer(deviceId, async () => {
      return this.player?.previousTrack();
    });
    if (handled) return;
    const options = { method: "POST" };
    return this.callApi<void>(`https://api.spotify.com/v1/me/player/previous?device_id=${deviceId}`, options, false);
  }

  async seek(value: number): Promise<void> {
    return this.player?.seek(value);
  }

  async setVolume(volume: number) {
    if (this.player) {
      await this.player.setVolume(volume);
    }
  }

  async getVolume(): Promise<number> {
    if (this.player) {
      return this.player.getVolume();
    }
    return 0.5;
  }

  public disconnect() {
    if (this.player) {
      console.log("Disconnecting Spotify Player");
      this.player.disconnect();
    }
  }

  async getDevices(): Promise<SpotifyDevice[]> {
    type DevicesResponse = {
      devices: SpotifyDevice[];
    };

    const result = await this.callApi<DevicesResponse>(`https://api.spotify.com/v1/me/player/devices`);
    return result.devices;
  }

  async isPlayerInDevices(): Promise<boolean> {
    if (!this.player || !this.deviceId) return false;
    const devices = await this.getDevices();
    return devices.some((device) => device.id === this.deviceId);
  }
}

export const spotifyService = new SpotifyService();
