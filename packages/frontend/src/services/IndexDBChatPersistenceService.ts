import { ChatPersistenceService } from "./ChatPersistenceService";
import { Chat, ChatInfo } from "@shared/types";
import { indexDbDelete, indexDbGet, indexDbGetAllKeys, indexDbPut } from "../utils/indexDB";

export class IndexDBChatPersistenceService implements ChatPersistenceService {
  async getChats(): Promise<ChatInfo[]> {
    return (await indexDbGet<ChatInfo[]>("chats")) || [];
  }

  async getCurrentChatID(): Promise<string> {
    return (await indexDbGet<string>("currentChatID")) || "";
  }

  async setCurrentChatID(chatID: string): Promise<void> {
    await indexDbPut("currentChatID", chatID);
  }

  async getChat(chatID: string): Promise<Chat | null> {
    return await indexDbGet<Chat>(chatID);
  }

  async addChat(chat: Chat): Promise<void> {
    const chats = await this.getChats();
    await indexDbPut("chats", [...chats, chat]);
    await indexDbPut(chat.id, chat);
  }

  async updateChat(chat: Chat): Promise<void> {
    await indexDbPut(chat.id, chat);
    const chats = await this.getChats();
    const updatedChats = chats.map((c) => (c.id === chat.id ? { ...c, lastUpdated: chat.lastUpdated } : c));
    await indexDbPut("chats", updatedChats);
  }

  async renameChat(chatID: string, newName: string): Promise<void> {
    const chats = await this.getChats();
    const updatedChats = chats.map((c) => (c.id === chatID ? { ...c, name: newName } : c));
    await indexDbPut("chats", updatedChats);
  }

  async deleteChat(chatID: string): Promise<void> {
    const chats = await this.getChats();
    const updatedChats = chats.filter((c) => c.id !== chatID);
    await indexDbPut("chats", updatedChats);
    await indexDbDelete(chatID);
  }

  async syncChats(): Promise<void> {
    const allChatIDs = (await indexDbGetAllKeys()).filter((key) => key !== "chats" && key !== "currentChatID");
    const chatsFromDb = await Promise.all(allChatIDs.map((chatID) => indexDbGet<Chat>(chatID)));
    const chatInfos = chatsFromDb.map((chat) => ({
      id: chat.id,
      name: chat.name,
      created: chat.created,
      lastUpdated: chat.lastUpdated,
    }));
    await indexDbPut("chats", chatInfos);
  }

  async getAllChatsData(): Promise<Record<string, Chat>> {
    const chats = await this.getChats();
    const allData: Record<string, Chat> = {};
    for (const chatInfo of chats) {
      const chat = await this.getChat(chatInfo.id);
      if (chat) {
        allData[chatInfo.id] = chat;
      }
    }
    return allData;
  }
}
