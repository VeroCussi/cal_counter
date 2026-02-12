import { MacroCalculationResult, UserProfile, MacroDistributionType, CutIntensity } from '@/types';

/**
 * Activity level multipliers for TDEE calculation
 */
const ACTIVITY_MULTIPLIERS = {
  sedentary: 1.2,
  lightly_active: 1.375,
  moderately_active: 1.55,
  very_active: 1.725,
  extremely_active: 1.9,
} as const;

/**
 * Predefined macro distributions (as percentages of total calories)
 */
const MACRO_DISTRIBUTIONS: Record<MacroDistributionType, { protein: number; fat: number; carbs: number }> = {
  balanced: { protein: 30, fat: 30, carbs: 40 },        // 30/30/40
  high_protein: { protein: 40, fat: 30, carbs: 30 },    // 40/30/30
  keto: { protein: 20, fat: 70, carbs: 10 },            // 20/70/10 (keto)
  low_carb: { protein: 35, fat: 40, carbs: 25 },        // 35/40/25
  custom: { protein: 0, fat: 0, carbs: 0 },             // Will be overridden by user input
};

/**
 * Calorie adjustments based on goal and cut intensity
 */
const CUT_INTENSITY_ADJUSTMENTS = {
  gentle: -250,      // Suave: ~0.25 kg/semana
  moderate: -400,    // Moderado: ~0.4 kg/semana
  aggressive: -550,  // Rápido: -500 a -600 kcal/día (promedio -550)
} as const;

const GOAL_ADJUSTMENTS = {
  cut: -250,    // Default gentle cut (will be overridden by cutIntensity)
  maintain: 0,  // No change
  bulk: 500,    // Surplus for weight gain
} as const;

/**
 * Calculate BMR (Basal Metabolic Rate) using Mifflin-St Jeor equation
 * @param weightKg Weight in kilograms
 * @param heightCm Height in centimeters
 * @param age Age in years
 * @param gender 'male' or 'female'
 * @returns BMR in calories per day
 */
export function calculateBMR(
  weightKg: number,
  heightCm: number,
  age: number,
  gender: 'male' | 'female'
): number {
  // Mifflin-St Jeor equation
  // Men: BMR = 10 × weight(kg) + 6.25 × height(cm) - 5 × age + 5
  // Women: BMR = 10 × weight(kg) + 6.25 × height(cm) - 5 × age - 161
  const baseBMR = 10 * weightKg + 6.25 * heightCm - 5 * age;
  return gender === 'male' ? baseBMR + 5 : baseBMR - 161;
}

/**
 * Calculate TDEE (Total Daily Energy Expenditure)
 * @param bmr Basal Metabolic Rate
 * @param activityLevel Activity level
 * @returns TDEE in calories per day
 */
export function calculateTDEE(
  bmr: number,
  activityLevel: keyof typeof ACTIVITY_MULTIPLIERS
): number {
  const multiplier = ACTIVITY_MULTIPLIERS[activityLevel];
  return Math.round(bmr * multiplier);
}

/**
 * Calculate target calories based on TDEE and goal
 * @param tdee Total Daily Energy Expenditure
 * @param goal Goal type (cut/maintain/bulk)
 * @param cutIntensity Intensity of weight loss (only used when goal is 'cut')
 * @returns Target calories per day
 */
export function calculateTargetCalories(
  tdee: number,
  goal: keyof typeof GOAL_ADJUSTMENTS,
  cutIntensity: 'gentle' | 'moderate' | 'aggressive' = 'gentle'
): number {
  let adjustment: number;
  
  if (goal === 'cut') {
    adjustment = CUT_INTENSITY_ADJUSTMENTS[cutIntensity];
  } else {
    adjustment = GOAL_ADJUSTMENTS[goal];
  }
  
  return Math.max(1200, Math.round(tdee + adjustment)); // Minimum 1200 kcal for safety
}

/**
 * Calculate macronutrient distribution based on percentage distribution
 * @param targetCalories Target daily calories
 * @param distribution Macro distribution percentages
 * @returns Object with protein, carbs, and fat in grams
 */
export function calculateMacrosByDistribution(
  targetCalories: number,
  distribution: { protein: number; fat: number; carbs: number }
): { protein: number; carbs: number; fat: number } {
  // Normalize percentages to ensure they sum to 100%
  const total = distribution.protein + distribution.fat + distribution.carbs;
  const normalizedProtein = distribution.protein / total;
  const normalizedFat = distribution.fat / total;
  const normalizedCarbs = distribution.carbs / total;

  // Calculate calories for each macro
  const proteinCalories = Math.round(targetCalories * normalizedProtein);
  const fatCalories = Math.round(targetCalories * normalizedFat);
  const carbsCalories = targetCalories - proteinCalories - fatCalories; // Use remaining to ensure exact total

  // Convert to grams (protein and carbs: 4 cal/g, fat: 9 cal/g)
  const proteinGrams = Math.round(proteinCalories / 4);
  const fatGrams = Math.round(fatCalories / 9);
  const carbsGrams = Math.max(0, Math.round(carbsCalories / 4));

  return {
    protein: proteinGrams,
    carbs: carbsGrams,
    fat: fatGrams,
  };
}

/**
 * Calculate macronutrient distribution (legacy method - kept for backward compatibility)
 * @param targetCalories Target daily calories
 * @param weightKg Weight in kilograms
 * @param proteinPerKg Protein per kg of body weight (default 2.0)
 * @param fatPercentage Percentage of calories from fat (default 25%)
 * @returns Object with protein, carbs, and fat in grams
 */
export function calculateMacros(
  targetCalories: number,
  weightKg: number,
  proteinPerKg: number = 2.0,
  fatPercentage: number = 0.25
): { protein: number; carbs: number; fat: number } {
  // Protein: based on body weight (4 calories per gram)
  const proteinGrams = Math.round(weightKg * proteinPerKg);
  const proteinCalories = proteinGrams * 4;

  // Fat: percentage of total calories (9 calories per gram)
  const fatCalories = Math.round(targetCalories * fatPercentage);
  const fatGrams = Math.round(fatCalories / 9);

  // Carbs: remaining calories (4 calories per gram)
  const remainingCalories = targetCalories - proteinCalories - fatCalories;
  const carbsGrams = Math.max(0, Math.round(remainingCalories / 4));

  return {
    protein: proteinGrams,
    carbs: carbsGrams,
    fat: fatGrams,
  };
}

/**
 * Get macro distribution percentages based on type
 */
export function getMacroDistribution(type: MacroDistributionType, custom?: { protein: number; fat: number; carbs: number }): { protein: number; fat: number; carbs: number } {
  if (type === 'custom' && custom) {
    return custom;
  }
  return MACRO_DISTRIBUTIONS[type];
}

/**
 * Main function to calculate all macros based on user profile
 * @param profile User profile with age, gender, height, activity level, and goal
 * @param weightKg Current weight in kilograms
 * @param proteinPerKg Optional: protein per kg (default 2.0)
 * @param fatPercentage Optional: fat percentage (default 0.25)
 * @returns Complete macro calculation result
 */
export function calculateMacrosFromProfile(
  profile: UserProfile,
  weightKg: number,
  proteinPerKg: number = 2.0,
  fatPercentage: number = 0.25
): MacroCalculationResult | null {
  // Validate required fields
  if (
    !profile.age ||
    !profile.gender ||
    !profile.heightCm ||
    !profile.activityLevel ||
    !profile.goal
  ) {
    return null;
  }

  // Validate ranges
  if (
    profile.age < 13 ||
    profile.age > 120 ||
    profile.heightCm < 100 ||
    profile.heightCm > 250 ||
    weightKg <= 0 ||
    weightKg > 500
  ) {
    return null;
  }

  const bmr = calculateBMR(weightKg, profile.heightCm, profile.age, profile.gender);
  const tdee = calculateTDEE(bmr, profile.activityLevel);
  // Only use cutIntensity when goal is 'cut', default to 'gentle'
  const cutIntensity = profile.goal === 'cut' ? (profile.cutIntensity || 'gentle') : 'gentle';
  const targetCalories = calculateTargetCalories(tdee, profile.goal, cutIntensity);

  // Use distribution-based calculation
  let macros;
  const distributionType = profile.macroDistribution?.type || 'balanced';
  
  if (distributionType === 'custom' && 
      profile.macroDistribution?.proteinPercent !== undefined && 
      profile.macroDistribution?.fatPercent !== undefined) {
    // Custom distribution
    const carbsPercent = profile.macroDistribution.carbsPercent || 
      (100 - profile.macroDistribution.proteinPercent - profile.macroDistribution.fatPercent);
    macros = calculateMacrosByDistribution(targetCalories, {
      protein: profile.macroDistribution.proteinPercent,
      fat: profile.macroDistribution.fatPercent,
      carbs: carbsPercent,
    });
  } else {
    // Use predefined distribution (defaults to 'balanced' if not specified)
    const distribution = getMacroDistribution(distributionType);
    macros = calculateMacrosByDistribution(targetCalories, distribution);
  }

  return {
    bmr: Math.round(bmr),
    tdee,
    targetCalories,
    macros,
  };
}

/**
 * Convert height from inches to centimeters
 */
export function inchesToCm(inches: number): number {
  return Math.round(inches * 2.54);
}

/**
 * Convert height from centimeters to inches
 */
export function cmToInches(cm: number): number {
  return Math.round((cm / 2.54) * 10) / 10; // Round to 1 decimal
}

/**
 * Convert weight from pounds to kilograms
 */
export function poundsToKg(pounds: number): number {
  return Math.round((pounds / 2.20462) * 10) / 10; // Round to 1 decimal
}

/**
 * Convert weight from kilograms to pounds
 */
export function kgToPounds(kg: number): number {
  return Math.round(kg * 2.20462);
}
