import { canApprove } from "@/lib/actor";
import { actorProcedure } from "@/lib/orpc/procedures";
import { base } from "../base";
import { requestProcedures } from "./requests";
import { vendorProcedures } from "./vendor";
import { agentProcedures, notificationProcedures } from "./agent";
import accountProcedures from "./account";

export const ping = base.route({ method: "GET", path: "/ping" }).handler(() => ({
  ok: true,
  at: new Date().toISOString(),
}));

export const me = actorProcedure.route({ method: "GET", path: "/me" }).handler(({ context }) => {
  const { actor } = context;

  return {
    kind: actor.kind,
    user: {
      id: actor.user.id,
      name: actor.user.name,
      email: actor.user.email,
    },
    organization:
      actor.kind === "buyer"
        ? {
            id: actor.organizationId,
            name: actor.organizationName,
            role: actor.role,
          }
        : null,
    vendor:
      actor.kind === "vendor"
        ? {
            id: actor.vendorId,
            name: actor.vendorName,
          }
        : null,
    canApprove: canApprove(actor),
  };
});

export default {
  ping,
  me,
  account: accountProcedures,
  requests: requestProcedures,
  vendor: vendorProcedures,
  agent: agentProcedures,
  notifications: notificationProcedures,
};
