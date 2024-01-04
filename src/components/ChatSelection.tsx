import './ChatSelection.css'
import useChats from "../hooks/useChats";
import {IconButton} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";

export function ChatSelection() {
  const { chats, setCurrentChat, currentChatID, deleteChat} = useChats();
  
  const sortedChats = chats.sort((a, b) => {
    return b.lastUpdated - a.lastUpdated;
  });
  
  return (
    <div className="chat-selection">
      {sortedChats.map((chat) => (
        <div
          key={chat.id}
          className={`chat-item${chat.id === currentChatID ? ' active-chat-item' : ''}`}
          onClick={() => setCurrentChat(chat.id)}
        >
          {new Date(chat.lastUpdated).toLocaleString()}
          {chat.id === currentChatID && (<div className="chat-remove">
            <IconButton aria-label="delete" size="small" onClick={() => {deleteChat(chat.id)}}>
              <DeleteIcon fontSize="inherit" sx={{color: "#999"}}/>
            </IconButton>
          </div>)}
        </div>
      ))}
    </div>
  );
}
