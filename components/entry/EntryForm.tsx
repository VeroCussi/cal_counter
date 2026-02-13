'use client';

import { useState, useMemo } from 'react';
import { Food } from '@/types';
import { FoodSearchModal } from '@/components/food/FoodSearchModal';
import { calculateMacros, convertDisplayValueToGrams } from '@/lib/macros';

interface EntryFormProps {
  initialFood?: Food | null;
  initialQuantity?: {
    grams: number;
    customServingId?: string;
    displayValue?: number;
    displayUnit?: string;
  };
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  onSubmit: (data: {
    foodId: string;
    quantity: {
      grams: number;
      unit: string;
      customServingId?: string;
      displayValue?: number;
      displayUnit?: string;
    };
    computedMacros: {
      kcal: number;
      protein: number;
      carbs: number;
      fat: number;
    };
  }) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

export function EntryForm({
  initialFood = null,
  initialQuantity,
  mealType,
  onSubmit,
  onCancel,
  loading = false,
}: EntryFormProps) {
  const [selectedFood, setSelectedFood] = useState<Food | null>(initialFood);
  const [selectedCustomServingId, setSelectedCustomServingId] = useState<string | null>(
    initialQuantity?.customServingId || null
  );
  const [customValue, setCustomValue] = useState(
    initialQuantity?.displayValue?.toString() || ''
  );
  const [showModal, setShowModal] = useState(false);

  const baseUnit = selectedFood?.serving.baseUnit || 'g';
  const hasCustomServings = selectedFood?.serving.customServings && selectedFood.serving.customServings.length > 0;
  const unitLabel = baseUnit === 'ml' ? 'ml' : 'g';

  // Calculate display value and grams
  const { displayValue, grams, computedMacros } = useMemo(() => {
    if (!selectedFood) return { displayValue: 0, grams: 0, computedMacros: null };

    let displayVal = 0;
    let gramsValue = 0;

    if (selectedCustomServingId && hasCustomServings) {
      const customServing = selectedFood.serving.customServings!.find(
        (s) => s.id === selectedCustomServingId
      );
      if (customServing) {
        displayVal = customServing.value;
        gramsValue = convertDisplayValueToGrams(customServing.value, baseUnit, selectedFood);
      }
    } else if (customValue) {
      const val = parseFloat(customValue);
      if (!isNaN(val) && val > 0) {
        displayVal = val;
        gramsValue = convertDisplayValueToGrams(val, baseUnit, selectedFood);
      }
    } else if (initialQuantity?.grams) {
      // Use initial quantity if provided
      gramsValue = initialQuantity.grams;
      displayVal = initialQuantity.displayValue || initialQuantity.grams;
    }

    if (gramsValue > 0) {
      const macros = calculateMacros(selectedFood, gramsValue, {
        customServingId: selectedCustomServingId || undefined,
        displayValue: displayVal,
        displayUnit: baseUnit,
      });
      return { displayValue: displayVal, grams: gramsValue, computedMacros: macros };
    }

    return { displayValue: 0, grams: 0, computedMacros: null };
  }, [selectedFood, selectedCustomServingId, customValue, baseUnit, hasCustomServings, initialQuantity]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFood || grams <= 0 || !computedMacros) {
      return;
    }

    await onSubmit({
      foodId: selectedFood._id,
      quantity: {
        grams,
        unit: baseUnit,
        customServingId: selectedCustomServingId || undefined,
        displayValue: displayValue > 0 ? displayValue : undefined,
        displayUnit: baseUnit,
      },
      computedMacros,
    });
  };

  const handleFoodSelect = (food: Food) => {
    setSelectedFood(food);
    setSelectedCustomServingId(null);
    setCustomValue('');
    setShowModal(false);
  };

  const getMacroLabel = () => {
    if (!selectedFood) return '';
    const servingType = selectedFood.serving.type;
    if (servingType === 'per100g' || servingType === 'per100ml') {
      return `por 100${baseUnit}`;
    }
    return 'por porción';
  };

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-gray-100">
            Seleccionar alimento
          </label>
          {selectedFood ? (
            <div className="border border-gray-300 dark:border-gray-600 rounded p-3 bg-gray-50 dark:bg-gray-900">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-medium text-gray-900 dark:text-gray-100">{selectedFood.name}</p>
                  {selectedFood.brand && (
                    <p className="text-sm text-gray-600 dark:text-gray-300">{selectedFood.brand}</p>
                  )}
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {selectedFood.macros.kcal} kcal {getMacroLabel()}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedFood(null);
                    setSelectedCustomServingId(null);
                    setCustomValue('');
                  }}
                  className="text-red-600 dark:text-red-400 text-sm hover:text-red-800 dark:hover:text-red-300"
                >
                  Cambiar
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowModal(true)}
              className="w-full border-2 border-dashed border-gray-300 dark:border-gray-600 rounded px-3 py-4 text-gray-600 dark:text-gray-300 transition-smooth hover:border-indigo-600 dark:hover:border-indigo-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900 active:scale-95"
            >
              + Buscar alimento
            </button>
          )}
        </div>

        {selectedFood && (
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-gray-100">
              Cantidad
            </label>
            
            {hasCustomServings ? (
              <div className="space-y-2">
                <div className="space-y-2">
                  {selectedFood.serving.customServings!.map((serving) => (
                    <label
                      key={serving.id}
                      className={`flex items-center p-3 border rounded cursor-pointer transition-colors ${
                        selectedCustomServingId === serving.id
                          ? 'border-indigo-600 dark:border-indigo-500 bg-indigo-50 dark:bg-indigo-900'
                          : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
                      }`}
                    >
                      <input
                        type="radio"
                        name="customServing"
                        value={serving.id}
                        checked={selectedCustomServingId === serving.id}
                        onChange={(e) => {
                          setSelectedCustomServingId(e.target.value);
                          setCustomValue('');
                        }}
                        className="mr-3"
                      />
                      <div className="flex-1">
                        <span className="font-medium text-gray-900 dark:text-gray-100">{serving.label}</span>
                        <span className="text-sm text-gray-600 dark:text-gray-300 ml-2">
                          ({serving.value} {baseUnit})
                        </span>
                      </div>
                    </label>
                  ))}
                </div>
                
                <div className="pt-2 border-t">
                  <label className="flex items-center p-3 border rounded cursor-pointer transition-colors">
                    <input
                      type="radio"
                      name="customServing"
                      value="custom"
                      checked={selectedCustomServingId === null && customValue !== ''}
                      onChange={() => {
                        setSelectedCustomServingId(null);
                        setCustomValue(customValue || '');
                      }}
                      className="mr-3"
                    />
                    <span className="font-medium mr-2 text-gray-900 dark:text-gray-100">Personalizado:</span>
                    <input
                      type="number"
                      step="0.1"
                      value={customValue}
                      onChange={(e) => {
                        setCustomValue(e.target.value);
                        setSelectedCustomServingId(null);
                      }}
                      placeholder={`Cantidad (${unitLabel})`}
                      className="flex-1 border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                    />
                  </label>
                </div>
              </div>
            ) : (
              <input
                type="number"
                step="0.1"
                value={customValue}
                onChange={(e) => setCustomValue(e.target.value)}
                className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                placeholder={`Cantidad (${unitLabel})`}
                required
              />
            )}
          </div>
        )}

        {computedMacros && (
          <div className="bg-blue-50 dark:bg-blue-900 p-4 rounded text-sm border border-blue-200 dark:border-blue-700">
            <p className="font-medium mb-2 text-gray-900 dark:text-gray-100">Macros calculados:</p>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-gray-600 dark:text-gray-300">Calorías:</span>{' '}
                <span className="font-semibold text-gray-900 dark:text-gray-100">{Math.round(computedMacros.kcal)} kcal</span>
              </div>
              <div>
                <span className="text-gray-600 dark:text-gray-300">Proteína:</span>{' '}
                <span className="font-semibold text-gray-900 dark:text-gray-100">{computedMacros.protein}g</span>
              </div>
              <div>
                <span className="text-gray-600 dark:text-gray-300">Carbohidratos:</span>{' '}
                <span className="font-semibold text-gray-900 dark:text-gray-100">{computedMacros.carbs}g</span>
              </div>
              <div>
                <span className="text-gray-600 dark:text-gray-300">Grasa:</span>{' '}
                <span className="font-semibold text-gray-900 dark:text-gray-100">{computedMacros.fat}g</span>
              </div>
            </div>
          </div>
        )}

        <div className="flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={loading || !selectedFood || grams <= 0}
            className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded disabled:opacity-50"
          >
            {loading ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </form>

      <FoodSearchModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSelectFood={handleFoodSelect}
      />
    </>
  );
}
