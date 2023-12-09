import React from 'react';
import {Conversation} from "./Conversation";
import {Message} from "../model/message";
import {MessageBar} from "./MessageBar";
import {Timers} from "./Timers";
import OpenAI from "openai";
import {OpenAiConfig} from "../secrets";
import {splitIntoSentencesAst} from "../utils/splitSentences";
import generateSystemMessage from "../utils/generateSystemMessage";
import {tools, callFunction} from "../utils/tools";
import {Settings} from "./Settings";
import {Settings as SettingsType} from "../contexts/SettingsContext.tsx";
import useSettings from "../hooks/useSettings";
import {ChatCompletionStream} from "openai/lib/ChatCompletionStream";
// @ts-expect-error - missing types
import {ChatCompletionMessage} from "openai/resources";
import {getTimers} from "../utils/timers.ts";

const openai = new OpenAI(OpenAiConfig);

const model = "gpt-4-1106-preview";

async function streamChatCompletion(
  currentMessages: Message[],
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>,
  stream: ChatCompletionStream,
  audible: boolean,
  settingsRef: React.MutableRefObject<SettingsType>,
  responseLevelRef: React.MutableRefObject<number>
) {
  let audioEndedPromise: Promise<unknown> | null = null;
  
  const playSentence = async (sentence: string) => {
    responseLevelRef.current++;
    const response = await openai.audio.speech.create({
      model: "tts-1",
      voice: settingsRef.current.voice,
      speed: settingsRef.current.audioSpeed,
      input: sentence,
    });
    
    const arrayBuffer = await response.arrayBuffer();
    const blob = new Blob([arrayBuffer], { type: 'audio/mpeg' });
    const url = URL.createObjectURL(blob);
    
    if (audioEndedPromise) {
      await audioEndedPromise;
    }
    
    const audio = new Audio(url);
    audioEndedPromise = new Promise<void>((resolve) => {
      audio.onended = () => {
        URL.revokeObjectURL(url);
        responseLevelRef.current--;
        resolve();
      };
    });
    
    audio.play().catch(error => {
      responseLevelRef.current--;
      console.error('Failed to play audio', error);
    });
  };
  
  const sentenceQueue: string[] = [];
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
    const sentences = splitIntoSentencesAst(content.slice(lastPlayedOffset));
    const sentenceCount = includeLast ? sentences.length : sentences.length - 1;
      // -1, since the last sentence might be incomplete
    for (let i = 0; i < sentenceCount; i++) {
      const sentence = sentences[i];
      if (sentence.content.trim()) {
        console.log(`playing segment "${sentence.content}"`);
        sentenceQueue.push(sentence.content);
        lastPlayedOffset += sentence.offset + sentence.content.length;
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
    currentMessages.push(functionReply as Message);
  }
}

async function streamChatCompletionLoop(
  currentMessages: Message[],
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>,
  audible: boolean,
  settingsRef: React.MutableRefObject<SettingsType>,
  responseLevelRef: React.MutableRefObject<number>
) {
  // console.log(`streamChatCompletionLoop(last message: "${currentMessages[currentMessages.length-1].content}, responseLevel: ${responseLevelRef.current}")`);
  if (responseLevelRef.current > 0) {
    console.log("Already responding to a message, ignoring");
    return;
  }
  let tries = 0
  responseLevelRef.current++;
  while (tries < 4) {
    const systemMessage = generateSystemMessage(
      audible, settingsRef.current.personality, getTimers());
    const stream = openai.beta.chat.completions.stream({
      messages: [systemMessage, ...currentMessages] as ChatCompletionMessage[],
      model: model,
      stream: true,
      tools: tools,
    })
    await streamChatCompletion(
      currentMessages, setMessages, stream, audible, settingsRef, responseLevelRef);
    const lastMessage = currentMessages[currentMessages.length - 1];
    if (lastMessage.role === "assistant" && typeof lastMessage.content === "string") {
      break;
    }
    console.log("Restarting chat completion loop");
    tries++;
  }
  responseLevelRef.current--;
}

function appendMessage(messages: Message[], message: Message) {
  return [...messages.filter(message => message.content !== ""), message];
}

export default function VoiceAssistant() {
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [awaitSpokenResponse, setAwaitSpokenResponse] = React.useState(false);
  const respondingRef = React.useRef(false);
  const responseLevelRef = React.useRef(0);

  const {settings} = useSettings();
  const settingsRef = React.useRef(settings);
  React.useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);
  
  const sendMessage = React.useCallback((message: string, audible: boolean) => {
    console.log(`sendMessage("${message}", ${audible})`);
    if (respondingRef.current) {
      console.log("Already responding to a message, ignoring");
      return;
    }
    console.log("started responding");
    respondingRef.current = true;
    if (message === "") {
      console.log("inserted pending user message");
      setMessages(appendMessage(messages, {role: "user", content: ""}));
      respondingRef.current = false;
      return;
    }
    setMessages(currentMessages => {
      const newMessages: Message[] = appendMessage(currentMessages, {role: "user", content: message});
      
      streamChatCompletionLoop(newMessages, setMessages, audible, settingsRef, responseLevelRef)
        .then(() => {
          setMessages(newMessages)
        })
        .catch(error => {
          console.error('Failed to stream chat completion', error);
          setMessages(appendMessage(currentMessages, {role: "user", content: message}));
        })
        .finally(() => {
          console.log("response finished");
          if (audible) {
            // If "audible" is true, block here until all audio has finished playing,
            // before setting respondingRef.current to false.
            const checkAudioCompletion = () => {
              if (responseLevelRef.current === 0) {
                console.log("audio finished");
                respondingRef.current = false;
                setAwaitSpokenResponse(true);
                setTimeout(() => setAwaitSpokenResponse(false), 1000);
              } else {
                setTimeout(checkAudioCompletion, 500);
              }
            };
            checkAudioCompletion();
          } else {
            respondingRef.current = false;
          }
        });
      
      // Return the intermediate state to update conversation UI
      return [...newMessages, {role: "assistant", content: ""}];
    });
  }, [setMessages, setAwaitSpokenResponse]);
  
  return (
    <>
      <Conversation chat={messages}/>
      <MessageBar sendMessage={sendMessage} respondingRef={respondingRef} awaitSpokenResponse={awaitSpokenResponse}/>
      <Settings/>
      <Timers/>
    </>
  );
}
