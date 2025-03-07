import MicIcon from "@mui/icons-material/Mic";
import RecordVoiceOverIcon from "@mui/icons-material/RecordVoiceOver";
import IconButton from "@mui/material/IconButton";

interface Props {
  listening: boolean;
  isRecording: boolean;
  startConversation: () => void;
  stopConversation: () => void;
}

const SpeechRecorder = ({
  listening,
  isRecording,
  startConversation,
  stopConversation,
}: Props) => {
  return (
    <div>
      {isRecording && (
        <IconButton area-label="stop conversation" color="error" onClick={stopConversation}>
          <RecordVoiceOverIcon />
        </IconButton>
      )}
      {!isRecording && (
        <IconButton area-label="start conversation" color={listening ? "error" : "default"} onClick={startConversation}>
          <MicIcon />
        </IconButton>
      )}
    </div>
  );
};

export default SpeechRecorder;
