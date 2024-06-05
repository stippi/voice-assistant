import React, {useEffect, useState} from "react";
import './ChatSelection.css'
import useChats from "../hooks/useChats";
import {List, ListItem, ListItemText, IconButton, Input, ListItemButton} from '@mui/material';
import DeleteIcon from "@mui/icons-material/Delete";
import DoneIcon from '@mui/icons-material/Done';
import EditIcon from '@mui/icons-material/Edit';
import {ChatInfo} from "../model/chat.ts";

const ChatInfoListItem = ({ chat, onClick, onRename, onDelete, isSelected }: ItemProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [currentName, setCurrentName] = useState(chat.name);
  const [ hovered, setHovered ] = React.useState(false);
  const onMouseEnter = () => {
    setHovered(true);
  };
  const onMouseLeave = () => {
    setHovered(false);
  };
  
  useEffect(() => {
    if (!isSelected) {
      setIsEditing(false);
    }
  }, [isSelected]);
  
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
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      secondaryAction={
        isEditing ? (
          <IconButton edge="end" aria-label="done" size="small" onClick={doneRenaming}>
            <DoneIcon fontSize="inherit"/>
          </IconButton>
        ) : isSelected ? (
          <div
            style={{
              opacity: hovered ? 1 : 0,
              transition: 'opacity 0.2s ease-in-out',
              backgroundColor: 'inherit',
            }}
          >
            <IconButton edge="end" aria-label="rename" size="small" onClick={() => setIsEditing(true)}>
              <EditIcon fontSize="inherit"/>
            </IconButton>
            <IconButton
              edge="end" aria-label="delete" size="small" onClick={onDelete}
              style={{
                opacity: hovered ? 1 : 0,
                transition: 'opacity 0.2s ease-in-out'
              }}
            >
              <DeleteIcon fontSize="inherit"/>
            </IconButton>
          </div>
        ) : (
          <></>
        )
      }
    >
      {isEditing ? (
        <Input
          value={currentName}
          onChange={(e) => setCurrentName(e.target.value)}
          autoFocus
          fullWidth
          onKeyDown={onKeyDown}
          sx={{
            paddingLeft: "1rem",
            paddingRight: "1rem",
          }}
        />
      ) : (
        <ListItemButton
          disableRipple
          selected={isSelected}
          onClick={onClick}
        >
          <ListItemText
            id={chat.id}
            primary={chat.name || new Date(chat.lastUpdated).toLocaleString()}
            primaryTypographyProps={{
              fontSize: 14, fontWeight: 'medium',
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis"
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
  isSelected: boolean;
}

export function ChatSelection() {
  const { chats, setCurrentChat, currentChatID, renameChat, deleteChat} = useChats();
  
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
          isSelected={chat.id === currentChatID}
        />
      ))}
    </List>
  );
}
