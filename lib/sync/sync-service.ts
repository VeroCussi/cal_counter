import { db, OutboxItem } from './dexie';

export type SyncStatus = 'idle' | 'syncing' | 'error';

class SyncService {
  private status: SyncStatus = 'idle';
  private listeners: Set<(status: SyncStatus) => void> = new Set();

  getStatus(): SyncStatus {
    return this.status;
  }

  subscribe(listener: (status: SyncStatus) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private setStatus(status: SyncStatus) {
    this.status = status;
    this.listeners.forEach(listener => listener(status));
  }

  async sync(userId: string): Promise<void> {
    if (this.status === 'syncing') {
      return;
    }

    if (!navigator.onLine) {
      this.setStatus('idle');
      return;
    }

    this.setStatus('syncing');

    try {
      // Process outbox
      const outboxItems = await db.outbox
        .where('userId')
        .equals(userId)
        .toArray();

      for (const item of outboxItems) {
        await this.processOutboxItem(item);
      }

      // Pull latest from server (simplified - could be enhanced)
      await this.pullFromServer(userId);

      this.setStatus('idle');
    } catch (error) {
      console.error('Sync error:', error);
      this.setStatus('error');
      throw error;
    }
  }

  private async processOutboxItem(item: OutboxItem): Promise<void> {
    try {
      const { entity, op, payload, id } = item;

      let response: Response;
      const baseUrl = '/api';

      if (op === 'create') {
        response = await fetch(`${baseUrl}/${entity}s`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else if (op === 'update') {
        response = await fetch(`${baseUrl}/${entity}s/${payload._id || payload.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        // delete
        const entityId = payload._id || payload.id;
        response = await fetch(`${baseUrl}/${entity}s/${entityId}`, {
          method: 'DELETE',
        });
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      const serverEntity = data[entity] || data;

      // Update local record with server _id and mark as synced
      if (op === 'create' && serverEntity._id) {
        await this.updateLocalEntity(entity, payload.localId, {
          _id: serverEntity._id,
          synced: true,
          updatedAt: new Date(serverEntity.updatedAt || Date.now()),
        });
      } else if (op === 'update' && serverEntity._id) {
        await this.updateLocalEntity(entity, serverEntity._id, {
          ...serverEntity,
          synced: true,
          updatedAt: new Date(serverEntity.updatedAt || Date.now()),
        });
      }

      // Remove from outbox
      if (id) {
        await db.outbox.delete(id);
      }
    } catch (error: any) {
      // Increment retry count
      const retryCount = (item.retryCount || 0) + 1;
      await db.outbox.update(item.id!, {
        retryCount,
        lastError: error.message,
      });

      // If retry count exceeds limit, keep in outbox but mark as failed
      if (retryCount > 5) {
        console.error(`Outbox item ${item.id} failed after ${retryCount} retries`);
      }
    }
  }

  private async updateLocalEntity(
    entity: 'food' | 'entry' | 'weight',
    localId: number | string,
    updates: any
  ): Promise<void> {
    const table = db[`${entity}s` as keyof typeof db] as any;
    if (typeof localId === 'number') {
      await table.update(localId, updates);
    } else {
      // Find by _id or other field
      const record = await table.where('_id').equals(localId).first();
      if (record) {
        await table.update(record.id, updates);
      }
    }
  }

  private async pullFromServer(userId: string): Promise<void> {
    // Simplified pull - in production, use timestamps to get only changes
    try {
      // Pull foods
      const foodsRes = await fetch('/api/foods');
      if (foodsRes.ok) {
        const { foods } = await foodsRes.json();
        for (const food of foods) {
          await this.mergeEntity('foods', food, userId);
        }
      }

      // Pull recent entries (last 30 days)
      const today = new Date();
      const thirtyDaysAgo = new Date(today);
      thirtyDaysAgo.setDate(today.getDate() - 30);
      const fromDate = thirtyDaysAgo.toISOString().split('T')[0];
      const toDate = today.toISOString().split('T')[0];

      const entriesRes = await fetch(`/api/entries?date=${fromDate}`);
      if (entriesRes.ok) {
        const { entries } = await entriesRes.json();
        for (const entry of entries) {
          await this.mergeEntity('entries', entry, userId);
        }
      }

      // Pull weights
      const weightsRes = await fetch(`/api/weights?from=${fromDate}&to=${toDate}`);
      if (weightsRes.ok) {
        const { weights } = await weightsRes.json();
        for (const weight of weights) {
          await this.mergeEntity('weights', weight, userId);
        }
      }
    } catch (error) {
      console.error('Pull from server error:', error);
    }
  }

  private async mergeEntity(
    tableName: 'foods' | 'entries' | 'weights',
    serverEntity: any,
    userId: string
  ): Promise<void> {
    const table = db[tableName] as any;
    const localEntity = await table.where('_id').equals(serverEntity._id).first();

    const entityData = {
      ...serverEntity,
      ownerUserId: userId,
      synced: true,
      createdAt: new Date(serverEntity.createdAt),
      updatedAt: new Date(serverEntity.updatedAt),
    };

    if (localEntity) {
      // Last-write-wins: compare updatedAt
      const serverTime = new Date(serverEntity.updatedAt).getTime();
      const localTime = new Date(localEntity.updatedAt).getTime();

      if (serverTime >= localTime) {
        await table.update(localEntity.id, entityData);
      }
    } else {
      // New entity from server
      await table.add(entityData);
    }
  }

  async addToOutbox(
    userId: string,
    entity: 'food' | 'entry' | 'weight',
    op: 'create' | 'update' | 'delete',
    payload: any,
    localId?: number
  ): Promise<void> {
    await db.outbox.add({
      userId,
      entity,
      op,
      payload: { ...payload, localId },
      createdAt: new Date(),
      retryCount: 0,
    });
  }
}

export const syncService = new SyncService();

// Auto-sync when online
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    // Will be called when user is set
  });
}
