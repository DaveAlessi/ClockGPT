const { z } = require('zod');

const configSchema = z.object({
  // Server
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),

  // Session
  SESSION_SECRET: z.string().min(1).default('dev-only-secret-change-me'),
  SESSION_TTL_MS: z.coerce.number().int().positive().default(24 * 60 * 60 * 1000),
  SESSION_COOKIE_SECURE: z.string().optional().transform(val => {
    if (val === undefined) return undefined;
    return val === 'true' || val === '1';
  }),
  SESSION_COOKIE_SAMESITE: z.enum(['strict', 'lax', 'none']).default('lax'),

  // Database
  DB_PATH: z.string().default('./users.db'),

  // Upload
  UPLOAD_DIR: z.string().default('./public/images'),
  UPLOAD_MAX_BYTES: z.coerce.number().int().positive().default(2 * 1024 * 1024),

  // Security
  BCRYPT_ROUNDS: z.coerce.number().int().min(4).max(12).default(10),

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(15 * 60 * 1000),
  REGISTRATION_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(10),
  LOGIN_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(10),
  UPLOAD_RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(15 * 60 * 1000),
  UPLOAD_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(30),
  PROFILE_PAGE_RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(15 * 60 * 1000),
  PROFILE_PAGE_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(120),

  // Logging
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
});

module.exports = { configSchema };
