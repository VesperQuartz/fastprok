import { eq } from "drizzle-orm";
import { Result } from "better-result";
import { auth, type Session } from "@/lib/auth";
import { db } from "@/lib/db";
import { tryDatabase } from "@/lib/result/database";
import { DatabaseError, ForbiddenError, UnauthenticatedError } from "@/lib/result/errors";
import {
  organizationMembers,
  organizations,
  type MembershipRole,
  vendorContacts,
  vendors,
} from "@/repo/schema";

type AuthenticatedUser = Session["user"];
type AuthenticatedSession = Session["session"];

export type BuyerActor = {
  kind: "buyer";
  user: AuthenticatedUser;
  session: AuthenticatedSession;
  organizationId: string;
  organizationName: string;
  role: MembershipRole;
};

export type VendorActor = {
  kind: "vendor";
  user: AuthenticatedUser;
  session: AuthenticatedSession;
  vendorId: string;
  vendorName: string;
};

export type Actor = BuyerActor | VendorActor;

export const canApprove = (actor: Actor) =>
  actor.kind === "buyer" && (actor.role === "approver" || actor.role === "both");

export const loadActor = async (
  headers: Headers,
): Promise<Result<Actor, DatabaseError | UnauthenticatedError | ForbiddenError>> => {
  const session = await Result.tryPromise({
    try: () => auth.api.getSession({ headers }),
    catch: (cause) =>
      new DatabaseError({
        operation: "load session",
        cause,
      }),
  });

  if (session.isErr()) {
    return Result.err(session.error);
  }

  if (!session.value) {
    return Result.err(new UnauthenticatedError());
  }

  const authenticated = session.value;

  const membership = await tryDatabase("load organization membership", () =>
    db
      .select({
        organizationId: organizationMembers.organizationId,
        organizationName: organizations.name,
        role: organizationMembers.role,
      })
      .from(organizationMembers)
      .innerJoin(organizations, eq(organizationMembers.organizationId, organizations.id))
      .where(eq(organizationMembers.userId, authenticated.user.id))
      .limit(1),
  );

  if (membership.isErr()) {
    return Result.err(membership.error);
  }

  const member = membership.value.at(0);

  if (member) {
    return Result.ok({
      kind: "buyer",
      user: authenticated.user,
      session: authenticated.session,
      organizationId: member.organizationId,
      organizationName: member.organizationName,
      role: member.role,
    });
  }

  const vendorAccount = await tryDatabase("load vendor contact", () =>
    db
      .select({
        vendorId: vendors.id,
        vendorName: vendors.name,
      })
      .from(vendorContacts)
      .innerJoin(vendors, eq(vendorContacts.vendorId, vendors.id))
      .where(eq(vendorContacts.userId, authenticated.user.id))
      .limit(1),
  );

  if (vendorAccount.isErr()) {
    return Result.err(vendorAccount.error);
  }

  const vendor = vendorAccount.value.at(0);

  if (vendor) {
    return Result.ok({
      kind: "vendor",
      user: authenticated.user,
      session: authenticated.session,
      vendorId: vendor.vendorId,
      vendorName: vendor.vendorName,
    });
  }

  return Result.err(
    new ForbiddenError({
      action: "use the procurement workspace",
      reason: "this account is not linked to an organization or a vendor",
    }),
  );
};
