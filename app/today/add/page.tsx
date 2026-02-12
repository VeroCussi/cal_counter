'use client';

import { useState, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Food } from '@/types';
import { FoodSearchModal } from '@/components/food/FoodSearchModal';
import { OfflineService } from '@/lib/offline-service';
import { calculateMacros, convertDisplayValueToGrams } from '@/lib/macros';
import { useToastContext } from '@/components/ui/ToastContainer';

export default function AddEntryPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const toast = useToastContext();
  const date = searchParams.get('date') || new Date().toISOString().split('T')[0];
  const mealType = searchParams.get('meal') || 'breakfast';
  const [selectedFood, setSelectedFood] = useState<Food | null>(null);
  const [selectedCustomServingId, setSelectedCustomServingId] = useState<string | null>(null);
  const [customValue, setCustomValue] = useState('');
  const [loading, setLoading] = useState(false);
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
  }, [selectedFood, selectedCustomServingId, customValue, baseUnit, hasCustomServings]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFood || !user || grams <= 0) {
      toast.error('Selecciona un alimento y una cantidad válida');
      return;
    }

    setLoading(true);
    try {
      // Use offline-first service
      await OfflineService.createEntry(user._id, {
        date,
        mealType: mealType as any,
        foodId: selectedFood._id,
        quantity: {
          grams,
          unit: baseUnit,
          customServingId: selectedCustomServingId || undefined,
          displayValue: displayValue > 0 ? displayValue : undefined,
          displayUnit: baseUnit,
        },
        computedMacros: computedMacros!,
      });

      // Try to sync if online
      if (navigator.onLine) {
        const { syncService } = await import('@/lib/sync/sync-service');
        syncService.sync(user._id).catch((err) => {
          console.error('Sync error:', err);
          toast.warning('Entrada guardada localmente, se sincronizará cuando haya conexión');
        });
        toast.success('Entrada creada');
      } else {
        toast.info('Entrada guardada localmente, se sincronizará cuando haya conexión');
      }

      router.push(`/today?date=${date}`);
    } catch (error) {
      console.error('Error creating entry:', error);
      toast.error('Error al crear entrada');
    } finally {
      setLoading(false);
    }
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
    <div className="min-h-screen bg-gray-50 p-4 animate-fade-in">
      <div className="max-w-md mx-auto">
        <h1 className="text-2xl font-bold mb-6 animate-slide-down">Añadir alimento</h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Seleccionar alimento</label>
            {selectedFood ? (
              <div className="border rounded p-3 bg-gray-50">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium">{selectedFood.name}</p>
                    {selectedFood.brand && (
                      <p className="text-sm text-gray-600">{selectedFood.brand}</p>
                    )}
                    <p className="text-xs text-gray-500 mt-1">
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
                    className="text-red-600 text-sm"
                  >
                    Cambiar
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowModal(true)}
                className="w-full border-2 border-dashed border-gray-300 rounded px-3 py-4 text-gray-600 transition-smooth hover:border-indigo-600 hover:text-indigo-600 hover:bg-indigo-50 active:scale-95"
              >
                + Buscar alimento
              </button>
            )}
          </div>

          {selectedFood && (
            <div>
              <label className="block text-sm font-medium mb-2">Cantidad</label>
              
              {hasCustomServings ? (
                <div className="space-y-2">
                  <div className="space-y-2">
                    {selectedFood.serving.customServings!.map((serving) => (
                      <label
                        key={serving.id}
                        className={`flex items-center p-3 border rounded cursor-pointer transition-colors ${
                          selectedCustomServingId === serving.id
                            ? 'border-indigo-600 bg-indigo-50'
                            : 'border-gray-300 hover:border-gray-400'
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
                          <span className="font-medium">{serving.label}</span>
                          <span className="text-sm text-gray-600 ml-2">
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
                      <span className="font-medium mr-2">Personalizado:</span>
                      <input
                        type="number"
                        step="0.1"
                        value={customValue}
                        onChange={(e) => {
                          setCustomValue(e.target.value);
                          setSelectedCustomServingId(null);
                        }}
                        placeholder={`Cantidad (${unitLabel})`}
                        className="flex-1 border rounded px-2 py-1"
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
                  className="w-full border rounded px-3 py-2"
                  placeholder={`Cantidad (${unitLabel})`}
                  required
                />
              )}
            </div>
          )}

          {computedMacros && (
            <div className="bg-blue-50 p-4 rounded text-sm">
              <p className="font-medium mb-2">Macros calculados:</p>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-gray-600">Calorías:</span>{' '}
                  <span className="font-semibold">{Math.round(computedMacros.kcal)} kcal</span>
                </div>
                <div>
                  <span className="text-gray-600">Proteína:</span>{' '}
                  <span className="font-semibold">{computedMacros.protein}g</span>
                </div>
                <div>
                  <span className="text-gray-600">Carbohidratos:</span>{' '}
                  <span className="font-semibold">{computedMacros.carbs}g</span>
                </div>
                <div>
                  <span className="text-gray-600">Grasa:</span>{' '}
                  <span className="font-semibold">{computedMacros.fat}g</span>
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => router.back()}
              className="flex-1 px-4 py-2 border rounded"
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
      </div>
    </div>
  );
}
