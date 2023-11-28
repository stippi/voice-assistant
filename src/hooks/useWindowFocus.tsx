import { useEffect } from 'react';

export default function useWindowFocus() {
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        document.body.classList.add('window-focused');
      } else {
        document.body.classList.remove('window-focused');
      }
    };
    
    const handleWindowFocus = () => {
      document.body.classList.add('window-focused');
    };
    
    const handleWindowBlur = () => {
      document.body.classList.remove('window-focused');
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
}