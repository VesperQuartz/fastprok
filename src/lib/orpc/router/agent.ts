import { z } from "zod";
import { runAgentTick } from "@/domain/agent-tick";
import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/domain/activity";
import { actorProcedure, buyerProcedure } from "@/lib/orpc/procedures";
import { unwrapResult } from "@/lib/result/orpc";

const tickInput = z.object({
  requestId: z.uuid().optional(),
  forceRank: z.boolean().optional(),
});

const notificationIdInput = z.object({ notificationId: z.uuid() });

export const tick = buyerProcedure
  .route({ method: "POST", path: "/agent/tick" })
  .input(tickInput)
  .handler(async ({ input, context }) =>
    unwrapResult(
      runAgentTick({
        requestId: input.requestId,
        forceRank: input.forceRank,
        actorUserId: context.actor.user.id,
      }),
    ),
  );

export const notificationList = actorProcedure
  .route({ method: "GET", path: "/notifications" })
  .handler(async ({ context }) => unwrapResult(listNotifications(context.actor)));

export const notificationMarkRead = actorProcedure
  .route({ method: "POST", path: "/notifications/{notificationId}/read" })
  .input(notificationIdInput)
  .handler(async ({ input, context }) =>
    unwrapResult(markNotificationRead(context.actor, input.notificationId)),
  );

export const notificationMarkAllRead = actorProcedure
  .route({ method: "POST", path: "/notifications/read-all" })
  .handler(async ({ context }) => unwrapResult(markAllNotificationsRead(context.actor)));

export const agentProcedures = {
  tick,
};

export const notificationProcedures = {
  list: notificationList,
  markRead: notificationMarkRead,
  markAllRead: notificationMarkAllRead,
};
