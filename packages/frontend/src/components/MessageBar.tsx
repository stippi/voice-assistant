import React, { KeyboardEvent, MouseEvent } from "react";
import "./MessageBar.css";
import { TextareaAutosize } from "@mui/base";
import { createTheme, IconButton, ThemeProvider } from "@mui/material";
import SendIcon from "@mui/icons-material/Send";
import CancelIcon from "@mui/icons-material/Cancel";
import SpeechRecorder from "./SpeechRecorder";
import { createPerformanceTrackingService } from "../services/PerformanceTrackingService";
import { useChats } from "../hooks";

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

interface Props {
  sendMessage: (id: string, message: string, audible: boolean) => void;
  stopResponding: (audible: boolean) => void;
  responding: boolean;
  awaitSpokenResponse: boolean;
  idle: boolean;
}

export const MessageBar = React.memo(
  ({ sendMessage, stopResponding, responding, awaitSpokenResponse, idle }: Props) => {
    //const [message, setMessage] = React.useState("");
    const { currentlyTypedMessage, setCurrentlyTypedMessage } = useChats();
    const defaultPlaceHolder = "Type to chat";
    const [placeHolder, setPlaceHolder] = React.useState(defaultPlaceHolder);
    const textAreaRef = React.useRef<HTMLTextAreaElement>(null);
    const performanceTrackingServiceRef = React.useRef(createPerformanceTrackingService());

    const [isTransitionComplete, setIsTransitionComplete] = React.useState(true);
    const [showInnerContent, setShowInnerContent] = React.useState(!idle);
    const containerRef = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
      const container = containerRef.current;
      if (!container) return;

      const handleTransitionStart = (e: TransitionEvent) => {
        if (e.propertyName === "width") {
          setIsTransitionComplete(false);
        }
      };

      const handleTransitionEnd = (e: TransitionEvent) => {
        if (e.propertyName === "width") {
          setIsTransitionComplete(true);
          // Show inner content with a slight delay
          setTimeout(() => setShowInnerContent(true), 500);
        }
      };

      container.addEventListener("transitionstart", handleTransitionStart);
      container.addEventListener("transitionend", handleTransitionEnd);

      return () => {
        container.removeEventListener("transitionstart", handleTransitionStart);
        container.removeEventListener("transitionend", handleTransitionEnd);
      };
    }, []);

    React.useEffect(() => {
      if (idle) {
        setShowInnerContent(false);
      }
    }, [idle]);

    const focusTextArea = (e: MouseEvent) => {
      if (textAreaRef.current && e.target !== textAreaRef.current) {
        textAreaRef.current.focus();
      }
    };

    const sendTextMessage = (message: string) => {
      const userMessageId = crypto.randomUUID();
      const now = new Date().getTime();
      performanceTrackingServiceRef.current.trackTimestamp(userMessageId, "transcription-started", now);
      performanceTrackingServiceRef.current.trackTimestamp(userMessageId, "transcription-finished", now);
      sendMessage(userMessageId, message, false);
      setCurrentlyTypedMessage("");
    };

    const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey && !currentlyTypedMessage.includes("\n")) {
        e.preventDefault();
        sendTextMessage(currentlyTypedMessage);
      }
    };

    return (
      <div className={`fixedBottom ${idle ? "idle" : "gradientBottom"} ${showInnerContent ? "contentVisible" : ""}`}>
        <ThemeProvider theme={theme}>
          <div ref={containerRef} className="textContainer" onClick={focusTextArea}>
            {!idle && isTransitionComplete && (
              <TextareaAutosize
                name="Message input"
                className={showInnerContent ? "visible textArea" : "textArea"}
                ref={textAreaRef}
                placeholder={placeHolder}
                value={currentlyTypedMessage}
                onChange={(e) => setCurrentlyTypedMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                minRows={1}
                maxRows={10}
              />
            )}
            <div className="buttonContainer">
              {!idle && isTransitionComplete && (
                <>
                  {!responding && (
                    <IconButton
                      className="sendButton"
                      disabled={currentlyTypedMessage.trim() === ""}
                      aria-label="send message"
                      onMouseDown={(event) => {
                        event.preventDefault();
                        sendTextMessage(currentlyTypedMessage);
                      }}
                    >
                      <SendIcon />
                    </IconButton>
                  )}
                  {responding && (
                    <IconButton
                      className="sendButton"
                      aria-label="cancel response"
                      onMouseDown={(event) => {
                        event.preventDefault();
                        stopResponding(false);
                      }}
                    >
                      <CancelIcon />
                    </IconButton>
                  )}
                </>
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
