import React from "react";
import './MessageBar.css';
import { TextareaAutosize } from '@mui/base';
import {IconButton} from "@mui/material";
import SendIcon from '@mui/icons-material/Send';
import SpeechRecorder from "./SpeechRecorder.tsx";

export function MessageBar({ sendMessage }: Props) {
  
  const [message, setMessage] = React.useState("");
  const defaultPlaceHolder = "Type to chat";
  const [placeHolder, setPlaceHolder] = React.useState(defaultPlaceHolder);
  
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey && !message.includes('\n')) {
      e.preventDefault();
      sendMessage(message, false);
      setMessage('');
    }
  };
  
  return (
    <div className="fixedBottom">
      <div className="textContainer">
        <TextareaAutosize
          className="textArea"
          placeholder={placeHolder}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          minRows={1}
          maxRows={10}
        />
        <IconButton
          className="sendButton"
          aria-label="send message"
          onMouseDown={(event) => {
            event.preventDefault();
            sendMessage(message, false);
            setMessage("");
          }}
        >
          <SendIcon />
        </IconButton>
        <SpeechRecorder
          sendMessage={sendMessage}
          setTranscript={setPlaceHolder}
          defaultMessage={defaultPlaceHolder}
          triggerPhrase="computer"
        />
      </div>
    </div>
  );
}

interface Props {
  sendMessage: (message: string, audible: boolean) => void;
}