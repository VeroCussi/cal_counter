'use client';

import { useState, useEffect } from 'react';
import { syncService, SyncStatus } from '@/lib/sync/sync-service';

export function useSync(userId?: string) {
  const [status, setStatus] = useState<SyncStatus>('idle');
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    setIsOnline(navigator.onLine);

    const handleOnline = () => {
      setIsOnline(true);
      if (userId) {
        // Auto-sync when coming back online
        syncService.sync(userId).catch((error) => {
          console.error('Auto-sync error:', error);
        });
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const unsubscribe = syncService.subscribe(setStatus);

    // Initial sync if online
    if (userId && navigator.onLine) {
      syncService.sync(userId).catch(console.error);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      unsubscribe();
    };
  }, [userId]);

  const syncNow = async () => {
    if (userId && isOnline) {
      try {
        await syncService.sync(userId);
      } catch (error) {
        console.error('Manual sync error:', error);
        throw error;
      }
    }
  };

  return {
    status,
    isOnline,
    syncNow,
  };
}
