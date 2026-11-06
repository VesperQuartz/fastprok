import { poweredBy } from "hono/powered-by";
import { prettyJSON } from "hono/pretty-json";
import { requestId } from "hono/request-id";
import { secureHeaders } from "hono/secure-headers";
import { pinoLogger } from "hono-pino";
import pino from "pino";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { factory } from "./factory";

const app = factory.createApp().basePath("/api");

app.use(poweredBy());
app.use(secureHeaders());
app.use(requestId());
app.use(
  pinoLogger({
    pino: pino({
      level: "info",
      transport:
        typeof window !== "undefined"
          ? {
              target: import.meta.env.MODE === "production" ? "pino-pretty" : "hono-pino/debug-log",
            }
          : undefined,
    }),
    contextKey: "logger" as const,
  }),
);

app.use(prettyJSON());

app.get("/health", async (c) => {
  try {
    await db.execute(sql`select 1`);

    return c.json({
      status: "ok",
      database: "up",
      at: new Date().toISOString(),
    });
  } catch {
    return c.json({ status: "error", database: "down" }, 503);
  }
});

app.get("/hono", (c) => {
  const logger = c.get("logger");
  logger.info("Hello Hono");
  return c.json({ message: "Hello Hono" });
});

export default app;
