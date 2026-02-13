import { z } from 'zod';

// Auth validations
export const registerSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
  name: z.string().min(1, 'El nombre es requerido'),
  pin: z.string().regex(/^\d{4,6}$/, 'El PIN debe tener entre 4 y 6 dígitos').optional(),
});

export const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'La contraseña es requerida'),
});

export const pinSchema = z.object({
  pin: z.string().regex(/^\d{4,6}$/, 'El PIN debe tener entre 4 y 6 dígitos'),
});

// Food validations
const customServingSchema = z.object({
  id: z.string().min(1, 'ID es requerido'),
  label: z.string().min(1, 'Label es requerido'),
  value: z.number().positive('El valor debe ser positivo'),
});

export const foodSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  brand: z.string().optional(),
  serving: z.object({
    type: z.enum(['per100g', 'per100ml', 'perServing']),
    servingSizeG: z.number().positive().optional(),
    servingSizeMl: z.number().positive().optional(),
    baseUnit: z.enum(['g', 'ml']).optional().default('g'),
    customServings: z.array(customServingSchema).optional(),
  }).refine((data) => {
    // Si es perServing, debe tener servingSizeG o servingSizeMl según baseUnit
    if (data.type === 'perServing') {
      const baseUnit = data.baseUnit || 'g';
      if (baseUnit === 'g') {
        return data.servingSizeG !== undefined && data.servingSizeG > 0;
      } else {
        return data.servingSizeMl !== undefined && data.servingSizeMl > 0;
      }
    }
    return true;
  }, {
    message: 'perServing requiere servingSizeG o servingSizeMl según baseUnit',
  }),
  macros: z.object({
    kcal: z.number().min(0),
    protein: z.number().min(0),
    carbs: z.number().min(0),
    fat: z.number().min(0),
  }),
  source: z.enum(['custom', 'openfoodfacts', 'usda']),
  externalId: z.string().optional(),
  barcode: z.string().optional(),
  isShared: z.boolean().optional().default(false),
}).refine((data) => {
  // Solo alimentos custom pueden ser compartidos
  if (data.isShared && data.source !== 'custom') {
    return false;
  }
  return true;
}, {
  message: 'Solo los alimentos personalizados pueden ser compartidos',
});

// Entry validations
export const entrySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida (YYYY-MM-DD)'),
  mealType: z.enum(['breakfast', 'lunch', 'dinner', 'snack']),
  foodId: z.string().min(1, 'Food ID es requerido'),
  quantity: z.object({
    grams: z.number().positive('Los gramos deben ser positivos'),
    unit: z.string().optional(),
    customServingId: z.string().optional(),
    displayValue: z.number().positive().optional(),
    displayUnit: z.string().optional(),
  }),
});

// Weight validations
export const weightSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida (YYYY-MM-DD)'),
  weightKg: z.number().positive('El peso debe ser positivo'),
});

// Water validations
export const waterSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida (YYYY-MM-DD)'),
  amountMl: z.number().positive('La cantidad debe ser positiva'),
});

// Profile validations
export const profileSchema = z.object({
  age: z.number().min(13).max(120).optional(),
  gender: z.enum(['male', 'female']).optional(),
  heightCm: z.number().min(100).max(250).optional(),
  activityLevel: z.enum(['sedentary', 'lightly_active', 'moderately_active', 'very_active', 'extremely_active']).optional(),
  goal: z.enum(['cut', 'maintain', 'bulk']).optional(),
  cutIntensity: z.enum(['gentle', 'moderate', 'aggressive']).optional(),
  macroDistribution: z.object({
    type: z.enum(['balanced', 'high_protein', 'keto', 'low_carb', 'custom']).optional(),
    proteinPercent: z.number().min(0).max(100).optional(),
    fatPercent: z.number().min(0).max(100).optional(),
    carbsPercent: z.number().min(0).max(100).optional(),
  }).optional(),
});

// Settings validations
export const settingsSchema = z.object({
  goals: z.object({
    kcal: z.number().min(0),
    protein: z.number().min(0),
    carbs: z.number().min(0),
    fat: z.number().min(0),
  }),
  units: z.enum(['kg', 'lb']),
  timezone: z.string(),
  pinRememberMinutes: z.number().min(0).max(1440), // Max 24 horas
  waterGoalMl: z.number().min(500).max(5000).optional(), // Objetivo de agua en ml
  profile: profileSchema.optional(),
});

// MongoDB ObjectId validation
export const mongoIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid MongoDB ObjectId format');

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type PinInput = z.infer<typeof pinSchema>;
export type FoodInput = z.infer<typeof foodSchema>;
export type EntryInput = z.infer<typeof entrySchema>;
export type WeightInput = z.infer<typeof weightSchema>;
export type ProfileInput = z.infer<typeof profileSchema>;
export type SettingsInput = z.infer<typeof settingsSchema>;
export type MongoId = z.infer<typeof mongoIdSchema>;
