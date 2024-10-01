import React, { createContext, useCallback, useState, useEffect, ReactNode } from "react";
import { Chat, ChatInfo, Message } from "@shared/types";
import { createChatService } from "../services/ChatService";

type ChatsContextType = {
  loading: boolean;
  currentlyTypedMessage: string;
  setCurrentlyTypedMessage: (message: string) => void;
  chats: ChatInfo[];
  currentChatID: string;
  currentChat: Chat | null;
  setCurrentChat: (chatID: string) => void;
  newChat: (messages: Message[]) => Promise<string>;
  updateChat: (messages: Message[]) => void;
  renameChat: (chatID: string, newName: string) => void;
  deleteChat: (chatID: string) => void;
  syncChats: () => void;
  downloadChats: () => Promise<void>;
};

export const ChatsContext = createContext<ChatsContextType>({
  loading: true,
  currentlyTypedMessage: "",
  setCurrentlyTypedMessage: () => {},
  chats: [],
  currentChatID: "",
  currentChat: null,
  setCurrentChat: () => {},
  newChat: async () => "",
  updateChat: () => {},
  renameChat: () => {},
  deleteChat: () => {},
  syncChats: () => {},
  downloadChats: async () => {},
});

export const ChatsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [chatService] = useState(() => createChatService());
  const [loading, setLoading] = useState(true);
  const [chats, setChats] = useState<ChatInfo[]>([]);
  const [currentChatID, setCurrentChatID] = useState<string>("");
  const [currentChat, setCurrentChat] = useState<Chat | null>(null);
  const [currentlyTypedMessage, setCurrentlyTypedMessage] = useState("");

  useEffect(() => {
    const initializeChats = async () => {
      const chatsFromService = await chatService.getChats();
      setChats(chatsFromService);
      const currentChatIDFromService = await chatService.getCurrentChatID();
      if (currentChatIDFromService) {
        setCurrentChatID(currentChatIDFromService);
      }
      setLoading(false);
    };

    initializeChats();
  }, [chatService]);

  useEffect(() => {
    const loadCurrentChat = async () => {
      if (currentChatID) {
        const chat = await chatService.getChat(currentChatID);
        setCurrentChat(chat);
        setCurrentlyTypedMessage(chat?.currentlyTypedMessage || "");
      }
    };

    loadCurrentChat();
  }, [chatService, currentChatID]);

  const setCurrentChatContext = useCallback(
    async (chatID: string) => {
      if (currentChat) {
        await chatService.setCurrentlyTypedMessage(currentChat.id, currentlyTypedMessage);
      }
      await chatService.setCurrentChat(chatID);
      setCurrentChatID(chatID);
      const newCurrentChat = await chatService.getChat(chatID);
      setCurrentChat(newCurrentChat);
      setCurrentlyTypedMessage(newCurrentChat?.currentlyTypedMessage || "");
    },
    [chatService, currentChat, currentlyTypedMessage],
  );

  const newChat = useCallback(
    async (messages: Message[]) => {
      if (loading) throw new Error("Cannot create new chat while loading");
      const newChatID = await chatService.newChat(messages);
      setChats(await chatService.getChats());
      await setCurrentChatContext(newChatID);
      return newChatID;
    },
    [chatService, loading, setCurrentChatContext],
  );

  const updateChat = useCallback(
    async (messages: Message[]) => {
      if (!currentChat) throw new Error("Cannot update chat while current chat is null");
      await chatService.updateChat(currentChat.id, messages, currentlyTypedMessage);
      setCurrentChat(await chatService.getChat(currentChat.id));
      setChats(await chatService.getChats());
    },
    [chatService, currentChat, currentlyTypedMessage],
  );

  const setTypedMessageAndUpdateChat = useCallback(
    (message: string) => {
      setCurrentlyTypedMessage(message);
      if (currentChat) {
        chatService.setCurrentlyTypedMessage(currentChat.id, message);
      }
    },
    [chatService, currentChat],
  );

  const renameChat = async (chatID: string, newName: string) => {
    if (loading) throw new Error("Cannot rename chat while loading");
    await chatService.renameChat(chatID, newName);
    setChats(await chatService.getChats());
  };

  const deleteChat = async (chatID: string) => {
    if (loading) throw new Error("Cannot delete chat while loading");
    await chatService.deleteChat(chatID);
    const updatedChats = await chatService.getChats();
    setChats(updatedChats);

    if (chatID === currentChatID) {
      if (updatedChats.length > 0) {
        await setCurrentChatContext(updatedChats[0].id);
      } else {
        await setCurrentChatContext("");
      }
    }
  };

  const syncChats = async () => {
    await chatService.syncChats();
    setChats(await chatService.getChats());
  };

  const downloadChats = async () => {
    const allData = await chatService.getAllChatsData();
    const jsonData = JSON.stringify(allData, null, 2);
    const blob = new Blob([jsonData], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = `chat_data.json`;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  };

  return (
    <ChatsContext.Provider
      value={{
        loading,
        chats,
        currentChatID,
        currentChat,
        setCurrentChat: setCurrentChatContext,
        newChat,
        updateChat,
        renameChat,
        deleteChat,
        syncChats,
        downloadChats,
        currentlyTypedMessage,
        setCurrentlyTypedMessage: setTypedMessageAndUpdateChat,
      }}
    >
      {children}
    </ChatsContext.Provider>
  );
};
