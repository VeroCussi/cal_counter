'use client';

interface MacroRingProps {
  current: {
    kcal: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  goals: {
    kcal: number;
    protein: number;
    carbs: number;
    fat: number;
  };
}

interface CircularProgressProps {
  percentage: number;
  color: string;
  label: string;
  current: number;
  goal: number;
  unit: string;
  size?: number;
  strokeWidth?: number;
}

function CircularProgress({
  percentage,
  color,
  label,
  current,
  goal,
  unit,
  size = 80,
  strokeWidth = 8,
}: CircularProgressProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percentage / 100) * circumference;
  const normalizedPercentage = Math.min(Math.max(percentage, 0), 100);

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          className="transform -rotate-90"
        >
          {/* Background circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="currentColor"
            strokeWidth={strokeWidth}
            fill="none"
            className="text-gray-200 dark:text-gray-700"
          />
          {/* Progress circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={color}
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className="transition-all duration-500 ease-out"
          />
        </svg>
        {/* Center text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xs font-semibold text-gray-900 dark:text-gray-100">
            {Math.round(normalizedPercentage)}%
          </span>
        </div>
      </div>
      <div className="mt-2 text-center">
        <div className="text-xs font-medium text-gray-900 dark:text-gray-100">{label}</div>
        <div className="text-xs text-gray-600 dark:text-gray-400">
          {Math.round(current)} / {goal} {unit}
        </div>
      </div>
    </div>
  );
}

export function MacroRing({ current, goals }: MacroRingProps) {
  const percentages = {
    kcal: Math.min((current.kcal / goals.kcal) * 100, 100),
    protein: Math.min((current.protein / goals.protein) * 100, 100),
    carbs: Math.min((current.carbs / goals.carbs) * 100, 100),
    fat: Math.min((current.fat / goals.fat) * 100, 100),
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
      <CircularProgress
        percentage={percentages.kcal}
        color="#2563eb" // blue-600
        label="Calorías"
        current={current.kcal}
        goal={goals.kcal}
        unit="kcal"
        size={100}
        strokeWidth={10}
      />
      <CircularProgress
        percentage={percentages.protein}
        color="#16a34a" // green-600
        label="Proteína"
        current={current.protein}
        goal={goals.protein}
        unit="g"
        size={100}
        strokeWidth={10}
      />
      <CircularProgress
        percentage={percentages.carbs}
        color="#ca8a04" // yellow-600
        label="Carbohidratos"
        current={current.carbs}
        goal={goals.carbs}
        unit="g"
        size={100}
        strokeWidth={10}
      />
      <CircularProgress
        percentage={percentages.fat}
        color="#dc2626" // red-600
        label="Grasa"
        current={current.fat}
        goal={goals.fat}
        unit="g"
        size={100}
        strokeWidth={10}
      />
    </div>
  );
}
