import React from "react";
import { IconButton } from "@mui/material";
import { PiPresentationBold } from "react-icons/pi";
import { useAppContext } from "../hooks";

const IdleModeControls: React.FC = () => {
  const { idle, setIdle } = useAppContext();
  
  if (!idle) return null;
  
  return (
    <div 
      style={{ 
        position: 'fixed',
        left: '16px',
        bottom: '16px',
        zIndex: 1000,
      }}
    >
      <IconButton
        onClick={() => setIdle(false)}
        sx={{ 
          backgroundColor: 'rgba(0, 0, 0, 0.2)',
          color: 'white',
          fontSize: "1rem",
          '&:hover': { 
            backgroundColor: 'rgba(0, 0, 0, 0.4)'
          }
        }}
      >
        <PiPresentationBold style={{ fontSize: "inherit" }} />
      </IconButton>
    </div>
  );
};

export default IdleModeControls;
