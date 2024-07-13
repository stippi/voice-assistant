import { GeoLocation } from "../model/location";
import { Personality } from "../contexts/SettingsContext";
import { Timer } from "../model/timer";
// @ts-expect-error - The import works, no idea why the IDE complains
import { ChatCompletionMessage } from "openai/resources";

function generateLocationSentence(location: GeoLocation | undefined) {
  if (!location) {
    return "- The current location is unknown.";
  }
  return `- The current location is ${location.city}, ${location.region}, ${location.country}. Latitude: ${location.latitude}, Longitude: ${location.longitude}.`;
}

function generateSpotifyPlaybackState(state: Spotify.PlaybackState | null) {
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

function generateTimersSection(timers: Timer[]) {
  return `${timers.length > 0 ? `You have ${timers.length} active timer${timers.length > 1 ? "s" : ""}:\n${timers.map((timer) => `- ID: ${timer.id}, title '${timer.title}' at ${timer.time}`).join("\n")}\n` : ""}`;
}

function restoreMemory() {
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

const personalities = {
  professional: "You are a professional, helpful assistant.",
  friendly: "You are a friendly, helpful assistant.",
  curious: "You are a curious, eager and helpful assistant.",
  peppy: "You are a peppy, enthusiastic assistant.",
  snarky: "You are a snarky, reluctant and sometimes witty assistant.",
  silly: "You are a silly, but well meaning, often flimsy assistant.",
  zen: "You are an endlessly patient, helpful and wise assistant.",
};

export default function generateSystemMessage(
  optimizeForVoiceOutput: boolean,
  personality: Personality,
  timers: Timer[],
  location: GeoLocation | undefined,
  playbackState: Spotify.PlaybackState | null,
): ChatCompletionMessage {
  const voiceOptimization = optimizeForVoiceOutput
    ? `Note, the user's last message was transcribed from their speech and may be incomplete or garbled.
If you think that is the case, just ask the user to clarify.
Your next reply (unless it is a tool invocation) will be processed by a text-to-speech engine. It is capable of processing any language, so reply in the user's language.
Do not abbreviate numbers or units of measure.
For example, write 'fifty one' instead of 51, or 'second' instead of '2.'.
Write 'degree Celsius' instead of '°C'.
Write 'kilometers per hour' instead of 'km/h'.
Write 'second of December' instead of '2nd of Dec.' or similar abbreviations.
Please no digits or abbreviations whatsoever.
Be very concise, otherwise it will take a long time to read your reply to the user.
Make your first sentence short, since speech output will be delayed until you complete at least one sentence. `
    : "";
  const currentTimeAndDate = new Date().toLocaleString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
  });
  const personalityString = personalities[personality];
  return {
    role: "system",
    content: `${personalityString} Always stay in character even when the user asks you to generate stories or other content. Be concise.\n
${voiceOptimization}\n
Remember to memorize information that seems like it could be relevant in the future, also when only mentioned in passing.\n
When describing the weather, only mention the most important information and use familiar units of measurement, rounded to the nearest integer.\n
When finding a track on Spotify, always start playing the first result instead of assuming it didn't match the query.\n
You have access to some realtime data as provided below:
- The current time and date is ${currentTimeAndDate}.
${generateLocationSentence(location)}\n
${generateSpotifyPlaybackState(playbackState)}\n
${generateTimersSection(timers)}\n
${restoreMemory()}`,
  };
}
