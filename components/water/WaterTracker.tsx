'use client';

interface WaterTrackerProps {
  current: number; // ml consumidos
  goal: number; // ml objetivo (default 2000ml)
}

export function WaterTracker({ current, goal }: WaterTrackerProps) {
  const percentage = Math.min((current / goal) * 100, 100);
  const normalizedPercentage = Math.min(Math.max(percentage, 0), 100);

  return (
    <div className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <svg
            className="w-5 h-5 text-blue-600 dark:text-blue-400"
            fill="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0L12 2.69z" />
          </svg>
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">Agua</h3>
        </div>
        <div className="text-right">
          <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
            {Math.round(current)}ml
          </div>
          <div className="text-xs text-gray-600 dark:text-gray-400">
            de {goal}ml objetivo
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="relative w-full bg-blue-100 dark:bg-blue-900/50 rounded-full h-3 overflow-hidden">
        <div
          className="bg-gradient-to-r from-blue-500 to-cyan-500 h-3 rounded-full transition-all duration-500 ease-out"
          style={{ width: `${normalizedPercentage}%` }}
        />
      </div>

      {/* Percentage indicator */}
      <div className="mt-2 text-center">
        <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
          {Math.round(normalizedPercentage)}% completado
        </span>
      </div>
    </div>
  );
}
