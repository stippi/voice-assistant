import React, { useState } from "react";
import './ChatSelection.css'
import useChats from "../hooks/useChats";
import {List, ListItem, ListItemText, IconButton, Input, ListItemButton} from '@mui/material';
import DeleteIcon from "@mui/icons-material/Delete";
import DoneIcon from '@mui/icons-material/Done';
import EditIcon from '@mui/icons-material/Edit';
import {ChatInfo} from "../model/chat.ts";

const ChatInfoListItem = ({ chat, onClick, onRename, onDelete, onMouseEnter, onMouseLeave, isSelected }: ItemProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [currentName, setCurrentName] = useState(chat.name);
  
  const doneRenaming = () => {
    onRename(currentName);
    setIsEditing(false);
  };
  
  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      doneRenaming();
    }
  }
  
  return (
    <ListItem
      disablePadding
      sx={{
        bgcolor: isSelected ? "action.selected" : "inherit",
      }}
      secondaryAction={
        isEditing ? (
          <IconButton edge="end" aria-label="done" size="small" onClick={doneRenaming}>
            <DoneIcon fontSize="inherit" sx={{color: "#666"}}/>
          </IconButton>
        ) : isSelected ? (
          <div className="chat-buttons">
            <IconButton edge="end" aria-label="rename" size="small" onClick={() => setIsEditing(true)}>
              <EditIcon fontSize="inherit" sx={{color: "#666"}}/>
            </IconButton>
            <IconButton edge="end" aria-label="delete" size="small" onClick={onDelete}>
              <DeleteIcon fontSize="inherit" sx={{color: "#666"}}/>
            </IconButton>
          </div>
        ) : (<></>)
      }
    >
      {isEditing ? (
        <Input
          value={currentName}
          onChange={(e) => setCurrentName(e.target.value)}
          autoFocus
          fullWidth
          onKeyDown={onKeyDown}
        />
      ) : (
        <ListItemButton
          selected={isSelected}
          onMouseEnter={onMouseEnter}
          onMouseLeave={onMouseLeave}
          onClick={onClick}
        >
          <ListItemText
            id={chat.id}
            primary={chat.name || new Date(chat.lastUpdated).toLocaleString()}
            sx={{
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          />
        </ListItemButton>
      )}
    </ListItem>
  );
};

interface ItemProps {
  chat: ChatInfo;
  onClick: () => void;
  onRename: (newName: string) => void;
  onDelete: () => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  isHovered: boolean;
  isSelected: boolean;
}

export function ChatSelection() {
  const { chats, setCurrentChat, currentChatID, renameChat, deleteChat} = useChats();
  const [ hoveredChat, setHoveredChat ] = React.useState("");
  
  const handleMouseEnter = (chatID: string) => {
    setHoveredChat(chatID);
  };
  
  const handleMouseLeave = () => {
    setHoveredChat("");
  };
  
  const sortedChats = chats.sort((a, b) => {
    return b.lastUpdated - a.lastUpdated;
  });
  
  return (
    <List className="chat-selection" dense>
      {sortedChats.map((chat) => (
        <ChatInfoListItem
          key={chat.id}
          chat={chat}
          onClick={() => setCurrentChat(chat.id)}
          onRename={(newName: string) => renameChat(chat.id, newName)}
          onDelete={() => deleteChat(chat.id)}
          onMouseEnter={() => handleMouseEnter(chat.id)}
          onMouseLeave={handleMouseLeave}
          isHovered={chat.id === hoveredChat}
          isSelected={chat.id === currentChatID}
        />
      ))}
    </List>
  );
}
