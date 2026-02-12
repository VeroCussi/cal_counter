'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Food } from '@/types';
import { FoodSearchModal } from '@/components/food/FoodSearchModal';
import { OfflineService } from '@/lib/offline-service';
import { calculateMacros } from '@/lib/macros';
import { useToastContext } from '@/components/ui/ToastContainer';

export default function AddEntryPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const toast = useToastContext();
  const date = searchParams.get('date') || new Date().toISOString().split('T')[0];
  const mealType = searchParams.get('meal') || 'breakfast';
  const [selectedFood, setSelectedFood] = useState<Food | null>(null);
  const [grams, setGrams] = useState('');
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFood || !grams || !user) return;

    const gramsNum = parseFloat(grams);
    if (isNaN(gramsNum) || gramsNum <= 0) {
      toast.error('La cantidad debe ser un número positivo');
      return;
    }

    setLoading(true);
    try {
      // Calculate macros
      const computedMacros = calculateMacros(selectedFood, gramsNum);

      // Use offline-first service
      await OfflineService.createEntry(user._id, {
        date,
        mealType: mealType as any,
        foodId: selectedFood._id,
        quantity: { grams: gramsNum },
        computedMacros,
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
                      {selectedFood.macros.kcal} kcal por 100g
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedFood(null)}
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
            <div className="bg-gray-100 p-3 rounded text-sm">
              <p className="font-medium">{selectedFood.name}</p>
              {selectedFood.brand && <p className="text-gray-600">{selectedFood.brand}</p>}
              <p className="text-gray-600 mt-1">
                {selectedFood.macros.kcal} kcal por 100g
              </p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-2">Cantidad (gramos)</label>
            <input
              type="number"
              step="0.1"
              value={grams}
              onChange={(e) => setGrams(e.target.value)}
              className="w-full border rounded px-3 py-2"
              placeholder="100"
              required
            />
          </div>

          {selectedFood && grams && !isNaN(parseFloat(grams)) && (
            <div className="bg-blue-50 p-3 rounded text-sm">
              <p className="font-medium mb-1">Macros calculados:</p>
              <p>
                {Math.round((selectedFood.macros.kcal * parseFloat(grams)) / 100)} kcal
              </p>
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
              disabled={loading || !selectedFood || !grams}
              className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded disabled:opacity-50"
            >
              {loading ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>

        <FoodSearchModal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          onSelectFood={setSelectedFood}
        />
      </div>
    </div>
  );
}
