import { drizzleAdapter } from "@better-auth/drizzle-adapter/relations-v2";
import { type BetterAuthOptions, betterAuth } from "better-auth";
import { admin, bearer, openAPI } from "better-auth/plugins";
import { tanstackStartCookies } from "better-auth/tanstack-start";
import * as schema from "@/repo/schema";
import { MailServer } from "@/services/mail";
import { db } from "./db";
import { transporter } from "./mail";
import { ac, adminRole, customRole, superadmin, userRole } from "./permission";

const authOptions: BetterAuthOptions = {
  baseURL: process.env.BETTER_AUTH_BASE_URL,
  rateLimit: {
    window: 10,
    max: 100,
    enabled: true,
  },
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 6,
    requireEmailVerification: true,
    autoSignIn: false,
  },
  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    sendOnSignIn: true,
    sendVerificationEmail: async ({ user, url }) => {
      const mail = new MailServer(transporter);
      await mail.sendVerificationEmail({
        recipient: user.email,
        tokenUrl: url,
      });
    },
    afterEmailVerification: async (data) => {
      console.log(data);
    },
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
        input: true,
        required: false,
      },
    },
  },
  plugins: [
    admin({
      ac,
      roles: {
        admin: adminRole,
        user: userRole,
        custom: customRole,
        superadmin: superadmin,
      },
      defaultRole: "user",
      adminRoles: ["admin", "superadmin"],
    }),
    openAPI(),
    bearer(),
    tanstackStartCookies(),
  ],
  databaseHooks: {
    user: {
      create: {
        before: async (user, ctx) => {
          if (!ctx?.body?.role) {
            return {
              data: { ...user },
            };
          }
          return { data: { ...user, role: ctx?.body?.role } };
        },
      },
    },
  },
};

export const auth = betterAuth(authOptions) as ReturnType<typeof betterAuth<typeof authOptions>>;

export type Session = typeof auth.$Infer.Session;
