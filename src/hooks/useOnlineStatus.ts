import { useEffect, useState } from 'react';

export function useOnlineStatus() {
  const [isBrowserOnline, setIsBrowserOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline = () => setIsBrowserOnline(true);
    const handleOffline = () => setIsBrowserOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isBrowserOnline;
}
