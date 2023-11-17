import React from 'react';
import './App.css';
import {Conversation} from "./components/Conversation";
import {Message} from "./model/message";
import {MessageBar} from "./components/MessageBar.tsx";
import OpenAI from "openai";
import {OpenAiConfig} from "./secrets.ts";
import {
  ChatCompletionChunk,
  ChatCompletionMessage
} from "openai/resources";
import splitIntoSentences from "./utils/splitSentences.ts";
import {LocationInfo} from "./model/location";
import getLocation from "./utils/getLocation.ts";
import {tools, callFunction} from "./utils/tools.ts";

const openai = new OpenAI(OpenAiConfig);

const initialMessages: Message[] = []
const location: LocationInfo = {};
const model = "gpt-4-1106-preview";
const voice = "onyx";

function generateLocationSentence() {
  getLocation(location);
  if (!location.location) {
    return "- The current location is Großbeeren, Brandenburg, Germany. Latitude: 52.3667, Longitude: 13.3333.";
  }
  return `- The current location is ${location.location.city}, ${location.location.region}, ${location.location.country}. Latitude: ${location.location.latitude}, Longitude: ${location.location.longitude}.`;
}

function generateSystemMessage() {
  const currentTimeAndDate = new Date().toLocaleString('en-US');
  return {
    role: "system",
    content: `You are a reluctant, grumpy assistant.\n
The user may optionally activate you by voice, which will trigger a recording and subsequent transcription of their speech.
Understand that this may result in garbled or incomplete messages. If this happens, you may ask the user to repeat themselves.\n
When describing the weather, only mention the most important information and use familiar units of measurement, rounded to the nearest integer.\n
You have access to some realtime data as provided below:\n
- The current time and date is ${currentTimeAndDate}.
${generateLocationSentence()}`
  };
}

function messageReducer(previous: ChatCompletionMessage, item: ChatCompletionChunk): ChatCompletionMessage {
  const reduce = (acc: any, delta: any) => {
    acc = { ...acc };
    for (const [key, value] of Object.entries(delta)) {
      if (acc[key] === undefined || acc[key] === null) {
        acc[key] = value;
      } else if (typeof acc[key] === 'string' && typeof value === 'string') {
        (acc[key] as string) += value;
      } else if (typeof acc[key] === 'number' && typeof value === 'number') {
        (acc[key] as number) = value;
      } else if (Array.isArray(acc[key]) && Array.isArray(value)) {
        const accArray = acc[key] as any[];
        if (accArray.length !== value.length) {
          throw new Error(`Array length mismatch for key ${key}: ${accArray.length} !== ${value.length}`);
        }
        for (let i = 0; i < value.length; i++) {
          accArray[i] = reduce(accArray[i], value[i]);
        }
      } else if (typeof acc[key] === 'object' && typeof value === 'object') {
        acc[key] = reduce(acc[key], value);
      }
    }
    return acc;
  };
  
  return reduce(previous, item.choices[0]!.delta) as ChatCompletionMessage;
}

async function streamChatCompletion(currentMessages, setMessages, stream, audible) {
  let audioEndedPromise = null;
  
  const playSentence = async (sentence) => {
    const response = await openai.audio.speech.create({
      model: "tts-1",
      voice: voice,
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
  
  let newMessage = {} as ChatCompletionMessage;
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
    newMessage = messageReducer(newMessage, chunk);
    if (newMessage.tool_calls) {
      console.log("received chunk", chunk);
    }
    const newContent = chunk.choices[0]?.delta?.content || '';
    content += newContent;
    if (content !== "") {
      setMessages([...currentMessages, {role: "assistant", content}]);
    }
    
    playNextSentences(false);
  }
  playNextSentences(true);
  
  // If there are no tool calls, we're done and can exit this loop
  currentMessages.push(newMessage);
  if (!newMessage.tool_calls) {
    return;
  }
  
  console.log('detected function call', newMessage.tool_calls);
  // For each tool call, we generate a new message with the role 'tool'.
  for (const toolCall of newMessage.tool_calls) {
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

async function streamChatCompletionLoop(currentMessages, setMessages, audible) {
  let tries = 0
  while (tries < 4) {
    const stream = await openai.chat.completions.create({
      messages: [generateSystemMessage(), ...currentMessages] as ChatCompletionMessage[],
      model: model,
      stream: true,
      tools: tools,
    })
    await streamChatCompletion(currentMessages, setMessages, stream, audible);
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
  
  const sendMessage = React.useCallback((message: string, audible: boolean) => {
    if (responding.current) {
      console.log("Already responding to a message, ignoring");
      return;
    }
    responding.current = true;
    setMessages(currentMessages => {
      const newMessages: Message[] = [...currentMessages, {role: "user", content: message}];
      
      streamChatCompletionLoop(newMessages, setMessages, audible)
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
  }, [setMessages, responding]);
  
  return (
    <div className="conversation">
      <Conversation chat={messages}/>
      <MessageBar sendMessage={sendMessage}/>
    </div>
  );
};

export default App;