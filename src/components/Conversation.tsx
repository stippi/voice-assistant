import React from "react";
import './Conversation.css'

import {MessageCard} from "./MessageCard";
import {Message} from "../model/message";

export function Conversation({chat}: Props) {
  const visibleRoles = ["user", "assistant"];
  return <div className="messages">
    {chat && chat.filter(message => visibleRoles.includes(message.role) && message.content !== null)
      .map((message, index) => (
        <MessageCard
          key={index}
          className="message"
          role={message.role === "user" ? "user" : "assistant"}
          content={message.content || ""}
        />
      ))
    }
  </div>
}

interface Props {
  chat: Message[] | undefined
}
