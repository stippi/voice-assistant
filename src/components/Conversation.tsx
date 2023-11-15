import React from "react";
import './Conversation.css'

import {MessageCard} from "./MessageCard";
import {Message} from "../model/message";

export function Conversation({chat}: Props) {
  return <div className="messages">
    {chat && chat.map((message, index) => (
      <MessageCard
        key={index}
        className="message"
        role={message.role === "user" ? "user" : "assistant"}
        content={message.content}
      />
    ))}
  </div>
}

interface Props {
  chat: Message[] | undefined
}
