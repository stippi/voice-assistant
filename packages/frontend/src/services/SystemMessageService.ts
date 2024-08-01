import { GeoLocation, Timer } from "@shared/types";
import { Personality } from "../contexts/SettingsContext";

export interface SystemMessageService {
  generateSystemMessage(
    optimizeForVoiceOutput: boolean,
    personality: Personality,
    timers: Timer[],
    location: GeoLocation | undefined,
    playbackState: Spotify.PlaybackState | null,
  ): string;
}

class BaseSystemMessageService implements SystemMessageService {
  private generateLocationSentence(location: GeoLocation | undefined) {
    if (!location) {
      return "- The current location is unknown.";
    }
    return `- The current location is ${location.city}, ${location.region}, ${location.country}. Latitude: ${location.latitude}, Longitude: ${location.longitude}.`;
  }

  private generateSpotifyPlaybackState(state: Spotify.PlaybackState | null) {
    if (!state || state.paused) {
      return "- No music is currently playing.";
    }
    const track = state.track_window.current_track;
    return (
      `- The currently playing music is '${track.name}' (trackId: ${track.id}) by ` +
      `${track.artists.map((artist) => `${artist.name} (artistId: ${artist.uri.replace("spotify:artist:", "")})`).join(", ")}. ` +
      `The album is ${track.album.name} (albumId: ${track.album.uri.replace("spotify:album:", "")}).`
    );
  }

  private generateTimersSection(timers: Timer[]) {
    if (!timers) {
      return "";
    }
    return `You have ${timers.length} active timer${timers.length != 1 ? "s" : ""}:\n${timers.map((timer) => `- ID: ${timer.id}, title '${timer.title}' at ${timer.time}`).join("\n")}`;
  }

  private generateCurrentTimeAndDate() {
    const currentTimeAndDate = new Date().toLocaleString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      second: "numeric",
    });
    return `- The current time and date is ${currentTimeAndDate}.`;
  }

  private generateVoiceOptimization(optimizeForVoiceOutput: boolean) {
    if (!optimizeForVoiceOutput) {
      return "";
    }
    return `Note, the user's last message was transcribed from their speech and may be incomplete or garbled.
If you think that is the case, just ask the user to clarify.
Your next reply (unless it is a tool invocation) will be processed by a text-to-speech engine.
The engine is capable of processing any language, so reply in the same language that the user used.
Do not abbreviate numbers or units of measure.
For example, write 'fifty one' instead of 51, or 'Second' instead of '2.', also in numbered lists.
Write 'degree Celsius' instead of '°C'.
Write 'kilometers per hour' instead of 'km/h'.
Write 'second of December' instead of '2nd of Dec.' or a similar abbreviation.
Please no digits or abbreviations whatsoever.
Be very concise, otherwise it will take a long time to read your reply to the user.
IMPORTANT: Make your first sentence short, since speech output will be delayed until you complete at least one sentence.`;
  }

  private restoreMemory() {
    const memoryString = window.localStorage.getItem("memory");
    if (!memoryString) {
      return "";
    }
    let result = "Regard the information (your accumulated memory) in the following categories:";
    const memory = JSON.parse(memoryString);
    for (const category in memory) {
      result += `\n\n${category}:\n`;
      result += memory[category].map((item: string) => `- ${item}`).join("\n");
    }
    return result;
  }

  private personalities = {
    professional: "You are a professional, helpful assistant.",
    friendly: "You are a friendly, helpful assistant.",
    curious: "You are a curious, eager and helpful assistant.",
    peppy: "You are a peppy, enthusiastic assistant.",
    snarky: "You are a snarky, reluctant and sometimes witty assistant.",
    silly: "You are a silly, but well meaning, often flimsy assistant.",
    zen: "You are an endlessly patient and wise, but often cryptic assistant.",
  };

  generateSystemMessage(
    optimizeForVoiceOutput: boolean,
    personality: Personality,
    timers: Timer[],
    location: GeoLocation | undefined,
    playbackState: Spotify.PlaybackState | null,
  ): string {
    return `# Instructions

## Personality

${this.personalities[personality]}
Use the tone of this personality also when the user asks you to generate creative content.
Be concise, unless the user asks you to elaborate.

## General

${this.generateVoiceOptimization(optimizeForVoiceOutput)}
Remember to memorize information that seems like it could be relevant in the future, also when the user only mentions it briefly.
When describing the weather, only mention the most important information and use familiar units of measurement, rounded to the nearest integer.
When finding a track on Spotify, always start playing the first result instead of assuming it didn't match the query.

## Long-Term Memory

${this.restoreMemory()}

## Realtime Data

You have access to some realtime data as provided below:
${this.generateCurrentTimeAndDate()}
${this.generateLocationSentence(location)}

${this.generateSpotifyPlaybackState(playbackState)}

${this.generateTimersSection(timers)}`;
  }
}

export function createSystemMessageService(): SystemMessageService {
  return new BaseSystemMessageService();
}
