import { z } from "zod";
import { runAgentTick } from "@/domain/agent-tick";
import { listNotifications } from "@/domain/activity";
import { actorProcedure, buyerProcedure } from "@/lib/orpc/procedures";
import { unwrapResult } from "@/lib/result/orpc";

const tickInput = z.object({
  requestId: z.uuid().optional(),
});

export const tick = buyerProcedure
  .route({ method: "POST", path: "/agent/tick" })
  .input(tickInput)
  .handler(async ({ input, context }) =>
    unwrapResult(
      runAgentTick({
        requestId: input.requestId,
        actorUserId: context.actor.user.id,
      }),
    ),
  );

export const notificationList = actorProcedure
  .route({ method: "GET", path: "/notifications" })
  .handler(async ({ context }) => unwrapResult(listNotifications(context.actor)));

export const agentProcedures = {
  tick,
};

export const notificationProcedures = {
  list: notificationList,
};
