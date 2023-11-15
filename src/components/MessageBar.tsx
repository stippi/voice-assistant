import React from "react";
import { TextareaAutosize } from '@mui/base';
import {IconButton} from "@mui/material";
import SendIcon from '@mui/icons-material/Send';

export function MessageBar({ sendMessage }: Props) {
  
  const [message, setMessage] = React.useState("");
  
  return (
    <div className="fixed bottom-0 flex justify-center items-center w-full pb-4">
      <div className="max-w-[500px] w-full">
        <div className="relative">
          <div className="absolute right-2 bottom-3 flex space-x-2">
            
            <IconButton
              aria-label="send message"
              onClick={() => {
                sendMessage(message)
                setMessage("")
              }}
            >
              <SendIcon />
            </IconButton>
          </div>
          <TextareaAutosize
            className=""
            placeholder="Type to chat"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            minRows={1}
            maxRows={10}
          />
        </div>
      </div>
    </div>
  );
}

interface Props {
  sendMessage: (message: string) => void;
}