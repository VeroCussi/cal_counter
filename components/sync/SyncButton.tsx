'use client';

import { useSync } from '@/hooks/useSync';
import { useToastContext } from '@/components/ui/ToastContainer';

export function SyncButton({ userId }: { userId: string }) {
  const { status, isOnline, syncNow } = useSync(userId);
  const toast = useToastContext();

  const handleClick = async () => {
    if (!isOnline) {
      toast.warning('Sin conexión a internet');
      return;
    }

    try {
      await syncNow();
      toast.success('Sincronización completada');
    } catch (error) {
      toast.error('Error al sincronizar');
    }
  };

  if (!isOnline) {
    return (
      <button
        disabled
        className="px-3 py-1 text-xs bg-gray-400 text-white rounded cursor-not-allowed"
        title="Sin conexión"
      >
        Sin conexión
      </button>
    );
  }

  return (
    <button
      onClick={handleClick}
      disabled={status === 'syncing'}
      className="px-3 py-1 text-xs bg-indigo-600 text-white rounded disabled:opacity-50 transition-smooth hover:bg-indigo-700"
      title="Sincronizar datos"
    >
      {status === 'syncing' ? 'Sincronizando...' : 'Sincronizar'}
    </button>
  );
}
