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

const playAudioBySentence = async (text) => {
  const sentences = text.split(/(?<=[.!?])\s/);
  let audioEndedPromise = null;
  
  for (let i = 0; i < sentences.length; i++) {
    const sentence = sentences[i];
    //console.log(`Sentence ${i}: ${sentence}`);
    
    const response = await openai.audio.speech.create({
      model: "tts-1",
      voice: "nova",
      input: sentence,
    });
    //console.log(`Sentence ${i}: got response`);
    
    const arrayBuffer = await response.arrayBuffer();
    //console.log(`Sentence ${i}: got array buffer`);
    const blob = new Blob([arrayBuffer], { type: 'audio/mpeg' });
    const url = URL.createObjectURL(blob);
    //console.log(`Sentence ${i} created blob URL ${url}`);
    
    if (audioEndedPromise) {
      await audioEndedPromise;
    }
    const audio = new Audio(url);
    
    audioEndedPromise = new Promise((resolve) => {
      audio.onended = () => {
        //console.log(`Sentence ${i} audio ended`)
        URL.revokeObjectURL(url);
        resolve();
      }
      //console.log(`Sentence ${i} starting audio`)
      audio.play().catch(error => {
        console.error('Failed to play audio', error);
      });
    });
  }
  
  if (audioEndedPromise) {
    await audioEndedPromise;
  }
};

const App = () => {
  const [messages, setMessages] = React.useState<Message[]>(initialMessages);
  
  const sendMessage = React.useCallback((message: string, audible: boolean) => {
    setMessages(currentMessages => {
      let newMessages: Message[] = [...currentMessages, {role: "user", content: message}, {role: "assistant", content: ""}];
      
      openai.chat.completions.create({
        messages: newMessages as ChatCompletionAssistantMessageParam[],
        model: "gpt-4-1106-preview",
      }).then(completion => {
        newMessages = [...currentMessages, {role: "user", content: message}, completion.choices[0].message as Message];
        setMessages(newMessages);
        if (audible) {
          playAudioBySentence(completion.choices[0].message.content).catch(error => {
            console.error('Failed to generate audio', error);
          });
        }
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