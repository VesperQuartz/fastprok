import { and, eq } from "drizzle-orm";
import { Result } from "better-result";
import type { Actor, VendorActor } from "@/lib/actor";
import { db } from "@/lib/db";
import { tryDatabase, withTransaction } from "@/lib/result/database";
import {
  InvalidInputError,
  InvalidStateError,
  NotFoundError,
  type AppError,
} from "@/lib/result/errors";
import { putObject, removeObject } from "@/lib/storage";
import { invitations, quoteDocuments, quotes, requests } from "@/repo/schema";
import { logAgentAction } from "./agent-log";
import { requestAudience } from "./notification-audience";
import { queueNotification } from "./notifications";

const MAX_BYTES = 5 * 1024 * 1024;

type ProformaMime = "application/pdf" | "image/png" | "image/jpeg";

const MIME_EXTENSIONS: Record<ProformaMime, string> = {
  "application/pdf": "pdf",
  "image/png": "png",
  "image/jpeg": "jpg",
};

export type ProformaMetadata = {
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  uploadedAt: string;
};

export type ProformaDocument = ProformaMetadata & {
  storageKey: string;
};

type DetectedFile = {
  mimeType: ProformaMime;
};

const startsWith = (bytes: Uint8Array, signature: number[]) =>
  signature.every((value, index) => bytes[index] === value);

const detectFile = (bytes: Uint8Array): DetectedFile | null => {
  if (startsWith(bytes, [0x25, 0x50, 0x44, 0x46, 0x2d])) {
    return { mimeType: "application/pdf" };
  }

  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return { mimeType: "image/png" };
  }

  if (startsWith(bytes, [0xff, 0xd8, 0xff])) {
    return { mimeType: "image/jpeg" };
  }

  return null;
};

const safeFileName = (name: string, mimeType: ProformaMime) => {
  const base = name
    .split(/[\\/]/)
    .at(-1)
    ?.replaceAll(/[^\w.\- ]+/g, "")
    .trim()
    .slice(0, 160);

  return base && /\.[a-z0-9]{2,5}$/i.test(base) ? base : `proforma.${MIME_EXTENSIONS[mimeType]}`;
};

const validateFile = (file: File) => {
  if (file.size < 1) {
    return Result.err(
      new InvalidInputError({
        field: "proforma invoice",
        detail: "choose a file to upload",
      }),
    );
  }

  if (file.size > MAX_BYTES) {
    return Result.err(
      new InvalidInputError({
        field: "proforma invoice",
        detail: "files must be 5 MB or smaller",
      }),
    );
  }

  return Result.ok(true);
};

const parseFile = async (file: File) => {
  const body = await Result.tryPromise({
    try: () => file.arrayBuffer(),
    catch: (cause) =>
      new InvalidInputError({
        field: "proforma invoice",
        detail: cause instanceof Error ? cause.message : "the file could not be read",
      }),
  });

  if (body.isErr()) {
    return body;
  }

  const detected = detectFile(new Uint8Array(body.value));

  if (!detected) {
    return Result.err(
      new InvalidInputError({
        field: "proforma invoice",
        detail: "use a PDF, PNG, or JPG file",
      }),
    );
  }

  return Result.ok({
    body: body.value,
    mimeType: detected.mimeType,
    fileName: safeFileName(file.name, detected.mimeType),
  });
};

export const uploadProforma = async (
  actor: VendorActor,
  requestId: string,
  file: File,
): Promise<Result<ProformaMetadata, AppError>> => {
  const valid = validateFile(file);

  if (valid.isErr()) {
    return valid;
  }

  const parsed = await parseFile(file);

  if (parsed.isErr()) {
    return parsed;
  }

  const target = await tryDatabase("load proforma target", () =>
    db
      .select({
        requestStatus: requests.status,
        deadlineAt: requests.deadlineAt,
        requestTitle: requests.title,
        organizationId: requests.organizationId,
        createdByUserId: requests.createdByUserId,
        quoteId: quotes.id,
      })
      .from(invitations)
      .innerJoin(requests, eq(invitations.requestId, requests.id))
      .innerJoin(
        quotes,
        and(eq(quotes.requestId, invitations.requestId), eq(quotes.vendorId, invitations.vendorId)),
      )
      .where(and(eq(invitations.requestId, requestId), eq(invitations.vendorId, actor.vendorId)))
      .limit(1),
  );

  if (target.isErr()) {
    return target;
  }

  const row = target.value.at(0);

  if (!row) {
    return Result.err(
      new NotFoundError({
        resource: "quote",
        resourceId: requestId,
      }),
    );
  }

  if (row.requestStatus !== "quoting" || row.deadlineAt.getTime() <= Date.now()) {
    return Result.err(
      new InvalidStateError({
        action: "attach a proforma invoice",
        currentStatus: row.requestStatus,
      }),
    );
  }

  const existing = await tryDatabase("load proforma document", () =>
    db
      .select({ storageKey: quoteDocuments.storageKey })
      .from(quoteDocuments)
      .where(eq(quoteDocuments.quoteId, row.quoteId))
      .limit(1),
  );

  if (existing.isErr()) {
    return existing;
  }

  const previousKey = existing.value.at(0)?.storageKey ?? null;
  const storageKey = `quotes/${row.quoteId}/proforma-${crypto.randomUUID()}.${MIME_EXTENSIONS[parsed.value.mimeType]}`;
  const uploaded = await putObject({
    key: storageKey,
    body: parsed.value.body,
    contentType: parsed.value.mimeType,
    fileName: parsed.value.fileName,
  });

  if (uploaded.isErr()) {
    return uploaded;
  }

  const saved = await withTransaction<ProformaMetadata, AppError>(
    "save proforma document",
    async (tx) => {
      const updated = await tx
        .insert(quoteDocuments)
        .values({
          quoteId: row.quoteId,
          storageKey,
          fileName: parsed.value.fileName,
          mimeType: parsed.value.mimeType,
          sizeBytes: file.size,
          uploadedByUserId: actor.user.id,
        })
        .onConflictDoUpdate({
          target: quoteDocuments.quoteId,
          set: {
            storageKey,
            fileName: parsed.value.fileName,
            mimeType: parsed.value.mimeType,
            sizeBytes: file.size,
            uploadedByUserId: actor.user.id,
            updatedAt: new Date(),
          },
        })
        .returning({
          fileName: quoteDocuments.fileName,
          mimeType: quoteDocuments.mimeType,
          sizeBytes: quoteDocuments.sizeBytes,
          updatedAt: quoteDocuments.updatedAt,
        });

      const document = updated.at(0);

      if (!document) {
        throw new Error("Proforma insert returned no row.");
      }

      const audience = await requestAudience(tx, row.organizationId, row.createdByUserId);

      await queueNotification(tx, {
        eventKey: `request:${requestId}:proforma:${row.quoteId}:${document.updatedAt.getTime()}`,
        type: "quote.proforma",
        requestId,
        recipients: audience,
        title: "Proforma invoice uploaded",
        body: `${actor.vendorName} attached ${document.fileName} to ${row.requestTitle}.`,
      });

      await logAgentAction(tx, {
        requestId,
        actorType: "human",
        actorUserId: actor.user.id,
        action: "quote.proforma_uploaded",
        detail: {
          quoteId: row.quoteId,
          vendorId: actor.vendorId,
          vendorName: actor.vendorName,
          fileName: document.fileName,
          sizeBytes: document.sizeBytes,
        },
      });

      return Result.ok({
        fileName: document.fileName,
        mimeType: document.mimeType,
        sizeBytes: document.sizeBytes,
        uploadedAt: document.updatedAt.toISOString(),
      });
    },
  );

  if (saved.isErr()) {
    const removed = await removeObject(storageKey);

    if (removed.isErr()) {
      console.error("Could not remove orphaned proforma upload", storageKey, removed.error);
    }

    return saved;
  }

  if (previousKey && previousKey !== storageKey) {
    const removed = await removeObject(previousKey);

    if (removed.isErr()) {
      console.error("Could not remove replaced proforma upload", previousKey, removed.error);
    }
  }

  return saved;
};

export const getProformaDocument = async (
  actor: Actor,
  quoteId: string,
): Promise<Result<ProformaDocument, AppError>> => {
  const rows = await tryDatabase("load proforma document", () =>
    db
      .select({
        storageKey: quoteDocuments.storageKey,
        fileName: quoteDocuments.fileName,
        mimeType: quoteDocuments.mimeType,
        sizeBytes: quoteDocuments.sizeBytes,
        uploadedAt: quoteDocuments.updatedAt,
        vendorId: quotes.vendorId,
        organizationId: requests.organizationId,
      })
      .from(quoteDocuments)
      .innerJoin(quotes, eq(quoteDocuments.quoteId, quotes.id))
      .innerJoin(requests, eq(quotes.requestId, requests.id))
      .where(eq(quoteDocuments.quoteId, quoteId))
      .limit(1),
  );

  if (rows.isErr()) {
    return rows;
  }

  const document = rows.value.at(0);

  if (!document) {
    return Result.err(
      new NotFoundError({
        resource: "proforma invoice",
        resourceId: quoteId,
      }),
    );
  }

  const allowed =
    actor.kind === "vendor"
      ? document.vendorId === actor.vendorId
      : document.organizationId === actor.organizationId;

  if (!allowed) {
    return Result.err(
      new NotFoundError({
        resource: "proforma invoice",
        resourceId: quoteId,
      }),
    );
  }

  return Result.ok({
    storageKey: document.storageKey,
    fileName: document.fileName,
    mimeType: document.mimeType,
    sizeBytes: document.sizeBytes,
    uploadedAt: document.uploadedAt.toISOString(),
  });
};
