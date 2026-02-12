'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { ProgressBars } from '@/components/macros/ProgressBars';
import { OfflineBadge } from '@/components/sync/OfflineBadge';
import { SyncButton } from '@/components/sync/SyncButton';
import { EditEntryModal } from '@/components/entry/EditEntryModal';
import { OfflineService, EntryWithFood } from '@/lib/offline-service';
import { useToastContext } from '@/components/ui/ToastContainer';
import Link from 'next/link';

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

  useEffect(() => {
    if (user) {
      loadEntries();
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

  const totals = entries.reduce(
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
      <div className="min-h-screen flex items-center justify-center">
        <div>Cargando...</div>
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

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {user && <OfflineBadge userId={user._id} />}
      
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="mb-6">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-2xl font-bold">Hoy</h1>
            <div className="flex gap-2">
              {user && <SyncButton userId={user._id} />}
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="border rounded px-2 py-1 text-sm"
              />
            </div>
          </div>
          <p className="text-gray-600">{formatDate(date)}</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6 mb-6 animate-fade-in transition-smooth hover:shadow-md">
          <h2 className="text-lg font-semibold mb-4">Resumen del día</h2>
          <ProgressBars current={totals} goals={user.settings.goals} />
        </div>

        {mealTypes.map((meal, index) => {
          const mealEntries = entries.filter((e) => e.mealType === meal.key);
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
              key={meal.key} 
              className="bg-white rounded-lg shadow p-4 mb-4 animate-slide-up transition-smooth hover:shadow-md"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-semibold">{meal.label}</h3>
                <span className="text-sm text-gray-600">
                  {Math.round(mealTotal.kcal)} kcal
                </span>
              </div>

              {mealEntries.length === 0 ? (
                <p className="text-gray-400 text-sm mb-2">No hay alimentos</p>
              ) : (
                <ul className="space-y-2 mb-3">
                  {mealEntries.map((entry) => (
                    <li key={entry._id} className="flex justify-between items-center text-sm group">
                      <span>
                        {entry.foodId.name}
                        {entry.foodId.brand && ` (${entry.foodId.brand})`}
                        <span className="text-gray-500 ml-2">
                          {formatQuantity(entry)}
                        </span>
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-600">
                          {Math.round(entry.computedMacros.kcal)} kcal
                        </span>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => setEditingEntry(entry)}
                            className="text-indigo-600 hover:text-indigo-800 text-xs px-2 py-1 rounded hover:bg-indigo-50"
                            title="Editar"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => handleDeleteEntry(entry._id)}
                            className="text-red-600 hover:text-red-800 text-xs px-2 py-1 rounded hover:bg-red-50"
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
                href={`/today/add?date=${date}&meal=${meal.key}`}
                className="text-indigo-600 text-sm font-medium hover:underline"
              >
                + Añadir alimento
              </Link>
            </div>
          );
        })}
      </div>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200">
        <div className="max-w-2xl mx-auto flex justify-around">
          <Link href="/today" className="flex-1 py-3 text-center text-indigo-600 font-medium">
            Hoy
          </Link>
          <Link href="/foods" className="flex-1 py-3 text-center text-gray-600">
            Alimentos
          </Link>
          <Link href="/weight" className="flex-1 py-3 text-center text-gray-600">
            Peso
          </Link>
          <Link href="/settings" className="flex-1 py-3 text-center text-gray-600">
            Ajustes
          </Link>
        </div>
      </nav>

      <EditEntryModal
        isOpen={editingEntry !== null}
        entry={editingEntry}
        onClose={() => setEditingEntry(null)}
        onSave={loadEntries}
      />
    </div>
  );
}
