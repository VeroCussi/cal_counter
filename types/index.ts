// Shared TypeScript types

export interface User {
  _id: string;
  email: string;
  name: string;
  passwordHash: string;
  pinHash: string;
  settings: {
    goals: {
      kcal: number;
      protein: number;
      carbs: number;
      fat: number;
    };
    units: 'kg' | 'lb';
    timezone: string;
    pinRememberMinutes: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface Food {
  _id: string;
  ownerUserId: string;
  name: string;
  brand?: string;
  serving: {
    type: 'per100g' | 'perServing';
    servingSizeG?: number;
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
  createdAt: Date;
  updatedAt: Date;
}

export interface Entry {
  _id: string;
  ownerUserId: string;
  date: string; // YYYY-MM-DD
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  foodId: string;
  quantity: {
    grams: number;
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

export interface WeightEntry {
  _id: string;
  ownerUserId: string;
  date: string; // YYYY-MM-DD
  weightKg: number;
  createdAt: Date;
  updatedAt: Date;
}
