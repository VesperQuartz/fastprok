import handler from "@tanstack/react-start/server-entry";
import { runMigrations } from "./server/migrate";

let migrations: Promise<void> | null = null;

const ensureMigrations = () => {
  migrations ??= runMigrations().catch((error) => {
    migrations = null;
    throw error;
  });

  return migrations;
};

export default {
  async fetch(request: Request) {
    await ensureMigrations();
    return handler.fetch(request);
  },
};
