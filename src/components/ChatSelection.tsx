import React from "react";
import './ChatSelection.css'
import useChats from "../hooks/useChats";

export function ChatSelection() {
  const { chats, setCurrentChat, currentChatID, newChat } = useChats();
  const [expanded, setExpanded] = React.useState(true);
  
  React.useEffect(() => {
    const root = document.documentElement;
    if (expanded) {
      root.style.setProperty('--chat-selection-width', '12vw');
    } else {
      root.style.setProperty('--chat-selection-width', '0.5rem');
    }
  }, [expanded]);
  
  const sortedChats = chats.sort((a, b) => {
    return b.lastUpdated - a.lastUpdated;
  });
  
  return (
    <div className="chat-selection">
      <div
        className="chat-selection-toggle"
        onClick={() => setExpanded(!expanded)}
      />
      
      {expanded && (
        <div
          className="chat-item"
          onClick={() => newChat([])}
        >
          New chat
        </div>
      )}
      
      {expanded && sortedChats.map((chat) => (
        <div
          key={chat.id}
          className={`chat-item${chat.id === currentChatID ? ' active-chat-item' : ''}`}
          onClick={() => setCurrentChat(chat.id)}
        >
          {new Date(chat.lastUpdated).toLocaleString()}
        </div>
      ))}
    </div>
  );
}
