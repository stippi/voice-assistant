import getLocation from "./getLocation";
import {LocationInfo} from "../model/location";
import {Personality} from "../contexts/SettingsContext";
import {Timer} from "../model/timer";

const location: LocationInfo = {};

function generateLocationSentence() {
  getLocation(location);
  if (!location.location) {
    return "- The current location is Großbeeren, Brandenburg, Germany. Latitude: 52.3667, Longitude: 13.3333.";
  }
  return `- The current location is ${location.location.city}, ${location.location.region}, ${location.location.country}. Latitude: ${location.location.latitude}, Longitude: ${location.location.longitude}.`;
}

function generateTimersSection(timers: Timer[]) {
  return `${timers.length > 0 ? `You have ${timers.length} active timer${timers.length > 1 ? 's' : ''}:\n${timers.map(timer => `- ID: ${timer.id}, title '${timer.title}' at ${timer.time}`).join('\n')}\n` : ''}`;
}

function restoreMemory() {
  const memoryString = window.localStorage.getItem('memory');
  if (!memoryString) {
    return '';
  }
  let result = "Regard the information (your accumulated memory) in the following categories:"
  const memory = JSON.parse(memoryString);
  for (const category in memory) {
    result += `\n\n${category}:\n`;
    result += memory[category].map((item: string) => `- ${item}`).join('\n');
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
  zen: "You are an endlessly patient, helpful and wise assistant."
}

export default function generateSystemMessage(optimizeForVoiceOutput: boolean, personality: Personality, timers: Timer[]) {
  const voiceOptimization = optimizeForVoiceOutput ? `Note, the user's last message was transcribed from their speech and may be incomplete or garbled.
If you think that is the case, just ask the user to clarify.
Your next reply (unless it is a tool invocation) will be processed by a text-to-speech engine. It is capable of processing any language, so reply in the user's language.
Do not abbreviate numbers or units of measure.
For example, write 'fifty one' instead of 51, or 'second' instead of '2.'.
Write 'degree Celsius' instead of '°C'.
Write 'kilometers per hour' instead of 'km/h'.
Write 'second of December' instead of '2nd of Dec.' or similar abbreviations.
Please no digits or abbreviations whatsoever.
Be very concise, otherwise it will take a long time to read your reply to the user.` : '';
  const currentTimeAndDate = new Date().toLocaleString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric' });
  const personalityString = personalities[personality];
  return {
    role: "system",
    content: `${personalityString} Always stay in character even when the user asks you to generate stories or other content.\n
${voiceOptimization}\n
Remember to memorize information that seems like it could be relevant in the future, also when only mentioned in passing.\n
When describing the weather, only mention the most important information and use familiar units of measurement, rounded to the nearest integer.\n
You have access to some realtime data as provided below:
- The current time and date is ${currentTimeAndDate}.
${generateLocationSentence()}\n
${generateTimersSection(timers)}\n
${restoreMemory()}`
  };
}