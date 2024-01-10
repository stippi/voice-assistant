import React, {createContext, useState, useEffect, ReactNode} from 'react';

type WindowFocusContextType = {
  windowFocused: boolean;
  documentVisible: boolean;
};

export const WindowFocusContext = createContext<WindowFocusContextType>({
  windowFocused: true,
  documentVisible: true
});

export const WindowFocusProvider: React.FC<{children: ReactNode}>  = ({ children }) => {
  const [windowFocused, setWindowFocused] = useState(true);
  const [documentVisible, setDocumentVisible] = useState(true);
  
  useEffect(() => {
    const handleVisibilityChange = () => {
      const visible = document.visibilityState === 'visible';
      setWindowFocused(visible);
      setDocumentVisible(visible);
    };
    
    const handleWindowFocus = () => {
      setWindowFocused(true);
    };
    
    const handleWindowBlur = () => {
      setWindowFocused(false);
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleWindowFocus);
    window.addEventListener('blur', handleWindowBlur);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleWindowFocus);
      window.removeEventListener('blur', handleWindowBlur);
    };
  }, []);
  
  return (
    <WindowFocusContext.Provider value={{ windowFocused, documentVisible }}>
      {children}
    </WindowFocusContext.Provider>
  );
};
