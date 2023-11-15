import React from 'react';
import SpeechRecorder from "./components/SpeechRecorder";
import {Conversation} from "./components/Conversation";
import {Message} from "./model/message";
import {MessageBar} from "./components/MessageBar.tsx";
import OpenAI from "openai";
import OpenAIConfig from "./OpenAIConfig.ts";
import {ChatCompletionAssistantMessageParam} from "openai/resources";

const openai = new OpenAI(OpenAIConfig);

const initialMessages: Message[] = [
  {
    role: "user",
    content: "Hello"
  },
  {
    role: "assistant",
    content: "Hi there, how can I help you today?"
  }
]

const App = () => {
  const [messages, setMessages] = React.useState<Message[]>(initialMessages);
  
  const sendMessage = React.useCallback((message: string) => {
    setMessages(currentMessages => {
      let newMessages: Message[] = [...currentMessages, {role: "user", content: message}, {role: "assistant", content: ""}];
      
      openai.chat.completions.create({
        messages: newMessages as ChatCompletionAssistantMessageParam[],
        model: "gpt-4-1106-preview",
      }).then(completion => {
        newMessages = [...currentMessages, {role: "user", content: message}, completion.choices[0].message as Message];
        setMessages(newMessages);
      }).catch(error => {
        console.error('Failed to send request to Completions API', error);
      });
      
      // Return the intermediate state to update messages
      return newMessages;
    });
  }, [setMessages]);
  
  return (
    <div>
      <Conversation chat={messages}/>
      <MessageBar sendMessage={sendMessage}/>
      <SpeechRecorder sendMessage={sendMessage}/>
    </div>
  );
};

export default App;