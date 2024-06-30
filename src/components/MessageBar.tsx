import React, { KeyboardEvent, MouseEvent } from "react";
import "./MessageBar.css";
import { TextareaAutosize } from "@mui/base";
import { createTheme, IconButton, ThemeProvider } from "@mui/material";
import SendIcon from "@mui/icons-material/Send";
import CancelIcon from "@mui/icons-material/Cancel";
import SpeechRecorder from "./SpeechRecorder";

const theme = createTheme({
  components: {},
  palette: {
    mode: "light",
    primary: { main: "rgb(5, 30, 52)" },
    text: {
      primary: "#222222",
      secondary: "#333333",
    },
  },
});

export const MessageBar = React.memo(
  ({
    sendMessage,
    stopResponding,
    responding,
    awaitSpokenResponse,
    idle,
  }: Props) => {
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
      if (e.key === "Enter" && !e.shiftKey && !message.includes("\n")) {
        e.preventDefault();
        sendMessage(message, false);
        setMessage("");
      }
    };

    return (
      <div className={`fixedBottom ${idle ? "idle" : "gradientBottom"}`}>
        <ThemeProvider theme={theme}>
          <div className="textContainer" onClick={focusTextArea}>
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
              {!responding && (
                <IconButton
                  disabled={message.trim() === ""}
                  aria-label="send message"
                  onMouseDown={(event) => {
                    event.preventDefault();
                    sendMessage(message, false);
                    setMessage("");
                  }}
                >
                  <SendIcon />
                </IconButton>
              )}
              {responding && (
                <IconButton
                  aria-label="cancel response"
                  onMouseDown={(event) => {
                    event.preventDefault();
                    stopResponding(false);
                  }}
                >
                  <CancelIcon />
                </IconButton>
              )}
              <SpeechRecorder
                sendMessage={sendMessage}
                stopResponding={stopResponding}
                setTranscript={setPlaceHolder}
                defaultMessage={defaultPlaceHolder}
                responding={responding}
                awaitSpokenResponse={awaitSpokenResponse}
              />
            </div>
          </div>
        </ThemeProvider>
      </div>
    );
  },
);

interface Props {
  sendMessage: (message: string, audible: boolean) => void;
  stopResponding: (audible: boolean) => void;
  responding: boolean;
  awaitSpokenResponse: boolean;
  idle: boolean;
}
