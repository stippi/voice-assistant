import React from "react";
import "./Conversation.css";

import { MessageCard } from "./MessageCard";
import { Message } from "@shared/types";
import OpenAI from "openai";
import ChatCompletionMessageToolCall = OpenAI.ChatCompletionMessageToolCall;
import { showToolCallInChat } from "../../integrations/tools";

function showInline(toolCalls: ChatCompletionMessageToolCall[] | undefined): boolean {
  if (!Array.isArray(toolCalls)) {
    return false;
  }
  return toolCalls.some(showToolCallInChat);
}

interface ConversationProps {
  chat: Message[] | undefined;
  deleteMessage: (message: Message) => void;
}

export const Conversation = React.memo(({ chat, deleteMessage }: ConversationProps) => {
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
  const filteredChat =
    chat &&
    chat.filter(
      (message) => visibleRoles.includes(message.role) && (message.content !== null || showInline(message.tool_calls)),
    );

  return (
    <div className="messages">
      {filteredChat &&
        filteredChat.map((message, index) => (
          <MessageCard
            key={index}
            className="message"
            message={message}
            deleteMessage={() => deleteMessage(message)}
            regenerateMessage={index === filteredChat.length - 1 && message.role === "assistant" ? () => {} : undefined}
            ref={index === filteredChat.length - 1 ? messagesEndRef : undefined}
          />
        ))}
    </div>
  );
});
