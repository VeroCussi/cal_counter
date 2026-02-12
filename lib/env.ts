import { z } from 'zod';

/**
 * Validates environment variables at application startup.
 * Throws an error if any required variable is missing or invalid.
 */
const envSchema = z.object({
  MONGODB_URI: z.string().url('MONGODB_URI must be a valid URL'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters long'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  USDA_API_KEY: z.string().optional(),
  OFF_CONTACT_EMAIL: z.string().email('OFF_CONTACT_EMAIL must be a valid email').optional(),
});

type Env = z.infer<typeof envSchema>;

function validateEnv(): Env {
  const env = {
    MONGODB_URI: process.env.MONGODB_URI,
    JWT_SECRET: process.env.JWT_SECRET,
    NODE_ENV: process.env.NODE_ENV || 'development',
    USDA_API_KEY: process.env.USDA_API_KEY,
    OFF_CONTACT_EMAIL: process.env.OFF_CONTACT_EMAIL,
  };

  try {
    return envSchema.parse(env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('\n');
      throw new Error(`Invalid environment variables:\n${missingVars}`);
    }
    throw error;
  }
}

// Validate environment variables at module load time
export const env = validateEnv();

// Export individual variables for convenience
export const {
  MONGODB_URI,
  JWT_SECRET,
  NODE_ENV,
  USDA_API_KEY,
  OFF_CONTACT_EMAIL,
} = env;
