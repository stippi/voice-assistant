import React, {KeyboardEvent, MouseEvent} from "react";
import './MessageBar.css';
import { TextareaAutosize } from '@mui/base';
import {IconButton} from "@mui/material";
import SendIcon from '@mui/icons-material/Send';
import SpeechRecorder from "./SpeechRecorder.tsx";

export function MessageBar({ sendMessage, respondingRef, awaitSpokenResponse }: Props) {
  
  const [message, setMessage] = React.useState("");
  const defaultPlaceHolder = "Type to chat";
  const [placeHolder, setPlaceHolder] = React.useState(defaultPlaceHolder);
  const textAreaRef = React.useRef<HTMLTextAreaElement>(null);

  const focusTextArea = (e: MouseEvent) => {
    if (textAreaRef.current && e.target !== textAreaRef.current) {
      textAreaRef.current.focus();
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !message.includes('\n')) {
      e.preventDefault();
      sendMessage(message, false);
      setMessage('');
    }
  };
  
  return (
    <div className="fixedBottom">
      <div
        className="textContainer"
        onClick={focusTextArea}
      >
        <TextareaAutosize
          name="Message input"
          className="textArea"
          ref={textAreaRef}
          placeholder={placeHolder}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          minRows={1}
          maxRows={10}
        />
        <div className="buttonContainer">
          <IconButton
            disabled={message === ""}
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
            respondingRef={respondingRef}
            awaitSpokenResponse={awaitSpokenResponse}
          />
        </div>
      </div>
    </div>
  );
}

interface Props {
  sendMessage: (message: string, audible: boolean) => void;
  respondingRef: React.MutableRefObject<boolean>;
  awaitSpokenResponse: boolean;
}