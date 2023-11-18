import React from 'react';
import './App.css';
import {Conversation} from "./components/Conversation";
import {Message} from "./model/message";
import {MessageBar} from "./components/MessageBar";
import OpenAI from "openai";
import {OpenAiConfig} from "./secrets";
import {ChatCompletionMessage} from "openai/resources";
import splitIntoSentences from "./utils/splitSentences";
import {LocationInfo} from "./model/location";
import getLocation from "./utils/getLocation";
import {tools, callFunction} from "./utils/tools";
import {Settings} from "./components/Settings";

const openai = new OpenAI(OpenAiConfig);

const initialMessages: Message[] = []
const location: LocationInfo = {};
const model = "gpt-4-1106-preview";
type Voice = "alloy" | "echo" | "fable" | "onyx" | "nova" | "shimmer";
const audioSpeed = 1.05;

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

function generateSystemMessage(optimizeForVoiceOutput: boolean) {
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

async function streamChatCompletion(currentMessages, setMessages, stream, audible, voice) {
  let audioEndedPromise = null;
  
  const playSentence = async (sentence) => {
    const response = await openai.audio.speech.create({
      model: "tts-1",
      voice: voice,
      speed: audioSpeed,
      input: sentence,
    });
    
    const arrayBuffer = await response.arrayBuffer();
    const blob = new Blob([arrayBuffer], { type: 'audio/mpeg' });
    const url = URL.createObjectURL(blob);
    
    if (audioEndedPromise) {
      await audioEndedPromise;
    }
    
    const audio = new Audio(url);
    audioEndedPromise = new Promise((resolve) => {
      audio.onended = () => {
        URL.revokeObjectURL(url);
        resolve();
      };
    });
    
    audio.play().catch(error => {
      console.error('Failed to play audio', error);
    });
  };
  
  const sentenceQueue = [];
  let isAudioPlaying = false;
  const playSentencesFromQueue = async () => {
    while (sentenceQueue.length > 0) {
      const sentence = sentenceQueue.shift();
      if (sentence) {
        await playSentence(sentence);
      }
    }
    isAudioPlaying = false;
  };
  
  let content = "";
  let lastPlayedOffset = 0;

  const playNextSentences = (includeLast: boolean) => {
    if (!audible || content === "") {
      return;
    }
    const sentences = splitIntoSentences(content.slice(lastPlayedOffset), ['.', '!', '?', '\n'], 30);
    const lastSentence = includeLast ? sentences.length : sentences.length - 1;
      // -1, since the last sentence might be incomplete
    for (let i = 0; i < lastSentence; i++) {
      const sentence = sentences[i];
      if (sentence.trim()) {
        //console.log(`playing segment "${sentence}"`);
        sentenceQueue.push(sentence);
        lastPlayedOffset += sentence.length;
        if (!isAudioPlaying) {
          isAudioPlaying = true;
          playSentencesFromQueue().catch(error => {
            console.error('Failed to play sentences', error);
          });
        }
      }
    }
  }
  
  for await (const chunk of stream) {
    const newContent = chunk.choices[0]?.delta?.content || '';
    content += newContent;
    if (content !== "") {
      setMessages([...currentMessages, {role: "assistant", content}]);
    }
    
    playNextSentences(false);
  }
  playNextSentences(true);
  
  const finalMessage = await stream.finalMessage()
  currentMessages.push(finalMessage);

  // If there are no tool calls, we're done and can exit this loop
  if (!finalMessage.tool_calls) {
    return;
  }
  
  console.log('detected function call', finalMessage.tool_calls);
  // For each tool call, we generate a new message with the role 'tool'.
  for (const toolCall of finalMessage.tool_calls) {
    if (toolCall.type !== "function") {
      continue;
    }
    const result = await callFunction(toolCall.function);
    const functionReply = {
      role: "tool",
      name: toolCall.function.name,
      tool_call_id: toolCall.id,
      content: JSON.stringify(result),
    };
    currentMessages.push(functionReply);
  }
}

async function streamChatCompletionLoop(currentMessages, setMessages, audible, voice) {
  let tries = 0
  while (tries < 4) {
    const stream = await openai.beta.chat.completions.stream({
      messages: [generateSystemMessage(audible), ...currentMessages] as ChatCompletionMessage[],
      model: model,
      stream: true,
      tools: tools,
    })
    await streamChatCompletion(currentMessages, setMessages, stream, audible, voice);
    const lastMessage = currentMessages[currentMessages.length - 1];
    if (lastMessage.role === "assistant" && typeof lastMessage.content === "string") {
      break;
    }
    console.log("Restarting chat completion loop");
    tries++;
  }
}

const App = () => {
  const [messages, setMessages] = React.useState<Message[]>(initialMessages);
  const responding = React.useRef(false);
  const voice = React.useRef<Voice>("onyx");
  const [openMic, setOpenMic] = React.useState(true);
  
  const sendMessage = React.useCallback((message: string, audible: boolean) => {
    if (responding.current) {
      console.log("Already responding to a message, ignoring");
      return;
    }
    responding.current = true;
    setMessages(currentMessages => {
      const newMessages: Message[] = [...currentMessages, {role: "user", content: message}];
      
      streamChatCompletionLoop(newMessages, setMessages, audible, voice.current)
        .then(() => {
          setMessages(newMessages)
        })
        .catch(error => {
          console.error('Failed to stream chat completion', error);
          setMessages([...currentMessages, {role: "user", content: message}])
        })
        .finally(() => {
          responding.current = false;
        });
      
      // Return the intermediate state to update conversation UI
      return [...newMessages, {role: "assistant", content: ""}];
    });
  }, [setMessages]);
  
  return (
    <div className="conversation">
      <Conversation chat={messages}/>
      <MessageBar sendMessage={sendMessage} openMic={openMic}/>
      <Settings voiceRef={voice} openMic={openMic} setOpenMic={setOpenMic}/>
    </div>
  );
};

export default App;