import React, { useState } from "react";
import './ChatSelection.css'
import useChats from "../hooks/useChats";
import {List, ListItem, ListItemText, IconButton, Input, ListItemButton} from '@mui/material';
import DeleteIcon from "@mui/icons-material/Delete";
import DoneIcon from '@mui/icons-material/Done';
import EditIcon from '@mui/icons-material/Edit';
import {ChatInfo} from "../model/chat.ts";

const InlineEditListItem = ({ chat, onClick, onRename, onDelete, onMouseEnter, onMouseLeave, isSelected }: ItemProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [currentName, setCurrentName] = useState(chat.name);
  
  return (
    <ListItem
      disablePadding
      sx={{
        bgcolor: isSelected ? "action.selected" : "inherit",
      }}
      secondaryAction={
        isEditing ? (
          <IconButton edge="end" aria-label="done" size="small" onClick={() => { onRename(currentName); setIsEditing(false); }}>
            <DoneIcon fontSize="inherit" sx={{color: "#888"}}/>
          </IconButton>
        ) : isSelected ? (
          <>
            <IconButton edge="end" aria-label="rename" size="small" onClick={() => setIsEditing(true)}>
              <EditIcon fontSize="inherit" sx={{color: "#888"}}/>
            </IconButton>
            <IconButton edge="end" aria-label="delete" size="small" onClick={onDelete}>
              <DeleteIcon fontSize="inherit" sx={{color: "#888"}}/>
            </IconButton>
          </>
        ) : (<></>)
      }
    >
      {isEditing ? (
        <Input
          value={currentName}
          onChange={(e) => setCurrentName(e.target.value)}
          autoFocus
          fullWidth
          // Close the input box on Enter key down
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              onRename(currentName);
              setIsEditing(false);
            }
          }}
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
        // <div
        //   key={chat.id}
        //   className={`chat-item${chat.id === currentChatID ? ' active-chat-item' : ''}`}
        //   onMouseEnter={() => handleMouseEnter(chat.id)}
        //   onMouseLeave={handleMouseLeave}
        //   onClick={() => setCurrentChat(chat.id)}
        // >
        //   {chat.name || new Date(chat.lastUpdated).toLocaleString()}
        //   {chat.id === currentChatID && chat.id === hoveredChat && (
        //     <div className="chat-remove">
        //       <IconButton aria-label="rename" size="small" onClick={() => {}}>
        //         <EditIcon fontSize="inherit" sx={{color: "#888"}}/>
        //       </IconButton>
        //       <IconButton aria-label="delete" size="small" onClick={() => {deleteChat(chat.id)}}>
        //         <DeleteIcon fontSize="inherit" sx={{color: "#888"}}/>
        //       </IconButton>
        //     </div>
        //   )}
        // </div>
        <InlineEditListItem
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
