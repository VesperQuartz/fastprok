import { and, desc, eq, sql } from "drizzle-orm";
import { Result } from "better-result";
import type { BuyerActor, VendorActor } from "@/lib/actor";
import { db } from "@/lib/db";
import { tryDatabase } from "@/lib/result/database";
import { NotFoundError, type AppError } from "@/lib/result/errors";
import {
  invitations,
  quoteDocuments,
  quoteRevisions,
  quotes,
  requests,
  vendors,
  type ParsedRequest,
  type Recommendation,
} from "@/repo/schema";
import type { ProformaMetadata } from "./proforma";

export type BuyerRequestView = {
  kind: "buyer";
  request: {
    id: string;
    title: string;
    rawText: string;
    category: string;
    quantity: number;
    unit: string;
    deliveryRegion: string;
    neededBy: string;
    budgetCents: number | null;
    currency: string;
    priority: string;
    status: string;
    deadlineAt: string;
    parsed: ParsedRequest | null;
    recommendation: Recommendation | null;
    createdAt: string;
  };
  invitations: Array<{
    vendorId: string;
    vendorName: string;
    status: string;
    reminderCount: number;
    invitedAt: string;
    respondedAt: string | null;
    quoteTotalCents: number | null;
  }>;
};

export type VendorRequestView = {
  kind: "vendor";
  request: {
    id: string;
    title: string;
    category: string;
    quantity: number;
    unit: string;
    deliveryRegion: string;
    neededBy: string;
    status: string;
    deadlineAt: string;
    createdAt: string;
  };
  quote: {
    id: string;
    unitPriceCents: number;
    totalPriceCents: number;
    quantityOffered: number;
    deliveryDate: string;
    warrantyMonths: number;
    validUntil: string | null;
    notes: string | null;
    status: string;
    firstSubmittedAt: string;
    updatedAt: string;
    version: number;
    document: ProformaMetadata | null;
  } | null;
};

export const getBuyerRequest = async (
  actor: BuyerActor,
  requestId: string,
): Promise<Result<BuyerRequestView, AppError>> => {
  const rows = await tryDatabase("load request", () =>
    db
      .select()
      .from(requests)
      .where(and(eq(requests.id, requestId), eq(requests.organizationId, actor.organizationId)))
      .limit(1),
  );

  if (rows.isErr()) {
    return rows;
  }

  const request = rows.value.at(0);

  if (!request) {
    return Result.err(
      new NotFoundError({
        resource: "request",
        resourceId: requestId,
      }),
    );
  }

  const inviteRows = await tryDatabase("load request invitations", () =>
    db
      .select({
        vendorId: invitations.vendorId,
        vendorName: vendors.name,
        status: invitations.status,
        reminderCount: invitations.reminderCount,
        invitedAt: invitations.invitedAt,
        respondedAt: invitations.respondedAt,
        quoteTotalCents: quotes.totalPriceCents,
      })
      .from(invitations)
      .innerJoin(vendors, eq(invitations.vendorId, vendors.id))
      .leftJoin(
        quotes,
        and(eq(quotes.vendorId, invitations.vendorId), eq(quotes.requestId, invitations.requestId)),
      )
      .where(eq(invitations.requestId, requestId))
      .orderBy(desc(invitations.invitedAt)),
  );

  return inviteRows.map((invites) => ({
    kind: "buyer" as const,
    request: {
      id: request.id,
      title: request.title,
      rawText: request.rawText,
      category: request.category,
      quantity: request.quantity,
      unit: request.unit,
      deliveryRegion: request.deliveryRegion,
      neededBy: request.neededBy,
      budgetCents: request.budgetCents,
      currency: request.currency,
      priority: request.priority,
      status: request.status,
      deadlineAt: request.deadlineAt.toISOString(),
      parsed: request.parsed,
      recommendation: request.recommendation,
      createdAt: request.createdAt.toISOString(),
    },
    invitations: invites.map((invite) => ({
      ...invite,
      invitedAt: invite.invitedAt.toISOString(),
      respondedAt: invite.respondedAt?.toISOString() ?? null,
    })),
  }));
};

export const getVendorRequest = async (
  actor: VendorActor,
  requestId: string,
): Promise<Result<VendorRequestView, AppError>> => {
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

  const rows = await tryDatabase("load vendor request", () =>
    db
      .select({
        id: requests.id,
        title: requests.title,
        category: requests.category,
        quantity: requests.quantity,
        unit: requests.unit,
        deliveryRegion: requests.deliveryRegion,
        neededBy: requests.neededBy,
        status: requests.status,
        deadlineAt: requests.deadlineAt,
        createdAt: requests.createdAt,
      })
      .from(requests)
      .where(eq(requests.id, requestId))
      .limit(1),
  );

  if (rows.isErr()) {
    return rows;
  }

  const request = rows.value.at(0);

  if (!request) {
    return Result.err(
      new NotFoundError({
        resource: "request",
        resourceId: requestId,
      }),
    );
  }

  const quoteRows = await tryDatabase("load vendor quote", () =>
    db
      .select({
        id: quotes.id,
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
        documentFileName: quoteDocuments.fileName,
        documentMimeType: quoteDocuments.mimeType,
        documentSizeBytes: quoteDocuments.sizeBytes,
        documentUpdatedAt: quoteDocuments.updatedAt,
      })
      .from(quotes)
      .leftJoin(quoteDocuments, eq(quoteDocuments.quoteId, quotes.id))
      .where(and(eq(quotes.requestId, requestId), eq(quotes.vendorId, actor.vendorId)))
      .limit(1),
  );

  return quoteRows.map((quoteRowsValue) => {
    const quote = quoteRowsValue.at(0);

    return {
      kind: "vendor" as const,
      request: {
        ...request,
        deadlineAt: request.deadlineAt.toISOString(),
        createdAt: request.createdAt.toISOString(),
      },
      quote: quote
        ? {
            id: quote.id,
            unitPriceCents: quote.unitPriceCents,
            totalPriceCents: quote.totalPriceCents,
            quantityOffered: quote.quantityOffered,
            deliveryDate: quote.deliveryDate,
            warrantyMonths: quote.warrantyMonths,
            validUntil: quote.validUntil,
            notes: quote.notes,
            status: quote.status,
            version: quote.version ?? 1,
            firstSubmittedAt: quote.firstSubmittedAt.toISOString(),
            updatedAt: quote.updatedAt.toISOString(),
            document:
              quote.documentFileName &&
              quote.documentMimeType &&
              quote.documentSizeBytes !== null &&
              quote.documentUpdatedAt
                ? {
                    fileName: quote.documentFileName,
                    mimeType: quote.documentMimeType,
                    sizeBytes: quote.documentSizeBytes,
                    uploadedAt: quote.documentUpdatedAt.toISOString(),
                  }
                : null,
          }
        : null,
    };
  });
};

export type VendorInboxItem = {
  requestId: string;
  title: string;
  category: string;
  quantity: number;
  unit: string;
  deliveryRegion: string;
  neededBy: string;
  status: string;
  deadlineAt: string;
  invitationStatus: string;
  invitedAt: string;
  quoteStatus: string | null;
  quoteTotalCents: number | null;
};

export const listVendorInbox = async (
  actor: VendorActor,
): Promise<Result<VendorInboxItem[], AppError>> => {
  const rows = await tryDatabase("list vendor invitations", () =>
    db
      .select({
        requestId: requests.id,
        title: requests.title,
        category: requests.category,
        quantity: requests.quantity,
        unit: requests.unit,
        deliveryRegion: requests.deliveryRegion,
        neededBy: requests.neededBy,
        status: requests.status,
        deadlineAt: requests.deadlineAt,
        invitationStatus: invitations.status,
        invitedAt: invitations.invitedAt,
        quoteStatus: quotes.status,
        quoteTotalCents: quotes.totalPriceCents,
      })
      .from(invitations)
      .innerJoin(requests, eq(invitations.requestId, requests.id))
      .leftJoin(
        quotes,
        and(eq(quotes.requestId, invitations.requestId), eq(quotes.vendorId, invitations.vendorId)),
      )
      .where(eq(invitations.vendorId, actor.vendorId))
      .orderBy(desc(invitations.invitedAt)),
  );

  return rows.map((items) =>
    items.map((item) => ({
      ...item,
      deadlineAt: item.deadlineAt.toISOString(),
      invitedAt: item.invitedAt.toISOString(),
    })),
  );
};
