import {
  registerSchema,
  loginSchema,
  pinSchema,
  foodSchema,
  entrySchema,
  weightSchema,
} from '@/lib/validations';

describe('Validation Schemas', () => {
  describe('registerSchema', () => {
    it('should validate correct registration data', () => {
      const validData = {
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
        pin: '1234',
      };

      expect(() => registerSchema.parse(validData)).not.toThrow();
    });

    it('should reject invalid email', () => {
      const invalidData = {
        email: 'invalid-email',
        password: 'password123',
        name: 'Test User',
        pin: '1234',
      };

      expect(() => registerSchema.parse(invalidData)).toThrow();
    });

    it('should reject short password', () => {
      const invalidData = {
        email: 'test@example.com',
        password: '12345',
        name: 'Test User',
        pin: '1234',
      };

      expect(() => registerSchema.parse(invalidData)).toThrow();
    });

    it('should reject invalid PIN format', () => {
      const invalidData = {
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
        pin: '12', // Too short
      };

      expect(() => registerSchema.parse(invalidData)).toThrow();
    });
  });

  describe('loginSchema', () => {
    it('should validate correct login data', () => {
      const validData = {
        email: 'test@example.com',
        password: 'password123',
      };

      expect(() => loginSchema.parse(validData)).not.toThrow();
    });

    it('should reject invalid email', () => {
      const invalidData = {
        email: 'invalid',
        password: 'password123',
      };

      expect(() => loginSchema.parse(invalidData)).toThrow();
    });
  });

  describe('pinSchema', () => {
    it('should validate 4-digit PIN', () => {
      expect(() => pinSchema.parse({ pin: '1234' })).not.toThrow();
    });

    it('should validate 6-digit PIN', () => {
      expect(() => pinSchema.parse({ pin: '123456' })).not.toThrow();
    });

    it('should reject non-numeric PIN', () => {
      expect(() => pinSchema.parse({ pin: 'abcd' })).toThrow();
    });

    it('should reject short PIN', () => {
      expect(() => pinSchema.parse({ pin: '123' })).toThrow();
    });
  });

  describe('foodSchema', () => {
    it('should validate correct food data', () => {
      const validData = {
        name: 'Test Food',
        serving: {
          type: 'per100g' as const,
        },
        macros: {
          kcal: 100,
          protein: 10,
          carbs: 20,
          fat: 5,
        },
        source: 'custom' as const,
      };

      expect(() => foodSchema.parse(validData)).not.toThrow();
    });

    it('should reject negative macros', () => {
      const invalidData = {
        name: 'Test Food',
        serving: {
          type: 'per100g' as const,
        },
        macros: {
          kcal: -100,
          protein: 10,
          carbs: 20,
          fat: 5,
        },
        source: 'custom' as const,
      };

      expect(() => foodSchema.parse(invalidData)).toThrow();
    });
  });

  describe('entrySchema', () => {
    it('should validate correct entry data', () => {
      const validData = {
        date: '2024-01-15',
        mealType: 'breakfast' as const,
        foodId: 'food123',
        quantity: {
          grams: 100,
        },
      };

      expect(() => entrySchema.parse(validData)).not.toThrow();
    });

    it('should reject invalid date format', () => {
      const invalidData = {
        date: '01/15/2024',
        mealType: 'breakfast' as const,
        foodId: 'food123',
        quantity: {
          grams: 100,
        },
      };

      expect(() => entrySchema.parse(invalidData)).toThrow();
    });

    it('should reject negative quantity', () => {
      const invalidData = {
        date: '2024-01-15',
        mealType: 'breakfast' as const,
        foodId: 'food123',
        quantity: {
          grams: -100,
        },
      };

      expect(() => entrySchema.parse(invalidData)).toThrow();
    });
  });

  describe('weightSchema', () => {
    it('should validate correct weight data', () => {
      const validData = {
        date: '2024-01-15',
        weightKg: 70.5,
      };

      expect(() => weightSchema.parse(validData)).not.toThrow();
    });

    it('should reject negative weight', () => {
      const invalidData = {
        date: '2024-01-15',
        weightKg: -70,
      };

      expect(() => weightSchema.parse(invalidData)).toThrow();
    });
  });
});
