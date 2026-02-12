'use client';

import { useSync } from '@/hooks/useSync';

export function OfflineBadge({ userId }: { userId: string }) {
  const { isOnline } = useSync(userId);

  if (isOnline) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 bg-yellow-500 text-white px-3 py-1 rounded-full text-xs font-medium z-50">
      Sin conexión
    </div>
  );
}
