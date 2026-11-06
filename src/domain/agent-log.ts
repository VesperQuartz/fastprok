import type { DbTransaction } from "@/lib/db";
import { agentActions } from "@/repo/schema";

export type AgentActionInput = {
  runId?: string | null;
  requestId?: string | null;
  actorType?: "human" | "agent" | "system";
  actorUserId?: string | null;
  action: string;
  detail?: Record<string, unknown> | null;
};

export const logAgentAction = async (tx: DbTransaction, input: AgentActionInput) => {
  await tx.insert(agentActions).values({
    runId: input.runId ?? null,
    requestId: input.requestId ?? null,
    actorType: input.actorType ?? "system",
    actorUserId: input.actorUserId ?? null,
    action: input.action,
    detail: input.detail ?? null,
  });
};
