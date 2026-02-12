'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { usePinLock } from '@/hooks/usePinLock';

export default function LockPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { unlockPin, checking } = usePinLock();
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [unlocking, setUnlocking] = useState(false);

  useEffect(() => {
    // If not authenticated, redirect to login
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  // If already unlocked, redirect
  useEffect(() => {
    if (!checking && !authLoading && user) {
      const unlockedUntil = localStorage.getItem('pinUnlockedUntil');
      if (unlockedUntil && parseInt(unlockedUntil, 10) > Date.now()) {
        router.push('/today');
      }
    }
  }, [checking, authLoading, user, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setUnlocking(true);

    const success = await unlockPin(pin);
    if (success) {
      router.push('/today');
    } else {
      setError('PIN incorrecto');
      setPin('');
    }
    setUnlocking(false);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, ''); // Only digits
    if (value.length <= 6) {
      setPin(value);
      setError('');
    }
  };

  if (authLoading || checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-600">Cargando...</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Macros & Peso
          </h1>
          <p className="text-gray-600">Ingresa tu PIN para continuar</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-center">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="pin" className="sr-only">
              PIN
            </label>
            <input
              id="pin"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={pin}
              onChange={handleChange}
              className="w-full text-center text-3xl font-mono tracking-widest border-2 border-gray-300 rounded-lg px-4 py-4 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="••••"
              autoFocus
              maxLength={6}
              disabled={unlocking}
            />
            <p className="mt-2 text-center text-sm text-gray-500">
              PIN de 4 a 6 dígitos
            </p>
          </div>

          <button
            type="submit"
            disabled={unlocking || pin.length < 4}
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {unlocking ? 'Verificando...' : 'Desbloquear'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => {
              localStorage.removeItem('pinUnlockedUntil');
              router.push('/login');
            }}
            className="text-sm text-gray-600 hover:text-gray-900"
          >
            Cerrar sesión
          </button>
        </div>
      </div>
    </div>
  );
}
