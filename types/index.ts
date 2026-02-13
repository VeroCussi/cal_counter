// Shared TypeScript types

export type MacroDistributionType = 'balanced' | 'high_protein' | 'keto' | 'low_carb' | 'custom';
export type CutIntensity = 'gentle' | 'moderate' | 'aggressive';

export interface MacroDistribution {
  type: MacroDistributionType;
  proteinPercent?: number;  // For custom distribution
  fatPercent?: number;      // For custom distribution
  carbsPercent?: number;    // For custom distribution (calculated if not provided)
}

export interface UserProfile {
  age?: number;
  gender?: 'male' | 'female';
  heightCm?: number;
  activityLevel?: 'sedentary' | 'lightly_active' | 'moderately_active' | 'very_active' | 'extremely_active';
  goal?: 'cut' | 'maintain' | 'bulk';
  cutIntensity?: CutIntensity;  // Only used when goal is 'cut'
  macroDistribution?: MacroDistribution;
}

export interface MacroCalculationResult {
  bmr: number;
  tdee: number;
  targetCalories: number;
  macros: {
    protein: number;
    carbs: number;
    fat: number;
  };
}

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
    waterGoalMl?: number;
    profile?: UserProfile;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface CustomServing {
  id: string;
  label: string;
  value: number;
}

export interface Food {
  _id: string;
  ownerUserId?: string; // Opcional para alimentos compartidos
  isShared?: boolean;
  createdByUserId?: string;
  name: string;
  brand?: string;
  serving: {
    type: 'per100g' | 'per100ml' | 'perServing';
    servingSizeG?: number;
    servingSizeMl?: number;
    baseUnit?: 'g' | 'ml';
    customServings?: CustomServing[];
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

export interface WeightEntry {
  _id: string;
  ownerUserId: string;
  date: string; // YYYY-MM-DD
  weightKg: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface WaterEntry {
  _id: string;
  ownerUserId: string;
  date: string; // YYYY-MM-DD
  amountMl: number;
  createdAt: Date;
  updatedAt: Date;
}
