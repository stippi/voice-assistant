import React from "react";
import './ChatSelection.css'
import useChats from "../hooks/useChats";

export function ChatSelection() {
  const { chats, setCurrentChat, newChat } = useChats();
  const [expanded, setExpanded] = React.useState(true);
  
  React.useEffect(() => {
    const root = document.documentElement;
    if (expanded) {
      console.log("expanded");
      root.style.setProperty('--chat-selection-width', '12vw');
    } else {
      console.log("collapsed");
      root.style.setProperty('--chat-selection-width', '5vw');
    }
  }, [expanded]);
  
  const sortedChats = chats.sort((a, b) => {
    return b.lastUpdated - a.lastUpdated;
  });
  
  return (
    <div className="chat-selection">
      <div
        onClick={() => setExpanded(!expanded)}
      >
        X
      </div>
      
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
