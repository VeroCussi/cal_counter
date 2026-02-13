'use client';

import { useState, useEffect } from 'react';
import { Food } from '@/types';
import { FoodSearchModal } from '@/components/food/FoodSearchModal';
import { OfflineService, EntryWithFood } from '@/lib/offline-service';
import { useToastContext } from '@/components/ui/ToastContainer';

interface EditEntryModalProps {
  isOpen: boolean;
  entry: EntryWithFood | null;
  onClose: () => void;
  onSave: () => void;
}

export function EditEntryModal({ isOpen, entry, onClose, onSave }: EditEntryModalProps) {
  const toast = useToastContext();
  const [selectedFood, setSelectedFood] = useState<Food | null>(null);
  const [grams, setGrams] = useState('');
  const [mealType, setMealType] = useState<'breakfast' | 'lunch' | 'dinner' | 'snack'>('breakfast');
  const [loading, setLoading] = useState(false);
  const [showFoodModal, setShowFoodModal] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (entry) {
      setSelectedFood({
        _id: entry.foodId._id,
        ownerUserId: '',
        name: entry.foodId.name,
        brand: entry.foodId.brand,
        serving: { type: 'per100g' },
        macros: entry.foodId.macros || {
          kcal: 0,
          protein: 0,
          carbs: 0,
          fat: 0,
        },
        source: 'custom',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      setGrams(entry.quantity.grams.toString());
      setMealType(entry.mealType);
      setError('');
    }
  }, [entry]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFood || !entry || !grams) return;

    const gramsNum = parseFloat(grams);
    if (isNaN(gramsNum) || gramsNum <= 0) {
      setError('La cantidad debe ser un número positivo');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Get userId from entry
      const userId = entry.ownerUserId || '';
      
      // Calculate macros
      const { calculateMacros } = await import('@/lib/macros');
      const computedMacros = calculateMacros(selectedFood, gramsNum);

      // Use offline-first service
      await OfflineService.updateEntry(userId, entry._id, {
        date: entry.date,
        mealType,
        foodId: selectedFood._id,
        quantity: { grams: gramsNum },
        computedMacros,
      });

      // Try to sync if online
      if (navigator.onLine && userId) {
        const { syncService } = await import('@/lib/sync/sync-service');
        syncService.sync(userId).catch((err) => {
          console.error('Sync error:', err);
          toast.warning('Entrada guardada localmente, se sincronizará cuando haya conexión');
        });
      } else {
        toast.info('Entrada guardada localmente, se sincronizará cuando haya conexión');
      }

      toast.success('Entrada actualizada');
      onSave();
      onClose();
    } catch (error) {
      console.error('Error updating entry:', error);
      const errorMsg = error instanceof Error ? error.message : 'Error al actualizar entrada';
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !entry) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6 animate-scale-in">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Editar entrada</h2>
            <button
              onClick={onClose}
              className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 text-2xl"
            >
              ×
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-200 px-4 py-3 rounded text-sm">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-gray-100">Tipo de comida</label>
              <select
                value={mealType}
                onChange={(e) => setMealType(e.target.value as any)}
                className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              >
                <option value="breakfast">Desayuno</option>
                <option value="lunch">Comida</option>
                <option value="dinner">Cena</option>
                <option value="snack">Snacks</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-gray-100">Alimento</label>
              {selectedFood ? (
                <div className="border border-gray-300 dark:border-gray-600 rounded p-3 bg-gray-50 dark:bg-gray-900">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-gray-100">{selectedFood.name}</p>
                      {selectedFood.brand && (
                        <p className="text-sm text-gray-600 dark:text-gray-300">{selectedFood.brand}</p>
                      )}
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {selectedFood.macros.kcal} kcal por 100g
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowFoodModal(true)}
                      className="text-indigo-600 dark:text-indigo-400 text-sm hover:text-indigo-800 dark:hover:text-indigo-300"
                    >
                      Cambiar
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowFoodModal(true)}
                  className="w-full border-2 border-dashed border-gray-300 dark:border-gray-600 rounded px-3 py-4 text-gray-600 dark:text-gray-300 transition-smooth hover:border-indigo-600 dark:hover:border-indigo-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900"
                >
                  + Seleccionar alimento
                </button>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-gray-100">Cantidad (gramos)</label>
              <input
                type="number"
                step="0.1"
                value={grams}
                onChange={(e) => setGrams(e.target.value)}
                className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                placeholder="100"
                required
              />
            </div>

            {selectedFood && grams && !isNaN(parseFloat(grams)) && (
              <div className="bg-blue-50 dark:bg-blue-900 p-3 rounded text-sm border border-blue-200 dark:border-blue-700">
                <p className="font-medium mb-1 text-gray-900 dark:text-gray-100">Macros calculados:</p>
                <p className="text-gray-900 dark:text-gray-100">
                  {Math.round((selectedFood.macros.kcal * parseFloat(grams)) / 100)} kcal |{' '}
                  P: {Math.round((selectedFood.macros.protein * parseFloat(grams)) / 100)}g |{' '}
                  C: {Math.round((selectedFood.macros.carbs * parseFloat(grams)) / 100)}g |{' '}
                  G: {Math.round((selectedFood.macros.fat * parseFloat(grams)) / 100)}g
                </p>
              </div>
            )}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded transition-smooth hover:bg-gray-50 dark:hover:bg-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading || !selectedFood || !grams}
                className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded disabled:opacity-50 transition-smooth hover:bg-indigo-700"
              >
                {loading ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </form>
        </div>
      </div>

      <FoodSearchModal
        isOpen={showFoodModal}
        onClose={() => setShowFoodModal(false)}
        onSelectFood={setSelectedFood}
      />
    </>
  );
}
