import { and, asc, eq, sql } from "drizzle-orm";
import { Result } from "better-result";
import { serverEnv } from "@/env/server";
import type { BuyerActor, VendorActor } from "@/lib/actor";
import { db, type DbTransaction } from "@/lib/db";
import { tryDatabase, withTransaction } from "@/lib/result/database";
import {
  InvalidInputError,
  InvalidStateError,
  NotFoundError,
  type AppError,
} from "@/lib/result/errors";
import {
  invitations,
  quoteRevisions,
  quotes,
  requests,
  user,
  vendors,
  type QuoteSnapshot,
} from "@/repo/schema";
import { logAgentAction } from "./agent-log";
import { dispatchPendingEmails, queueNotification } from "./notifications";

export type QuoteInput = {
  requestId: string;
  unitPriceCents: number;
  quantityOffered: number;
  deliveryDate: string;
  warrantyMonths: number;
  validUntil: string | null;
  notes: string | null;
};

export type QuoteResult = {
  quoteId: string;
  requestId: string;
  version: number;
  totalPriceCents: number;
  status: "created" | "updated";
};

export type QuoteView = {
  id: string;
  vendorId: string;
  vendorName: string;
  unitPriceCents: number;
  totalPriceCents: number;
  quantityOffered: number;
  deliveryDate: string;
  warrantyMonths: number;
  validUntil: string | null;
  notes: string | null;
  status: string;
  version: number;
  firstSubmittedAt: string;
  updatedAt: string;
};

const isIsoDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value);

const validateQuoteInput = (input: QuoteInput) => {
  if (!Number.isInteger(input.unitPriceCents) || input.unitPriceCents < 1) {
    return new InvalidInputError({
      field: "unitPriceCents",
      detail: "enter a unit price greater than zero",
    });
  }

  if (!Number.isInteger(input.quantityOffered) || input.quantityOffered < 1) {
    return new InvalidInputError({
      field: "quantityOffered",
      detail: "enter how many units you can supply",
    });
  }

  if (!isIsoDate(input.deliveryDate)) {
    return new InvalidInputError({
      field: "deliveryDate",
      detail: "use the YYYY-MM-DD format",
    });
  }

  if (input.validUntil && !isIsoDate(input.validUntil)) {
    return new InvalidInputError({
      field: "validUntil",
      detail: "use the YYYY-MM-DD format",
    });
  }

  if (!Number.isInteger(input.warrantyMonths) || input.warrantyMonths < 0) {
    return new InvalidInputError({
      field: "warrantyMonths",
      detail: "warranty months cannot be negative",
    });
  }

  return null;
};

const quoteVersion = async (tx: DbTransaction, quoteId: string) => {
  const rows = await tx
    .select({ version: sql<number>`count(*)::int` })
    .from(quoteRevisions)
    .where(eq(quoteRevisions.quoteId, quoteId));

  return (rows.at(0)?.version ?? 0) + 1;
};

export const submitQuote = async (
  actor: VendorActor,
  input: QuoteInput,
): Promise<Result<QuoteResult, AppError>> => {
  const invalid = validateQuoteInput(input);

  if (invalid) {
    return Result.err(invalid);
  }

  return withTransaction<QuoteResult, AppError>(
    "submit quote",
    async (tx): Promise<Result<QuoteResult, AppError>> => {
      const inviteRows = await tx
        .select({
          invitationId: invitations.id,
          invitationStatus: invitations.status,
          requestStatus: requests.status,
          deadlineAt: requests.deadlineAt,
          requestTitle: requests.title,
          quantity: requests.quantity,
          unit: requests.unit,
          createdByUserId: requests.createdByUserId,
        })
        .from(invitations)
        .innerJoin(requests, eq(invitations.requestId, requests.id))
        .where(
          and(eq(invitations.requestId, input.requestId), eq(invitations.vendorId, actor.vendorId)),
        )
        .limit(1);

      const invite = inviteRows.at(0);

      if (!invite) {
        return Result.err(
          new NotFoundError({
            resource: "invitation",
            resourceId: input.requestId,
          }),
        );
      }

      if (invite.invitationStatus === "declined" || invite.invitationStatus === "expired") {
        return Result.err(
          new InvalidStateError({
            action: "submit a quote",
            currentStatus: invite.invitationStatus,
          }),
        );
      }

      if (invite.requestStatus !== "quoting") {
        return Result.err(
          new InvalidStateError({
            action: "submit a quote",
            currentStatus: invite.requestStatus,
          }),
        );
      }

      if (invite.deadlineAt.getTime() <= Date.now()) {
        return Result.err(
          new InvalidStateError({
            action: "submit a quote",
            currentStatus: "past the quote deadline",
          }),
        );
      }

      const totalPriceCents = input.unitPriceCents * input.quantityOffered;
      const existingRows = await tx
        .select({ id: quotes.id })
        .from(quotes)
        .where(and(eq(quotes.requestId, input.requestId), eq(quotes.vendorId, actor.vendorId)))
        .limit(1);
      const existing = existingRows.at(0);

      let quoteId: string;
      let version: number;

      if (existing) {
        version = await quoteVersion(tx, existing.id);
        await tx
          .update(quotes)
          .set({
            submittedByUserId: actor.user.id,
            unitPriceCents: input.unitPriceCents,
            totalPriceCents,
            quantityOffered: input.quantityOffered,
            deliveryDate: input.deliveryDate,
            warrantyMonths: input.warrantyMonths,
            validUntil: input.validUntil,
            notes: input.notes,
            status: "submitted",
          })
          .where(eq(quotes.id, existing.id));
        quoteId = existing.id;
      } else {
        const inserted = await tx
          .insert(quotes)
          .values({
            requestId: input.requestId,
            vendorId: actor.vendorId,
            submittedByUserId: actor.user.id,
            unitPriceCents: input.unitPriceCents,
            totalPriceCents,
            quantityOffered: input.quantityOffered,
            deliveryDate: input.deliveryDate,
            warrantyMonths: input.warrantyMonths,
            validUntil: input.validUntil,
            notes: input.notes,
            status: "submitted",
          })
          .returning({ id: quotes.id });
        const quote = inserted.at(0);

        if (!quote) {
          throw new Error("Quote insert did not return a row.");
        }

        quoteId = quote.id;
        version = 1;
      }

      await tx.insert(quoteRevisions).values({
        quoteId,
        version,
        snapshot: {
          unitPriceCents: input.unitPriceCents,
          totalPriceCents,
          quantityOffered: input.quantityOffered,
          deliveryDate: input.deliveryDate,
          warrantyMonths: input.warrantyMonths,
          validUntil: input.validUntil,
          notes: input.notes,
          version,
        } satisfies QuoteSnapshot,
      });

      await tx
        .update(invitations)
        .set({
          status: "responded",
          respondedAt: sql`coalesce(${invitations.respondedAt}, now())`,
        })
        .where(eq(invitations.id, invite.invitationId));

      const creatorRows = await tx
        .select({ id: user.id, name: user.name, email: user.email })
        .from(user)
        .where(eq(user.id, invite.createdByUserId))
        .limit(1);
      const creator = creatorRows.at(0);
      const status: "created" | "updated" = existing ? "updated" : "created";

      await queueNotification(tx, {
        eventKey: `request:${input.requestId}:quote:${actor.vendorId}:v${version}`,
        type: "quote.received",
        requestId: input.requestId,
        recipients: creator
          ? [{ userId: creator.id, name: creator.name, email: creator.email }]
          : [],
        title: `Quote ${status === "created" ? "received" : "updated"} from ${actor.vendorName}`,
        body: `${actor.vendorName} quoted ${invite.quantity} ${invite.unit} of ${invite.requestTitle} at ${(totalPriceCents / 100).toFixed(2)} USD, delivering ${input.deliveryDate}.`,
        email: {
          subject: `Quote ${status} for ${invite.requestTitle}`,
          heading: `${actor.vendorName} submitted a quote`,
          lines: [
            `Request: ${invite.requestTitle}`,
            `Quantity: ${invite.quantity} ${invite.unit}`,
            "Open the app to compare quotes and approve one.",
          ],
          cta: {
            url: `${serverEnv.APP_BASE_URL}/requests/${input.requestId}`,
            label: "Review quotes",
          },
        },
      });

      await logAgentAction(tx, {
        requestId: input.requestId,
        actorType: "human",
        actorUserId: actor.user.id,
        action: status === "created" ? "quote.submitted" : "quote.updated",
        detail: {
          quoteId,
          vendorId: actor.vendorId,
          vendorName: actor.vendorName,
          version,
          totalPriceCents,
          quantityOffered: input.quantityOffered,
          deliveryDate: input.deliveryDate,
          warrantyMonths: input.warrantyMonths,
        },
      });

      return Result.ok({
        quoteId,
        requestId: input.requestId,
        version,
        totalPriceCents,
        status,
      });
    },
  ).then(async (outcome) => {
    if (outcome.isOk()) {
      const dispatch = await dispatchPendingEmails(10);

      if (dispatch.isErr()) {
        console.error("Could not dispatch quote emails", dispatch.error);
      }
    }

    return outcome;
  });
};

export const listRequestQuotes = async (
  actor: BuyerActor | VendorActor,
  requestId: string,
): Promise<Result<QuoteView[], AppError>> => {
  if (actor.kind === "vendor") {
    const invited = await tryDatabase("check vendor invitation", () =>
      db
        .select({ id: invitations.id })
        .from(invitations)
        .where(and(eq(invitations.requestId, requestId), eq(invitations.vendorId, actor.vendorId)))
        .limit(1),
    );

    if (invited.isErr()) {
      return invited;
    }

    if (invited.value.length === 0) {
      return Result.err(
        new NotFoundError({
          resource: "request",
          resourceId: requestId,
        }),
      );
    }
  }

  const rows = await tryDatabase("list quotes", () => {
    const scope =
      actor.kind === "vendor"
        ? and(eq(quotes.requestId, requestId), eq(quotes.vendorId, actor.vendorId))
        : eq(quotes.requestId, requestId);

    return db
      .select({
        id: quotes.id,
        vendorId: quotes.vendorId,
        vendorName: vendors.name,
        unitPriceCents: quotes.unitPriceCents,
        totalPriceCents: quotes.totalPriceCents,
        quantityOffered: quotes.quantityOffered,
        deliveryDate: quotes.deliveryDate,
        warrantyMonths: quotes.warrantyMonths,
        validUntil: quotes.validUntil,
        notes: quotes.notes,
        status: quotes.status,
        firstSubmittedAt: quotes.firstSubmittedAt,
        updatedAt: quotes.updatedAt,
        version: sql<number>`(
          select max(${quoteRevisions.version})
          from ${quoteRevisions}
          where ${quoteRevisions.quoteId} = ${quotes.id}
        )`,
      })
      .from(quotes)
      .innerJoin(vendors, eq(quotes.vendorId, vendors.id))
      .where(scope)
      .orderBy(asc(quotes.firstSubmittedAt));
  });

  return rows.map((list) =>
    list.map((quote) => ({
      ...quote,
      version: quote.version ?? 1,
      firstSubmittedAt: quote.firstSubmittedAt.toISOString(),
      updatedAt: quote.updatedAt.toISOString(),
    })),
  );
};
