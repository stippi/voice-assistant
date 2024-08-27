import { Conversation } from "./chat/Conversation";
import { MessageBar } from "./MessageBar";
import { useVoiceAssistant } from "../hooks/useVoiceAssistant";

interface Props {
  idle: boolean;
}

export default function VoiceAssistant({ idle }: Props) {
  const { responding, awaitSpokenResponse, sendMessage, stopResponding, deleteMessage, messages } = useVoiceAssistant();

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
