'use client';

import Link from 'next/link';
import { EntryWithFood } from '@/lib/offline-service';

interface MealSectionProps {
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  mealLabel: string;
  entries: EntryWithFood[];
  date: string;
  onEditEntry: (entry: EntryWithFood) => void;
  onDeleteEntry: (entryId: string) => void;
  index?: number;
}

export function MealSection({
  mealType,
  mealLabel,
  entries,
  date,
  onEditEntry,
  onDeleteEntry,
  index = 0,
}: MealSectionProps) {
  const formatQuantity = (entry: EntryWithFood) => {
    // If we have custom serving ID, try to find the label
    if (entry.quantity.customServingId && entry.foodId.serving?.customServings) {
      const customServing = entry.foodId.serving.customServings.find(
        (s) => s.id === entry.quantity.customServingId
      );
      if (customServing) {
        // Show label with value and unit
        const unit = entry.quantity.displayUnit || 'g';
        return `${customServing.label} (${customServing.value} ${unit})`;
      }
    }
    
    // If we have display value and unit, use that
    if (entry.quantity.displayValue && entry.quantity.displayUnit) {
      return `${entry.quantity.displayValue} ${entry.quantity.displayUnit}`;
    }
    
    // Default: show grams
    return `${entry.quantity.grams}g`;
  };

  // Remove duplicates by _id
  const mealEntriesMap = new Map<string, EntryWithFood>();
  entries
    .filter((e) => e.mealType === mealType)
    .forEach((entry) => {
      if (!mealEntriesMap.has(entry._id)) {
        mealEntriesMap.set(entry._id, entry);
      }
    });
  const mealEntries = Array.from(mealEntriesMap.values());
  
  const mealTotal = mealEntries.reduce(
    (acc, e) => ({
      kcal: acc.kcal + e.computedMacros.kcal,
      protein: acc.protein + e.computedMacros.protein,
      carbs: acc.carbs + e.computedMacros.carbs,
      fat: acc.fat + e.computedMacros.fat,
    }),
    { kcal: 0, protein: 0, carbs: 0, fat: 0 }
  );

  return (
    <div 
      className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mb-4 animate-slide-up transition-smooth hover:shadow-md"
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <div className="flex justify-between items-center mb-3">
        <h3 className="font-semibold text-gray-900 dark:text-gray-100">{mealLabel}</h3>
        <span className="text-sm text-gray-600 dark:text-gray-300">
          {Math.round(mealTotal.kcal)} kcal
        </span>
      </div>

      {mealEntries.length === 0 ? (
        <p className="text-gray-400 dark:text-gray-500 text-sm mb-2">No hay alimentos</p>
      ) : (
        <ul className="space-y-2 mb-3">
          {mealEntries.map((entry, entryIndex) => (
            <li key={`${entry._id}-${mealType}-${entryIndex}`} className="flex justify-between items-center text-sm group">
              <span className="text-gray-900 dark:text-gray-100">
                {entry.foodId.name}
                {entry.foodId.brand && ` (${entry.foodId.brand})`}
                <span className="text-gray-500 dark:text-gray-400 ml-2">
                  {formatQuantity(entry)}
                </span>
              </span>
              <div className="flex items-center gap-2">
                <span className="text-gray-600 dark:text-gray-300">
                  {Math.round(entry.computedMacros.kcal)} kcal
                </span>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => onEditEntry(entry)}
                    className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 text-xs px-2 py-1 rounded hover:bg-indigo-50 dark:hover:bg-indigo-900"
                    title="Editar"
                  >
                    ✏️
                  </button>
                  <button
                    onClick={() => onDeleteEntry(entry._id)}
                    className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 text-xs px-2 py-1 rounded hover:bg-red-50 dark:hover:bg-red-900"
                    title="Eliminar"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Link
        href={`/today/add?date=${date}&meal=${mealType}`}
        className="text-indigo-600 dark:text-indigo-400 text-sm font-medium hover:underline"
      >
        + Añadir alimento
      </Link>
    </div>
  );
}
