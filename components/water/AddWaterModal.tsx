'use client';

import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useToastContext } from '@/components/ui/ToastContainer';

interface AddWaterModalProps {
  isOpen: boolean;
  onClose: () => void;
  date: string;
  onSuccess?: () => void;
}

const quickAmounts = [250, 500, 750, 1000];

export function AddWaterModal({ isOpen, onClose, date, onSuccess }: AddWaterModalProps) {
  const { user } = useAuth();
  const toast = useToastContext();
  const [customAmount, setCustomAmount] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleQuickAdd = async (amount: number) => {
    if (!user) return;
    
    setLoading(true);
    try {
      // Use offline-first service
      const { OfflineService } = await import('@/lib/offline-service');
      await OfflineService.createWater(user._id, {
        date,
        amountMl: amount,
      });

      // Try to sync if online
      if (navigator.onLine) {
        const { syncService } = await import('@/lib/sync/sync-service');
        syncService.sync(user._id).catch((err) => {
          console.error('Sync error:', err);
          toast.warning('Agua guardada localmente, se sincronizará cuando haya conexión');
        });
        toast.success(`${amount}ml de agua añadidos`);
      } else {
        toast.info('Agua guardada localmente, se sincronizará cuando haya conexión');
      }

      if (onSuccess) {
        onSuccess();
      }
      onClose();
    } catch (error) {
      console.error('Error adding water:', error);
      toast.error('Error al añadir agua');
    } finally {
      setLoading(false);
    }
  };

  const handleCustomAdd = async () => {
    const amount = parseFloat(customAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Ingresa una cantidad válida');
      return;
    }

    await handleQuickAdd(amount);
    setCustomAmount('');
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6 animate-scale-in">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Añadir agua</h2>
          <button
            onClick={onClose}
            className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 text-2xl"
          >
            ×
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-gray-100">
              Cantidad rápida
            </label>
            <div className="grid grid-cols-2 gap-2">
              {quickAmounts.map((amount) => (
                <button
                  key={amount}
                  onClick={() => handleQuickAdd(amount)}
                  disabled={loading}
                  className="px-4 py-3 bg-blue-50 dark:bg-blue-900 text-blue-700 dark:text-blue-200 rounded-lg font-medium hover:bg-blue-100 dark:hover:bg-blue-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {amount}ml
                </button>
              ))}
            </div>
          </div>

          <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
            <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-gray-100">
              Cantidad personalizada
            </label>
            <div className="flex gap-2">
              <input
                type="number"
                step="50"
                min="0"
                value={customAmount}
                onChange={(e) => setCustomAmount(e.target.value)}
                placeholder="Cantidad en ml"
                className="flex-1 border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
              />
              <button
                onClick={handleCustomAdd}
                disabled={loading || !customAmount}
                className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Añadir
              </button>
            </div>
          </div>

          {loading && (
            <div className="text-center text-sm text-gray-600 dark:text-gray-400">
              Guardando...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
