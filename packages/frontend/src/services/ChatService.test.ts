import { describe, it, expect, vi, beforeEach } from "vitest";
import { ChatService } from "./ChatService";
import { Chat, ChatInfo, Message } from "@shared/types";

// Mock PersistenceService
const mockPersistenceService = {
  getChats: vi.fn(),
  getCurrentChatID: vi.fn(),
  setCurrentChatID: vi.fn(),
  getChat: vi.fn(),
  addChat: vi.fn(),
  updateChat: vi.fn(),
  renameChat: vi.fn(),
  deleteChat: vi.fn(),
  syncChats: vi.fn(),
  getAllChatsData: vi.fn(),
};

describe("ChatService", () => {
  let chatService: ChatService;

  beforeEach(() => {
    chatService = new ChatService(mockPersistenceService);
    vi.resetAllMocks();
  });

  describe("getChats", () => {
    it("should return chats from persistence service", async () => {
      const mockChats: ChatInfo[] = [{ id: "1", name: "Chat 1", created: 1000, lastUpdated: 1000 }];
      mockPersistenceService.getChats.mockResolvedValue(mockChats);

      const result = await chatService.getChats();

      expect(result).toEqual(mockChats);
      expect(mockPersistenceService.getChats).toHaveBeenCalledTimes(1);
    });
  });

  describe("getCurrentChatID", () => {
    it("should return current chat ID from persistence service", async () => {
      mockPersistenceService.getCurrentChatID.mockResolvedValue("chat1");

      const result = await chatService.getCurrentChatID();

      expect(result).toBe("chat1");
      expect(mockPersistenceService.getCurrentChatID).toHaveBeenCalledTimes(1);
    });
  });

  describe("getChat", () => {
    it("should return chat from persistence service if not cached", async () => {
      const mockChat: Chat = {
        id: "1",
        name: "Chat 1",
        created: 1000,
        lastUpdated: 1000,
        messages: [],
        currentlyTypedMessage: "",
      };
      mockPersistenceService.getChat.mockResolvedValue(mockChat);

      const result = await chatService.getChat("1");

      expect(result).toEqual(mockChat);
      expect(mockPersistenceService.getChat).toHaveBeenCalledWith("1");
    });

    it("should return cached chat if available", async () => {
      const mockChat: Chat = {
        id: "1",
        name: "Chat 1",
        created: 1000,
        lastUpdated: 1000,
        messages: [],
        currentlyTypedMessage: "",
      };
      mockPersistenceService.getChat.mockResolvedValue(mockChat);

      await chatService.getChat("1"); // This call will cache the chat
      const result = await chatService.getChat("1"); // This should use the cache

      expect(result).toEqual(mockChat);
      expect(mockPersistenceService.getChat).toHaveBeenCalledTimes(1);
    });
  });

  describe("setCurrentChat", () => {
    it("should set current chat ID and update cache", async () => {
      const mockChat: Chat = {
        id: "1",
        name: "Chat 1",
        created: 1000,
        lastUpdated: 1000,
        messages: [],
        currentlyTypedMessage: "",
      };
      mockPersistenceService.getChat.mockResolvedValue(mockChat);

      await chatService.setCurrentChat("1");

      expect(mockPersistenceService.setCurrentChatID).toHaveBeenCalledWith("1");
      expect(mockPersistenceService.getChat).toHaveBeenCalledWith("1");

      // Verify that the chat is now cached
      await chatService.getChat("1");
      expect(mockPersistenceService.getChat).toHaveBeenCalledTimes(1);
    });
  });

  describe("newChat", () => {
    it("should create a new chat and return its ID", async () => {
      const messages: Message[] = [{ id: "1", role: "user", content: "Hello" }];

      const result = await chatService.newChat(messages);

      expect(typeof result).toBe("string");
      expect(mockPersistenceService.addChat).toHaveBeenCalledTimes(1);
      expect(mockPersistenceService.addChat.mock.calls[0][0]).toMatchObject({
        id: expect.any(String),
        name: "",
        created: expect.any(Number),
        lastUpdated: expect.any(Number),
        messages,
        currentlyTypedMessage: "",
      });
    });
  });

  describe("updateChat", () => {
    it("should update an existing chat", async () => {
      const chatId = "1";
      const messages: Message[] = [
        { id: "1", role: "user", content: "Hello" },
        { id: "2", role: "assistant", content: "Hello yourself!" },
      ];
      const currentlyTypedMessage = "Typing...";

      mockPersistenceService.getChat.mockResolvedValue({
        id: chatId,
        name: "Chat 1",
        created: 1000,
        lastUpdated: 1000,
        messages: [{ id: "1", role: "user", content: "Hello" }],
        currentlyTypedMessage: "",
      });

      await chatService.updateChat(chatId, messages, currentlyTypedMessage);

      expect(mockPersistenceService.updateChat).toHaveBeenCalledTimes(1);
      expect(mockPersistenceService.updateChat.mock.calls[0][0]).toMatchObject({
        id: chatId,
        messages,
        currentlyTypedMessage,
        lastUpdated: expect.any(Number),
      });
    });
  });
});
