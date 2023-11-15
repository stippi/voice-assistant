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
  
  return (
    <div className="fixedBottom">
      <div className="textContainer">
        <TextareaAutosize
          className="textArea"
          placeholder={placeHolder}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          minRows={1}
          maxRows={10}
        />
        <IconButton
          className="sendButton"
          aria-label="send message"
          onClick={() => {
            sendMessage(message)
            setMessage("")
          }}
        >
          <SendIcon />
        </IconButton>
        <SpeechRecorder
          sendMessage={sendMessage}
          setTranscript={setPlaceHolder}
          defaultMessage={defaultPlaceHolder}
        />
      </div>
    </div>
  );
}

interface Props {
  sendMessage: (message: string) => void;
}