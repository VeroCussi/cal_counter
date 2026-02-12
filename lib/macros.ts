import { Food } from '@/types';

/**
 * Calculate macros for a given quantity of food
 */
export function calculateMacros(food: Food, grams: number): {
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
} {
  let multiplier: number;

  if (food.serving.type === 'per100g') {
    multiplier = grams / 100;
  } else {
    // perServing
    const servingSize = food.serving.servingSizeG || 100;
    multiplier = grams / servingSize;
  }

  return {
    kcal: Math.round(food.macros.kcal * multiplier * 10) / 10,
    protein: Math.round(food.macros.protein * multiplier * 10) / 10,
    carbs: Math.round(food.macros.carbs * multiplier * 10) / 10,
    fat: Math.round(food.macros.fat * multiplier * 10) / 10,
  };
}
