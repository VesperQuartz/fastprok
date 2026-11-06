import { runAgentTick } from "@/domain/agent-tick";
import { serverEnv } from "@/env/server";

let started = false;

const runOnce = async () => {
  try {
    const outcome = await runAgentTick();

    if (outcome.isErr()) {
      console.error("Agent tick failed", outcome.error);
    }
  } catch (error) {
    console.error("Agent tick crashed", error);
  }
};

export const startAgentScheduler = () => {
  if (started) {
    return;
  }

  started = true;
  void runOnce();

  const timer = setInterval(() => {
    void runOnce();
  }, serverEnv.AGENT_TICK_MS);

  timer.unref();
};
