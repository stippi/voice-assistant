import React, { useState, useEffect } from "react";
import FullscreenIcon from "@mui/icons-material/Fullscreen";
import FullscreenExitIcon from "@mui/icons-material/FullscreenExit";
import SidebarButton from "./SidebarButton";

const ToggleFullscreenButton: React.FC = () => {
  const [isFullscreen, setIsFullscreen] = useState(!!document.fullscreenElement);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };

  return (
    <SidebarButton
      icon={isFullscreen ? <FullscreenExitIcon /> : <FullscreenIcon />}
      tooltip={isFullscreen ? "Leave fullscreen" : "Enter fullscreen"}
      onClick={toggleFullscreen}
    />
  );
};

export default ToggleFullscreenButton;
