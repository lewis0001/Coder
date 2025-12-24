import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  API_PORT: z.coerce.number().default(3001),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  REDIS_URL: z.string().min(1, 'REDIS_URL is required'),
  JWT_SECRET: z.string().min(8, 'JWT_SECRET must be set'),
  REFRESH_SECRET: z.string().min(8, 'REFRESH_SECRET must be set'),
  OTP_CODE: z.string().default('000000'),
  STRIPE_SECRET_KEY: z.string().min(10, 'STRIPE_SECRET_KEY is required'),
  STRIPE_WEBHOOK_SECRET: z.string().min(10, 'STRIPE_WEBHOOK_SECRET is required'),
});

export type AppEnv = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>): AppEnv {
  const parsed = envSchema.safeParse(config);
  if (!parsed.success) {
    const formatted = parsed.error.format();
    throw new Error(`Invalid environment configuration: ${JSON.stringify(formatted, null, 2)}`);
  }
  return parsed.data;
}
