import './ChatSelection.css'
import useChats from "../hooks/useChats";

export function ChatSelection() {
  const { chats, setCurrentChat, currentChatID} = useChats();
  
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
        </div>
      ))}
    </div>
  );
}
