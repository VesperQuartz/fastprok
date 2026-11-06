import { and, eq, inArray, ne } from "drizzle-orm";
import { Result } from "better-result";
import { serverEnv } from "@/env/server";
import type { BuyerActor } from "@/lib/actor";
import { withTransaction } from "@/lib/result/database";
import { InvalidStateError, NotFoundError, type AppError } from "@/lib/result/errors";
import { invitations, quotes, requests, user, vendorContacts, vendors } from "@/repo/schema";
import { logAgentAction } from "./agent-log";
import { dispatchPendingEmails, queueNotification } from "./notifications";

export type ApproveQuoteInput = {
  requestId: string;
  quoteId: string;
  note: string | null;
};

export type ApproveQuoteResult = {
  requestId: string;
  quoteId: string;
  vendorId: string;
  vendorName: string;
};

export const approveQuote = async (
  actor: BuyerActor,
  input: ApproveQuoteInput,
): Promise<Result<ApproveQuoteResult, AppError>> => {
  const outcome = await withTransaction<ApproveQuoteResult, AppError>(
    "approve quote",
    async (tx): Promise<Result<ApproveQuoteResult, AppError>> => {
      const requestRows = await tx
        .select()
        .from(requests)
        .where(
          and(eq(requests.id, input.requestId), eq(requests.organizationId, actor.organizationId)),
        )
        .limit(1);
      const request = requestRows.at(0);

      if (!request) {
        return Result.err(new NotFoundError({ resource: "request", resourceId: input.requestId }));
      }

      if (request.status !== "awaiting_approval") {
        return Result.err(
          new InvalidStateError({
            action: "approve a quote",
            currentStatus: request.status,
          }),
        );
      }

      const quoteRows = await tx
        .select({
          id: quotes.id,
          vendorId: quotes.vendorId,
          vendorName: vendors.name,
          vendorEmail: vendors.contactEmail,
          status: quotes.status,
        })
        .from(quotes)
        .innerJoin(vendors, eq(quotes.vendorId, vendors.id))
        .where(and(eq(quotes.id, input.quoteId), eq(quotes.requestId, input.requestId)))
        .limit(1);
      const quote = quoteRows.at(0);

      if (!quote) {
        return Result.err(new NotFoundError({ resource: "quote", resourceId: input.quoteId }));
      }

      if (quote.status !== "submitted") {
        return Result.err(
          new InvalidStateError({
            action: "approve this quote",
            currentStatus: quote.status,
          }),
        );
      }

      await tx.update(requests).set({ status: "approved" }).where(eq(requests.id, request.id));

      await tx.update(quotes).set({ status: "won" }).where(eq(quotes.id, quote.id));

      await tx
        .update(quotes)
        .set({ status: "lost" })
        .where(and(eq(quotes.requestId, request.id), ne(quotes.id, quote.id)));

      const otherVendors = await tx
        .select({
          vendorId: quotes.vendorId,
          vendorName: vendors.name,
          vendorEmail: vendors.contactEmail,
        })
        .from(quotes)
        .innerJoin(vendors, eq(quotes.vendorId, vendors.id))
        .where(and(eq(quotes.requestId, request.id), ne(quotes.id, quote.id)));

      const vendorIds = [quote.vendorId, ...otherVendors.map((row) => row.vendorId)];
      const contactRows = await tx
        .select({
          vendorId: vendorContacts.vendorId,
          userId: user.id,
          name: user.name,
          email: user.email,
        })
        .from(vendorContacts)
        .innerJoin(user, eq(vendorContacts.userId, user.id))
        .where(inArray(vendorContacts.vendorId, vendorIds));

      const contacts = new Map<string, Array<{ userId: string; name: string; email: string }>>();

      for (const contact of contactRows) {
        const existing = contacts.get(contact.vendorId) ?? [];
        existing.push({ userId: contact.userId, name: contact.name, email: contact.email });
        contacts.set(contact.vendorId, existing);
      }

      const winnerRecipients = contacts.get(quote.vendorId) ?? [
        { userId: null, name: quote.vendorName, email: quote.vendorEmail },
      ];

      await queueNotification(tx, {
        eventKey: `request:${request.id}:won:${quote.vendorId}`,
        type: "quote.won",
        requestId: request.id,
        recipients: winnerRecipients,
        title: "Your quote was accepted",
        body: `${actor.organizationName} approved your quote for ${request.quantity} ${request.unit} of ${request.title}.`,
        email: {
          subject: `Quote accepted: ${request.title}`,
          heading: "Your quote was accepted",
          lines: [
            `Request: ${request.title}`,
            `Quantity: ${request.quantity} ${request.unit}`,
            "Open the app for the details. The buyer will contact you about delivery.",
          ],
          cta: {
            url: `${serverEnv.APP_BASE_URL}/vendor/requests/${request.id}`,
            label: "Open request",
          },
        },
      });

      for (const vendor of otherVendors) {
        const recipients = contacts.get(vendor.vendorId) ?? [
          { userId: null, name: vendor.vendorName, email: vendor.vendorEmail },
        ];

        await queueNotification(tx, {
          eventKey: `request:${request.id}:lost:${vendor.vendorId}`,
          type: "quote.lost",
          requestId: request.id,
          recipients,
          title: "Quote not selected",
          body: `The buyer chose another quote for ${request.title}. Thanks for responding.`,
          email: {
            subject: `Request closed: ${request.title}`,
            heading: "Quote not selected",
            lines: [
              `Request: ${request.title}`,
              "The buyer chose another quote this time.",
              "Thanks for responding.",
            ],
            cta: {
              url: `${serverEnv.APP_BASE_URL}/vendor/requests/${request.id}`,
              label: "Open request",
            },
          },
        });
      }

      const creatorRows = await tx
        .select({ id: user.id, name: user.name, email: user.email })
        .from(user)
        .where(eq(user.id, request.createdByUserId))
        .limit(1);
      const creator = creatorRows.at(0);

      await queueNotification(tx, {
        eventKey: `request:${request.id}:approved:${quote.id}`,
        type: "request.approved",
        requestId: request.id,
        recipients: creator
          ? [{ userId: creator.id, name: creator.name, email: creator.email }]
          : [],
        title: `Approved: ${quote.vendorName}`,
        body: `${actor.user.name} approved ${quote.vendorName} for ${request.title}.${input.note ? ` Note: ${input.note}` : ""}`,
      });

      await tx
        .update(invitations)
        .set({ status: "expired" })
        .where(and(eq(invitations.requestId, request.id), eq(invitations.status, "invited")));

      await logAgentAction(tx, {
        requestId: request.id,
        actorType: "human",
        actorUserId: actor.user.id,
        action: "quote.approved",
        detail: {
          quoteId: quote.id,
          vendorId: quote.vendorId,
          vendorName: quote.vendorName,
          note: input.note,
        },
      });

      return Result.ok({
        requestId: request.id,
        quoteId: quote.id,
        vendorId: quote.vendorId,
        vendorName: quote.vendorName,
      });
    },
  );

  if (outcome.isOk()) {
    const dispatch = await dispatchPendingEmails(10);

    if (dispatch.isErr()) {
      console.error("Could not dispatch approval emails", dispatch.error);
    }
  }

  return outcome;
};
