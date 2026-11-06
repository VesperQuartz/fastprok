import { and, asc, desc, eq, isNull, sql } from "drizzle-orm";
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
  href: string | null;
  type: string;
  title: string;
  body: string;
  readAt: string | null;
  createdAt: string;
};

export type NotificationList = {
  items: NotificationItem[];
  unreadCount: number;
};

const notificationHref = (actor: Actor, requestId: string | null) => {
  if (!requestId) {
    return null;
  }

  return actor.kind === "vendor" ? `/vendor/requests/${requestId}` : `/requests/${requestId}`;
};

export const listNotifications = async (
  actor: Actor,
): Promise<Result<NotificationList, AppError>> => {
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
      .limit(50),
  );

  if (rows.isErr()) {
    return rows;
  }

  const unread = await tryDatabase("count unread notifications", () =>
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(notifications)
      .where(and(eq(notifications.userId, actor.user.id), isNull(notifications.readAt))),
  );

  if (unread.isErr()) {
    return unread;
  }

  return Result.ok({
    unreadCount: unread.value.at(0)?.count ?? 0,
    items: rows.value.map((item) => ({
      ...item,
      href: notificationHref(actor, item.requestId),
      readAt: item.readAt?.toISOString() ?? null,
      createdAt: item.createdAt.toISOString(),
    })),
  });
};

export const markNotificationRead = async (
  actor: Actor,
  notificationId: string,
): Promise<Result<{ id: string; readAt: string; href: string | null }, AppError>> => {
  const rows = await tryDatabase("mark notification read", () =>
    db
      .update(notifications)
      .set({ readAt: sql`coalesce(${notifications.readAt}, now())` })
      .where(and(eq(notifications.id, notificationId), eq(notifications.userId, actor.user.id)))
      .returning({
        id: notifications.id,
        readAt: notifications.readAt,
        requestId: notifications.requestId,
      }),
  );

  if (rows.isErr()) {
    return rows;
  }

  const notification = rows.value.at(0);

  if (!notification) {
    return Result.err(
      new NotFoundError({
        resource: "notification",
        resourceId: notificationId,
      }),
    );
  }

  return Result.ok({
    id: notification.id,
    readAt: notification.readAt?.toISOString() ?? new Date().toISOString(),
    href: notificationHref(actor, notification.requestId),
  });
};

export const markAllNotificationsRead = async (
  actor: Actor,
): Promise<Result<{ count: number }, AppError>> => {
  const rows = await tryDatabase("mark all notifications read", () =>
    db
      .update(notifications)
      .set({ readAt: new Date() })
      .where(and(eq(notifications.userId, actor.user.id), isNull(notifications.readAt)))
      .returning({ id: notifications.id }),
  );

  return rows.map((updated) => ({ count: updated.length }));
};
