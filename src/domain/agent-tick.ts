import { and, arrayContains, eq, inArray, sql } from "drizzle-orm";
import { Result } from "better-result";
import { serverEnv } from "@/env/server";
import { db, type DbTransaction } from "@/lib/db";
import { tryDatabase, withTransaction } from "@/lib/result/database";
import type { AppError } from "@/lib/result/errors";
import {
  agentRuns,
  invitations,
  organizationMembers,
  quotes,
  requests,
  user,
  vendorContacts,
  vendors,
  type AgentRunSummary,
} from "@/repo/schema";
import { logAgentAction } from "./agent-log";
import type { CategoryId } from "./categories";
import {
  dispatchPendingEmails,
  queueNotification,
  type NotificationRecipient,
} from "./notifications";
import { explainRecommendation } from "./recommendation-ai";
import { rankQuotes, type RankingQuote } from "./ranking";
import { matchVendors, type VendorCandidate } from "./vendor-match";

const formatDeadline = (deadline: Date) =>
  new Intl.DateTimeFormat("en-NG", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Africa/Lagos",
  }).format(deadline);

const reminderThreshold = (deadline: Date, createdAt: Date) => {
  const windowMs = Math.max(deadline.getTime() - createdAt.getTime(), 0);

  return new Date(deadline.getTime() - windowMs * 0.25);
};

const extensionMinutes = () =>
  serverEnv.DEMO_MODE
    ? serverEnv.DEMO_QUOTING_EXTENSION_MINUTES
    : serverEnv.QUOTING_EXTENSION_MINUTES;

const contactsByVendor = async (tx: DbTransaction, vendorIds: string[]) => {
  const grouped = new Map<string, NotificationRecipient[]>();

  if (vendorIds.length === 0) {
    return grouped;
  }

  const contacts = await tx
    .select({
      vendorId: vendorContacts.vendorId,
      userId: user.id,
      name: user.name,
      email: user.email,
    })
    .from(vendorContacts)
    .innerJoin(user, eq(vendorContacts.userId, user.id))
    .where(inArray(vendorContacts.vendorId, vendorIds));

  for (const contact of contacts) {
    const existing = grouped.get(contact.vendorId) ?? [];
    existing.push({ userId: contact.userId, name: contact.name, email: contact.email });
    grouped.set(contact.vendorId, existing);
  }

  return grouped;
};

const requestAudience = async (tx: DbTransaction, organizationId: string, creatorId: string) => {
  const members = await tx
    .select({ id: user.id, name: user.name, email: user.email })
    .from(organizationMembers)
    .innerJoin(user, eq(organizationMembers.userId, user.id))
    .where(
      and(
        eq(organizationMembers.organizationId, organizationId),
        inArray(organizationMembers.role, ["approver", "both"]),
      ),
    );

  const creator = await tx
    .select({ id: user.id, name: user.name, email: user.email })
    .from(user)
    .where(eq(user.id, creatorId))
    .limit(1);

  const recipients = new Map<string, NotificationRecipient>();

  for (const row of [...members, ...creator]) {
    recipients.set(row.id, { userId: row.id, name: row.name, email: row.email });
  }

  return [...recipients.values()];
};

export type AgentTickInput = {
  requestId?: string;
  actorUserId?: string | null;
};

export type AgentTickOutput = {
  runId: string;
  summary: AgentRunSummary;
};

export const runAgentTick = async (
  input: AgentTickInput = {},
): Promise<Result<AgentTickOutput, AppError>> => {
  const outcome = await withTransaction<AgentTickOutput, AppError>(
    "run agent tick",
    async (tx): Promise<Result<AgentTickOutput, AppError>> => {
      const now = new Date();
      const runRows = await tx
        .insert(agentRuns)
        .values({ status: "running" })
        .returning({ id: agentRuns.id });
      const run = runRows.at(0);

      if (!run) {
        throw new Error("Agent run insert did not return a row.");
      }

      const summary: AgentRunSummary = {
        requestsChecked: 0,
        remindersSent: 0,
        requestsWidened: 0,
        requestsRanked: 0,
        escalations: 0,
        emailsSent: 0,
        emailsDeferred: 0,
      };

      const requestRows = await tx
        .select()
        .from(requests)
        .where(
          input.requestId
            ? and(eq(requests.status, "quoting"), eq(requests.id, input.requestId))
            : eq(requests.status, "quoting"),
        );

      for (const request of requestRows) {
        summary.requestsChecked += 1;

        const inviteRows = await tx
          .select({
            id: invitations.id,
            vendorId: invitations.vendorId,
            vendorName: vendors.name,
            vendorEmail: vendors.contactEmail,
            status: invitations.status,
            reminderCount: invitations.reminderCount,
            invitedAt: invitations.invitedAt,
          })
          .from(invitations)
          .innerJoin(vendors, eq(invitations.vendorId, vendors.id))
          .where(eq(invitations.requestId, request.id));

        const quoteRows = await tx
          .select({
            id: quotes.id,
            vendorId: quotes.vendorId,
            vendorName: vendors.name,
            totalPriceCents: quotes.totalPriceCents,
            deliveryDate: quotes.deliveryDate,
            quantityOffered: quotes.quantityOffered,
            warrantyMonths: quotes.warrantyMonths,
            firstSubmittedAt: quotes.firstSubmittedAt,
            onTimeCount: vendors.onTimeCount,
            lateCount: vendors.lateCount,
            invitationCount: vendors.invitationCount,
            responseCount: vendors.responseCount,
          })
          .from(quotes)
          .innerJoin(vendors, eq(quotes.vendorId, vendors.id))
          .where(eq(quotes.requestId, request.id));

        const validQuotes = quoteRows.filter(
          (quote) =>
            quote.quantityOffered >= request.quantity &&
            quote.deliveryDate <= request.neededBy &&
            quote.firstSubmittedAt.getTime() <= request.deadlineAt.getTime(),
        );
        const outstanding = inviteRows.filter((invite) => invite.status === "invited");
        const allResponded = inviteRows.length > 0 && outstanding.length === 0;
        const deadlinePassed = request.deadlineAt.getTime() <= Date.now();
        const closing = deadlinePassed || (allResponded && quoteRows.length > 0);

        if (!closing) {
          const quotedVendors = new Set(quoteRows.map((quote) => quote.vendorId));
          const reminderTargets = inviteRows.filter(
            (invite) =>
              invite.status === "invited" &&
              !quotedVendors.has(invite.vendorId) &&
              invite.reminderCount < serverEnv.MAX_REMINDERS &&
              now.getTime() >= reminderThreshold(request.deadlineAt, invite.invitedAt).getTime() &&
              now.getTime() < request.deadlineAt.getTime(),
          );
          const contacts = await contactsByVendor(
            tx,
            reminderTargets.map((invite) => invite.vendorId),
          );

          for (const invite of reminderTargets) {
            const recipients = contacts.get(invite.vendorId) ?? [
              { userId: null, name: invite.vendorName, email: invite.vendorEmail },
            ];
            const nextReminder = invite.reminderCount + 1;

            await queueNotification(tx, {
              eventKey: `request:${request.id}:reminder:${invite.vendorId}:${nextReminder}`,
              type: "request.reminder",
              requestId: request.id,
              recipients,
              title: "Quote request closes soon",
              body: `Reminder: ${request.quantity} ${request.unit} of ${request.title} closes ${formatDeadline(request.deadlineAt)}.`,
              email: {
                subject: `Reminder: quote for ${request.title}`,
                heading: "There is still time to quote",
                lines: [
                  `Request: ${request.title}`,
                  `Quantity: ${request.quantity} ${request.unit}`,
                  `Deliver to: ${request.deliveryRegion}`,
                  `Quotes close: ${formatDeadline(request.deadlineAt)}`,
                ],
                cta: {
                  url: `${serverEnv.APP_BASE_URL}/vendor/requests/${request.id}`,
                  label: "Submit a quote",
                },
              },
            });

            await tx
              .update(invitations)
              .set({ reminderCount: nextReminder, lastRemindedAt: now })
              .where(eq(invitations.id, invite.id));

            await logAgentAction(tx, {
              runId: run.id,
              requestId: request.id,
              actorType: "agent",
              action: "vendor.reminded",
              detail: {
                vendorId: invite.vendorId,
                vendorName: invite.vendorName,
                reminderCount: nextReminder,
                closesAt: request.deadlineAt.toISOString(),
              },
            });

            summary.remindersSent += 1;
          }

          continue;
        }

        if (
          deadlinePassed &&
          validQuotes.length < serverEnv.MIN_VALID_QUOTES &&
          !request.widenedAt
        ) {
          const invitedIds = new Set(inviteRows.map((invite) => invite.vendorId));
          const candidateRows = await tx
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
            .where(
              and(eq(vendors.active, true), arrayContains(vendors.categories, [request.category])),
            );

          const matches = matchVendors({
            vendors: candidateRows
              .filter((candidate) => !invitedIds.has(candidate.id))
              .map((candidate): VendorCandidate => candidate),
            category: request.category as CategoryId,
            deliveryRegion: request.deliveryRegion,
            neededBy: request.neededBy,
            limit: serverEnv.WIDEN_BATCH_SIZE,
          });

          if (matches.length > 0) {
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

            const contacts = await contactsByVendor(
              tx,
              matches.map((match) => match.vendor.id),
            );

            for (const match of matches) {
              const recipients = contacts.get(match.vendor.id) ?? [
                { userId: null, name: match.vendor.name, email: match.vendor.contactEmail },
              ];

              await queueNotification(tx, {
                eventKey: `request:${request.id}:invited:${match.vendor.id}`,
                type: "request.invited",
                requestId: request.id,
                recipients,
                title: "New quote request",
                body: `${request.quantity} ${request.unit} of ${request.title} for ${request.deliveryRegion}. Quotes close ${formatDeadline(request.deadlineAt)}.`,
                email: {
                  subject: `Quote request: ${request.title}`,
                  heading: "You are invited to quote",
                  lines: [
                    `Request: ${request.title}`,
                    `Quantity: ${request.quantity} ${request.unit}`,
                    `Deliver to: ${request.deliveryRegion}`,
                    `Needed by: ${request.neededBy}`,
                    `Quotes close: ${formatDeadline(request.deadlineAt)}`,
                  ],
                  cta: {
                    url: `${serverEnv.APP_BASE_URL}/vendor/requests/${request.id}`,
                    label: "Open request",
                  },
                },
              });
            }

            const extendedDeadline = new Date(Date.now() + extensionMinutes() * 60 * 1_000);

            await tx
              .update(requests)
              .set({ deadlineAt: extendedDeadline, widenedAt: now })
              .where(eq(requests.id, request.id));

            await logAgentAction(tx, {
              runId: run.id,
              requestId: request.id,
              actorType: "agent",
              action: "vendors.widened",
              detail: {
                reason: `only ${validQuotes.length} valid quote(s) at the deadline`,
                invited: matches.map((match) => ({
                  vendorId: match.vendor.id,
                  vendorName: match.vendor.name,
                  score: match.score,
                })),
                newDeadline: extendedDeadline.toISOString(),
              },
            });

            summary.requestsWidened += 1;
            continue;
          }

          await tx.update(requests).set({ widenedAt: now }).where(eq(requests.id, request.id));
        }

        const audience = await requestAudience(tx, request.organizationId, request.createdByUserId);

        if (quoteRows.length === 0) {
          await tx.update(requests).set({ status: "no_quotes" }).where(eq(requests.id, request.id));

          await queueNotification(tx, {
            eventKey: `request:${request.id}:no-quotes`,
            type: "request.no_quotes",
            requestId: request.id,
            recipients: audience,
            title: "No quotes received",
            body: `No vendor quoted ${request.quantity} ${request.unit} of ${request.title}. The agent has flagged this request for a human.`,
            email: {
              subject: `No quotes for ${request.title}`,
              heading: "No quotes received",
              lines: [
                `Request: ${request.title}`,
                `Quantity: ${request.quantity} ${request.unit}`,
                "No invited vendor responded before the deadline.",
                "Open the app to widen the search or cancel the request.",
              ],
              cta: {
                url: `${serverEnv.APP_BASE_URL}/requests/${request.id}`,
                label: "Review request",
              },
            },
          });

          await logAgentAction(tx, {
            runId: run.id,
            requestId: request.id,
            actorType: "agent",
            action: "request.no_quotes",
            detail: {
              invitedCount: inviteRows.length,
              widened: Boolean(request.widenedAt),
            },
          });

          summary.escalations += 1;
          continue;
        }

        const rankingQuotes: RankingQuote[] = quoteRows.map((quote) => ({
          id: quote.id,
          vendorId: quote.vendorId,
          vendorName: quote.vendorName,
          totalPriceCents: quote.totalPriceCents,
          deliveryDate: quote.deliveryDate,
          quantityOffered: quote.quantityOffered,
          warrantyMonths: quote.warrantyMonths,
          firstSubmittedAt: quote.firstSubmittedAt,
          onTimeCount: quote.onTimeCount,
          lateCount: quote.lateCount,
          invitationCount: quote.invitationCount,
          responseCount: quote.responseCount,
        }));

        const baseRecommendation = rankQuotes({
          request: {
            quantity: request.quantity,
            neededBy: request.neededBy,
            priority: request.priority,
            budgetCents: request.budgetCents,
            deadlineAt: request.deadlineAt,
          },
          quotes: rankingQuotes,
        });
        const explained = await explainRecommendation(baseRecommendation);
        const missingCount = Math.max(0, serverEnv.MIN_VALID_QUOTES - validQuotes.length);

        await tx
          .update(requests)
          .set({
            status: "awaiting_approval",
            recommendation: explained.recommendation,
            rankedAt: now,
          })
          .where(eq(requests.id, request.id));

        await queueNotification(tx, {
          eventKey: `request:${request.id}:ranked`,
          type: "request.ranked",
          requestId: request.id,
          recipients: audience,
          title: "Quotes are ready to review",
          body:
            missingCount > 0
              ? `${explained.recommendation.reason} ${missingCount} fewer than the target ${serverEnv.MIN_VALID_QUOTES} valid quotes, so this needs your judgement.`
              : explained.recommendation.reason,
          email: {
            subject: `Quotes ready for ${request.title}`,
            heading: "Quotes are ready to review",
            lines: [
              `Request: ${request.title}`,
              `Quotes received: ${quoteRows.length}`,
              missingCount > 0
                ? `Only ${validQuotes.length} met the quantity and delivery requirements.`
                : "A recommended quote is ready for approval.",
              "Open the app to compare the quotes and approve one.",
            ],
            cta: {
              url: `${serverEnv.APP_BASE_URL}/requests/${request.id}`,
              label: "Review quotes",
            },
          },
        });

        await logAgentAction(tx, {
          runId: run.id,
          requestId: request.id,
          actorType: "agent",
          action: "quotes.ranked",
          detail: {
            quoteCount: quoteRows.length,
            validQuoteCount: validQuotes.length,
            missing: missingCount,
            winner: explained.recommendation.winner,
            explanationUsedFallback: explained.usedFallback,
            explanationFallbackReason: explained.fallbackReason,
            explanationLatencyMs: explained.latencyMs,
            reason: explained.recommendation.reason,
          },
        });

        summary.requestsRanked += 1;
      }

      return Result.ok({ runId: run.id, summary });
    },
  );

  if (outcome.isErr()) {
    return outcome;
  }

  const dispatch = await dispatchPendingEmails(20);
  const summary: AgentRunSummary = {
    ...outcome.value.summary,
    emailsSent: dispatch.isOk() ? dispatch.value.sent : 0,
    emailsDeferred: dispatch.isOk() ? dispatch.value.failed : 0,
  };

  const finalized = await tryDatabase("finalize agent run", () =>
    db
      .update(agentRuns)
      .set({ status: "done", summary, finishedAt: new Date() })
      .where(eq(agentRuns.id, outcome.value.runId)),
  );

  if (finalized.isErr()) {
    console.error("Could not finalize agent run", finalized.error);
  }

  return Result.ok({ runId: outcome.value.runId, summary });
};
