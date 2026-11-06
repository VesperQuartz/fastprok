import { canApprove, loadActor } from "@/lib/actor";
import { auth } from "@/lib/auth";
import { ForbiddenError, UnauthenticatedError } from "@/lib/result/errors";
import { toORPCError, unwrapResult } from "@/lib/result/orpc";
import { base } from "./base";

const withSession = base.use(async ({ context, next }) => {
  const session = await auth.api.getSession({ headers: context.headers });

  if (!session) {
    throw toORPCError(new UnauthenticatedError());
  }

  return next({ context: { user: session.user, session: session.session } });
});

const withActor = base.use(async ({ context, next }) => {
  const actor = await unwrapResult(loadActor(context.headers));

  return next({ context: { actor } });
});

const requireBuyer = withActor.use(async ({ context, next }) => {
  if (context.actor.kind !== "buyer") {
    throw toORPCError(
      new ForbiddenError({
        action: "use buyer actions",
        reason: "your account is registered as a vendor",
      }),
    );
  }

  return next({ context: { actor: context.actor } });
});

const requireApprover = requireBuyer.use(async ({ context, next }) => {
  if (!canApprove(context.actor)) {
    throw toORPCError(
      new ForbiddenError({
        action: "approve this request",
        reason: "only organization approvers can approve requests",
      }),
    );
  }

  return next({ context: { actor: context.actor } });
});

const requireVendor = withActor.use(async ({ context, next }) => {
  if (context.actor.kind !== "vendor") {
    throw toORPCError(
      new ForbiddenError({
        action: "use vendor actions",
        reason: "your account is registered as a buyer",
      }),
    );
  }

  return next({ context: { actor: context.actor } });
});

export const sessionProcedure = withSession;
export const actorProcedure = withActor;
export const buyerProcedure = requireBuyer;
export const approverProcedure = requireApprover;
export const vendorProcedure = requireVendor;
