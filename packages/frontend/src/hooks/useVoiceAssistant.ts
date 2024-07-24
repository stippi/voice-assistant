import React, { useState, useRef, useCallback, useEffect } from "react";
import { ChatCompletionService, createChatCompletionService } from "../services/ChatCompletionService";
import { TextToSpeechService, createTextToSpeechService } from "../services/TextToSpeechService";
import { SystemMessageService, createSystemMessageService } from "../services/SystemMessageService";
import { LLMConfig, Message } from "@shared/types";
import useChats from "./useChats";
import useSettings from "./useSettings";
import useConfigs from "./useConfigs";
import useAppContext from "./useAppContext";
import { getTools, callFunction } from "../integrations/tools";
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
import { removeCodeBlocks } from "../utils/removeCodeBlocks";
import useSpotifyContext from "./useSpotifyContext";
import { createPerformanceTrackingService } from "../services/PerformanceTrackingService";

const fallbackConfig: LLMConfig = {
  id: "",
  name: "fallback",
  modelID: modelName,
  apiKey: completionsApiKey,
  apiEndPoint: completionsApiUrl,
  apiCompatibility: "OpenAI",
  useTools: useTools,
  useStreaming: useStreaming,
};

export function useVoiceAssistant() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [responding, setResponding] = useState(false);
  const [awaitSpokenResponse, setAwaitSpokenResponse] = useState(false);

  const { currentChatID, currentChat, updateChat, newChat } = useChats();
  const { llmConfigs, activeLLMConfig } = useConfigs();
  const [llmConfig, setLLMConfig] = useState<LLMConfig>(fallbackConfig);

  const appContext = useAppContext();
  const { settings } = useSettings();

  const appContextRef = React.useRef(appContext);
  const settingsRef = React.useRef(settings);
  React.useEffect(() => {
    appContextRef.current = appContext;
    settingsRef.current = settings;
  }, [settings, appContext]);

  // TODO: Remove this hack
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
  }, [
    spotifyContext.player,
    spotifyContext.accessToken,
    spotifyContext.deviceId,
    spotifyContext.search,
    spotifyContext.play,
    spotifyContext.playTopTracks,
    spotifyContext.pausePlayback,
  ]);
  // End hack

  const systemMessageServiceRef = useRef<SystemMessageService>(createSystemMessageService());
  const chatServiceRef = useRef<ChatCompletionService | null>(null);
  const textToSpeechServiceRef = useRef<TextToSpeechService | null>(null);
  const performanceTrackingServiceRef = useRef(createPerformanceTrackingService());
  const abortControllerRef = useRef<AbortController | null>(null);
  const isRespondingRef = useRef<boolean>(false);
  const assistantMessageIdRef = useRef(crypto.randomUUID());

  useEffect(() => {
    if (llmConfigs.length > 0) {
      setLLMConfig(llmConfigs.find((config) => config.id === activeLLMConfig) || fallbackConfig);
    } else {
      setLLMConfig(fallbackConfig);
    }
  }, [activeLLMConfig, llmConfigs]);

  useEffect(() => {
    chatServiceRef.current = createChatCompletionService(llmConfig);
    textToSpeechServiceRef.current = createTextToSpeechService({
      type: "OpenAI",
      apiKey: speechApiKey,
      baseURL: speechApiUrl,
      options: {
        voice: settings.voice,
        speed: settings.audioSpeed,
      },
    });

    if (textToSpeechServiceRef.current) {
      textToSpeechServiceRef.current.onPlaybackStart(async () => {
        await performanceTrackingServiceRef.current.trackTimestamp(
          assistantMessageIdRef.current,
          "spoken-response-started",
          new Date().getTime(),
        );
        document.dispatchEvent(new CustomEvent("reduce-volume"));
      });
      textToSpeechServiceRef.current.onPlaybackComplete(async () => {
        await performanceTrackingServiceRef.current.trackTimestamp(
          assistantMessageIdRef.current,
          "spoken-response-finished",
          new Date().getTime(),
        );
        document.dispatchEvent(new CustomEvent("restore-volume"));
        isRespondingRef.current = false;
        setResponding(false);
        abortControllerRef.current = null;
        if (settings.expectResponse) {
          setAwaitSpokenResponse(true);
          setTimeout(() => setAwaitSpokenResponse(false), 1000);
        }
      });
    }
  }, [llmConfig, settings.voice, settings.audioSpeed, settings.expectResponse]);

  useEffect(() => {
    if (currentChat) {
      setMessages(currentChat.messages);
    }
  }, [currentChat]);

  const sendMessage = useCallback(
    async (userMessageId: string, message: string, audible: boolean) => {
      if (isRespondingRef.current) {
        // Prevent any new user messages while already responding.
        return;
      }
      const appendMessage = (messages: Message[], message: Message) => {
        // Filter out any "empty" messages from the user or assistant which are used to indicate a pending state.
        // Note: This will keep tool_choices messages, because those have content === null.
        const newMessages = messages.filter((message) => message.content !== "");
        if (messages.length > 0 && messages[messages.length - 1].content === "" && message.content === "") {
          return newMessages;
        }
        newMessages.push(message);
        return newMessages;
      };

      const updateLastMessage = (messages: Message[], message: Message) => {
        const newMessages = messages.slice(0, -1);
        newMessages.push(message);
        return newMessages;
      };

      assistantMessageIdRef.current = crypto.randomUUID();

      const runCompletionsLoop = async (messages: Message[]): Promise<Message[]> => {
        if (!chatServiceRef.current || !abortControllerRef.current) {
          return messages;
        }

        const tools = llmConfig.useTools ? await getTools(settingsRef.current, appContextRef.current) : undefined;

        let tries = 0;
        while (tries < 4 && isRespondingRef.current) {
          tries++;

          // Generate system message
          const playbackState = appContextRef.current.spotify
            ? await appContextRef.current.spotify.player.getCurrentState()
            : null;
          const systemMessage = systemMessageServiceRef.current.generateSystemMessage(
            audible,
            settingsRef.current.personality,
            appContextRef.current.timers,
            appContextRef.current.location,
            playbackState,
          );

          const apiMessages: OpenAI.ChatCompletionMessageParam[] = messages.map((message) => {
            const messageCopy: Partial<Message> = { ...message };
            delete messageCopy.id;
            return messageCopy as OpenAI.ChatCompletionMessageParam;
          });

          let content = "";
          messages.push({
            id: assistantMessageIdRef.current,
            role: "assistant",
            content,
          });

          await performanceTrackingServiceRef.current.trackTimestamp(
            assistantMessageIdRef.current,
            "streaming-started",
            new Date().getTime(),
          );

          const finalAssistantMessage = await chatServiceRef.current.getStreamedMessage(
            systemMessage,
            {
              messages: apiMessages,
              model: llmConfig.modelID,
              tools,
            },
            abortControllerRef.current.signal,
            async (chunk: string) => {
              if (!isRespondingRef.current) {
                console.log("User canceled during streaming");
                return false;
              }
              if (content === "" && chunk !== "") {
                await performanceTrackingServiceRef.current.trackTimestamp(
                  assistantMessageIdRef.current,
                  "first-content-received",
                  new Date().getTime(),
                );
              }
              content += chunk;
              messages = updateLastMessage(messages, {
                id: assistantMessageIdRef.current,
                role: "assistant",
                content,
              });
              setMessages(messages);
              if (audible && textToSpeechServiceRef.current) {
                textToSpeechServiceRef.current.addText(removeCodeBlocks(chunk));
              }
              return true;
            },
          );

          await performanceTrackingServiceRef.current.trackTimestamp(
            assistantMessageIdRef.current,
            "streaming-finished",
            new Date().getTime(),
          );

          messages = updateLastMessage(messages, { ...finalAssistantMessage, id: assistantMessageIdRef.current });

          // Check for tool calls
          if (finalAssistantMessage.tool_calls) {
            await performanceTrackingServiceRef.current.trackTimestamp(
              assistantMessageIdRef.current,
              "tool-execution-started",
              new Date().getTime(),
            );
            for (const toolCall of finalAssistantMessage.tool_calls) {
              if (toolCall.type !== "function") continue;
              const result = await callFunction(toolCall.function, appContextRef.current);
              console.log("function result", result);
              const toolReply: Message = {
                id: crypto.randomUUID(),
                role: "tool",
                name: toolCall.function.name,
                tool_call_id: toolCall.id,
                content: JSON.stringify(result),
              };
              messages.push(toolReply);
            }
            await performanceTrackingServiceRef.current.trackTimestamp(
              assistantMessageIdRef.current,
              "tool-execution-finished",
              new Date().getTime(),
            );
            // Update the assistant message ID for the next loop iteration
            assistantMessageIdRef.current = crypto.randomUUID();
          } else {
            // If there are no tool calls, we're done and can exit this loop
            break;
          }
        }

        return messages;
      };

      const userMessage: Message = {
        id: userMessageId,
        role: "user",
        content: message,
      };
      if (message === "") {
        // sendMessage() was called with an empty user message.
        // This is used when a voice recording of the user completed, and we wait for the transcription service.
        // The chat then shows an empty user message with a progress-spinner.
        setMessages((currentMessages) => appendMessage(currentMessages, userMessage));
        return;
      }

      isRespondingRef.current = true;
      setResponding(true);

      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();

      setMessages((currentMessages) => {
        const newMessages: Message[] = appendMessage(currentMessages, userMessage);

        runCompletionsLoop(newMessages)
          .then((finalMessages) => {
            setMessages(finalMessages);
            if (currentChatID === "") {
              newChat(finalMessages).then((chatID) => {
                console.log(`created new chat with ID: ${chatID}`);
              });
            } else {
              updateChat(finalMessages);
            }
          })
          .catch((error) => {
            if (error.name === "AbortError") {
              console.log("User canceled");
            } else {
              console.error("Failed to stream chat completion", error);
              isRespondingRef.current = false;
              setResponding(false);
              abortControllerRef.current = null;
              setMessages(appendMessage(currentMessages, userMessage));
            }
          })
          .finally(() => {
            if (!audible) {
              isRespondingRef.current = false;
              setResponding(false);
              abortControllerRef.current = null;
            } else {
              if (textToSpeechServiceRef.current) {
                textToSpeechServiceRef.current.finalizePlayback();
              }
            }
          });
        // Add empty assistant message. This causes the chat to show an empty assistant message with a progress spinner.
        return [
          ...newMessages,
          {
            id: assistantMessageIdRef.current,
            role: "assistant",
            content: "",
          },
        ];
      });
    },
    [llmConfig, updateChat, newChat, currentChatID],
  );

  const stopResponding = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    if (textToSpeechServiceRef.current) {
      textToSpeechServiceRef.current.stopPlayback();
    } else {
      isRespondingRef.current = false;
      setResponding(false);
    }
  }, []);

  const deleteMessage = React.useCallback(
    (message: Message) => {
      updateChat(messages.filter((m) => m !== message));
    },
    [messages, updateChat],
  );

  return {
    messages,
    responding,
    awaitSpokenResponse,
    sendMessage,
    stopResponding,
    deleteMessage,
  };
}
