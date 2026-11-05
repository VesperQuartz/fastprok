import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { serverEnv } from "@/env/server";
import { authRelations } from "@/repo/schema/auth.schema";

const pool = new Pool({
  connectionString: String(serverEnv.DB_URL),
});

export const db = drizzle({
  client: pool,
  logger: true,
  relations: {
    ...authRelations,
  },
});

export type Db = typeof db;
