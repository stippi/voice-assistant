import React from "react";
import { IconButton, Tooltip } from "@mui/material";
import { useChats } from "../../hooks";
import SaveAltIcon from "@mui/icons-material/SaveAlt";

const DownloadChatsButton: React.FC = () => {
  const { downloadChats } = useChats();
  return (
    <Tooltip title="Download all chats">
      <IconButton onClick={downloadChats} sx={{ fontSize: "1rem" }}>
        <SaveAltIcon sx={{ fontSize: "inherit" }} />
      </IconButton>
    </Tooltip>
  );
};

export default DownloadChatsButton;
