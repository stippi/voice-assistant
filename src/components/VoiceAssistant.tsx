import React from "react";
import { Conversation } from "./Conversation";
import { MessageBar } from "./MessageBar";
import { useVoiceAssistant } from "../hooks/useVoiceAssistant";
import useWindowFocus from "../hooks/useWindowFocus";

interface Props {
  idle: boolean;
}

export default function VoiceAssistant({ idle }: Props) {
  const { responding, awaitSpokenResponse, sendMessage, stopResponding, deleteMessage, messages } = useVoiceAssistant();

  const { windowFocused } = useWindowFocus();

  React.useEffect(() => {
    if (windowFocused) {
      document.body.classList.add("window-focused");
    } else {
      document.body.classList.remove("window-focused");
    }
  }, [windowFocused]);

  return (
    <>
      {!idle && <Conversation chat={messages} deleteMessage={deleteMessage} />}
      <MessageBar
        sendMessage={sendMessage}
        stopResponding={stopResponding}
        responding={responding}
        awaitSpokenResponse={awaitSpokenResponse}
        idle={idle}
      />
    </>
  );
}
