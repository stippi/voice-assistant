import React from 'react';
import './App.css';
import {Conversation} from "./components/Conversation";
import {Message} from "./model/message";
import {MessageBar} from "./components/MessageBar.tsx";
import OpenAI from "openai";
import OpenAIConfig from "./OpenAIConfig.ts";
import {ChatCompletionAssistantMessageParam} from "openai/resources";

const openai = new OpenAI(OpenAIConfig);

const initialMessages: Message[] = [
  {
    role: "system",
    content: "You are a helpful assistant."
  }
]

const streamChatCompletion = async (message, currentMessages, setMessages, stream, audible) => {
  let audioEndedPromise = null;
  
  const playSentence = async (sentence) => {
    const response = await openai.audio.speech.create({
      model: "tts-1",
      voice: "nova",
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
  for await (const part of stream) {
    const newContent = part.choices[0]?.delta?.content || '';
    content += newContent;
    const newMessages = [...currentMessages, {role: "user", content: message}, {role: "assistant", content}];
    setMessages(newMessages);
    
    if (audible) {
      const sentences = content.slice(lastPlayedOffset).split(/(?<=[.!?])\s/);
      for (let i = 0; i < sentences.length - 1; i++) { // -1, since the last sentence might be incomplete
        const sentence = sentences[i];
        if (sentence.trim()) {
          sentenceQueue.push(sentence);
          lastPlayedOffset += sentence.length;
          if (!isAudioPlaying && sentenceQueue.length > 0) {
            isAudioPlaying = true;
            playSentencesFromQueue().catch(error => {
              console.error('Failed to play sentences', error);
            });
          }
        }
      }
    }
  }
}

const App = () => {
  const [messages, setMessages] = React.useState<Message[]>(initialMessages);
  
  const sendMessage = React.useCallback((message: string, audible: boolean) => {
    setMessages(currentMessages => {
      let newMessages: Message[] = [...currentMessages, {role: "user", content: message}, {role: "assistant", content: ""}];
      
      openai.chat.completions.create({
        messages: newMessages as ChatCompletionAssistantMessageParam[],
        model: "gpt-4-1106-preview",
        stream: true,
      }).then(async (stream) => {
        streamChatCompletion(message, currentMessages, setMessages, stream, audible).catch(error => {
          console.error('Failed to stream chat completion', error);
        });
      }).catch(error => {
        console.error('Failed to send request to Completions API', error);
      });
      
      // Return the intermediate state to update messages
      return newMessages;
    });
  }, [setMessages]);
  
  return (
    <div className="conversation">
      <Conversation chat={messages}/>
      <MessageBar sendMessage={sendMessage}/>
    </div>
  );
};

export default App;