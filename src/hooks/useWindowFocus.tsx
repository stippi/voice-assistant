import React from 'react';
import {WindowFocusContext} from "../contexts/WindowFocusContext.tsx";

export default function useWindowFocus() {
  const context = React.useContext(WindowFocusContext);
  
  if (context === undefined) {
    throw new Error("useWindowFocus must be used within a WindowFocusProvider");
  }
  
  return context;
}