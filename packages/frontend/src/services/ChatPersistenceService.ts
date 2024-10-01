import { Chat, ChatInfo } from "@shared/types";

export interface ChatPersistenceService {
  getChats(): Promise<ChatInfo[]>;
  getCurrentChatID(): Promise<string>;
  setCurrentChatID(chatID: string): Promise<void>;
  getChat(chatID: string): Promise<Chat | null>;
  addChat(chat: Chat): Promise<void>;
  updateChat(chat: Chat): Promise<void>;
  renameChat(chatID: string, newName: string): Promise<void>;
  deleteChat(chatID: string): Promise<void>;
  syncChats(): Promise<void>;
  getAllChatsData(): Promise<Record<string, Chat>>;
}
