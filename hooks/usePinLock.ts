'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const PIN_UNLOCKED_UNTIL_KEY = 'pinUnlockedUntil';
const PIN_REMEMBER_MINUTES_KEY = 'pinRememberMinutes';

export function usePinLock() {
  const [isLocked, setIsLocked] = useState(true);
  const [checking, setChecking] = useState(true);
  const router = useRouter();

  useEffect(() => {
    checkPinStatus();
  }, []);

  const checkPinStatus = () => {
    setChecking(true);
    try {
      // Check if we're in browser environment
      if (typeof window === 'undefined') {
        setIsLocked(true);
        setChecking(false);
        return;
      }

      const unlockedUntil = localStorage.getItem(PIN_UNLOCKED_UNTIL_KEY);
      const rememberMinutes = localStorage.getItem(PIN_REMEMBER_MINUTES_KEY);

      if (unlockedUntil && rememberMinutes) {
        const unlockTime = parseInt(unlockedUntil, 10);
        const now = Date.now();

        if (now < unlockTime) {
          // Still unlocked
          setIsLocked(false);
          setChecking(false);
          return;
        }
      }

      // Locked or expired
      setIsLocked(true);
      setChecking(false);
    } catch (error) {
      console.error('Error checking PIN status:', error);
      setIsLocked(true);
      setChecking(false);
    }
  };

  const unlockPin = async (pin: string): Promise<boolean> => {
    try {
      const res = await fetch('/api/auth/verify-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
      });

      if (!res.ok) {
        return false;
      }

      // Get remember minutes from user settings (default 15)
      const meRes = await fetch('/api/auth/me');
      let rememberMinutes = 15;
      if (meRes.ok) {
        const data = await meRes.json();
        rememberMinutes = data.user?.settings?.pinRememberMinutes || 15;
      }

      // Store unlock time (only in browser)
      if (typeof window !== 'undefined') {
        const unlockTime = Date.now() + rememberMinutes * 60 * 1000;
        localStorage.setItem(PIN_UNLOCKED_UNTIL_KEY, unlockTime.toString());
        localStorage.setItem(PIN_REMEMBER_MINUTES_KEY, rememberMinutes.toString());
      }

      setIsLocked(false);
      return true;
    } catch (error) {
      console.error('Error unlocking PIN:', error);
      return false;
    }
  };

  const lockPin = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(PIN_UNLOCKED_UNTIL_KEY);
      localStorage.removeItem(PIN_REMEMBER_MINUTES_KEY);
    }
    setIsLocked(true);
    router.push('/lock');
  };

  return {
    isLocked,
    checking,
    unlockPin,
    lockPin,
    checkPinStatus,
  };
}
