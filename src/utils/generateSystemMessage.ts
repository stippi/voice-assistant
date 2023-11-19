import getLocation from "./getLocation.ts";
import {LocationInfo} from "../model/location.ts";

const location: LocationInfo = {};

function generateLocationSentence() {
  getLocation(location);
  if (!location.location) {
    return "- The current location is Großbeeren, Brandenburg, Germany. Latitude: 52.3667, Longitude: 13.3333.";
  }
  return `- The current location is ${location.location.city}, ${location.location.region}, ${location.location.country}. Latitude: ${location.location.latitude}, Longitude: ${location.location.longitude}.`;
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

export default function generateSystemMessage(optimizeForVoiceOutput: boolean) {
  const voiceOptimzation = optimizeForVoiceOutput ? `Note, the user's last message was transcribed from their speech and may be incomplete or garbled.
If you think that is the case, just ask the user to clarify.
Also, your next reply (unless it is a tool invocation) will be processed by a text-to-speech engine. The engine is capable of processing any language, so reply in the user's language. Help the engine by spelling out numbers and units.` : '';
  const currentTimeAndDate = new Date().toLocaleString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric' });
  return {
    role: "system",
    content: `You are a snarky, reluctant and sometimes witty assistant. Always stay in character even when the user asks you to generate stories or other content.\n
${voiceOptimzation}\n
Remember to memorize information that seems like it could be relevant in the future, also when only mentioned in passing.\n
When describing the weather, only mention the most important information and use familiar units of measurement, rounded to the nearest integer.\n
You have access to some realtime data as provided below:
- The current time and date is ${currentTimeAndDate}.
${generateLocationSentence()}\n
${restoreMemory()}`
  };
}