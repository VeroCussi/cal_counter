'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { BottomNavigation } from '@/components/navigation/BottomNavigation';
import { WeightChart } from '@/components/weight/WeightChart';
import { OfflineService } from '@/lib/offline-service';

interface WeightEntry {
  _id: string;
  date: string;
  weightKg: number;
}

export default function WeightPage() {
  const { user, loading } = useAuth();
  const [weights, setWeights] = useState<WeightEntry[]>([]);
  const [todayWeight, setTodayWeight] = useState('');
  const [loadingWeights, setLoadingWeights] = useState(true);

  useEffect(() => {
    if (user) {
      loadWeights();
    }
  }, [user]);

  const loadWeights = async () => {
    if (!user) return;
    
    try {
      setLoadingWeights(true);
      const today = new Date();
      const ninetyDaysAgo = new Date(today);
      ninetyDaysAgo.setDate(today.getDate() - 90);
      const from = ninetyDaysAgo.toISOString().split('T')[0];
      const to = today.toISOString().split('T')[0];

      // Use offline-first service
      const loadedWeights = await OfflineService.loadWeights(user._id, from, to);
      setWeights(loadedWeights);
    } catch (error) {
      console.error('Error loading weights:', error);
    } finally {
      setLoadingWeights(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    const weight = parseFloat(todayWeight);
    if (isNaN(weight) || weight <= 0) return;

    try {
      const today = new Date().toISOString().split('T')[0];
      
      // Use offline-first service
      const result = await OfflineService.createWeight(user._id, {
        date: today,
        weightKg: weight,
      });

      // Try to sync if online
      if (navigator.onLine && !result.synced) {
        const { syncService } = await import('@/lib/sync/sync-service');
        syncService.sync(user._id).catch((err) => {
          console.error('Sync error:', err);
        });
      }

      setTodayWeight('');
      loadWeights();
    } catch (error) {
      console.error('Error saving weight:', error);
    }
  };


  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-gray-900 dark:text-gray-100">Cargando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20">
      <div className="max-w-2xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold mb-6 text-gray-900 dark:text-gray-100">Peso</h1>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6 animate-fade-in transition-smooth hover:shadow-md">
          <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">Registrar peso de hoy</h2>
          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              type="number"
              step="0.1"
              placeholder="Peso en kg"
              value={todayWeight}
              onChange={(e) => setTodayWeight(e.target.value)}
              className="flex-1 border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-indigo-600 text-white rounded"
            >
              Guardar
            </button>
          </form>
        </div>

        {loadingWeights ? (
          <div className="text-center py-8 text-gray-900 dark:text-gray-100">Cargando...</div>
        ) : weights.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            No hay registros de peso
          </div>
        ) : (
          <>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6 animate-fade-in transition-smooth hover:shadow-md">
              <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">Últimos registros</h2>
              <div className="space-y-2">
                {weights.slice(0, 10).map((w, index) => (
                  <div 
                    key={w._id} 
                    className="flex justify-between text-sm animate-slide-up transition-smooth hover:bg-gray-50 dark:hover:bg-gray-700 p-2 rounded text-gray-900 dark:text-gray-100"
                    style={{ animationDelay: `${index * 30}ms` }}
                  >
                    <span>{new Date(w.date).toLocaleDateString('es-ES')}</span>
                    <span className="font-medium">{w.weightKg} kg</span>
                  </div>
                ))}
              </div>
            </div>

            {weights.length > 0 && <WeightChart weights={weights} />}
          </>
        )}
      </div>

      {/* Bottom Navigation */}
      <BottomNavigation />
    </div>
  );
}
