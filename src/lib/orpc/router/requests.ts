import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { CATEGORY_IDS } from "@/domain/categories";
import { approveQuote } from "@/domain/approve";
import { getRequestTimeline } from "@/domain/activity";
import { createRequest } from "@/domain/request-create";
import { getBuyerRequest } from "@/domain/request-view";
import { listRequestQuotes } from "@/domain/quote-submit";
import { db } from "@/lib/db";
import { actorProcedure, approverProcedure, buyerProcedure } from "@/lib/orpc/procedures";
import { tryDatabase } from "@/lib/result/database";
import { unwrapResult } from "@/lib/result/orpc";
import { requests } from "@/repo/schema";

const requestInput = z.object({
  rawText: z.string().trim().min(10).max(4_000),
  title: z.string().trim().min(3).max(160).optional(),
  category: z.enum(CATEGORY_IDS).optional(),
  quantity: z.number().int().positive().max(100_000).optional(),
  unit: z.string().trim().min(1).max(24).optional(),
  deliveryRegion: z.string().trim().min(1).max(80).optional(),
  neededBy: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  budgetCents: z.number().int().nonnegative().nullable().optional(),
  currency: z.string().trim().length(3).optional(),
  priority: z.enum(["balanced", "cost", "speed", "reliability"]).optional(),
  quotingWindowMinutes: z.number().int().min(1).max(10_080).optional(),
});

export const create = buyerProcedure
  .route({ method: "POST", path: "/requests" })
  .input(requestInput)
  .handler(async ({ input, context }) => unwrapResult(createRequest(context.actor, input)));

export const list = buyerProcedure
  .route({ method: "GET", path: "/requests" })
  .handler(async ({ context }) => {
    const rows = await tryDatabase("list requests", () =>
      db
        .select({
          id: requests.id,
          title: requests.title,
          status: requests.status,
          category: requests.category,
          quantity: requests.quantity,
          unit: requests.unit,
          deliveryRegion: requests.deliveryRegion,
          neededBy: requests.neededBy,
          deadlineAt: requests.deadlineAt,
          budgetCents: requests.budgetCents,
          currency: requests.currency,
          priority: requests.priority,
          createdAt: requests.createdAt,
        })
        .from(requests)
        .where(eq(requests.organizationId, context.actor.organizationId))
        .orderBy(desc(requests.createdAt))
        .limit(50),
    );

    const result = await unwrapResult(rows);

    return result.map((request) => ({
      ...request,
      deadlineAt: request.deadlineAt.toISOString(),
      createdAt: request.createdAt.toISOString(),
    }));
  });

const requestIdInput = z.object({ requestId: z.uuid() });

export const get = buyerProcedure
  .route({ method: "GET", path: "/requests/{requestId}" })
  .input(requestIdInput)
  .handler(async ({ input, context }) =>
    unwrapResult(getBuyerRequest(context.actor, input.requestId)),
  );

export const quoteList = actorProcedure
  .route({ method: "GET", path: "/requests/{requestId}/quotes" })
  .input(requestIdInput)
  .handler(async ({ input, context }) =>
    unwrapResult(listRequestQuotes(context.actor, input.requestId)),
  );

export const timeline = buyerProcedure
  .route({ method: "GET", path: "/requests/{requestId}/timeline" })
  .input(requestIdInput)
  .handler(async ({ input, context }) =>
    unwrapResult(getRequestTimeline(context.actor, input.requestId)),
  );

const approveInput = requestIdInput.extend({
  quoteId: z.uuid(),
  note: z.string().trim().max(1_000).nullable().default(null),
});

export const approve = approverProcedure
  .route({ method: "POST", path: "/requests/{requestId}/approve" })
  .input(approveInput)
  .handler(async ({ input, context }) =>
    unwrapResult(
      approveQuote(context.actor, {
        requestId: input.requestId,
        quoteId: input.quoteId,
        note: input.note,
      }),
    ),
  );

export const requestProcedures = {
  create,
  list,
  get,
  quoteList,
  timeline,
  approve,
};
