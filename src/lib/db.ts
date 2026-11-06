import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { serverEnv } from "@/env/server";
import { authRelations } from "@/repo/schema/auth.schema";

const ssl = serverEnv.DB_SSL_DISABLED
  ? false
  : {
      ca: readFileSync(resolve(serverEnv.DB_SSL_CA), "utf8"),
      rejectUnauthorized: true,
    };

export const pool = new Pool({
  connectionString: serverEnv.DB_URL,
  ssl,
  max: serverEnv.NODE_ENV === "production" ? 10 : 5,
});

pool.on("error", (error) => {
  console.error("Unexpected database pool error", error);
});

export const db = drizzle({
  client: pool,
  logger: serverEnv.NODE_ENV === "development",
  relations: {
    ...authRelations,
  },
});

export type Db = typeof db;
export type DbTransaction = Parameters<Parameters<Db["transaction"]>[0]>[0];
