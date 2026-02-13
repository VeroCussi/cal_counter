'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

interface PinProtectionProps {
  children: React.ReactNode;
}

const PUBLIC_ROUTES = ['/login', '/register', '/lock'];

export function PinProtection({ children }: PinProtectionProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading: authLoading } = useAuth();
  const [isChecking, setIsChecking] = useState(false);

  const isPublicRoute = PUBLIC_ROUTES.includes(pathname);

  useEffect(() => {
    // Skip checks for public routes
    if (isPublicRoute) {
      setIsChecking(false);
      return;
    }

    // For protected routes only
    setIsChecking(true);

    // Wait for auth to load
    if (authLoading) {
      return;
    }

    // If not authenticated, let middleware handle redirect
    if (!user) {
      setIsChecking(false);
      return;
    }

    // Check PIN status only if authenticated and PIN is enabled
    try {
      // Check if user has PIN enabled (from user object)
      if (user && !(user as any).hasPin) {
        // PIN is disabled, skip check
        setIsChecking(false);
        return;
      }

      const unlockedUntil = localStorage.getItem('pinUnlockedUntil');
      const now = Date.now();

      if (unlockedUntil && parseInt(unlockedUntil, 10) > now) {
        // Still unlocked
        setIsChecking(false);
        return;
      }

      // Locked or expired - redirect to lock page
      setIsChecking(false);
      if (pathname !== '/lock') {
        router.push('/lock');
      }
    } catch (error) {
      console.error('PIN check error:', error);
      setIsChecking(false);
    }
  }, [pathname, authLoading, user, router, isPublicRoute]);

  // For public routes, always render immediately - no checks needed
  if (isPublicRoute) {
    return <>{children}</>;
  }

  // For protected routes, show loading while checking
  if (isChecking || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-gray-600 dark:text-gray-300">Cargando...</div>
      </div>
    );
  }

  // Render children (middleware will handle redirect if not authenticated)
  return <>{children}</>;
}
