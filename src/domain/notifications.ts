import { and, asc, eq, inArray, lt, lte } from "drizzle-orm";
import { Result } from "better-result";
import { serverEnv } from "@/env/server";
import { db, type DbTransaction } from "@/lib/db";
import { tryDatabase } from "@/lib/result/database";
import { EmailError } from "@/lib/result/errors";
import { emailLog, notifications } from "@/repo/schema";

export type NotificationRecipient = {
  userId: string | null;
  name: string;
  email: string;
};

export type NotificationEmail = {
  subject: string;
  heading: string;
  lines: string[];
  cta?: {
    url: string;
    label: string;
  };
};

export type NotificationEvent = {
  eventKey: string;
  type: string;
  requestId: string | null;
  recipients: NotificationRecipient[];
  title: string;
  body: string;
  email?: NotificationEmail;
};

export type EmailDispatchSummary = {
  sent: number;
  failed: number;
};

const escapeHtml = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

const resolveEmailRecipient = (intendedEmail: string) => {
  const override = serverEnv.DEMO_EMAIL_OVERRIDE;

  if (!override) {
    return intendedEmail;
  }

  const intendedDomain = intendedEmail.split("@").at(1)?.toLowerCase();
  const overrideDomain = override.split("@").at(1)?.toLowerCase();

  return intendedDomain && intendedDomain === overrideDomain ? intendedEmail : override;
};

const renderEmailHtml = ({ heading, lines, cta }: NotificationEmail) => {
  const content = lines
    .map(
      (line) =>
        `<p style="margin:0 0 12px;font-size:15px;line-height:1.6;color:#334155;">${escapeHtml(line)}</p>`,
    )
    .join("");
  const button = cta
    ? `<p style="margin:24px 0 8px;"><a href="${escapeHtml(cta.url)}" style="display:inline-block;background:#0f766e;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:600;">${escapeHtml(cta.label)}</a></p>`
    : "";

  return `<!doctype html>
<html>
  <body style="margin:0;padding:24px;background:#f8fafc;font-family:ui-sans-serif,system-ui,-apple-system,'Segoe UI',sans-serif;">
    <div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:12px;padding:28px;">
      <p style="margin:0 0 20px;font-size:13px;letter-spacing:0.08em;text-transform:uppercase;color:#0f766e;font-weight:700;">Procurement Agent</p>
      <h1 style="margin:0 0 16px;font-size:22px;line-height:1.3;color:#0f172a;">${escapeHtml(heading)}</h1>
      ${content}
      ${button}
      <p style="margin:24px 0 0;font-size:12px;line-height:1.5;color:#64748b;">This message was sent by the procurement workspace. Replies to this email are not read; use the app instead.</p>
    </div>
  </body>
</html>`;
};

export const queueNotification = async (tx: DbTransaction, event: NotificationEvent) => {
  for (const recipient of event.recipients) {
    const eventKey = `${event.eventKey}:${recipient.userId ?? recipient.email}`;

    if (recipient.userId) {
      await tx
        .insert(notifications)
        .values({
          eventKey,
          userId: recipient.userId,
          requestId: event.requestId,
          type: event.type,
          title: event.title,
          body: event.body,
        })
        .onConflictDoNothing();
    }

    if (event.email) {
      await tx
        .insert(emailLog)
        .values({
          eventKey,
          recipientUserId: recipient.userId,
          intendedToEmail: recipient.email,
          toEmail: resolveEmailRecipient(recipient.email),
          subject: event.email.subject,
          html: renderEmailHtml(event.email),
          status: "pending",
          scheduledAt: new Date(),
        })
        .onConflictDoNothing();
    }
  }
};

const sendResendEmail = async ({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}) =>
  Result.tryPromise({
    try: async () => {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${serverEnv.RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: serverEnv.RESEND_FROM,
          to,
          subject,
          html,
        }),
        signal: AbortSignal.timeout(15_000),
      });

      if (!response.ok) {
        const detail = (await response.text()).slice(0, 300);
        throw new Error(`Resend returned ${response.status}: ${detail}`);
      }

      return (await response.json()) as { id: string };
    },
    catch: (cause) =>
      new EmailError({
        operation: "send email",
        cause,
        retryable: true,
      }),
  });

const sleep = (milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds));

const claimPendingEmails = (limit: number) =>
  tryDatabase("claim pending emails", () =>
    db.transaction(async (tx) => {
      const claimed = await tx
        .select()
        .from(emailLog)
        .where(
          and(
            inArray(emailLog.status, ["pending", "failed"]),
            lt(emailLog.attempts, 3),
            lte(emailLog.scheduledAt, new Date()),
          ),
        )
        .orderBy(asc(emailLog.createdAt))
        .limit(limit)
        .for("update", { skipLocked: true });

      if (claimed.length === 0) {
        return claimed;
      }

      await tx
        .update(emailLog)
        .set({ status: "sending", updatedAt: new Date() })
        .where(
          inArray(
            emailLog.id,
            claimed.map((email) => email.id),
          ),
        );

      return claimed;
    }),
  );

export const dispatchPendingEmails = async (
  limit = 10,
): Promise<Result<EmailDispatchSummary, Error>> => {
  const staleBefore = new Date(Date.now() - 5 * 60 * 1_000);
  const reset = await tryDatabase("reset stale emails", () =>
    db
      .update(emailLog)
      .set({ status: "failed", updatedAt: new Date() })
      .where(and(eq(emailLog.status, "sending"), lt(emailLog.updatedAt, staleBefore))),
  );

  if (reset.isErr()) {
    return Result.err(reset.error);
  }

  const claimed = await claimPendingEmails(limit);

  if (claimed.isErr()) {
    return Result.err(claimed.error);
  }

  let sent = 0;
  let failed = 0;

  for (const email of claimed.value) {
    const delivery = await sendResendEmail({
      to: email.toEmail,
      subject: email.subject,
      html: email.html,
    });

    if (delivery.isOk()) {
      const updated = await tryDatabase("mark email sent", () =>
        db
          .update(emailLog)
          .set({ status: "sent", sentAt: new Date(), lastError: null })
          .where(eq(emailLog.id, email.id)),
      );

      if (updated.isErr()) {
        return Result.err(updated.error);
      }

      sent += 1;
    } else {
      const updated = await tryDatabase("mark email failed", () =>
        db
          .update(emailLog)
          .set({
            status: "failed",
            attempts: email.attempts + 1,
            lastError: delivery.error.message.slice(0, 500),
          })
          .where(eq(emailLog.id, email.id)),
      );

      if (updated.isErr()) {
        return Result.err(updated.error);
      }

      failed += 1;
    }

    await sleep(120);
  }

  return Result.ok({ sent, failed });
};

export const dispatchEmailsInBackground = (limit = 10) => {
  void dispatchPendingEmails(limit).then((outcome) => {
    if (outcome.isErr()) {
      console.error("Could not dispatch pending emails", outcome.error);
    }
  });
};
