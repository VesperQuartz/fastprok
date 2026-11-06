import { and, eq, inArray } from "drizzle-orm";
import type { DbTransaction } from "@/lib/db";
import { organizationMembers, user } from "@/repo/schema";
import type { NotificationRecipient } from "./notifications";

export const requestAudience = async (
  tx: DbTransaction,
  organizationId: string,
  creatorId: string,
) => {
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
