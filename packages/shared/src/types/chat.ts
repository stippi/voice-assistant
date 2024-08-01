import { Message } from "./message";

export type ChatInfo = {
  id: string;
  name: string;
  created: number;
  lastUpdated: number;
  currentlyTypedMessage?: string;
};

export type Chat = ChatInfo & {
  messages: Message[];
};
