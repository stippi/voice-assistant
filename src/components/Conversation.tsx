import React from "react";
import './Conversation.css'

import {MessageCard} from "./MessageCard";
import {Message} from "../model/message";
import OpenAI from "openai";
import ChatCompletionMessageToolCall = OpenAI.ChatCompletionMessageToolCall;

function hasImage(toolCalls: ChatCompletionMessageToolCall[] | undefined): boolean {
  if (!Array.isArray(toolCalls)) {
    return false;
  }
  return toolCalls.some(toolCall => toolCall.function.name === "show_image");
}

export function Conversation({chat}: Props) {
  const messagesEndRef = React.useRef<HTMLDivElement | null>(null);
  const messageCountRef = React.useRef(0);
  React.useEffect(() => {
    if (chat && chat.length != messageCountRef.current) {
      messageCountRef.current = chat.length;
      requestAnimationFrame(() => {
        if (messagesEndRef.current) {
          messagesEndRef.current!.scrollIntoView({ behavior: "smooth" });
        }
      });
    }
  }, [chat]);
  const visibleRoles = ["user", "assistant"];
  const filteredChat = chat && chat
    .filter(message => visibleRoles.includes(message.role) &&
      (message.content !== null || hasImage(message.tool_calls)));
  
  return <div className="messages">
    {filteredChat && filteredChat
      .map((message, index) => (
        <MessageCard
          key={index}
          className="message"
          message={message}
          ref={index === filteredChat.length - 1 ? messagesEndRef : undefined}
        />
      ))
    }
  </div>
}

interface Props {
  chat: Message[] | undefined
}
