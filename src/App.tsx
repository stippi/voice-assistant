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
  
  const sendMessage = React.useCallback(async (message: string) => {
    let newMessages: Message[] = [...messages, {role: "user", content: message}];
    setMessages(newMessages);
    
    const completion = await openai.chat.completions.create({
      messages: newMessages as ChatCompletionAssistantMessageParam[],
      model: "gpt-4-1106-preview",
    });
    
    newMessages = [...newMessages, completion.choices[0].message as Message];
    setMessages(newMessages);
  }, []);
  
  return (
    <div>
      <Conversation chat={messages}/>
      <MessageBar sendMessage={sendMessage}/>
      <SpeechRecorder sendMessage={sendMessage}/>
    </div>
  );
};

export default App;