'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface User {
  _id: string;
  email: string;
  name: string;
  hasPin?: boolean; // PIN status from API
  settings: {
    goals: {
      kcal: number;
      protein: number;
      carbs: number;
      fat: number;
    };
    units: 'kg' | 'lb';
    timezone: string;
    pinRememberMinutes: number;
    profile?: {
      age?: number;
      gender?: 'male' | 'female';
      heightCm?: number;
      activityLevel?: 'sedentary' | 'lightly_active' | 'moderately_active' | 'very_active' | 'extremely_active';
      goal?: 'cut' | 'maintain' | 'bulk';
      cutIntensity?: 'gentle' | 'moderate' | 'aggressive';
      macroDistribution?: {
        type?: 'balanced' | 'high_protein' | 'keto' | 'low_carb' | 'custom';
        proteinPercent?: number;
        fatPercent?: number;
        carbsPercent?: number;
      };
    };
  };
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
      } else {
        // 401 is normal when not logged in, don't log as error
        setUser(null);
      }
    } catch (error) {
      // Network errors are fine, user is just not authenticated
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setUser(null);
    router.push('/login');
  };

  return {
    user,
    loading,
    logout,
    refresh: checkAuth,
  };
}
