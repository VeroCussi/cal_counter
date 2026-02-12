import { MacroCalculationResult, UserProfile } from '@/types';

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
 * Calorie adjustments based on goal
 */
const GOAL_ADJUSTMENTS = {
  cut: -500,    // Deficit for weight loss
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
 * @returns Target calories per day
 */
export function calculateTargetCalories(
  tdee: number,
  goal: keyof typeof GOAL_ADJUSTMENTS
): number {
  const adjustment = GOAL_ADJUSTMENTS[goal];
  return Math.max(1200, Math.round(tdee + adjustment)); // Minimum 1200 kcal for safety
}

/**
 * Calculate macronutrient distribution
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
  const targetCalories = calculateTargetCalories(tdee, profile.goal);
  const macros = calculateMacros(targetCalories, weightKg, proteinPerKg, fatPercentage);

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
