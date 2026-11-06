import { migrate } from "drizzle-orm/node-postgres/migrator";
import { drizzle } from "drizzle-orm/node-postgres";
import { serverEnv } from "@/env/server";
import { pool } from "@/lib/db";
import { authRelations } from "@/repo/schema/auth.schema";

const MIGRATION_LOCK_KEY = 7_281_190;

export const runMigrations = async () => {
  const client = await pool.connect();

  try {
    await client.query("select pg_advisory_lock($1)", [MIGRATION_LOCK_KEY]);

    const migrationDb = drizzle({
      client,
      relations: {
        ...authRelations,
      },
    });

    const failure = await migrate(migrationDb, {
      migrationsFolder: serverEnv.MIGRATIONS_DIR,
    });

    if (failure) {
      throw new Error(`Database migration failed: ${failure.exitCode}`);
    }
  } finally {
    try {
      await client.query("select pg_advisory_unlock($1)", [MIGRATION_LOCK_KEY]);
    } finally {
      client.release();
    }
  }
};
