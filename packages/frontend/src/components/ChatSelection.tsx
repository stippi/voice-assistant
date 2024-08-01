import "./ChatSelection.css";
import useChats from "../hooks/useChats";
import { List } from "@mui/material";
import EditableListItem from "./common/EditableListItem";

export function ChatSelection() {
  const { chats, setCurrentChat, currentChatID, renameChat, deleteChat } = useChats();

  const sortedChats = chats.sort((a, b) => {
    return b.lastUpdated - a.lastUpdated;
  });

  return (
    <List className="chat-selection" dense>
      {sortedChats.map((chat) => (
        <EditableListItem
          key={chat.id}
          item={chat}
          fallbackName={new Date(chat.lastUpdated).toLocaleString()}
          onClick={() => setCurrentChat(chat.id)}
          onRename={(newName: string) => renameChat(chat.id, newName)}
          onDelete={() => deleteChat(chat.id)}
          isSelected={chat.id === currentChatID}
        />
      ))}
    </List>
  );
}
