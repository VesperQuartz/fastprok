import { and, arrayContains, eq, inArray, sql } from "drizzle-orm";
import { Result } from "better-result";
import { serverEnv } from "@/env/server";
import type { BuyerActor } from "@/lib/actor";
import { withTransaction } from "@/lib/result/database";
import { InvalidInputError, type AppError } from "@/lib/result/errors";
import {
  invitations,
  requests,
  user,
  vendorContacts,
  vendors,
  type ParsedRequest,
} from "@/repo/schema";
import { categoryLabel } from "./categories";
import { logAgentAction } from "./agent-log";
import { dispatchPendingEmails, queueNotification } from "./notifications";
import { parseRequestDraft, type RequestDraft, type RequestParseOverrides } from "./request-parse";
import { matchVendors, type VendorCandidate } from "./vendor-match";

export type CreateRequestInput = RequestParseOverrides & {
  rawText: string;
  quotingWindowMinutes?: number;
};

export type CreateRequestResult = {
  requestId: string;
  status: "quoting" | "needs_human";
  invitedVendorCount: number;
  queuedEmailCount: number;
  draft: RequestDraft;
};

type QueuedRequest = Omit<CreateRequestResult, "draft">;

const formatDeadline = (deadline: Date) =>
  new Intl.DateTimeFormat("en-NG", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Africa/Lagos",
  }).format(deadline);

const missingField = (draft: RequestDraft) => {
  if (!draft.title) {
    return new InvalidInputError({
      field: "title",
      detail: "tell the agent what item you need",
    });
  }

  if (!draft.category) {
    return new InvalidInputError({
      field: "category",
      detail: `choose one of: ${["office-furniture", "office-supplies", "computer-peripherals"].join(", ")}`,
    });
  }

  if (!draft.quantity) {
    return new InvalidInputError({
      field: "quantity",
      detail: "tell the agent how many units you need",
    });
  }

  if (!draft.deliveryRegion) {
    return new InvalidInputError({
      field: "deliveryRegion",
      detail: "tell the agent where the order should be delivered",
    });
  }

  if (!draft.neededBy) {
    return new InvalidInputError({
      field: "neededBy",
      detail: "tell the agent the date you need the order by",
    });
  }

  return null;
};

export const createRequest = async (
  actor: BuyerActor,
  input: CreateRequestInput,
): Promise<Result<CreateRequestResult, AppError>> => {
  const draft = await parseRequestDraft({
    rawText: input.rawText,
    overrides: input,
  });

  const invalid = missingField(draft);

  if (invalid) {
    return Result.err(invalid);
  }

  const title = draft.title;
  const category = draft.category;
  const quantity = draft.quantity;
  const deliveryRegion = draft.deliveryRegion;
  const neededBy = draft.neededBy;

  if (!title || !category || !quantity || !deliveryRegion || !neededBy) {
    return Result.err(
      new InvalidInputError({
        field: "request",
        detail: "the agent could not complete the request",
      }),
    );
  }

  const windowMinutes =
    input.quotingWindowMinutes ??
    (serverEnv.DEMO_MODE
      ? serverEnv.DEMO_QUOTING_WINDOW_MINUTES
      : serverEnv.QUOTING_WINDOW_MINUTES);
  const deadlineAt = new Date(Date.now() + windowMinutes * 60 * 1_000);
  const parsed: ParsedRequest = {
    title,
    category,
    quantity,
    unit: draft.unit,
    deliveryRegion,
    neededBy,
    budgetCents: draft.budgetCents,
    currency: draft.currency,
    priority: draft.priority,
    notes: draft.notes,
    confidence: draft.confidence,
    usedFallback: draft.usedFallback,
  };

  const outcome = await withTransaction<QueuedRequest, never>(
    "create request",
    async (tx): Promise<Result<QueuedRequest, never>> => {
      const vendorRows = await tx
        .select({
          id: vendors.id,
          name: vendors.name,
          contactEmail: vendors.contactEmail,
          categories: vendors.categories,
          regions: vendors.regions,
          leadTimeDays: vendors.leadTimeDays,
          onTimeCount: vendors.onTimeCount,
          lateCount: vendors.lateCount,
          invitationCount: vendors.invitationCount,
          responseCount: vendors.responseCount,
        })
        .from(vendors)
        .where(and(eq(vendors.active, true), arrayContains(vendors.categories, [category])));

      const candidates: VendorCandidate[] = vendorRows;
      const matches = matchVendors({
        vendors: candidates,
        category,
        deliveryRegion,
        neededBy,
        limit: serverEnv.INVITE_BATCH_SIZE,
      });

      const requestRows = await tx
        .insert(requests)
        .values({
          organizationId: actor.organizationId,
          createdByUserId: actor.user.id,
          title,
          rawText: input.rawText,
          category,
          quantity,
          unit: draft.unit,
          deliveryRegion,
          neededBy,
          budgetCents: draft.budgetCents,
          currency: draft.currency,
          priority: draft.priority,
          status: matches.length === 0 ? "needs_human" : "quoting",
          deadlineAt,
          parsed,
          aiMeta: draft.aiMeta,
        })
        .returning({ id: requests.id, status: requests.status });

      const request = requestRows[0];

      if (!request) {
        throw new Error("Request insert did not return a row.");
      }

      await logAgentAction(tx, {
        requestId: request.id,
        actorType: "human",
        actorUserId: actor.user.id,
        action: "request.created",
        detail: {
          title,
          category,
          quantity,
          unit: draft.unit,
          deliveryRegion,
          neededBy,
          budgetCents: draft.budgetCents,
          priority: draft.priority,
        },
      });

      await logAgentAction(tx, {
        requestId: request.id,
        actorType: "agent",
        action: "request.parsed",
        detail: {
          model: draft.aiMeta.model,
          latencyMs: draft.aiMeta.latencyMs,
          promptVersion: draft.aiMeta.promptVersion,
          usedFallback: draft.usedFallback,
          fallbackReason: draft.aiMeta.fallbackReason,
          confidence: draft.confidence,
        },
      });

      if (matches.length === 0) {
        await queueNotification(tx, {
          eventKey: `request:${request.id}:needs-human`,
          type: "request.needs_human",
          requestId: request.id,
          recipients: [
            {
              userId: actor.user.id,
              name: actor.user.name,
              email: actor.user.email,
            },
          ],
          title: "The agent needs help finding vendors",
          body: `No active vendor matched ${categoryLabel(category)} for ${deliveryRegion} within the ${neededBy} delivery window.`,
        });

        await logAgentAction(tx, {
          requestId: request.id,
          actorType: "agent",
          action: "vendors.none",
          detail: {
            category,
            deliveryRegion,
            neededBy,
            candidateCount: candidates.length,
          },
        });

        return Result.ok({
          requestId: request.id,
          status: "needs_human" as const,
          invitedVendorCount: 0,
          queuedEmailCount: 0,
        });
      }

      await tx
        .insert(invitations)
        .values(
          matches.map((match) => ({
            requestId: request.id,
            vendorId: match.vendor.id,
          })),
        )
        .onConflictDoNothing();

      await tx
        .update(vendors)
        .set({ invitationCount: sql`${vendors.invitationCount} + 1` })
        .where(
          inArray(
            vendors.id,
            matches.map((match) => match.vendor.id),
          ),
        );

      const contactRows = await tx
        .select({
          vendorId: vendorContacts.vendorId,
          userId: user.id,
          name: user.name,
          email: user.email,
        })
        .from(vendorContacts)
        .innerJoin(user, eq(vendorContacts.userId, user.id))
        .where(
          inArray(
            vendorContacts.vendorId,
            matches.map((match) => match.vendor.id),
          ),
        );

      const contactsByVendor = new Map<string, typeof contactRows>();

      for (const contact of contactRows) {
        const existing = contactsByVendor.get(contact.vendorId) ?? [];
        existing.push(contact);
        contactsByVendor.set(contact.vendorId, existing);
      }

      for (const match of matches) {
        const contacts = contactsByVendor.get(match.vendor.id) ?? [];
        const recipients =
          contacts.length > 0
            ? contacts.map((contact) => ({
                userId: contact.userId,
                name: contact.name,
                email: contact.email,
              }))
            : [
                {
                  userId: null,
                  name: match.vendor.name,
                  email: match.vendor.contactEmail,
                },
              ];

        await queueNotification(tx, {
          eventKey: `request:${request.id}:invited:${match.vendor.id}`,
          type: "request.invited",
          requestId: request.id,
          recipients,
          title: "New quote request",
          body: `${actor.organizationName} needs ${quantity} ${draft.unit} of ${title}. Quotes close ${formatDeadline(deadlineAt)}.`,
          email: {
            subject: `Quote request: ${title}`,
            heading: `Quote request from ${actor.organizationName}`,
            lines: [
              title,
              `Quantity: ${quantity} ${draft.unit}`,
              `Deliver to: ${deliveryRegion}`,
              `Needed by: ${neededBy}`,
              `Quotes close: ${formatDeadline(deadlineAt)}`,
            ],
            cta: {
              url: `${serverEnv.APP_BASE_URL}/requests/${request.id}`,
              label: "Open request",
            },
          },
        });
      }

      await queueNotification(tx, {
        eventKey: `request:${request.id}:sent`,
        type: "request.sent",
        requestId: request.id,
        recipients: [
          {
            userId: actor.user.id,
            name: actor.user.name,
            email: actor.user.email,
          },
        ],
        title: "Request sent to vendors",
        body: `The agent invited ${matches.length} matching vendor${matches.length === 1 ? "" : "s"} and will chase anyone who goes quiet.`,
      });

      await logAgentAction(tx, {
        requestId: request.id,
        actorType: "agent",
        action: "vendors.matched",
        detail: {
          category,
          deliveryRegion,
          neededBy,
          candidateCount: candidates.length,
          selected: matches.map((match) => ({
            vendorId: match.vendor.id,
            vendorName: match.vendor.name,
            score: match.score,
            reasons: match.reasons,
          })),
        },
      });

      await logAgentAction(tx, {
        requestId: request.id,
        actorType: "system",
        action: "request.invited",
        detail: {
          count: matches.length,
          vendorIds: matches.map((match) => match.vendor.id),
        },
      });

      return Result.ok({
        requestId: request.id,
        status: "quoting" as const,
        invitedVendorCount: matches.length,
        queuedEmailCount: matches.length,
      });
    },
  );

  if (outcome.isErr()) {
    return outcome;
  }

  const dispatch = await dispatchPendingEmails(10);

  if (dispatch.isErr()) {
    console.error("Could not dispatch invitation emails", dispatch.error);
  }

  return Result.ok({
    ...outcome.value,
    draft,
  });
};
