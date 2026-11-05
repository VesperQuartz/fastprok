import { serverEnv } from "@/env/server";
import "@dotenvx/dotenvx/config";
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  out: "./drizzle",
  schema: "./src/repo/schema",
  dialect: "postgresql",
  dbCredentials: {
    url: String(serverEnv.DB_URL),
  },
});
