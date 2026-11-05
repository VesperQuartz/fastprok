import { createFactory } from "hono/factory";
import type { Env as HonoPinoEnv, PinoLogger } from "hono-pino";
import type { auth } from "@/lib/auth";

export const factory = createFactory<{
  Variables: {
    user: typeof auth.$Infer.Session.user | null;
    session: typeof auth.$Infer.Session.session | null;
  } & { logger: PinoLogger };
  Bindings: {} & HonoPinoEnv;
}>();

export const authMiddleware = factory.createMiddleware(async (c, next) => {
  const session = c.get("session");
  if (!session) {
    return c.json({ message: "Unauthorized" }, 401);
  }
  return next();
});
