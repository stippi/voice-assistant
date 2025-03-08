import React from "react";
import { IconButton, Tooltip } from "@mui/material";

interface SidebarButtonProps {
  icon: React.ReactNode;
  tooltip: string;
  onClick: () => void;
  disabled?: boolean;
}

const SidebarButton: React.FC<SidebarButtonProps> = ({
  icon,
  tooltip,
  onClick,
  disabled = false
}) => {
  return (
    <Tooltip title={tooltip}>
      <span> {/* Wrapper needed for disabled buttons to show tooltips */}
        <IconButton
          onClick={onClick}
          disabled={disabled}
          sx={{
            fontSize: "1rem",
            opacity: disabled ? 0.5 : 1,
            margin: "4px",
          }}
        >
          {React.isValidElement(icon) && React.cloneElement(icon, {
            sx: { fontSize: "inherit" }
          })}
        </IconButton>
      </span>
    </Tooltip>
  );
};

export default SidebarButton;
