import {MessageCard} from "./MessageCard";
import {Message} from "../model/message";
import React from "react";

export function Conversation({chat}: Props) {
  return <div>
    {chat && chat.map((message, index) => (
      <div
        className=""
        key={index}
      >
        <MessageCard
          role={message.role === "user" ? "user" : "assistant"}
          content={message.content}
        />
      </div>
    ))}
  </div>
}

interface Props {
  chat: Message[] | undefined
}
