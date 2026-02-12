import { calculateMacros } from '@/lib/macros';
import { Food } from '@/types';

describe('calculateMacros', () => {
  const baseFood: Food = {
    _id: '1',
    ownerUserId: 'user1',
    name: 'Test Food',
    serving: {
      type: 'per100g',
    },
    macros: {
      kcal: 100,
      protein: 10,
      carbs: 20,
      fat: 5,
    },
    source: 'custom',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  it('should calculate macros correctly for per100g serving', () => {
    const result = calculateMacros(baseFood, 200);
    
    expect(result.kcal).toBe(200);
    expect(result.protein).toBe(20);
    expect(result.carbs).toBe(40);
    expect(result.fat).toBe(10);
  });

  it('should calculate macros correctly for 50g', () => {
    const result = calculateMacros(baseFood, 50);
    
    expect(result.kcal).toBe(50);
    expect(result.protein).toBe(5);
    expect(result.carbs).toBe(10);
    expect(result.fat).toBe(2.5);
  });

  it('should calculate macros correctly for perServing type', () => {
    const servingFood: Food = {
      ...baseFood,
      serving: {
        type: 'perServing',
        servingSizeG: 150,
      },
    };

    const result = calculateMacros(servingFood, 300);
    
    // 300g / 150g = 2 servings
    expect(result.kcal).toBe(200); // 100 * 2
    expect(result.protein).toBe(20); // 10 * 2
    expect(result.carbs).toBe(40); // 20 * 2
    expect(result.fat).toBe(10); // 5 * 2
  });

  it('should round to 1 decimal place', () => {
    const result = calculateMacros(baseFood, 33);
    
    // 100 * 0.33 = 33, but should round to 1 decimal
    expect(result.kcal).toBe(33);
    expect(result.protein).toBe(3.3);
    expect(result.carbs).toBe(6.6);
    expect(result.fat).toBe(1.7); // 5 * 0.33 = 1.65, rounded to 1.7
  });

  it('should handle zero grams', () => {
    const result = calculateMacros(baseFood, 0);
    
    expect(result.kcal).toBe(0);
    expect(result.protein).toBe(0);
    expect(result.carbs).toBe(0);
    expect(result.fat).toBe(0);
  });
});
