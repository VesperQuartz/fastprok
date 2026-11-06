import z from "zod";

const APP_NAME = "Procurement Agent";

const normalizePostgresUrl = (value: string) =>
  value
    .trim()
    .replace(/^psql\s+/, "")
    .replace(/^['"]|['"]$/g, "");

const normalizeSender = (value: string) => {
  const sender = value.trim().replace(/^['"]|['"]$/g, "");

  if (sender.includes("@")) {
    return /<[^>]+>/.test(sender) ? sender : `${APP_NAME} <${sender}>`;
  }

  return `${APP_NAME} <agent@${sender.replace(/^@/, "")}>`;
};

const booleanFromEnv = (defaultValue: boolean) =>
  z
    .string()
    .optional()
    .transform((value) => (value === undefined ? defaultValue : value === "true" || value === "1"));

const optionalEmail = z
  .string()
  .optional()
  .transform((value) => value?.trim() || undefined)
  .pipe(z.email().optional());

const envSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    HOST: z.string().trim().default("0.0.0.0"),
    PORT: z.coerce.number().int().positive().default(3000),

    APP_BASE_URL: z.string().trim().pipe(z.url()),
    BETTER_AUTH_BASE_URL: z.string().trim().pipe(z.url()),
    BETTER_AUTH_SECRET: z.string().trim().min(32),

    DB_URL: z
      .string()
      .trim()
      .min(1)
      .transform(normalizePostgresUrl)
      .refine((value) => /^postgres(ql)?:\/\//.test(value), {
        message: "DB_URL must start with postgres://",
      }),
    DB_SSL_CA: z.string().trim().default("./ca-certificate.crt"),
    DB_SSL_DISABLED: booleanFromEnv(false),
    MIGRATIONS_DIR: z.string().trim().default("./drizzle"),

    RESEND_API_KEY: z.string().trim().min(1),
    RESEND_FROM: z.string().trim().min(1).transform(normalizeSender),
    DEMO_EMAIL_OVERRIDE: optionalEmail,

    VULTR_INFERENCE_API_KEY: z.string().trim().min(1),
    VULTR_INFERENCE_MODEL: z.string().trim().default("deepseek-v4.1-flash-1017"),
    VULTR_INFERENCE_BASE_URL: z
      .string()
      .trim()
      .default("https://api.vultrinference.com/v1")
      .pipe(z.url()),

    DEMO_MODE: booleanFromEnv(false),
    AGENT_TICK_MS: z.coerce.number().int().min(5_000).default(60_000),

    QUOTING_WINDOW_MINUTES: z.coerce.number().int().positive().default(4_320),
    DEMO_QUOTING_WINDOW_MINUTES: z.coerce.number().int().positive().default(10),
    MAX_REMINDERS: z.coerce.number().int().min(0).default(2),
    INVITE_BATCH_SIZE: z.coerce.number().int().positive().default(3),
    WIDEN_BATCH_SIZE: z.coerce.number().int().positive().default(3),
  })
  .readonly();

export const serverEnv = envSchema.parse(process.env);

export type ServerEnv = typeof serverEnv;
