import { PorcupineDetection } from "@picovoice/porcupine-web";
import { useRealtimeAssistant, useVoiceAssistant, VoiceDetection } from "../hooks";
import { Conversation } from "./chat/Conversation";
import { MessageBar } from "./MessageBar";
import { ChatOverlay } from "./overlay/ChatOverlay";

interface Props {
  idle: boolean;
  listening: boolean;
  wakeWordDetection: PorcupineDetection | null;
  voiceDetection: VoiceDetection | null;
  startVoiceDetection: () => Promise<void>;
  stopVoiceDetection: () => Promise<void>;
}

export default function VoiceAssistant({
  idle,
  listening,
  wakeWordDetection,
  voiceDetection,
  startVoiceDetection,
  stopVoiceDetection,
}: Props) {
  const { responding, awaitSpokenResponse, sendMessage, stopResponding, deleteMessage, messages } = useVoiceAssistant();
  const { isConnected, connectConversation, disconnectConversation } = useRealtimeAssistant();

  // Realtime controls for the idle mode
  const realtimeControls = {
    isRecording: isConnected,
    connectConversation,
    disconnectConversation,
  };

  return (
    <>
      <ChatOverlay />
      {!idle && <Conversation chat={messages} deleteMessage={deleteMessage} />}
      <MessageBar
        sendMessage={sendMessage}
        stopResponding={stopResponding}
        responding={responding}
        awaitSpokenResponse={awaitSpokenResponse}
        idle={idle}
        listening={listening}
        wakeWordDetection={wakeWordDetection}
        voiceDetection={voiceDetection}
        startVoiceDetection={startVoiceDetection}
        stopVoiceDetection={stopVoiceDetection}
        useRealtimeAssistant={realtimeControls}
      />
    </>
  );
}
