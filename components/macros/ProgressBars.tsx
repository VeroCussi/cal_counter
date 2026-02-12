'use client';

interface ProgressBarsProps {
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

export function ProgressBars({ current, goals }: ProgressBarsProps) {
  const percentages = {
    kcal: Math.min((current.kcal / goals.kcal) * 100, 100),
    protein: Math.min((current.protein / goals.protein) * 100, 100),
    carbs: Math.min((current.carbs / goals.carbs) * 100, 100),
    fat: Math.min((current.fat / goals.fat) * 100, 100),
  };

  return (
    <div className="space-y-3">
      <div>
        <div className="flex justify-between text-sm mb-1">
          <span className="font-medium">Calorías</span>
          <span>{Math.round(current.kcal)} / {goals.kcal} kcal</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${percentages.kcal}%` }}
          />
        </div>
      </div>

      <div>
        <div className="flex justify-between text-sm mb-1">
          <span className="font-medium">Proteína</span>
          <span>{Math.round(current.protein)} / {goals.protein} g</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
          <div
            className="bg-green-600 h-2 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${percentages.protein}%` }}
          />
        </div>
      </div>

      <div>
        <div className="flex justify-between text-sm mb-1">
          <span className="font-medium">Carbohidratos</span>
          <span>{Math.round(current.carbs)} / {goals.carbs} g</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
          <div
            className="bg-yellow-600 h-2 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${percentages.carbs}%` }}
          />
        </div>
      </div>

      <div>
        <div className="flex justify-between text-sm mb-1">
          <span className="font-medium">Grasa</span>
          <span>{Math.round(current.fat)} / {goals.fat} g</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
          <div
            className="bg-red-600 h-2 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${percentages.fat}%` }}
          />
        </div>
      </div>
    </div>
  );
}
