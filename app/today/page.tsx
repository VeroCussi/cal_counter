'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { MacroRing } from '@/components/macros/MacroRing';
import { OfflineBadge } from '@/components/sync/OfflineBadge';
import { SyncButton } from '@/components/sync/SyncButton';
import { EditEntryModal } from '@/components/entry/EditEntryModal';
import { MealSection } from '@/components/entry/MealSection';
import { OfflineService, EntryWithFood } from '@/lib/offline-service';
import { useToastContext } from '@/components/ui/ToastContainer';
import { BottomNavigation } from '@/components/navigation/BottomNavigation';
import { AddWaterModal } from '@/components/water/AddWaterModal';
import { WaterTracker } from '@/components/water/WaterTracker';

const mealTypes = [
  { key: 'breakfast', label: 'Desayuno' },
  { key: 'lunch', label: 'Comida' },
  { key: 'dinner', label: 'Cena' },
  { key: 'snack', label: 'Snacks' },
];

export default function TodayPage() {
  const { user, loading } = useAuth();
  const toast = useToastContext();
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [entries, setEntries] = useState<EntryWithFood[]>([]);
  const [loadingEntries, setLoadingEntries] = useState(true);
  const [editingEntry, setEditingEntry] = useState<EntryWithFood | null>(null);
  const [showWaterModal, setShowWaterModal] = useState(false);
  const [waterAmount, setWaterAmount] = useState(0); // ml de agua consumidos
  const waterGoal = (user?.settings as any)?.waterGoalMl || 2000; // default 2000ml

  useEffect(() => {
    if (user) {
      loadEntries();
      loadWater();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, date]);

  const loadEntries = async () => {
    if (!user) return;
    
    try {
      setLoadingEntries(true);
      // Use offline-first service
      const loadedEntries = await OfflineService.loadEntries(user._id, date);
      setEntries(loadedEntries);
    } catch (error) {
      console.error('Error loading entries:', error);
      toast.error('Error al cargar entradas');
    } finally {
      setLoadingEntries(false);
    }
  };

  const loadWater = async () => {
    if (!user) return;
    
    try {
      const totalAmount = await OfflineService.loadWater(user._id, date);
      setWaterAmount(totalAmount);
    } catch (error) {
      console.error('Error loading water:', error);
    }
  };

  const handleDeleteEntry = async (entryId: string) => {
    if (!user) return;
    
    if (!confirm('¿Estás seguro de que quieres eliminar esta entrada?')) {
      return;
    }

    try {
      await OfflineService.deleteEntry(user._id, entryId);
      
      // Try to sync if online
      if (navigator.onLine) {
        const { syncService } = await import('@/lib/sync/sync-service');
        syncService.sync(user._id).catch((err) => {
          console.error('Sync error:', err);
          toast.warning('Entrada eliminada localmente, se sincronizará cuando haya conexión');
        });
        toast.success('Entrada eliminada');
      } else {
        toast.info('Entrada eliminada localmente, se sincronizará cuando haya conexión');
      }
      
      loadEntries();
    } catch (error) {
      console.error('Error deleting entry:', error);
      const errorMsg = error instanceof Error ? error.message : 'Error al eliminar entrada';
      toast.error(errorMsg);
    }
  };

  // Remove duplicates by _id before calculating totals (same logic as meal sections)
  const uniqueEntriesMap = new Map<string, EntryWithFood>();
  entries.forEach((entry) => {
    if (!uniqueEntriesMap.has(entry._id)) {
      uniqueEntriesMap.set(entry._id, entry);
    }
  });
  const uniqueEntries = Array.from(uniqueEntriesMap.values());

  const totals = uniqueEntries.reduce(
    (acc, entry) => ({
      kcal: acc.kcal + entry.computedMacros.kcal,
      protein: acc.protein + entry.computedMacros.protein,
      carbs: acc.carbs + entry.computedMacros.carbs,
      fat: acc.fat + entry.computedMacros.fat,
    }),
    { kcal: 0, protein: 0, carbs: 0, fat: 0 }
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-gray-900 dark:text-gray-100">Cargando...</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20">
      {user && <OfflineBadge userId={user._id} />}
      
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="mb-6">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Hoy</h1>
            <div className="flex gap-2">
              {user && <SyncButton userId={user._id} />}
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              />
            </div>
          </div>
          <p className="text-gray-600 dark:text-gray-300">{formatDate(date)}</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6 animate-fade-in transition-smooth hover:shadow-md">
          <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">Resumen del día</h2>
          <MacroRing current={totals} goals={user.settings.goals} />
          
          {/* Water Tracker */}
          <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
            <WaterTracker current={waterAmount} goal={waterGoal} />
          </div>
        </div>

        {mealTypes.map((meal, index) => (
          <MealSection
            key={meal.key}
            mealType={meal.key as 'breakfast' | 'lunch' | 'dinner' | 'snack'}
            mealLabel={meal.label}
            entries={entries}
            date={date}
            onEditEntry={setEditingEntry}
            onDeleteEntry={handleDeleteEntry}
            index={index}
          />
        ))}
      </div>

      {/* Bottom Navigation with integrated FAB */}
      <BottomNavigation
        currentDate={date}
        onAddWater={() => setShowWaterModal(true)}
      />

      <EditEntryModal
        isOpen={editingEntry !== null}
        entry={editingEntry}
        onClose={() => setEditingEntry(null)}
        onSave={loadEntries}
      />

      <AddWaterModal
        isOpen={showWaterModal}
        onClose={() => setShowWaterModal(false)}
        date={date}
        onSuccess={() => {
          loadWater();
        }}
      />
    </div>
  );
}
