import { Food } from '@/types';

/**
 * Convert value to grams based on unit
 * For liquids, 1ml ≈ 1g (common approximation)
 */
function convertToGrams(value: number, unit: 'g' | 'ml'): number {
  if (unit === 'ml') {
    // For liquids, 1ml ≈ 1g (common approximation)
    return value;
  }
  return value; // Already in grams
}

/**
 * Calculate macros for a given quantity of food
 * @param food - The food item
 * @param grams - Quantity in grams (always normalized internally)
 * @param customServingId - Optional custom serving ID to use
 * @param displayValue - Optional display value in original unit
 * @param displayUnit - Optional display unit ('g' or 'ml')
 */
export function calculateMacros(
  food: Food,
  grams: number,
  options?: {
    customServingId?: string;
    displayValue?: number;
    displayUnit?: 'g' | 'ml';
  }
): {
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
} {
  let multiplier: number;
  const baseUnit = food.serving.baseUnit || 'g';

  // If custom serving is specified, use its value
  if (options?.customServingId && food.serving.customServings) {
    const customServing = food.serving.customServings.find(
      (s) => s.id === options.customServingId
    );
    if (customServing) {
      // Convert custom serving value to grams if needed
      const servingValueInGrams = convertToGrams(customServing.value, baseUnit);
      
      if (food.serving.type === 'per100g' || food.serving.type === 'per100ml') {
        multiplier = servingValueInGrams / 100;
      } else {
        // perServing
        const servingSize = baseUnit === 'g' 
          ? (food.serving.servingSizeG || 100)
          : (food.serving.servingSizeMl || 100);
        multiplier = servingValueInGrams / servingSize;
      }
    } else {
      // Fallback to regular calculation
      multiplier = calculateMultiplier(food, grams, baseUnit);
    }
  } else {
    multiplier = calculateMultiplier(food, grams, baseUnit);
  }

  return {
    kcal: Math.round(food.macros.kcal * multiplier * 10) / 10,
    protein: Math.round(food.macros.protein * multiplier * 10) / 10,
    carbs: Math.round(food.macros.carbs * multiplier * 10) / 10,
    fat: Math.round(food.macros.fat * multiplier * 10) / 10,
  };
}

/**
 * Calculate multiplier based on serving type
 */
function calculateMultiplier(food: Food, grams: number, baseUnit: 'g' | 'ml'): number {
  if (food.serving.type === 'per100g' || food.serving.type === 'per100ml') {
    return grams / 100;
  } else {
    // perServing
    const servingSize = baseUnit === 'g'
      ? (food.serving.servingSizeG || 100)
      : (food.serving.servingSizeMl || 100);
    return grams / servingSize;
  }
}

/**
 * Convert display value to grams
 */
export function convertDisplayValueToGrams(
  value: number,
  unit: 'g' | 'ml',
  food: Food
): number {
  return convertToGrams(value, unit);
}
