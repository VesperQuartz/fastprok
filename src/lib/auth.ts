import { drizzleAdapter } from "@better-auth/drizzle-adapter/relations-v2";
import { type BetterAuthOptions, betterAuth } from "better-auth";
import { tanstackStartCookies } from "better-auth/tanstack-start";
import { serverEnv } from "@/env/server";
import * as schema from "@/repo/schema";
import { db } from "./db";

const authOptions: BetterAuthOptions = {
  baseURL: serverEnv.BETTER_AUTH_BASE_URL,
  secret: serverEnv.BETTER_AUTH_SECRET,
  trustedOrigins: [serverEnv.APP_BASE_URL],
  rateLimit: {
    window: 10,
    max: 100,
    enabled: serverEnv.NODE_ENV === "production",
  },
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    requireEmailVerification: false,
    autoSignIn: true,
  },
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      ...schema,
    },
  }),
  user: {
    additionalFields: {
      role: {
        type: "string",
        input: false,
        required: false,
        defaultValue: "user",
      },
    },
  },
  plugins: [tanstackStartCookies()],
};

export const auth = betterAuth(authOptions) as ReturnType<typeof betterAuth<typeof authOptions>>;

export type Session = typeof auth.$Infer.Session;
