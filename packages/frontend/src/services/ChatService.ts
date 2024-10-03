import { Chat, ChatInfo, Message } from "@shared/types";
import { ChatPersistenceService } from "./ChatPersistenceService";
import { IndexDBChatPersistenceService } from "./IndexDBChatPersistenceService";

export class ChatService {
  private persistenceService: ChatPersistenceService;
  private currentChatCache: Chat | null = null;

  constructor(persistenceService: ChatPersistenceService) {
    this.persistenceService = persistenceService;
  }

  async getChats(): Promise<ChatInfo[]> {
    return this.persistenceService.getChats();
  }

  async getCurrentChatID(): Promise<string> {
    return this.persistenceService.getCurrentChatID();
  }

  async getChat(chatID: string): Promise<Chat | null> {
    if (this.currentChatCache && this.currentChatCache.id === chatID) {
      return this.currentChatCache;
    }
    const chat = await this.persistenceService.getChat(chatID);
    if (chat) {
      this.currentChatCache = chat;
    }
    return chat;
  }

  async setCurrentChat(chatID: string): Promise<void> {
    await this.persistenceService.setCurrentChatID(chatID);
    this.currentChatCache = await this.persistenceService.getChat(chatID);
  }

  async newChat(messages: Message[]): Promise<string> {
    const newChatID = crypto.randomUUID();
    const now = new Date().getTime();
    const newChat: Chat = {
      id: newChatID,
      name: "",
      created: now,
      lastUpdated: now,
      messages: messages,
      currentlyTypedMessage: "",
    };
    await this.persistenceService.addChat(newChat);
    this.currentChatCache = newChat;
    return newChatID;
  }

  async updateChat(chatID: string, messages: Message[], currentlyTypedMessage: string): Promise<void> {
    if (this.currentChatCache && this.currentChatCache.id === chatID) {
      this.currentChatCache.messages = messages;
      this.currentChatCache.currentlyTypedMessage = currentlyTypedMessage;
      this.currentChatCache.lastUpdated = new Date().getTime();
      await this.persistenceService.updateChat(this.currentChatCache);
    } else {
      const chat = await this.persistenceService.getChat(chatID);
      if (!chat) throw new Error("Cannot update chat: chat not found");
      chat.messages = messages;
      chat.currentlyTypedMessage = currentlyTypedMessage;
      chat.lastUpdated = new Date().getTime();
      await this.persistenceService.updateChat(chat);
      this.currentChatCache = chat;
    }
  }

  async setCurrentlyTypedMessage(chatID: string, message: string): Promise<void> {
    if (this.currentChatCache && this.currentChatCache.id === chatID) {
      this.currentChatCache.currentlyTypedMessage = message;
      await this.persistenceService.updateChat(this.currentChatCache);
    } else {
      const chat = await this.persistenceService.getChat(chatID);
      if (chat) {
        chat.currentlyTypedMessage = message;
        await this.persistenceService.updateChat(chat);
        this.currentChatCache = chat;
      }
    }
  }

  async renameChat(chatID: string, newName: string): Promise<void> {
    await this.persistenceService.renameChat(chatID, newName);
    if (this.currentChatCache && this.currentChatCache.id === chatID) {
      this.currentChatCache.name = newName;
    }
  }

  async deleteChat(chatID: string): Promise<void> {
    await this.persistenceService.deleteChat(chatID);
    if (this.currentChatCache && this.currentChatCache.id === chatID) {
      this.currentChatCache = null;
    }
  }

  async syncChats(): Promise<void> {
    await this.persistenceService.syncChats();
    if (this.currentChatCache) {
      this.currentChatCache = await this.persistenceService.getChat(this.currentChatCache.id);
    }
  }

  async getAllChatsData(): Promise<Record<string, Chat>> {
    return this.persistenceService.getAllChatsData();
  }

  invalidateCache(): void {
    this.currentChatCache = null;
  }
}

export function createChatService(): ChatService {
  return new ChatService(new IndexDBChatPersistenceService());
}
