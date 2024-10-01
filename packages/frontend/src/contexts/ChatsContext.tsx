import React, { createContext, useState, useEffect, ReactNode } from "react";
import { Chat, ChatInfo, Message } from "@shared/types";
import { indexDbDelete, indexDbGet, indexDbGetAllKeys, indexDbPut } from "../utils/indexDB.ts";

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
  newChat: async () => {
    return "";
  },
  updateChat: () => {},
  renameChat: () => {},
  deleteChat: () => {},
  syncChats: () => {},
  downloadChats: async () => {},
});

export const ChatsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [loading, setLoading] = useState(true);
  const [currentlyTypedMessage, setCurrentlyTypedMessage] = useState("");
  const currentlyTypedMessageRef = React.useRef(currentlyTypedMessage);
  const [chats, setChats] = useState<ChatInfo[]>([]);
  const [currentChatID, setCurrentChatID] = useState<string>("");
  const [currentChat, setChat] = useState<Chat | null>(null);

  useEffect(() => {
    indexDbGet<ChatInfo[]>("chats")
      .then((chatsFromDb) => {
        setChats(chatsFromDb || []);
        return indexDbGet<string>("currentChatID");
      })
      .then((currentChatIDFromDb) => {
        if (currentChatIDFromDb) {
          setCurrentChatID(currentChatIDFromDb);
        }
      })
      .catch((error) => {
        console.error("An error occurred while loading chats or currentChatID", error);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    currentlyTypedMessageRef.current = currentlyTypedMessage;
  }, [currentlyTypedMessage]);

  useEffect(() => {
    if (currentChat) {
      setCurrentlyTypedMessage(currentChat.currentlyTypedMessage || "");
    }
    return () => {
      if (currentChat) {
        currentChat.currentlyTypedMessage = currentlyTypedMessageRef.current;
        indexDbPut(currentChat.id, currentChat);
      }
    };
  }, [currentChat]);

  useEffect(() => {
    if (currentChatID) {
      indexDbGet<Chat>(currentChatID).then((chat) => {
        setChat(chat);
      });
    }
  }, [currentChatID]);

  const setCurrentChat = React.useCallback(async (chatID: string) => {
    await indexDbPut("currentChatID", chatID);
    setCurrentChatID(chatID);
  }, []);

  const newChat = React.useCallback(
    async (messages: Message[]) => {
      if (loading) throw new Error("Cannot create new chat while loading");
      const newChatID = crypto.randomUUID();
      const now = new Date().getTime();
      const newChatInfo: ChatInfo = {
        id: newChatID,
        name: "",
        created: now,
        lastUpdated: now,
      };
      // TODO: Should use an atomic transaction here
      await indexDbPut("chats", [...chats, newChatInfo]);
      const newChat: Chat = {
        ...newChatInfo,
        messages: messages,
      };
      await indexDbPut(newChatID, newChat);
      setChats((prevChats) => [...prevChats, newChatInfo]);
      await setCurrentChat(newChatID);
      return newChatID;
    },
    [loading, chats, setCurrentChat],
  );

  const updateChat = React.useCallback(
    async (messages: Message[]) => {
      if (currentChat === null) throw new Error("Cannot update chat while current chat is null");
      const updatedChat = { ...currentChat };
      updatedChat.lastUpdated = new Date().getTime();
      updatedChat.messages = messages;
      // update current chat
      await indexDbPut(currentChat.id, updatedChat);
      setChat(updatedChat);
      // update chats
      const updatedChats = [...chats];
      const chatIndex = updatedChats.findIndex((chatInfo) => chatInfo.id === currentChat.id);
      if (chatIndex === -1) throw new Error("Cannot find current chat in chats");
      updatedChats[chatIndex].lastUpdated = updatedChat.lastUpdated;
      await indexDbPut("chats", updatedChats);
      setChats(updatedChats);
    },
    [currentChat, chats],
  );

  const renameChat = React.useCallback(
    async (chatID: string, newName: string) => {
      if (loading) throw new Error("Cannot rename chat while loading");

      const index = chats.findIndex((chatInfo) => chatInfo.id === chatID);
      if (index === -1) throw new Error("Cannot find chat to rename");

      const newChats = chats.map((chatInfo) => ({ ...chatInfo }));
      newChats[index].name = newName;
      await indexDbPut("chats", newChats);
      setChats(newChats);
    },
    [loading, chats],
  );

  const deleteChat = React.useCallback(
    async (chatID: string) => {
      if (loading) throw new Error("Cannot delete chat while loading");

      const index = chats.findIndex((chatInfo) => chatInfo.id === chatID);
      if (index === -1) throw new Error("Cannot find chat to delete");

      const newChats = [...chats];
      newChats.splice(index, 1);
      // TODO: Should use an atomic transaction here
      await indexDbPut("chats", newChats);
      await indexDbDelete(chatID);
      setChats(newChats);

      if (index < chats.length) {
        await setCurrentChat(newChats[index].id);
      } else if (index > 0) {
        await setCurrentChat(newChats[index - 1].id);
      } else {
        await setCurrentChat("");
      }
    },
    [loading, chats, setCurrentChat],
  );

  const syncChats = React.useCallback(async () => {
    const allChatIDs = (await indexDbGetAllKeys()).filter((key) => key !== "chats" && key !== "currentChatID");
    const chatsFromDb = await Promise.all(allChatIDs.map((chatID) => indexDbGet<Chat>(chatID)));
    const chatInfos = chatsFromDb.map((chat) => {
      return {
        id: chat.id,
        created: chat.created,
        lastUpdated: chat.lastUpdated,
      };
    });
    await indexDbPut("chats", chatInfos);
  }, []);

  const downloadChats = React.useCallback(async () => {
    const allData: Record<string, Chat> = {};
    for (const chatInfo of chats) {
      allData[chatInfo.id] = { ...(await indexDbGet<Chat>(chatInfo.id)), ...chatInfo };
    }

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
  }, [chats]);

  return (
    <ChatsContext.Provider
      value={{
        loading,
        currentlyTypedMessage,
        setCurrentlyTypedMessage,
        chats,
        newChat,
        currentChatID,
        setCurrentChat,
        currentChat,
        updateChat,
        renameChat,
        deleteChat,
        syncChats,
        downloadChats,
      }}
    >
      {children}
    </ChatsContext.Provider>
  );
};
