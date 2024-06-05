import {Message} from "./message.ts";

export type ChatInfo = {
  id: string,
  name: string,
  created: number,
  lastUpdated: number,
};

export type Chat = ChatInfo & {
  messages: Message[],
};
