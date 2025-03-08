import React from "react";
import { PiPresentation } from "react-icons/pi";
import { useAppContext, useSettings } from "../../hooks";
import SidebarButton from "./SidebarButton";

const ToggleIdleModeButton: React.FC = () => {
  const { idle, setIdle } = useAppContext();
  const { settings } = useSettings();
  const idleEnabled = settings.enableGoogle && settings.enableGooglePhotos;

  const handleToggleIdle = () => {
    if (idle) {
      setIdle(false);
    } else if (idleEnabled) {
      setIdle(true);
    }
  };

  return (
    <SidebarButton
      icon={<PiPresentation />}
      tooltip={idle ? "Exit presentation mode" : "Enter presentation mode"}
      onClick={handleToggleIdle}
      disabled={!idle && !idleEnabled}
    />
  );
};

export default ToggleIdleModeButton;
