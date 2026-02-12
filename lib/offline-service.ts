import { db, LocalEntry, LocalFood, LocalWeight } from './sync/dexie';
import { syncService } from './sync/sync-service';
import { Food, WeightEntry } from '@/types';

// Extended Entry type for UI (with populated foodId)
export interface EntryWithFood {
  _id: string;
  ownerUserId: string;
  date: string;
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  foodId: {
    _id: string;
    name: string;
    brand?: string;
    macros?: {
      kcal: number;
      protein: number;
      carbs: number;
      fat: number;
    };
  };
  quantity: { grams: number };
  computedMacros: {
    kcal: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Offline-first service: Write to IndexedDB first, then sync to API
 */

export class OfflineService {
  /**
   * Create entry offline-first
   */
  static async createEntry(
    userId: string,
    entryData: {
      date: string;
      mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
      foodId: string;
      quantity: { grams: number };
      computedMacros: {
        kcal: number;
        protein: number;
        carbs: number;
        fat: number;
      };
    }
  ): Promise<{ localId: number; synced: boolean }> {
    // 1. Write to IndexedDB first
    const localEntry: Omit<LocalEntry, 'id'> = {
      ownerUserId: userId,
      date: entryData.date,
      mealType: entryData.mealType,
      foodId: entryData.foodId,
      quantity: entryData.quantity,
      computedMacros: entryData.computedMacros,
      createdAt: new Date(),
      updatedAt: new Date(),
      synced: false,
    };

    const localId = await db.entries.add(localEntry as LocalEntry);

    // 2. Try to sync immediately if online
    if (navigator.onLine) {
      try {
        const res = await fetch('/api/entries', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(entryData),
        });

        if (res.ok) {
          const data = await res.json();
          const serverEntry = data.entry;

          // Update local with server _id
          await db.entries.update(localId, {
            _id: serverEntry._id,
            synced: true,
            updatedAt: new Date(serverEntry.updatedAt),
          });

          return { localId, synced: true };
        } else {
          // API failed (e.g., 401, 500), add to outbox
          const errorData = await res.json().catch(() => ({}));
          console.warn('API failed, adding to outbox:', errorData);
          await syncService.addToOutbox(userId, 'entry', 'create', entryData, localId);
        }
      } catch (error) {
        // Network error (offline, timeout, etc.), add to outbox
        console.warn('Network error, adding to outbox:', error);
        await syncService.addToOutbox(userId, 'entry', 'create', entryData, localId);
      }
    } else {
      // Offline, add to outbox
      await syncService.addToOutbox(userId, 'entry', 'create', entryData, localId);
    }

    return { localId, synced: false };
  }

  /**
   * Update entry offline-first
   */
  static async updateEntry(
    userId: string,
    entryId: string,
    entryData: {
      date: string;
      mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
      foodId: string;
      quantity: { grams: number };
      computedMacros: {
        kcal: number;
        protein: number;
        carbs: number;
        fat: number;
      };
    }
  ): Promise<void> {
    // 1. Update IndexedDB first
    let localEntry = await db.entries.where('_id').equals(entryId).first();
    
    if (!localEntry) {
      // Try to find by localId if entryId is a number string
      const localId = parseInt(entryId);
      if (!isNaN(localId)) {
        localEntry = await db.entries.get(localId) || undefined;
      }
    }

    if (localEntry) {
      await db.entries.update(localEntry.id!, {
        date: entryData.date,
        mealType: entryData.mealType,
        foodId: entryData.foodId,
        quantity: entryData.quantity,
        computedMacros: entryData.computedMacros,
        synced: false,
        updatedAt: new Date(),
      });
    } else {
      // Entry not found locally, create it
      await db.entries.add({
        ownerUserId: userId,
        date: entryData.date,
        mealType: entryData.mealType,
        foodId: entryData.foodId,
        quantity: entryData.quantity,
        computedMacros: entryData.computedMacros,
        createdAt: new Date(),
        updatedAt: new Date(),
        synced: false,
      });
    }

    // 2. Try to sync immediately if online
    if (navigator.onLine) {
      try {
        const res = await fetch(`/api/entries/${entryId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(entryData),
        });

        if (res.ok) {
          const data = await res.json();
          const serverEntry = data.entry;

          // Update local with server response
          const updatedLocal = await db.entries.where('_id').equals(entryId).first();
          if (updatedLocal) {
            await db.entries.update(updatedLocal.id!, {
              synced: true,
              updatedAt: new Date(serverEntry.updatedAt),
            });
          }
        } else {
          // API failed, add to outbox
          await syncService.addToOutbox(userId, 'entry', 'update', { _id: entryId, ...entryData });
        }
      } catch (error) {
        // Network error, add to outbox
        await syncService.addToOutbox(userId, 'entry', 'update', { _id: entryId, ...entryData });
      }
    } else {
      // Offline, add to outbox
      await syncService.addToOutbox(userId, 'entry', 'update', { _id: entryId, ...entryData });
    }
  }

  /**
   * Delete entry offline-first
   */
  static async deleteEntry(userId: string, entryId: string): Promise<void> {
    // 1. Delete from IndexedDB (or mark as deleted)
    const localEntry = await db.entries.where('_id').equals(entryId).first();
    
    if (localEntry) {
      // If synced, keep record but mark for deletion
      if (localEntry.synced) {
        await db.entries.update(localEntry.id!, {
          synced: false,
          updatedAt: new Date(),
        });
      } else {
        // If not synced, delete completely
        await db.entries.delete(localEntry.id!);
      }
    }

    // 2. Try to sync immediately if online
    if (navigator.onLine) {
      try {
        const res = await fetch(`/api/entries/${entryId}`, {
          method: 'DELETE',
        });

        if (res.ok) {
          // Successfully deleted from server
          if (localEntry) {
            await db.entries.delete(localEntry.id!);
          }
        } else {
          // API failed, add to outbox
          await syncService.addToOutbox(userId, 'entry', 'delete', { _id: entryId });
        }
      } catch (error) {
        // Network error, add to outbox
        await syncService.addToOutbox(userId, 'entry', 'delete', { _id: entryId });
      }
    } else {
      // Offline, add to outbox
      await syncService.addToOutbox(userId, 'entry', 'delete', { _id: entryId });
    }
  }

  /**
   * Load entries from IndexedDB, merge with server data
   */
  static async loadEntries(userId: string, date: string): Promise<EntryWithFood[]> {
    // 1. Load from IndexedDB
    const allLocalEntries = await db.entries
      .where('ownerUserId')
      .equals(userId)
      .toArray();
    
    const localEntries = allLocalEntries.filter((e) => e.date === date);

    // 2. Try to load from server if online
    if (navigator.onLine) {
      try {
        const res = await fetch(`/api/entries?date=${date}`);
        if (res.ok) {
          const data = await res.json();
          const serverEntries = data.entries || [];

          // Merge: server entries take precedence (last-write-wins)
          const mergedEntries: EntryWithFood[] = [];
          const serverEntryMap = new Map(serverEntries.map((e: any) => [e._id, e]));

          // Add/update local entries with server data
          for (const localEntry of localEntries) {
            if (localEntry._id && serverEntryMap.has(localEntry._id)) {
              // Server has this entry, use server version
              const serverEntry: any = serverEntryMap.get(localEntry._id);
              if (serverEntry) {
                // Ensure foodId is populated
                const entryWithFood: EntryWithFood = {
                  _id: serverEntry._id,
                  ownerUserId: serverEntry.ownerUserId || userId,
                  date: serverEntry.date,
                  mealType: serverEntry.mealType,
                  foodId: typeof serverEntry.foodId === 'string' 
                    ? { _id: serverEntry.foodId, name: 'Alimento' }
                    : serverEntry.foodId,
                  quantity: serverEntry.quantity,
                  computedMacros: serverEntry.computedMacros,
                  createdAt: new Date(serverEntry.createdAt),
                  updatedAt: new Date(serverEntry.updatedAt),
                };
                mergedEntries.push(entryWithFood);
              }

              // Update local if needed
              if (!localEntry.synced) {
                await db.entries.update(localEntry.id!, {
                  synced: true,
                  updatedAt: new Date(serverEntry.updatedAt),
                });
              }
            } else if (!localEntry.synced) {
              // Local entry not synced yet, include it
              // Need to get food data
              let foodData: any = { _id: localEntry.foodId, name: 'Alimento desconocido' };
              if (typeof localEntry.foodId === 'string') {
                const localFood = await db.foods.where('_id').equals(localEntry.foodId).first();
                if (localFood) {
                  foodData = {
                    _id: localFood._id || `local-${localFood.id}`,
                    name: localFood.name,
                    brand: localFood.brand,
                    macros: localFood.macros,
                  };
                }
              }
              
              mergedEntries.push({
                _id: localEntry._id || `local-${localEntry.id}`,
                ownerUserId: localEntry.ownerUserId,
                date: localEntry.date,
                mealType: localEntry.mealType,
                foodId: foodData,
                quantity: localEntry.quantity,
                computedMacros: localEntry.computedMacros,
                createdAt: localEntry.createdAt,
                updatedAt: localEntry.updatedAt,
              });
            }
          }

          // Add server entries not in local
          for (const serverEntryRaw of serverEntries) {
            const serverEntry: any = serverEntryRaw;
            if (!localEntries.find((le) => le._id === serverEntry._id)) {
              // Ensure foodId is populated
              const entryWithFood: EntryWithFood = {
                _id: serverEntry._id,
                ownerUserId: serverEntry.ownerUserId || userId,
                date: serverEntry.date,
                mealType: serverEntry.mealType,
                foodId: typeof serverEntry.foodId === 'string' 
                  ? { _id: serverEntry.foodId, name: 'Alimento' }
                  : serverEntry.foodId,
                quantity: serverEntry.quantity,
                computedMacros: serverEntry.computedMacros,
                createdAt: new Date(serverEntry.createdAt),
                updatedAt: new Date(serverEntry.updatedAt),
              };
              mergedEntries.push(entryWithFood);

              // Save to local
              try {
                await db.entries.add({
                  _id: serverEntry._id,
                  ownerUserId: userId,
                  date: serverEntry.date,
                  mealType: serverEntry.mealType,
                  foodId: typeof serverEntry.foodId === 'string' ? serverEntry.foodId : serverEntry.foodId._id,
                  quantity: serverEntry.quantity,
                  computedMacros: serverEntry.computedMacros,
                  createdAt: new Date(serverEntry.createdAt),
                  updatedAt: new Date(serverEntry.updatedAt),
                  synced: true,
                });
              } catch (error) {
                // Entry might already exist, try to update instead
                const existing = await db.entries.where('_id').equals(serverEntry._id).first();
                if (existing) {
                  await db.entries.update(existing.id!, {
                    synced: true,
                    updatedAt: new Date(serverEntry.updatedAt),
                  });
                }
              }
            }
          }

          return mergedEntries;
        }
      } catch (error) {
        console.error('Error loading from server, using local:', error);
      }
    }

    // Return local entries only (offline or server error)
    // Need to populate foodId with food data
    const entriesWithFoods: EntryWithFood[] = [];
    
    for (const le of localEntries) {
      // Try to get food data
      let foodData: any = { _id: le.foodId, name: 'Alimento desconocido' };
      
      if (typeof le.foodId === 'string') {
        // Try to get from local foods
        const localFood = await db.foods.where('_id').equals(le.foodId).first();
        if (localFood) {
          foodData = {
            _id: localFood._id || `local-${localFood.id}`,
            name: localFood.name,
            brand: localFood.brand,
            macros: localFood.macros,
          };
        }
      }
      
      entriesWithFoods.push({
        _id: le._id || `local-${le.id}`,
        ownerUserId: le.ownerUserId,
        date: le.date,
        mealType: le.mealType,
        foodId: foodData,
        quantity: le.quantity,
        computedMacros: le.computedMacros,
        createdAt: le.createdAt,
        updatedAt: le.updatedAt,
      });
    }
    
    return entriesWithFoods;
  }
}
