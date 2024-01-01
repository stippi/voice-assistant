import React from "react";
import AddCircleIcon from '@mui/icons-material/AddCircle';
import './Sidebar.css'
import useChats from "../hooks/useChats";
import {ChatSelection} from "./ChatSelection.tsx";

export function Sidebar() {
  const { newChat } = useChats();
  const [expanded, setExpanded] = React.useState(true);
  
  React.useEffect(() => {
    const root = document.documentElement;
    if (expanded) {
      root.style.setProperty('--sidebar-width', '12vw');
    } else {
      root.style.setProperty('--sidebar-width', '0.5rem');
    }
  }, [expanded]);
  
  return (
    <div className="sidebar">
      <div
        className="sidebar-toggle"
        onClick={() => setExpanded(!expanded)}
      />
      
      {expanded && (
        <div
          className="chat-item"
          onClick={() => newChat([])}
        >
          <AddCircleIcon fontSize="small"/>
          New chat
        </div>
      )}
      
      {expanded && (
        <ChatSelection/>
      )}
      
      {expanded && (
        <div
          className="chat-item"
        >
        Footer
        </div>)}
    </div>
  );
}
