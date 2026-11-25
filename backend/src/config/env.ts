import { z } from 'zod';

// Lokal ishlaganda .env faylini o'qiymiz (testlar hermetik bo'lishi uchun o'qilmaydi).
// process.loadEnvFile mavjud o'zgaruvchilarni bosib o'tmaydi.
if (process.env['NODE_ENV'] !== 'test') {
  try {
    process.loadEnvFile();
  } catch {
    // .env yo'q — muammo emas
  }
}

const bool = z
  .enum(['true', 'false', '1', '0', ''])
  .optional()
  .transform((v) => v === 'true' || v === '1');

/** Bo'sh qator = berilmagan. */
const opt = z
  .string()
  .optional()
  .transform((v) => (v !== undefined && v.trim() !== '' ? v.trim() : undefined));

export const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    HOST: z.string().default('0.0.0.0'),
    PORT: z.coerce.number().int().min(0).default(3000),
    LOG_LEVEL: z
      .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
      .default('info'),
    WEB_ORIGINS: z
      .string()
      .default('http://localhost:3001')
      .transform((v) =>
        v
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
      ),
    TRUST_PROXY: z.string().default('loopback'),
    ALLOW_TIME_TRAVEL: bool,
    /** Swagger UI (`/api/docs`) va `/api/openapi.json`: standart yoqiq (production'da ham); o'chirish uchun `false` */
    API_DOCS: z
      .enum(['true', 'false', '1', '0', ''])
      .optional()
      .transform((v) => v === undefined || v === '' || v === 'true' || v === '1'),
    LOGIN_IP_LIMIT: z.coerce.number().int().positive().default(20),
    /** Umumiy so'rovlar chegarasi: foydalanuvchi boshiga daqiqasiga */
    API_RATE_LIMIT: z.coerce.number().int().positive().default(300),

    DATABASE_URL: opt,
    DATABASE_POOL_MAX: z.coerce.number().int().positive().default(10),
    REDIS_URL: opt,

    S3_ENDPOINT: opt,
    S3_REGION: z.string().default('us-east-1'),
    S3_BUCKET: opt,
    S3_ACCESS_KEY: opt,
    S3_SECRET_KEY: opt,
    S3_FORCE_PATH_STYLE: bool,

    STORAGE_DIR: z.string().default('./data/media'),
    STORAGE_SIGNING_SECRET: z.string().default('dev-only-change-me'),
    PUBLIC_API_URL: opt,

    EXPO_ACCESS_TOKEN: opt,

    // Mobil ilova yangilanishi (GET /app/version)
    MOBILE_LATEST_VERSION: opt,
    MOBILE_MIN_VERSION: opt,
    MOBILE_DOWNLOAD_URL: opt,
    MOBILE_RELEASE_NOTES: opt,
  })
  .superRefine((env, ctx) => {
    if (env.S3_ENDPOINT) {
      for (const key of ['S3_BUCKET', 'S3_ACCESS_KEY', 'S3_SECRET_KEY'] as const) {
        if (!env[key]) {
          ctx.addIssue({ code: 'custom', path: [key], message: `S3_ENDPOINT berilgan: ${key} ham kerak` });
        }
      }
    }
    if (env.NODE_ENV === 'production' && !env.S3_ENDPOINT && env.STORAGE_SIGNING_SECRET === 'dev-only-change-me') {
      ctx.addIssue({
        code: 'custom',
        path: ['STORAGE_SIGNING_SECRET'],
        message: "Production'da lokal saqlash uchun STORAGE_SIGNING_SECRET o'zgartirilishi kerak",
      });
    }
  });

export type Env = z.infer<typeof envSchema>;

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const parsed = envSchema.safeParse(source);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join('.')}: ${i.message}`)
      .join('\n');
    throw new Error(`Muhit o'zgaruvchilari noto'g'ri:\n${issues}`);
  }
  return parsed.data;
}

export function publicApiUrl(env: Env): string {
  return env.PUBLIC_API_URL ?? `http://localhost:${env.PORT}`;
}
