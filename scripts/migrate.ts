import { pool } from "@/lib/db";
import { runMigrations } from "@/server/migrate";

await runMigrations();
await pool.end();

console.log("Database migrations applied.");
