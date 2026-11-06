import { and, asc, desc, eq } from "drizzle-orm";
import { Result } from "better-result";
import type { Actor, BuyerActor } from "@/lib/actor";
import { db } from "@/lib/db";
import { tryDatabase } from "@/lib/result/database";
import { NotFoundError, type AppError } from "@/lib/result/errors";
import { agentActions, notifications, requests } from "@/repo/schema";

export type TimelineItem = {
  id: string;
  action: string;
  actorType: string;
  detail: Record<string, unknown> | null;
  createdAt: string;
};

export const getRequestTimeline = async (
  actor: BuyerActor,
  requestId: string,
): Promise<Result<TimelineItem[], AppError>> => {
  const owned = await tryDatabase("check request ownership", () =>
    db
      .select({ id: requests.id })
      .from(requests)
      .where(and(eq(requests.id, requestId), eq(requests.organizationId, actor.organizationId)))
      .limit(1),
  );

  if (owned.isErr()) {
    return owned;
  }

  if (owned.value.length === 0) {
    return Result.err(new NotFoundError({ resource: "request", resourceId: requestId }));
  }

  const rows = await tryDatabase("list request timeline", () =>
    db
      .select({
        id: agentActions.id,
        action: agentActions.action,
        actorType: agentActions.actorType,
        detail: agentActions.detail,
        createdAt: agentActions.createdAt,
      })
      .from(agentActions)
      .where(eq(agentActions.requestId, requestId))
      .orderBy(asc(agentActions.createdAt))
      .limit(100),
  );

  return rows.map((items) =>
    items.map((item) => ({
      ...item,
      createdAt: item.createdAt.toISOString(),
    })),
  );
};

export type NotificationItem = {
  id: string;
  requestId: string | null;
  type: string;
  title: string;
  body: string;
  readAt: string | null;
  createdAt: string;
};

export const listNotifications = async (
  actor: Actor,
): Promise<Result<NotificationItem[], AppError>> => {
  const rows = await tryDatabase("list notifications", () =>
    db
      .select({
        id: notifications.id,
        requestId: notifications.requestId,
        type: notifications.type,
        title: notifications.title,
        body: notifications.body,
        readAt: notifications.readAt,
        createdAt: notifications.createdAt,
      })
      .from(notifications)
      .where(eq(notifications.userId, actor.user.id))
      .orderBy(desc(notifications.createdAt))
      .limit(30),
  );

  return rows.map((items) =>
    items.map((item) => ({
      ...item,
      readAt: item.readAt?.toISOString() ?? null,
      createdAt: item.createdAt.toISOString(),
    })),
  );
};
