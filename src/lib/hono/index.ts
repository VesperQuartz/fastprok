import { bodyLimit } from "hono/body-limit";
import { poweredBy } from "hono/powered-by";
import { prettyJSON } from "hono/pretty-json";
import { requestId } from "hono/request-id";
import { secureHeaders } from "hono/secure-headers";
import { pinoLogger } from "hono-pino";
import pino from "pino";
import { sql } from "drizzle-orm";
import { Result } from "better-result";
import { z } from "zod";
import { markNotificationRead } from "@/domain/activity";
import { getProformaDocument, uploadProforma } from "@/domain/proforma";
import { loadActor } from "@/lib/actor";
import { db } from "@/lib/db";
import { httpStatusFor } from "@/lib/result/http";
import { presignObject } from "@/lib/storage";
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

app.get("/notifications/:notificationId/open", async (c) => {
  const actor = await loadActor(c.req.raw.headers);

  if (actor.isErr()) {
    return c.json({ message: actor.error.message }, httpStatusFor(actor.error));
  }

  const notificationId = c.req.param("notificationId");

  if (!z.uuid().safeParse(notificationId).success) {
    return c.json({ message: "The notification ID is not valid." }, 400);
  }

  const notification = await markNotificationRead(actor.value, notificationId);

  if (notification.isErr()) {
    return c.json({ message: notification.error.message }, httpStatusFor(notification.error));
  }

  return c.redirect(notification.value.href ?? "/notifications", 302);
});

app.post(
  "/vendor/requests/:requestId/proforma",
  bodyLimit({
    maxSize: 6 * 1024 * 1024,
    onError: (c) => c.json({ message: "Files must be 5 megabytes or smaller." }, 413),
  }),
  async (c) => {
    const actor = await loadActor(c.req.raw.headers);

    if (actor.isErr()) {
      return c.json({ message: actor.error.message }, httpStatusFor(actor.error));
    }

    if (actor.value.kind !== "vendor") {
      return c.json({ message: "Only vendors can upload a proforma invoice." }, 403);
    }

    const requestId = c.req.param("requestId");

    if (!z.uuid().safeParse(requestId).success) {
      return c.json({ message: "The request ID is not valid." }, 400);
    }

    const form = await Result.tryPromise({
      try: () => c.req.formData(),
      catch: () => new Error("The upload could not be read."),
    });

    if (form.isErr()) {
      return c.json({ message: "Send the file as multipart form data." }, 400);
    }

    const file = form.value.get("file");

    if (!(file instanceof File)) {
      return c.json({ message: "Choose a file to upload." }, 400);
    }

    const saved = await uploadProforma(actor.value, requestId, file);

    if (saved.isErr()) {
      return c.json({ message: saved.error.message }, httpStatusFor(saved.error));
    }

    return c.json(saved.value);
  },
);

app.get("/documents/proforma/:quoteId", async (c) => {
  const actor = await loadActor(c.req.raw.headers);

  if (actor.isErr()) {
    return c.json({ message: actor.error.message }, httpStatusFor(actor.error));
  }

  const quoteId = c.req.param("quoteId");

  if (!z.uuid().safeParse(quoteId).success) {
    return c.json({ message: "The quote ID is not valid." }, 400);
  }

  const proforma = await getProformaDocument(actor.value, quoteId);

  if (proforma.isErr()) {
    return c.json({ message: proforma.error.message }, httpStatusFor(proforma.error));
  }

  const url = await presignObject(proforma.value.storageKey);

  if (url.isErr()) {
    return c.json({ message: url.error.message }, httpStatusFor(url.error));
  }

  return c.body(null, 302, {
    Location: url.value,
    "Cache-Control": "no-store",
  });
});

export default app;
