import React, {useEffect} from 'react';
import {Conversation} from "./Conversation";
import {Message} from "../model/message";
import {MessageBar} from "./MessageBar";
import OpenAI from "openai";
import {OpenAiConfig} from "../secrets";
import {splitIntoSentencesAst} from "../utils/textUtils";
import {removeCodeBlocks} from "../utils/removeCodeBlocks";
import generateSystemMessage from "../utils/generateSystemMessage";
import {tools, callFunction} from "../utils/tools";
import {Settings as SettingsType} from "../contexts/SettingsContext";
import useChats from "../hooks/useChats";
import useSettings from "../hooks/useSettings";
import {ChatCompletionStream} from "openai/lib/ChatCompletionStream";
// @ts-expect-error - missing types
import {ChatCompletionMessage} from "openai/resources";
import useWindowFocus from "../hooks/useWindowFocus.tsx";
import useAppContext from "../hooks/useAppContext.tsx";
import {AppContextType} from "../contexts/AppContext.tsx";
import useSpotifyContext from "../hooks/useSpotifyContext.tsx";

const openai = new OpenAI(OpenAiConfig);

const model = "gpt-4-turbo-preview";

async function streamChatCompletion(
  currentMessages: Message[],
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>,
  stream: ChatCompletionStream,
  audible: boolean,
  appContextRef: React.MutableRefObject<AppContextType>,
  settingsRef: React.MutableRefObject<SettingsType>,
  responseLevelRef: React.MutableRefObject<number>,
  responseCancelledRef: React.MutableRefObject<boolean>,
  cancelAudioRef: React.MutableRefObject<() => void>
) {
  let audioEndedPromise: Promise<unknown> | null = null;
  let currentAudio: HTMLAudioElement | null = null;
  
  const playSentence = async (sentence: string) => {
    if (responseCancelledRef.current) {
      return;
    }
 
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
    
    const cleanup = () => {
      URL.revokeObjectURL(url);
      responseLevelRef.current--;
    }
    
    if (audioEndedPromise) {
      await audioEndedPromise;
      if (responseCancelledRef.current) {
        cleanup();
        return;
      }
    }
    
    const audio = new Audio(url);
    currentAudio = audio;
    audioEndedPromise = new Promise<void>((resolve) => {
      audio.onended = () => {
        cleanup();
        currentAudio = null;
        resolve();
      };
    });
    
    audio.play().catch(error => {
      responseLevelRef.current--;
      currentAudio = null;
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
  
  const fadeOutAudio = () => {
    if (currentAudio === null) {
      return;
    }
    let volume = 1.0;
    const fadeInterval = window.setInterval(() => {
      if (currentAudio && volume > 0.2) {
        volume -= 0.2;
        currentAudio.volume = volume;
      } else {
        clearInterval(fadeInterval);
        if (currentAudio) {
          currentAudio.pause();
          currentAudio.currentTime = 0;
          if (currentAudio.onended) {
            // @ts-expect-error - The onended event listener which we registered above, ignores the event.
            currentAudio.onended();
          }
        }
      }
    }, 100);
  };
  
  cancelAudioRef.current = () => {
    fadeOutAudio();
    cancelAudioRef.current = () => {};
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
  
  let rawContent = "";
  for await (const chunk of stream) {
    if (responseCancelledRef.current) {
      console.log("Response cancelled");
      fadeOutAudio();
      currentMessages.push({role: "assistant", content: rawContent});
      return;
    }
    const newContent = chunk.choices[0]?.delta?.content || '';
    rawContent += newContent;
    content = removeCodeBlocks(rawContent);
    if (rawContent !== "") {
      setMessages([...currentMessages, {role: "assistant", content: rawContent}]);
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
  
  // For each tool call, we generate a new message with the role 'tool' and the content of the JSON result of that function.
  for (const toolCall of finalMessage.tool_calls) {
    if (toolCall.type !== "function") {
      continue;
    }
    const result = await callFunction(toolCall.function, appContextRef.current);
    console.log("function result:", result);
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
  appContextRef: React.MutableRefObject<AppContextType>,
  settingsRef: React.MutableRefObject<SettingsType>,
  responseLevelRef: React.MutableRefObject<number>,
  responseCancelledRef: React.MutableRefObject<boolean>,
  cancelAudioRef: React.MutableRefObject<() => void>
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
      audible, settingsRef.current.personality, appContextRef.current.timers, appContextRef.current.location);
    const stream = openai.beta.chat.completions.stream({
      messages: [systemMessage, ...currentMessages] as ChatCompletionMessage[],
      model: model,
      stream: true,
      tools: tools,
    })
    await streamChatCompletion(
      currentMessages, setMessages, stream, audible, appContextRef, settingsRef, responseLevelRef, responseCancelledRef, cancelAudioRef);
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
  const newMessages = messages.filter(message => message.content !== "");
  if (messages.length > 0 && messages[messages.length - 1].content === "" && message.content === "") {
    return newMessages;
  }
  newMessages.push(message);
  return newMessages;
}

export default function VoiceAssistant() {
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [awaitSpokenResponse, setAwaitSpokenResponse] = React.useState(false);
  const [responding, setResponding] = React.useState(false);
  const respondingRef = React.useRef(false);
  const responseCancelledRef = React.useRef(false);
  const responseLevelRef = React.useRef(0);
  const cancelAudioRef = React.useRef<() => void>(() => {})

  const {currentChatID, currentChat, newChat, updateChat} = useChats();
  
  React.useEffect(() => {
    if (currentChat) {
      setMessages(currentChat.messages);
    }
  }, [currentChat]);
  
  const appContext = useAppContext();
  const {settings} = useSettings();
  const appContextRef = React.useRef(appContext);
  const settingsRef = React.useRef(settings);
  React.useEffect(() => {
    appContextRef.current = appContext;
    settingsRef.current = settings;
  }, [settings, appContext]);
  
  const spotifyContext = useSpotifyContext();
  React.useEffect(() => {
    if (spotifyContext.player && spotifyContext.accessToken && spotifyContext.deviceId) {
      appContext.setSpotify({
        player: spotifyContext.player,
        accessToken: spotifyContext.accessToken,
        deviceId: spotifyContext.deviceId,
        search: spotifyContext.search,
        playTracks: spotifyContext.playTracks,
        playTopTracks: spotifyContext.playTopTracks,
        pausePlayback: spotifyContext.pausePlayback,
      });
    } else {
      appContext.setSpotify(undefined);
    }
  }, [spotifyContext.player, spotifyContext.accessToken, spotifyContext.deviceId, spotifyContext.search, spotifyContext.playTracks, spotifyContext.playTopTracks, spotifyContext.pausePlayback, appContext]);
  
  const sendMessage = React.useCallback((message: string, audible: boolean) => {
    console.log(`sendMessage("${message}", ${audible})`);
    if (respondingRef.current) {
      console.log("Already responding to a message, ignoring");
      return;
    }
    console.log("started responding");
    setResponding(true);
    respondingRef.current = true;
    responseCancelledRef.current = false;
    if (message === "") {
      console.log("inserted pending user message");
      setMessages(currentMessages => appendMessage(currentMessages, {role: "user", content: ""}));
      setResponding(false);
      respondingRef.current = false;
      return;
    }
    setMessages(currentMessages => {
      const newMessages: Message[] = appendMessage(currentMessages, {role: "user", content: message});
      
      streamChatCompletionLoop(newMessages, setMessages, audible, appContextRef, settingsRef, responseLevelRef, responseCancelledRef, cancelAudioRef)
        .then(() => {
          setMessages(newMessages)
          if (currentChatID === "") {
            newChat(newMessages).then((chatID) => {
              console.log(`created new chat with ID: ${chatID}`);
            });
          } else {
            updateChat(newMessages);
          }
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
              if (responseCancelledRef.current) {
                cancelAudioRef.current();
              }
              if (responseLevelRef.current === 0) {
                console.log("audio finished");
                setResponding(false);
                respondingRef.current = false;
                cancelAudioRef.current = () => {};
                if (settingsRef.current.expectResponse) {
                  setAwaitSpokenResponse(true);
                  setTimeout(() => setAwaitSpokenResponse(false), 1000);
                }
              } else {
                setTimeout(checkAudioCompletion, 500);
              }
            };
            checkAudioCompletion();
          } else {
            setResponding(false);
            respondingRef.current = false;
            cancelAudioRef.current = () => {};
          }
        });
      
      // Return the intermediate state to update conversation UI
      return [...newMessages, {role: "assistant", content: ""}];
    });
  }, [currentChatID, newChat, updateChat]);
  
  const stopResponding = React.useCallback(() => {
    responseCancelledRef.current = true;
  }, []);
  
  const {windowFocused} = useWindowFocus();
  useEffect(() => {
    if (windowFocused) {
      document.body.classList.add('window-focused');
    } else {
      document.body.classList.remove('window-focused');
    }
  }, [windowFocused]);
  
  const deleteMessage = React.useCallback((message: Message) => {
    updateChat(messages.filter(m => m !== message));
  }, [messages, updateChat]);
  
  return (
    <>
      <Conversation
        chat={messages}
        deleteMessage={deleteMessage}
      />
      <MessageBar
        sendMessage={sendMessage}
        stopResponding={stopResponding}
        responding={responding}
        respondingRef={respondingRef}
        awaitSpokenResponse={awaitSpokenResponse}
      />
    </>
  );
}
