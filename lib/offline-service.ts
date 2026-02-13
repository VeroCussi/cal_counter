import { db, LocalEntry, LocalFood, LocalWeight, LocalWater } from './sync/dexie';
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
    serving?: {
      customServings?: Array<{ id: string; label: string; value: number }>;
    };
  };
  quantity: {
    grams: number;
    unit?: 'g' | 'ml' | string;
    customServingId?: string;
    displayValue?: number;
    displayUnit?: string;
  };
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
      quantity: {
        grams: number;
        unit?: 'g' | 'ml' | string;
        customServingId?: string;
        displayValue?: number;
        displayUnit?: string;
      };
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
            serving: localFood.serving ? {
              customServings: localFood.serving.customServings,
            } : undefined,
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

  /**
   * Create water entry offline-first
   */
  static async createWater(
    userId: string,
    waterData: {
      date: string;
      amountMl: number;
    }
  ): Promise<{ localId: number; synced: boolean }> {
    // 1. Write to IndexedDB first
    const localWater: Omit<LocalWater, 'id'> = {
      ownerUserId: userId,
      date: waterData.date,
      amountMl: waterData.amountMl,
      createdAt: new Date(),
      updatedAt: new Date(),
      synced: false,
    };

    const localId = await db.water.add(localWater as LocalWater);

    // 2. Try to sync immediately if online
    if (navigator.onLine) {
      try {
        const res = await fetch('/api/water', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(waterData),
        });

        if (res.ok) {
          const data = await res.json();
          const serverWater = data.water;

          // Update local with server _id
          await db.water.update(localId, {
            _id: serverWater._id,
            synced: true,
            updatedAt: new Date(),
          });

          return { localId, synced: true };
        }
      } catch (error) {
        console.error('Sync water error:', error);
      }
    }

    // 3. Add to outbox for later sync
    await db.outbox.add({
      userId,
      entity: 'water',
      op: 'create',
      payload: waterData,
      createdAt: new Date(),
      retryCount: 0,
    });

    return { localId, synced: false };
  }

  /**
   * Load water entries for a specific date
   */
  static async loadWater(userId: string, date: string): Promise<number> {
    // 1. Load from IndexedDB
    const localWaterEntries = await db.water
      .where('ownerUserId')
      .equals(userId)
      .and((w) => w.date === date)
      .toArray();

    let totalAmount = localWaterEntries.reduce((sum, w) => sum + w.amountMl, 0);

    // 2. Try to load from server if online
    if (navigator.onLine) {
      try {
        const res = await fetch(`/api/water?date=${date}`);
        if (res.ok) {
          const data = await res.json();
          const serverTotal = data.totalAmount || 0;

          // Use server data if available
          if (serverTotal > 0) {
            totalAmount = serverTotal;
            
            // Update local entries with server data
            const serverEntries = data.waterEntries || [];
            for (const serverEntry of serverEntries) {
              const existing = await db.water.where('_id').equals(serverEntry._id).first();
              if (existing) {
                await db.water.update(existing.id!, {
                  amountMl: serverEntry.amountMl,
                  synced: true,
                  updatedAt: new Date(),
                });
              } else {
                await db.water.add({
                  _id: serverEntry._id,
                  ownerUserId: serverEntry.ownerUserId,
                  date: serverEntry.date,
                  amountMl: serverEntry.amountMl,
                  createdAt: new Date(serverEntry.createdAt),
                  updatedAt: new Date(serverEntry.updatedAt),
                  synced: true,
                });
              }
            }
          }
        }
      } catch (error) {
        console.error('Load water error:', error);
      }
    }

    return totalAmount;
  }

  /**
   * Delete water entry
   */
  static async deleteWater(userId: string, waterId: string): Promise<void> {
    // Find local entry
    const localWater = await db.water
      .where('ownerUserId')
      .equals(userId)
      .and((w) => w._id === waterId || `local-${w.id}` === waterId)
      .first();

    if (localWater) {
      if (localWater._id && navigator.onLine) {
        // Try to delete from server
        try {
          const res = await fetch(`/api/water/${localWater._id}`, {
            method: 'DELETE',
          });
          if (res.ok) {
            await db.water.delete(localWater.id!);
            return;
          }
        } catch (error) {
          console.error('Delete water error:', error);
        }
      }

      // Add to outbox for later sync
      await db.outbox.add({
        userId,
        entity: 'water',
        op: 'delete',
        payload: { _id: localWater._id || waterId },
        createdAt: new Date(),
        retryCount: 0,
      });

      // Delete locally
      await db.water.delete(localWater.id!);
    }
  }

  /**
   * Create food offline-first
   */
  static async createFood(
    userId: string,
    foodData: {
      name: string;
      brand?: string;
      serving: {
        type: 'per100g' | 'per100ml' | 'perServing';
        servingSizeG?: number;
        servingSizeMl?: number;
        baseUnit?: 'g' | 'ml';
        customServings?: Array<{ id: string; label: string; value: number }>;
      };
      macros: {
        kcal: number;
        protein: number;
        carbs: number;
        fat: number;
      };
      source: 'custom' | 'openfoodfacts' | 'usda';
      externalId?: string;
      barcode?: string;
    }
  ): Promise<{ localId: number; synced: boolean; food?: Food }> {
    // 1. Write to IndexedDB first
    const localFood: Omit<LocalFood, 'id'> = {
      ownerUserId: userId,
      name: foodData.name,
      brand: foodData.brand,
      serving: foodData.serving,
      macros: foodData.macros,
      source: foodData.source,
      externalId: foodData.externalId,
      barcode: foodData.barcode,
      createdAt: new Date(),
      updatedAt: new Date(),
      synced: false,
    };

    const localId = await db.foods.add(localFood as LocalFood);

    // 2. Try to sync immediately if online
    if (navigator.onLine) {
      try {
        const res = await fetch('/api/foods', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(foodData),
        });

        if (res.ok) {
          const data = await res.json();
          const serverFood = data.food;

          // Update local with server _id
          await db.foods.update(localId, {
            _id: serverFood._id,
            synced: true,
            updatedAt: new Date(),
          });

          return { localId, synced: true, food: serverFood };
        }
      } catch (error) {
        console.error('Sync food error:', error);
      }
    }

    // 3. Add to outbox for later sync
    await syncService.addToOutbox(userId, 'food', 'create', foodData, localId);

    // Return local food object
    const createdFood: Food = {
      _id: `local-${localId}`,
      ownerUserId: userId,
      name: foodData.name,
      brand: foodData.brand,
      serving: foodData.serving,
      macros: foodData.macros,
      source: foodData.source,
      externalId: foodData.externalId,
      barcode: foodData.barcode,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    return { localId, synced: false, food: createdFood };
  }

  /**
   * Update food offline-first
   */
  static async updateFood(
    userId: string,
    foodId: string,
    foodData: {
      name: string;
      brand?: string;
      serving: {
        type: 'per100g' | 'per100ml' | 'perServing';
        servingSizeG?: number;
        servingSizeMl?: number;
        baseUnit?: 'g' | 'ml';
        customServings?: Array<{ id: string; label: string; value: number }>;
      };
      macros: {
        kcal: number;
        protein: number;
        carbs: number;
        fat: number;
      };
      source?: 'custom' | 'openfoodfacts' | 'usda';
    }
  ): Promise<void> {
    // 1. Update in IndexedDB
    const localFood = await db.foods.where('_id').equals(foodId).first();
    
    if (localFood) {
      await db.foods.update(localFood.id!, {
        name: foodData.name,
        brand: foodData.brand,
        serving: foodData.serving,
        macros: foodData.macros,
        source: foodData.source || localFood.source,
        updatedAt: new Date(),
        synced: false,
      });
    }

    // 2. Try to sync immediately if online
    if (navigator.onLine) {
      try {
        const res = await fetch(`/api/foods/${foodId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(foodData),
        });

        if (res.ok) {
          const data = await res.json();
          const serverFood = data.food;

          // Update local with server data
          if (localFood) {
            await db.foods.update(localFood.id!, {
              _id: serverFood._id,
              synced: true,
              updatedAt: new Date(),
            });
          }
        } else {
          // API failed, add to outbox
          await syncService.addToOutbox(userId, 'food', 'update', { _id: foodId, ...foodData });
        }
      } catch (error) {
        // Network error, add to outbox
        await syncService.addToOutbox(userId, 'food', 'update', { _id: foodId, ...foodData });
      }
    } else {
      // Offline, add to outbox
      await syncService.addToOutbox(userId, 'food', 'update', { _id: foodId, ...foodData });
    }
  }

  /**
   * Delete food offline-first
   */
  static async deleteFood(userId: string, foodId: string): Promise<void> {
    // 1. Delete from IndexedDB (or mark as deleted)
    const localFood = await db.foods.where('_id').equals(foodId).first();
    
    if (localFood) {
      // If synced, keep record but mark for deletion
      if (localFood.synced) {
        await db.foods.update(localFood.id!, {
          synced: false,
          updatedAt: new Date(),
        });
      } else {
        // If not synced, delete completely
        await db.foods.delete(localFood.id!);
      }
    }

    // 2. Try to sync immediately if online
    if (navigator.onLine) {
      try {
        const res = await fetch(`/api/foods/${foodId}`, {
          method: 'DELETE',
        });

        if (res.ok) {
          // Successfully deleted from server
          if (localFood) {
            await db.foods.delete(localFood.id!);
          }
        } else {
          // API failed, add to outbox
          await syncService.addToOutbox(userId, 'food', 'delete', { _id: foodId });
        }
      } catch (error) {
        // Network error, add to outbox
        await syncService.addToOutbox(userId, 'food', 'delete', { _id: foodId });
      }
    } else {
      // Offline, add to outbox
      await syncService.addToOutbox(userId, 'food', 'delete', { _id: foodId });
    }
  }

  /**
   * Load foods from IndexedDB, merge with server data
   */
  static async loadFoods(userId: string, filter?: 'all' | 'mine' | 'shared'): Promise<Food[]> {
    // 1. Load from IndexedDB
    const localFoods = await db.foods
      .where('ownerUserId')
      .equals(userId)
      .toArray();

    // 2. Try to load from server if online
    if (navigator.onLine) {
      try {
        const filterParam = filter || 'all';
        const res = await fetch(`/api/foods?filter=${filterParam}`);
        if (res.ok) {
          const data = await res.json();
          const serverFoods = data.foods || [];

          // Merge: server foods take precedence (last-write-wins)
          const mergedFoods: Food[] = [];
          const serverFoodMap = new Map(serverFoods.map((f: any) => [f._id, f]));

          // Add/update local foods with server data
          for (const localFood of localFoods) {
            if (localFood._id && serverFoodMap.has(localFood._id)) {
              // Server has this food, use server version
              const serverFood: any = serverFoodMap.get(localFood._id);
              mergedFoods.push({
                _id: serverFood._id,
                ownerUserId: serverFood.ownerUserId || userId,
                name: serverFood.name,
                brand: serverFood.brand,
                serving: serverFood.serving,
                macros: serverFood.macros,
                source: serverFood.source,
                externalId: serverFood.externalId,
                barcode: serverFood.barcode,
                createdAt: new Date(serverFood.createdAt),
                updatedAt: new Date(serverFood.updatedAt),
              });

              // Update local if needed
              if (!localFood.synced) {
                await db.foods.update(localFood.id!, {
                  synced: true,
                  updatedAt: new Date(serverFood.updatedAt),
                });
              }
            } else if (!localFood.synced) {
              // Local food not synced yet, include it
              mergedFoods.push({
                _id: localFood._id || `local-${localFood.id}`,
                ownerUserId: localFood.ownerUserId,
                name: localFood.name,
                brand: localFood.brand,
                serving: localFood.serving,
                macros: localFood.macros,
                source: localFood.source,
                externalId: localFood.externalId,
                barcode: localFood.barcode,
                createdAt: localFood.createdAt,
                updatedAt: localFood.updatedAt,
              });
            }
          }

          // Add server foods not in local
          for (const serverFoodRaw of serverFoods) {
            const serverFood: any = serverFoodRaw;
            if (!localFoods.find((lf) => lf._id === serverFood._id)) {
              mergedFoods.push({
                _id: serverFood._id,
                ownerUserId: serverFood.ownerUserId || userId,
                name: serverFood.name,
                brand: serverFood.brand,
                serving: serverFood.serving,
                macros: serverFood.macros,
                source: serverFood.source,
                externalId: serverFood.externalId,
                barcode: serverFood.barcode,
                createdAt: new Date(serverFood.createdAt),
                updatedAt: new Date(serverFood.updatedAt),
              });

              // Save to local
              try {
                await db.foods.add({
                  _id: serverFood._id,
                  ownerUserId: userId,
                  name: serverFood.name,
                  brand: serverFood.brand,
                  serving: serverFood.serving,
                  macros: serverFood.macros,
                  source: serverFood.source,
                  externalId: serverFood.externalId,
                  barcode: serverFood.barcode,
                  createdAt: new Date(serverFood.createdAt),
                  updatedAt: new Date(serverFood.updatedAt),
                  synced: true,
                });
              } catch (error) {
                // Food might already exist, try to update instead
                const existing = await db.foods.where('_id').equals(serverFood._id).first();
                if (existing) {
                  await db.foods.update(existing.id!, {
                    synced: true,
                    updatedAt: new Date(serverFood.updatedAt),
                  });
                }
              }
            }
          }

          return mergedFoods;
        }
      } catch (error) {
        console.error('Error loading from server, using local:', error);
      }
    }

    // Return local foods only (offline or server error)
    return localFoods.map((lf) => ({
      _id: lf._id || `local-${lf.id}`,
      ownerUserId: lf.ownerUserId,
      name: lf.name,
      brand: lf.brand,
      serving: lf.serving,
      macros: lf.macros,
      source: lf.source,
      externalId: lf.externalId,
      barcode: lf.barcode,
      createdAt: lf.createdAt,
      updatedAt: lf.updatedAt,
    }));
  }

  /**
   * Create weight entry offline-first
   */
  static async createWeight(
    userId: string,
    weightData: {
      date: string;
      weightKg: number;
    }
  ): Promise<{ localId: number; synced: boolean; weight?: WeightEntry }> {
    // 1. Write to IndexedDB first
    const localWeight: Omit<LocalWeight, 'id'> = {
      ownerUserId: userId,
      date: weightData.date,
      weightKg: weightData.weightKg,
      createdAt: new Date(),
      updatedAt: new Date(),
      synced: false,
    };

    const localId = await db.weights.add(localWeight as LocalWeight);

    // 2. Try to sync immediately if online
    if (navigator.onLine) {
      try {
        const res = await fetch('/api/weights', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(weightData),
        });

        if (res.ok) {
          const data = await res.json();
          const serverWeight = data.weight;

          // Update local with server _id
          await db.weights.update(localId, {
            _id: serverWeight._id,
            synced: true,
            updatedAt: new Date(),
          });

          return { localId, synced: true, weight: serverWeight };
        }
      } catch (error) {
        console.error('Sync weight error:', error);
      }
    }

    // 3. Add to outbox for later sync
    await syncService.addToOutbox(userId, 'weight', 'create', weightData, localId);

    // Return local weight object
    const createdWeight: WeightEntry = {
      _id: `local-${localId}`,
      ownerUserId: userId,
      date: weightData.date,
      weightKg: weightData.weightKg,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    return { localId, synced: false, weight: createdWeight };
  }

  /**
   * Load weights from IndexedDB, merge with server data
   */
  static async loadWeights(
    userId: string,
    fromDate?: string,
    toDate?: string
  ): Promise<WeightEntry[]> {
    // 1. Load from IndexedDB
    let localWeights = await db.weights
      .where('ownerUserId')
      .equals(userId)
      .toArray();

    // Filter by date range if provided
    if (fromDate || toDate) {
      localWeights = localWeights.filter((w) => {
        if (fromDate && w.date < fromDate) return false;
        if (toDate && w.date > toDate) return false;
        return true;
      });
    }

    // 2. Try to load from server if online
    if (navigator.onLine) {
      try {
        const today = new Date();
        const from = fromDate || new Date(today.getFullYear(), today.getMonth(), today.getDate() - 90).toISOString().split('T')[0];
        const to = toDate || today.toISOString().split('T')[0];

        const res = await fetch(`/api/weights?from=${from}&to=${to}`);
        if (res.ok) {
          const data = await res.json();
          const serverWeights = data.weights || [];

          // Merge: server weights take precedence (last-write-wins)
          const mergedWeights: WeightEntry[] = [];
          const serverWeightMap = new Map(serverWeights.map((w: any) => [w._id, w]));

          // Add/update local weights with server data
          for (const localWeight of localWeights) {
            if (localWeight._id && serverWeightMap.has(localWeight._id)) {
              // Server has this weight, use server version
              const serverWeight: any = serverWeightMap.get(localWeight._id);
              mergedWeights.push({
                _id: serverWeight._id,
                ownerUserId: serverWeight.ownerUserId || userId,
                date: serverWeight.date,
                weightKg: serverWeight.weightKg,
                createdAt: new Date(serverWeight.createdAt),
                updatedAt: new Date(serverWeight.updatedAt),
              });

              // Update local if needed
              if (!localWeight.synced) {
                await db.weights.update(localWeight.id!, {
                  synced: true,
                  updatedAt: new Date(serverWeight.updatedAt),
                });
              }
            } else if (!localWeight.synced) {
              // Local weight not synced yet, include it
              mergedWeights.push({
                _id: localWeight._id || `local-${localWeight.id}`,
                ownerUserId: localWeight.ownerUserId,
                date: localWeight.date,
                weightKg: localWeight.weightKg,
                createdAt: localWeight.createdAt,
                updatedAt: localWeight.updatedAt,
              });
            }
          }

          // Add server weights not in local
          for (const serverWeightRaw of serverWeights) {
            const serverWeight: any = serverWeightRaw;
            if (!localWeights.find((lw) => lw._id === serverWeight._id)) {
              mergedWeights.push({
                _id: serverWeight._id,
                ownerUserId: serverWeight.ownerUserId || userId,
                date: serverWeight.date,
                weightKg: serverWeight.weightKg,
                createdAt: new Date(serverWeight.createdAt),
                updatedAt: new Date(serverWeight.updatedAt),
              });

              // Save to local
              try {
                await db.weights.add({
                  _id: serverWeight._id,
                  ownerUserId: userId,
                  date: serverWeight.date,
                  weightKg: serverWeight.weightKg,
                  createdAt: new Date(serverWeight.createdAt),
                  updatedAt: new Date(serverWeight.updatedAt),
                  synced: true,
                });
              } catch (error) {
                // Weight might already exist, try to update instead
                const existing = await db.weights.where('_id').equals(serverWeight._id).first();
                if (existing) {
                  await db.weights.update(existing.id!, {
                    synced: true,
                    updatedAt: new Date(serverWeight.updatedAt),
                  });
                }
              }
            }
          }

          return mergedWeights.sort((a, b) => a.date.localeCompare(b.date));
        }
      } catch (error) {
        console.error('Error loading from server, using local:', error);
      }
    }

    // Return local weights only (offline or server error)
    return localWeights
      .map((lw) => ({
        _id: lw._id || `local-${lw.id}`,
        ownerUserId: lw.ownerUserId,
        date: lw.date,
        weightKg: lw.weightKg,
        createdAt: lw.createdAt,
        updatedAt: lw.updatedAt,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }
}
