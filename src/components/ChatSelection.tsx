//import React from "react";
import './ChatSelection.css'
import useChats from "../hooks/useChats";

export function ChatSelection() {
  const { chats, setCurrentChat, newChat } = useChats();
  
  const sortedChats = chats.sort((a, b) => {
    return b.lastUpdated - a.lastUpdated;
  });
  
  return (
    <div className="chat-selection">
      <div
        className="chat-item"
        onClick={() => newChat([])}
      >
        New chat
      </div>
      
      {sortedChats.map((chat) => (
        <div
          key={chat.id}
          className="chat-item"
          onClick={() => setCurrentChat(chat.id)}
        >
          {new Date(chat.lastUpdated).toLocaleString()}
        </div>
      ))}
    </div>
  );
}
