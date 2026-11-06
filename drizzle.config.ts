import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { defineConfig } from "drizzle-kit";

const rawUrl = (process.env.DB_URL ?? "postgres://localhost:5432/postgres")
  .replace(/^psql\s+/, "")
  .replace(/^['"]|['"]$/g, "");
const url = new URL(rawUrl);
const sslDisabled = process.env.DB_SSL_DISABLED === "true";

export default defineConfig({
  out: "./drizzle",
  schema: ["./src/repo/schema/auth.schema.ts", "./src/repo/schema/procurement.schema.ts"],
  dialect: "postgresql",
  dbCredentials: {
    host: url.hostname,
    port: Number(url.port || 5432),
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: decodeURIComponent(url.pathname.replace(/^\//, "")),
    ssl: sslDisabled
      ? false
      : {
          ca: readFileSync(resolve(process.env.DB_SSL_CA ?? "./ca-certificate.crt"), "utf8"),
          rejectUnauthorized: true,
        },
  },
});
