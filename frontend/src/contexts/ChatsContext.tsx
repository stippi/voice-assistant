import React, {createContext, useState, useEffect, ReactNode} from 'react';
import {ChatInfo, Chat} from "../model/chat";
import {Message} from "../model/message.ts";
import useAuthenticationContext from "../hooks/useAuthenticationContext.tsx";
import {fetchWithJWT, fetchWithJWTParsed} from "../utils/fetch.ts";

type ChatsContextType = {
  loading: boolean;
  chats: ChatInfo[];
  currentChatID: string;
  currentChat: Chat | null
  setCurrentChatID: (chatID: string) => void;
  newChat: (messages: Message[]) => Promise<string>;
  updateChat: (messages: Message[]) => void;
  renameChat: (chatID: string, newName: string) => void;
  deleteChat: (chatID: string) => void;
};

export const ChatsContext = createContext<ChatsContextType>({
  loading: true,
  chats: [],
  currentChatID: "",
  currentChat: null,
  setCurrentChatID: () => {},
  newChat: async () => { return ""; },
  updateChat: () => {},
  renameChat: () => {},
  deleteChat: () => {},
});

export const ChatsProvider: React.FC<{children: ReactNode}>  = ({ children }) => {
  const [loading, setLoading] = useState(true);
  const [chats, setChats] = useState<ChatInfo[]>([]);
  const [currentChatID, setCurrentChatID] = useState<string>("");
  const [currentChat, setChat] = useState<Chat | null>(null);

  const {user} = useAuthenticationContext()


  function reloadChats() {
    setLoading(true);
    fetchWithJWTParsed<ChatInfo[]>('/api/chats', user)
        .then((chats) => {
          setChats(chats);
          if (!currentChatID && chats.length > 0) {
            setCurrentChatID(chats[0].id);
          }
        })
        .catch((error) => {
            console.error("An error occurred while loading chats", error);
        })
        .finally(() => {
          setLoading(false);
        });
  }

  useEffect(() => {
    reloadChats()
  }, []);
  
  useEffect(() => {
    if (currentChatID) {
      fetchWithJWTParsed<Chat>(`/api/chats/${currentChatID}`, user)
            .then(setChat)
            .catch((error) => {
                console.error("An error occurred while loading current chat", error);
            });
    }
  }, [currentChatID]);
  
  const newChat = React.useCallback(async (messages: Message[]) => {
    if (loading) throw new Error("Cannot create new chat while loading");
    const newChatID = crypto.randomUUID();
    const now = new Date().getTime();
    const newChatInfo: ChatInfo = {
      id: newChatID,
      name: "",
      created: now,
      lastUpdated: now,
    };
    const newChat: Chat = {
      ...newChatInfo,
      messages: messages,
    }

    fetchWithJWT(`/api/chats/${newChatID}`, user, {method: "PUT", body: JSON.stringify(newChat), headers: {"Content-Type": "application/json"}})
      .then(()=> setChats([newChatInfo, ...chats]))
      .then(() => setCurrentChatID(newChatID))
      .catch((error) => {
          console.error("An error occurred while creating new chat", error);
      });
    return newChatID;
  }, [loading, chats]);
  
  const updateChat = React.useCallback(async (messages: Message[]) => {
    if (currentChat === null) throw new Error("Cannot update chat while current chat is null");
    const updatedChat = {...currentChat};
    updatedChat.lastUpdated = new Date().getTime();
    updatedChat.messages = messages;
    // update current chat

    fetchWithJWT(`/api/chats/${currentChatID}`, user, {method: "PUT", body: JSON.stringify(updatedChat), headers: {"Content-Type": "application/json"}})
    .then(() => {
        setChats(chats.map((chat) => chat.id === currentChatID ? updatedChat : chat));
        setChat(updatedChat);
    })
    .catch((error) => {
        console.error("An error occurred while updating chat", error);
    });
  }, [currentChat, chats]);
  
  const renameChat = React.useCallback(async (chatID: string, newName: string) => {
    if (loading) throw new Error("Cannot rename chat while loading");
    const patch: Partial<ChatInfo> = {name: newName};

    fetchWithJWT(`/api/chats/${chatID}`, user, {method: "PATCH", body: JSON.stringify(patch), headers: {"Content-Type": "application/json"}})
    .then(() => setChats(chats.map((chat) => chat.id === chatID ? {...chat, name: newName} : chat)))
    .catch((error) => {
        console.error("An error occurred while renaming chat", error);
    });

  }, [loading, chats]);
  
  const deleteChat = React.useCallback(async (chatID: string) => {
    if (loading) throw new Error("Cannot delete chat while loading");

    fetchWithJWT(`/api/chats/${chatID}`, user, {method: "DELETE"})
      .then(() => {
        if (currentChatID === chatID) {
          setCurrentChatID("");
        }
      })
      .then(() => setChats(chats.filter((chat) => chat.id !== chatID)))
      .catch((error) => {
          console.error("An error occurred while deleting chat", error);
      });
  }, [loading, chats]);
  
  return (
    <ChatsContext.Provider value={{
      loading, chats, newChat, currentChatID, setCurrentChatID, currentChat, updateChat, renameChat, deleteChat
    }}>
      {children}
    </ChatsContext.Provider>
  );
};
