import React from "react";
import { useChats } from "../../hooks";
import SaveAltIcon from "@mui/icons-material/SaveAlt";
import SidebarButton from "./SidebarButton";

const DownloadChatsButton: React.FC = () => {
  const { downloadChats } = useChats();
  
  return (
    <SidebarButton
      icon={<SaveAltIcon />}
      tooltip="Download all chats"
      onClick={downloadChats}
    />
  );
};

export default DownloadChatsButton;
