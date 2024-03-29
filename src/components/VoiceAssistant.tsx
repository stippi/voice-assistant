import React, {useEffect} from 'react';
import {Conversation} from "./Conversation";
import {Message} from "../model/message";
import {MessageBar} from "./MessageBar";
import OpenAI from "openai";
import {
  completionsApiUrl,
  completionsApiKey,
  modelName,
  useTools,
  useStreaming,
  speechApiUrl,
  speechApiKey,
} from "../config";
import {splitIntoSentencesAst} from "../utils/textUtils";
import {removeCodeBlocks} from "../utils/removeCodeBlocks";
import generateSystemMessage from "../utils/generateSystemMessage";
import {getTools, callFunction} from "../integrations/tools";
import {Settings as SettingsType} from "../contexts/SettingsContext";
import useChats from "../hooks/useChats";
import useSettings from "../hooks/useSettings";
import {ChatCompletionStream} from "openai/lib/ChatCompletionStream";
import useWindowFocus from "../hooks/useWindowFocus.tsx";
import useAppContext from "../hooks/useAppContext.tsx";
import {AppContextType} from "../contexts/AppContext.tsx";
import useSpotifyContext from "../hooks/useSpotifyContext.tsx";
import ChatCompletion = OpenAI.ChatCompletion;
import ChatCompletionMessage = OpenAI.ChatCompletionMessage;

const openAi = new OpenAI({
  apiKey: completionsApiKey,
  baseURL: completionsApiUrl,
  dangerouslyAllowBrowser: true,
});
const openAiSpeech = new OpenAI({
  apiKey: speechApiKey,
  dangerouslyAllowBrowser: true,
  baseURL: speechApiUrl,
});

async function streamChatCompletion(
  currentMessages: Message[],
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>,
  stream: ChatCompletionStream | undefined,
  completionResponse: ChatCompletion | undefined,
  audible: boolean,
  appContextRef: React.MutableRefObject<AppContextType>,
  settingsRef: React.MutableRefObject<SettingsType>,
  responseLevelRef: React.MutableRefObject<number>,
  responseCancelledRef: React.MutableRefObject<boolean>,
  cancelAudioRef: React.MutableRefObject<() => void>
) {
  let audioEndedPromise: Promise<unknown> | null = null;
  let currentAudio: HTMLAudioElement | null = null;
  let firstAudio = true;
  
  const playSentence = async (sentence: string) => {
    if (responseCancelledRef.current) {
      return;
    }
 
    responseLevelRef.current++;
    const response = await openAiSpeech.audio.speech.create({
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
    
    if (firstAudio) {
      firstAudio = false;
      document.dispatchEvent(new CustomEvent('reduce-volume'));
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
  if (stream) {
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
  } else {
    rawContent = completionResponse!.choices[0].message.content || '';
    content = removeCodeBlocks(rawContent);
    setMessages([...currentMessages, {role: "assistant", content: rawContent}]);
  }

  playNextSentences(true);
  
  const finalMessage: ChatCompletionMessage = stream ? await stream.finalMessage() : completionResponse!.choices[0].message;
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
    let playbackState: Spotify.PlaybackState | null = null;
    if (appContextRef.current.spotify) {
      playbackState = await appContextRef.current.spotify.player.getCurrentState();
    }
    const systemMessage = generateSystemMessage(
      audible, settingsRef.current.personality, appContextRef.current.timers, appContextRef.current.location, playbackState);
    const messages: ChatCompletionMessage[] = [systemMessage, ...currentMessages];
    const tools = useTools ? await getTools(settingsRef.current, appContextRef.current) : undefined;

    let response = undefined;
    let stream = undefined;
    if (useStreaming) {
      stream = openAi.beta.chat.completions.stream({
        messages,
        model: modelName,
        stream: true,
        tools,
      });
    } else {
      response = await openAi.chat.completions.create({
        messages,
        model: modelName,
        tools,
      });
    }
    await streamChatCompletion(
      currentMessages, setMessages, stream, response, audible, appContextRef, settingsRef, responseLevelRef, responseCancelledRef, cancelAudioRef);
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

export default function VoiceAssistant({idle}: Props) {
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
      appContextRef.current.setSpotify({
        player: spotifyContext.player,
        accessToken: spotifyContext.accessToken,
        deviceId: spotifyContext.deviceId,
        search: spotifyContext.search,
        play: spotifyContext.play,
        playTopTracks: spotifyContext.playTopTracks,
        pausePlayback: spotifyContext.pausePlayback,
      });
    } else {
      appContextRef.current.setSpotify(undefined);
    }
  }, [spotifyContext.player, spotifyContext.accessToken, spotifyContext.deviceId, spotifyContext.search, spotifyContext.play, spotifyContext.playTopTracks, spotifyContext.pausePlayback]);
  
  const sendMessage = React.useCallback((message: string, audible: boolean) => {
    console.log(`sendMessage("${message}", ${audible})`);
    if (respondingRef.current) {
      console.log("Already responding to a message, ignoring");
      return;
    }
    console.log("started responding");
    setResponding(true);
    respondingRef.current = true;
    responseLevelRef.current = 0;
    
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
          responseLevelRef.current = 0;
          respondingRef.current = false;
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
                document.dispatchEvent(new CustomEvent('restore-volume'));
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
      {!idle && <Conversation
        chat={messages}
        deleteMessage={deleteMessage}
      />}
      <MessageBar
        sendMessage={sendMessage}
        stopResponding={stopResponding}
        responding={responding}
        respondingRef={respondingRef}
        awaitSpokenResponse={awaitSpokenResponse}
        idle={idle}
      />
    </>
  );
}

interface Props {
  idle: boolean;
}