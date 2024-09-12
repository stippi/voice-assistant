import React, { useState, useEffect } from "react";
import { IconButton, Tooltip } from "@mui/material";
import FullscreenIcon from "@mui/icons-material/Fullscreen";
import FullscreenExitIcon from "@mui/icons-material/FullscreenExit";

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
    <Tooltip title={isFullscreen ? "Leave fullscreen" : "Enter fullscreen"}>
      <IconButton onClick={toggleFullscreen} sx={{ fontSize: "1rem" }}>
        {isFullscreen ? (
          <FullscreenExitIcon sx={{ fontSize: "inherit" }} />
        ) : (
          <FullscreenIcon sx={{ fontSize: "inherit" }} />
        )}
      </IconButton>
    </Tooltip>
  );
};

export default ToggleFullscreenButton;
