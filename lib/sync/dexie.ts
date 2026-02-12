import Dexie, { Table } from 'dexie';

export interface LocalFood {
  id?: number;           // Dexie auto-increment
  _id?: string;          // MongoDB _id (cuando sync)
  ownerUserId: string;
  name: string;
  brand?: string;
  serving: {
    type: 'per100g' | 'per100ml' | 'perServing';
    servingSizeG?: number;
    servingSizeMl?: number;
    baseUnit?: 'g' | 'ml';
    customServings?: Array<{ id: string; label: string; value: number }>;
  };
  macros: { kcal: number; protein: number; carbs: number; fat: number };
  source: 'custom' | 'openfoodfacts' | 'usda';
  externalId?: string;
  barcode?: string;
  createdAt: Date;
  updatedAt: Date;
  synced: boolean;       // true si está en sync con server
}

export interface LocalEntry {
  id?: number;
  _id?: string;
  ownerUserId: string;
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
  computedMacros: { kcal: number; protein: number; carbs: number; fat: number };
  createdAt: Date;
  updatedAt: Date;
  synced: boolean;
}

export interface LocalWeight {
  id?: number;
  _id?: string;
  ownerUserId: string;
  date: string;
  weightKg: number;
  createdAt: Date;
  updatedAt: Date;
  synced: boolean;
}

export interface OutboxItem {
  id?: number;
  userId: string;
  entity: 'food' | 'entry' | 'weight';
  op: 'create' | 'update' | 'delete';
  payload: any;
  createdAt: Date;
  retryCount: number;
  lastError?: string;
}

export interface Meta {
  key: string;
  value: any;
}

class AppDatabase extends Dexie {
  foods!: Table<LocalFood, number>;
  entries!: Table<LocalEntry, number>;
  weights!: Table<LocalWeight, number>;
  outbox!: Table<OutboxItem, number>;
  meta!: Table<Meta, string>;

  constructor() {
    super('MacrosPesoDB');
    this.version(1).stores({
      foods: '++id, _id, ownerUserId, name, synced',
      entries: '++id, _id, ownerUserId, date, synced',
      weights: '++id, _id, ownerUserId, date, synced',
      outbox: '++id, userId, entity, createdAt',
      meta: 'key',
    });
  }
}

export const db = new AppDatabase();
