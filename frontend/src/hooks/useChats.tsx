import { ChatsContext } from "../contexts/ChatsContext";
import React from "react";

export default function useChats() {
  const context = React.useContext(ChatsContext);

  if (context === undefined) {
    throw new Error("useChats must be used within a ChatsProvider");
  }

  return context;
}
