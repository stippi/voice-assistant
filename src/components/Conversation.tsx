import React from "react";
import './Conversation.css'

import {MessageCard} from "./MessageCard";
import {Message} from "../model/message";

export function Conversation({chat}: Props) {
  const messagesEndRef = React.useRef<HTMLDivElement | null>(null);
  
  React.useEffect(() => {
    requestAnimationFrame(() => {
      if (messagesEndRef.current) {
          messagesEndRef.current!.scrollIntoView({ behavior: "smooth" });
      }
    });
  }, [chat]);
  const visibleRoles = ["user", "assistant"];
  const filteredChat = chat && chat.filter(message => visibleRoles.includes(message.role) && message.content !== null);
  
  return <div className="messages">
    {filteredChat && filteredChat
      .map((message, index) => (
        <MessageCard
          key={index}
          className="message"
          role={message.role === "user" ? "user" : "assistant"}
          content={message.content || ""}
          ref={index === filteredChat.length - 1 ? messagesEndRef : undefined}
        />
      ))
    }
  </div>
}

interface Props {
  chat: Message[] | undefined
}
