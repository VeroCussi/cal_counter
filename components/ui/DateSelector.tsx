'use client';

import { useState } from 'react';

interface DateSelectorProps {
  value: string; // YYYY-MM-DD
  onChange: (date: string) => void;
}

export function DateSelector({ value, onChange }: DateSelectorProps) {
  const [showCalendar, setShowCalendar] = useState(false);

  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  const isToday = value === todayStr;
  const isYesterday = value === yesterdayStr;

  const handleQuickSelect = (date: string) => {
    onChange(date);
    setShowCalendar(false);
  };

  const formatDisplayDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    if (dateStr === todayStr) {
      return 'Hoy';
    } else if (dateStr === yesterdayStr) {
      return 'Ayer';
    } else {
      return date.toLocaleDateString('es-ES', { 
        weekday: 'short', 
        day: 'numeric', 
        month: 'short' 
      });
    }
  };

  return (
    <div className="relative">
      <div className="flex items-center gap-2">
        {/* Quick buttons */}
        <button
          type="button"
          onClick={() => handleQuickSelect(yesterdayStr)}
          className={`px-3 py-1 text-sm rounded transition-colors ${
            isYesterday
              ? 'bg-indigo-600 text-white'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
          }`}
        >
          Ayer
        </button>
        <button
          type="button"
          onClick={() => handleQuickSelect(todayStr)}
          className={`px-3 py-1 text-sm rounded transition-colors ${
            isToday
              ? 'bg-indigo-600 text-white'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
          }`}
        >
          Hoy
        </button>
        
        {/* Calendar button */}
        <button
          type="button"
          onClick={() => setShowCalendar(!showCalendar)}
          className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700"
        >
          📅 {formatDisplayDate(value)}
        </button>
      </div>

      {/* Calendar dropdown */}
      {showCalendar && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowCalendar(false)}
          />
          <div className="absolute top-full mt-2 left-0 z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-4">
            <input
              type="date"
              value={value}
              onChange={(e) => {
                onChange(e.target.value);
                setShowCalendar(false);
              }}
              className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
              max={todayStr}
            />
          </div>
        </>
      )}
    </div>
  );
}
