import {
  calculateBMR,
  calculateTDEE,
  calculateTargetCalories,
  calculateMacros,
  calculateMacrosByDistribution,
  getMacroDistribution,
  calculateMacrosFromProfile,
  inchesToCm,
  cmToInches,
  poundsToKg,
  kgToPounds,
} from '@/lib/macro-calculator';
import { UserProfile } from '@/types';

describe('Macro Calculator', () => {
  describe('calculateBMR', () => {
    it('should calculate BMR correctly for male', () => {
      // Example: 30-year-old male, 80kg, 180cm
      // BMR = 10 × 80 + 6.25 × 180 - 5 × 30 + 5 = 800 + 1125 - 150 + 5 = 1780
      const bmr = calculateBMR(80, 180, 30, 'male');
      expect(bmr).toBe(1780);
    });

    it('should calculate BMR correctly for female', () => {
      // Example: 25-year-old female, 65kg, 165cm
      // BMR = 10 × 65 + 6.25 × 165 - 5 × 25 - 161 = 650 + 1031.25 - 125 - 161 = 1395.25
      const bmr = calculateBMR(65, 165, 25, 'female');
      expect(bmr).toBeCloseTo(1395.25, 1);
    });
  });

  describe('calculateTDEE', () => {
    it('should calculate TDEE correctly for sedentary', () => {
      const bmr = 1500;
      const tdee = calculateTDEE(bmr, 'sedentary');
      expect(tdee).toBe(1800); // 1500 * 1.2
    });

    it('should calculate TDEE correctly for moderately active', () => {
      const bmr = 1500;
      const tdee = calculateTDEE(bmr, 'moderately_active');
      expect(tdee).toBe(2325); // 1500 * 1.55
    });

    it('should calculate TDEE correctly for extremely active', () => {
      const bmr = 2000;
      const tdee = calculateTDEE(bmr, 'extremely_active');
      expect(tdee).toBe(3800); // 2000 * 1.9
    });
  });

  describe('calculateTargetCalories', () => {
    it('should calculate target calories for cut goal with gentle intensity (default)', () => {
      const tdee = 2000;
      const target = calculateTargetCalories(tdee, 'cut', 'gentle');
      expect(target).toBe(1750); // 2000 - 250
    });

    it('should calculate target calories for cut goal with moderate intensity', () => {
      const tdee = 2000;
      const target = calculateTargetCalories(tdee, 'cut', 'moderate');
      expect(target).toBe(1600); // 2000 - 400
    });

    it('should calculate target calories for cut goal with aggressive intensity', () => {
      const tdee = 2000;
      const target = calculateTargetCalories(tdee, 'cut', 'aggressive');
      expect(target).toBe(1450); // 2000 - 550
    });

    it('should calculate target calories for maintain goal', () => {
      const tdee = 2000;
      const target = calculateTargetCalories(tdee, 'maintain');
      expect(target).toBe(2000); // 2000 + 0
    });

    it('should calculate target calories for bulk goal', () => {
      const tdee = 2000;
      const target = calculateTargetCalories(tdee, 'bulk');
      expect(target).toBe(2500); // 2000 + 500
    });

    it('should enforce minimum of 1200 calories', () => {
      const tdee = 1000;
      const target = calculateTargetCalories(tdee, 'cut', 'gentle');
      expect(target).toBe(1200); // Minimum enforced
    });
  });

  describe('calculateMacros', () => {
    it('should calculate macros correctly with default values', () => {
      const result = calculateMacros(2000, 70);
      // Protein: 70 * 2.0 = 140g = 560 kcal
      // Fat: 2000 * 0.25 = 500 kcal = 55.56g ≈ 56g
      // Carbs: (2000 - 560 - 500) / 4 = 940 / 4 = 235g
      expect(result.protein).toBe(140);
      expect(result.fat).toBe(56);
      expect(result.carbs).toBe(235);
    });

    it('should calculate macros with custom protein per kg', () => {
      const result = calculateMacros(2000, 70, 1.8);
      // Protein: 70 * 1.8 = 126g = 504 kcal
      // Fat: 2000 * 0.25 = 500 kcal = 56g
      // Carbs: (2000 - 504 - 500) / 4 = 996 / 4 = 249g
      expect(result.protein).toBe(126);
      expect(result.fat).toBe(56);
      expect(result.carbs).toBe(249);
    });

    it('should calculate macros with custom fat percentage', () => {
      const result = calculateMacros(2000, 70, 2.0, 0.30);
      // Protein: 70 * 2.0 = 140g = 560 kcal
      // Fat: 2000 * 0.30 = 600 kcal = 66.67g ≈ 67g
      // Carbs: (2000 - 560 - 600) / 4 = 840 / 4 = 210g
      expect(result.protein).toBe(140);
      expect(result.fat).toBe(67);
      expect(result.carbs).toBe(210);
    });

    it('should handle edge case with very low calories', () => {
      const result = calculateMacros(1200, 50);
      // Protein: 50 * 2.0 = 100g = 400 kcal
      // Fat: 1200 * 0.25 = 300 kcal = 33.33g ≈ 33g
      // Carbs: (1200 - 400 - 300) / 4 = 500 / 4 = 125g
      expect(result.protein).toBe(100);
      expect(result.fat).toBe(33);
      expect(result.carbs).toBe(125);
    });
  });

  describe('calculateMacrosFromProfile', () => {
    const validProfile: UserProfile = {
      age: 30,
      gender: 'female',
      heightCm: 165,
      activityLevel: 'moderately_active',
      goal: 'cut',
    };

    it('should calculate complete macro result from valid profile', () => {
      const result = calculateMacrosFromProfile(validProfile, 65);
      expect(result).not.toBeNull();
      expect(result?.bmr).toBeGreaterThan(0);
      expect(result?.tdee).toBeGreaterThan(result?.bmr || 0);
      expect(result?.targetCalories).toBeGreaterThan(0);
      expect(result?.macros.protein).toBeGreaterThan(0);
      expect(result?.macros.carbs).toBeGreaterThan(0);
      expect(result?.macros.fat).toBeGreaterThan(0);
    });

    it('should return null for incomplete profile', () => {
      const incompleteProfile: UserProfile = {
        age: 30,
        gender: 'female',
        // Missing other fields
      };
      const result = calculateMacrosFromProfile(incompleteProfile, 65);
      expect(result).toBeNull();
    });

    it('should return null for invalid age', () => {
      const invalidProfile: UserProfile = {
        ...validProfile,
        age: 5, // Too young
      };
      const result = calculateMacrosFromProfile(invalidProfile, 65);
      expect(result).toBeNull();
    });

    it('should return null for invalid height', () => {
      const invalidProfile: UserProfile = {
        ...validProfile,
        heightCm: 50, // Too short
      };
      const result = calculateMacrosFromProfile(invalidProfile, 65);
      expect(result).toBeNull();
    });

    it('should return null for invalid weight', () => {
      const result = calculateMacrosFromProfile(validProfile, 0);
      expect(result).toBeNull();
    });
  });

  describe('Unit conversions', () => {
    describe('inchesToCm', () => {
      it('should convert inches to centimeters correctly', () => {
        expect(inchesToCm(65)).toBe(165); // 65 * 2.54 = 165.1 ≈ 165
      });

      it('should handle common conversions', () => {
        expect(inchesToCm(70)).toBe(178); // 70 * 2.54 = 177.8 ≈ 178
      });
    });

    describe('cmToInches', () => {
      it('should convert centimeters to inches correctly', () => {
        expect(cmToInches(165)).toBe(65.0); // 165 / 2.54 = 64.96 ≈ 65.0
      });

      it('should round to 1 decimal place', () => {
        expect(cmToInches(180)).toBe(70.9); // 180 / 2.54 = 70.87 ≈ 70.9
      });
    });

    describe('poundsToKg', () => {
      it('should convert pounds to kilograms correctly', () => {
        expect(poundsToKg(143)).toBe(64.9); // 143 / 2.20462 = 64.86 ≈ 64.9
      });

      it('should round to 1 decimal place', () => {
        expect(poundsToKg(150)).toBe(68.0); // 150 / 2.20462 = 68.04 ≈ 68.0
      });
    });

    describe('kgToPounds', () => {
      it('should convert kilograms to pounds correctly', () => {
        expect(kgToPounds(65)).toBe(143); // 65 * 2.20462 = 143.3 ≈ 143
      });

      it('should handle common weights', () => {
        expect(kgToPounds(70)).toBe(154); // 70 * 2.20462 = 154.32 ≈ 154
      });
    });
  });

  describe('calculateMacrosByDistribution', () => {
    it('should calculate macros correctly with balanced distribution', () => {
      // 2000 kcal, 30% protein, 30% fat, 40% carbs
      const result = calculateMacrosByDistribution(2000, { protein: 30, fat: 30, carbs: 40 });
      // Protein: 2000 * 0.30 / 4 = 150g
      // Fat: 2000 * 0.30 / 9 = 66.67g ≈ 67g
      // Carbs: remaining calories / 4
      expect(result.protein).toBe(150);
      expect(result.fat).toBe(67);
      expect(result.carbs).toBeGreaterThan(0);
    });

    it('should calculate macros correctly with keto distribution', () => {
      // 2000 kcal, 20% protein, 70% fat, 10% carbs
      const result = calculateMacrosByDistribution(2000, { protein: 20, fat: 70, carbs: 10 });
      // Protein: 2000 * 0.20 / 4 = 100g
      // Fat: 2000 * 0.70 / 9 = 155.56g ≈ 156g
      // Carbs: 2000 * 0.10 / 4 = 50g
      expect(result.protein).toBe(100);
      expect(result.fat).toBe(156);
      expect(result.carbs).toBe(50);
    });

    it('should normalize percentages that do not sum to 100', () => {
      // 2000 kcal, 50% protein, 30% fat, 20% carbs (sums to 100)
      const result = calculateMacrosByDistribution(2000, { protein: 50, fat: 30, carbs: 20 });
      expect(result.protein).toBe(250); // 2000 * 0.50 / 4
      expect(result.fat).toBe(67); // 2000 * 0.30 / 9
      expect(result.carbs).toBe(100); // 2000 * 0.20 / 4
    });
  });

  describe('getMacroDistribution', () => {
    it('should return balanced distribution', () => {
      const dist = getMacroDistribution('balanced');
      expect(dist.protein).toBe(30);
      expect(dist.fat).toBe(30);
      expect(dist.carbs).toBe(40);
    });

    it('should return high_protein distribution', () => {
      const dist = getMacroDistribution('high_protein');
      expect(dist.protein).toBe(40);
      expect(dist.fat).toBe(30);
      expect(dist.carbs).toBe(30);
    });

    it('should return keto distribution', () => {
      const dist = getMacroDistribution('keto');
      expect(dist.protein).toBe(20);
      expect(dist.fat).toBe(70);
      expect(dist.carbs).toBe(10);
    });

    it('should return custom distribution when provided', () => {
      const custom = { protein: 50, fat: 30, carbs: 20 };
      const dist = getMacroDistribution('custom', custom);
      expect(dist).toEqual(custom);
    });
  });

  describe('calculateMacrosFromProfile with distributions', () => {
    const baseProfile: UserProfile = {
      age: 30,
      gender: 'female',
      heightCm: 165,
      activityLevel: 'moderately_active',
      goal: 'cut',
    };

    it('should use balanced distribution by default', () => {
      const result = calculateMacrosFromProfile(baseProfile, 65);
      expect(result).not.toBeNull();
      // Should use balanced (30/30/40) instead of legacy method
      expect(result?.macros.protein).toBeGreaterThan(0);
      expect(result?.macros.fat).toBeGreaterThan(0);
      expect(result?.macros.carbs).toBeGreaterThan(0);
    });

    it('should use high_protein distribution when specified', () => {
      const profile = {
        ...baseProfile,
        macroDistribution: { type: 'high_protein' },
      };
      const result = calculateMacrosFromProfile(profile, 65);
      expect(result).not.toBeNull();
      // High protein should have more protein relative to carbs
      expect(result?.macros.protein).toBeGreaterThan(result?.macros.carbs || 0);
    });

    it('should use keto distribution when specified', () => {
      const profile = {
        ...baseProfile,
        macroDistribution: { type: 'keto' },
      };
      const result = calculateMacrosFromProfile(profile, 65);
      expect(result).not.toBeNull();
      // Keto should have very low carbs and high fat
      expect(result?.macros.carbs).toBeLessThan(100);
      expect(result?.macros.fat).toBeGreaterThan(result?.macros.protein || 0);
    });

    it('should use custom distribution when specified', () => {
      const profile = {
        ...baseProfile,
        macroDistribution: {
          type: 'custom',
          proteinPercent: 50,
          fatPercent: 30,
          carbsPercent: 20,
        },
      };
      const result = calculateMacrosFromProfile(profile, 65);
      expect(result).not.toBeNull();
      // Custom 50/30/20 should reflect in the macros
      const totalCal = result!.targetCalories;
      const proteinCal = result!.macros.protein * 4;
      const fatCal = result!.macros.fat * 9;
      const carbsCal = result!.macros.carbs * 4;
      // Check that percentages are approximately correct
      expect(proteinCal / totalCal).toBeCloseTo(0.50, 1);
      expect(fatCal / totalCal).toBeCloseTo(0.30, 1);
      expect(carbsCal / totalCal).toBeCloseTo(0.20, 1);
    });
  });
});
