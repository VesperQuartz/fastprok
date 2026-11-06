import { Result } from "better-result";
import { z } from "zod";
import { serverEnv } from "@/env/server";
import { formatMoney } from "@/lib/money";
import { AiError } from "@/lib/result/errors";
import type { Recommendation } from "@/repo/schema";

const AI_TIMEOUT_MS = 25_000;

const responseSchema = z.object({
  summary: z.string().trim().min(1).max(600),
  reasons: z
    .array(
      z.object({
        quoteId: z.string().trim().min(1),
        reason: z.string().trim().min(1).max(400),
      }),
    )
    .max(10)
    .default([]),
});

export type ExplainedRecommendation = {
  recommendation: Recommendation;
  usedFallback: boolean;
  fallbackReason: string | null;
  latencyMs: number;
};

const fallbackReasonFor = (recommendation: Recommendation) => {
  for (const quote of recommendation.ranked) {
    if (quote.aiReason) {
      continue;
    }

    const missing = quote.flags.length > 0 ? ` Flagged: ${quote.flags.join(", ")}.` : "";

    quote.aiReason = `${quote.vendorName} ranks #${quote.rank} at ${formatMoney(quote.totalPriceCents)} with delivery on ${quote.deliveryDate}.${missing}`;
  }
};

const callVultr = (recommendation: Recommendation) =>
  Result.tryPromise({
    try: async () => {
      const response = await fetch(`${serverEnv.VULTR_INFERENCE_BASE_URL}/chat/completions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${serverEnv.VULTR_INFERENCE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: serverEnv.VULTR_INFERENCE_MODEL,
          messages: [
            {
              role: "system",
              content: [
                "You explain a procurement quote ranking to a busy buyer.",
                "Return ONLY JSON with keys: summary (two sentences at most), reasons (array of {quoteId, reason}).",
                "Keep every sentence under 25 words. One idea per sentence.",
                "Use ONLY numbers and facts supplied in the input. Never invent a price, date, rating, or vendor fact.",
                "Prices are in kobo; convert to NGN by dividing by 100. Write amounts with the ₦ symbol.",
                "Mention only the top 3 quotes and give one short line for each flagged quote.",
                "Write plain English for a non-technical buyer. Never mention JSON keys, field names, or scoreBps.",
                "The summary must name the winning vendor and the main tradeoff. Never say that the ranking is unchanged.",
                "Explain the ranking that was supplied; do not change it.",
              ].join("\n"),
            },
            {
              role: "user",
              content: JSON.stringify({
                ranking: recommendation.ranked.map((quote) => ({
                  quoteId: quote.quoteId,
                  rank: quote.rank,
                  vendorName: quote.vendorName,
                  totalPriceCents: quote.totalPriceCents,
                  deliveryDate: quote.deliveryDate,
                  quantityOffered: quote.quantityOffered,
                  warrantyMonths: quote.warrantyMonths,
                  flags: quote.flags,
                  scoreBps: quote.scoreBps,
                  breakdown: quote.breakdown,
                })),
              }),
            },
          ],
          temperature: 0,
          max_tokens: 1_200,
          response_format: { type: "json_object" },
        }),
        signal: AbortSignal.timeout(AI_TIMEOUT_MS),
      });

      if (!response.ok) {
        const detail = (await response.text()).slice(0, 300);
        throw new Error(`Vultr inference returned ${response.status}: ${detail}`);
      }

      const payload = (await response.json()) as {
        choices?: Array<{ message?: { content?: string | null } }>;
      };
      const content = payload.choices?.at(0)?.message?.content?.trim();

      if (!content) {
        throw new Error("Vultr inference returned an empty message.");
      }

      return content;
    },
    catch: (cause) =>
      new AiError({
        operation: "explain recommendation",
        cause,
        retryable: true,
      }),
  });

export const explainRecommendation = async (
  input: Recommendation,
): Promise<ExplainedRecommendation> => {
  const startedAt = Date.now();
  const recommendation: Recommendation = {
    ...input,
    ranked: input.ranked.map((quote) => ({ ...quote })),
  };
  const aiMessage = await callVultr(recommendation);

  if (aiMessage.isErr()) {
    fallbackReasonFor(recommendation);

    return {
      recommendation,
      usedFallback: true,
      fallbackReason: aiMessage.error.message,
      latencyMs: Date.now() - startedAt,
    };
  }

  const json = Result.try({
    try: () => JSON.parse(aiMessage.value) as unknown,
    catch: (cause) =>
      new AiError({
        operation: "parse recommendation JSON",
        cause,
        retryable: false,
      }),
  });

  if (json.isErr()) {
    fallbackReasonFor(recommendation);

    return {
      recommendation,
      usedFallback: true,
      fallbackReason: json.error.message,
      latencyMs: Date.now() - startedAt,
    };
  }

  const parsed = responseSchema.safeParse(json.value);

  if (!parsed.success) {
    fallbackReasonFor(recommendation);

    return {
      recommendation,
      usedFallback: true,
      fallbackReason: "AI explanation did not match the expected shape.",
      latencyMs: Date.now() - startedAt,
    };
  }

  const reasons = new Map(
    parsed.data.reasons.map((entry) => [entry.quoteId, entry.reason] as const),
  );

  for (const quote of recommendation.ranked) {
    quote.aiReason = reasons.get(quote.quoteId) ?? null;
  }

  fallbackReasonFor(recommendation);
  recommendation.reason = parsed.data.summary;

  return {
    recommendation,
    usedFallback: false,
    fallbackReason: null,
    latencyMs: Date.now() - startedAt,
  };
};
