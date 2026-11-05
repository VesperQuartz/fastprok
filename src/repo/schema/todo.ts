import { integer, pgTable } from "drizzle-orm/pg-core";

export const todo = pgTable("todo", {
  id: integer(),
});
