import { adminClient, inferAdditionalFields } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";
import { clientEnv } from "@/env/client";
import type { auth } from "./auth";

export const authClient = createAuthClient({
  baseURL: clientEnv.VITE_BASE_URL,
  plugins: [adminClient(), inferAdditionalFields<typeof auth>()],
});
