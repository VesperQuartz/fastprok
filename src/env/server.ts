import z from "zod";

const env = z
  .object({
    SERVER_URL: z.url().optional(),
    BETTER_AUTH_SECRET: z.string().optional(),
    DB_URL: z.string().optional(),
  })
  .readonly();

export const serverEnv = env.parse(process.env);
