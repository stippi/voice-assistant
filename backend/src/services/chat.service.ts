import {DataStorageService} from "./datastorage.service";
import {Chat} from "../model/chat";
import {Message} from "../model/message";

const COLLECTION_NAME = 'chats';

export class ChatService {
   private storage = new DataStorageService<Chat>(COLLECTION_NAME);

   public async listChats() {
     const chatIds = await this.storage.listObjectIds();
     const allChats = await Promise.all(chatIds.map(id => this.storage.getObject(id)));
     const sortedChats = allChats.sort((a, b) => b.lastUpdated - a.lastUpdated);
     return sortedChats
   }

    public async getChatById(id: string) {
      return this.storage.getObject(id);
    }

    public async updateChat(chat: Chat) {
      return this.storage.saveObject(chat.id, chat);
    }

    public async deleteChat(chatId: string) {
      return this.storage.deleteObject(chatId);
    }

    public async addMessageToChat(chatId: string, message: Message) {
      const chat = await this.storage.getObject(chatId);
      chat.messages.push(message);
      return this.storage.saveObject(chatId, chat);
    }
}