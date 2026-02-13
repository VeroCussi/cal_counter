'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { AddWaterModal } from '@/components/water/AddWaterModal';
import { useState } from 'react';

interface BottomNavigationProps {
  currentDate?: string;
  onAddWater?: () => void;
}

export function BottomNavigation({ currentDate, onAddWater }: BottomNavigationProps) {
  const [showWaterModal, setShowWaterModal] = useState(false);
  const pathname = usePathname();
  
  // Get current date if not provided
  const date = currentDate || new Date().toISOString().split('T')[0];

  const handleAddWater = () => {
    if (onAddWater) {
      // Use provided callback if available (from Today page)
      onAddWater();
    } else {
      // Otherwise, show modal directly
      setShowWaterModal(true);
    }
  };

  const isActive = (path: string) => pathname === path;

  return (
    <>
      {/* Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 z-50">
        <div className="max-w-2xl mx-auto flex items-center justify-around relative px-2">
          {/* Today */}
          <Link
            href="/today"
            className={`flex-1 py-3 text-center transition-colors ${
              isActive('/today')
                ? 'text-indigo-600 dark:text-indigo-400 font-medium'
                : 'text-gray-600 dark:text-gray-300'
            }`}
          >
            Hoy
          </Link>

          {/* Foods */}
          <Link
            href="/foods"
            className={`flex-1 py-3 text-center transition-colors ${
              isActive('/foods')
                ? 'text-indigo-600 dark:text-indigo-400 font-medium'
                : 'text-gray-600 dark:text-gray-300'
            }`}
          >
            Alimentos
          </Link>

          {/* Center - Water Button */}
          <div className="relative flex-shrink-0 mx-2">
            <button
              onClick={handleAddWater}
              className="w-14 h-14 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg flex items-center justify-center transition-all duration-300 transform hover:scale-110 active:scale-95 -translate-y-7"
              aria-label="Añadir agua"
            >
              <svg
                className="w-6 h-6"
                fill="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0L12 2.69z" />
              </svg>
            </button>
          </div>

          {/* Weight */}
          <Link
            href="/weight"
            className={`flex-1 py-3 text-center transition-colors ${
              isActive('/weight')
                ? 'text-indigo-600 dark:text-indigo-400 font-medium'
                : 'text-gray-600 dark:text-gray-300'
            }`}
          >
            Peso
          </Link>

          {/* Settings */}
          <Link
            href="/settings"
            className={`flex-1 py-3 text-center transition-colors ${
              isActive('/settings')
                ? 'text-indigo-600 dark:text-indigo-400 font-medium'
                : 'text-gray-600 dark:text-gray-300'
            }`}
          >
            Ajustes
          </Link>
        </div>
      </nav>

      {/* Water Modal - shown when onAddWater is not provided */}
      {!onAddWater && (
        <AddWaterModal
          isOpen={showWaterModal}
          onClose={() => setShowWaterModal(false)}
          date={date}
        />
      )}
    </>
  );
}
