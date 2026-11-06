import { Result } from "better-result";
import { z } from "zod";
import { serverEnv } from "@/env/server";
import { AiError } from "@/lib/result/errors";
import type { AiMeta, RequestPriority } from "@/repo/schema";
import { CATEGORY_IDS, categoryFromText, type CategoryId } from "./categories";

const PROMPT_VERSION = "request-parse-v1";
const AI_TIMEOUT_MS = 25_000;
const KNOWN_REGIONS = [
  "Lagos",
  "Abuja",
  "Port Harcourt",
  "Kano",
  "Ibadan",
  "Nigeria",
  "Ghana",
  "Kenya",
  "Europe",
];

export type RequestParseOverrides = {
  title?: string;
  category?: CategoryId;
  quantity?: number;
  unit?: string;
  deliveryRegion?: string;
  neededBy?: string;
  budgetCents?: number | null;
  currency?: string;
  priority?: RequestPriority;
};

export type RequestDraft = {
  title: string | null;
  category: CategoryId | null;
  quantity: number | null;
  unit: string;
  deliveryRegion: string | null;
  neededBy: string | null;
  budgetCents: number | null;
  currency: string;
  priority: RequestPriority;
  notes: string | null;
  confidence: number;
  usedFallback: boolean;
  aiMeta: AiMeta;
};

type AiFields = {
  title: string | null;
  category: CategoryId | null;
  quantity: number | null;
  unit: string | null;
  deliveryRegion: string | null;
  neededBy: string | null;
  budgetCents: number | null;
  currency: string | null;
  priority: RequestPriority | null;
  notes: string | null;
  confidence: number | null;
};

const aiFieldsSchema = z.object({
  title: z.string().trim().min(1).max(160).nullable().catch(null),
  category: z.enum(CATEGORY_IDS).nullable().catch(null),
  quantity: z.coerce.number().int().positive().nullable().catch(null),
  unit: z.string().trim().min(1).max(24).nullable().catch(null),
  deliveryRegion: z.string().trim().min(1).max(80).nullable().catch(null),
  neededBy: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable()
    .catch(null),
  budgetCents: z.coerce.number().int().nonnegative().nullable().catch(null),
  currency: z.string().trim().length(3).nullable().catch(null),
  priority: z.enum(["balanced", "cost", "speed", "reliability"]).nullable().catch(null),
  notes: z.string().trim().max(2_000).nullable().catch(null),
  confidence: z.coerce.number().min(0).max(1).nullable().catch(null),
});

const systemPrompt = () => {
  const today = new Date().toISOString().slice(0, 10);

  return [
    "You extract structured procurement request fields from a buyer's message.",
    "Return ONLY a JSON object. Do not wrap it in markdown.",
    `Today is ${today}. Categories: ${CATEGORY_IDS.join(", ")}.`,
    "Priority values: balanced, cost, speed, reliability.",
    "Use null for anything the buyer did not state. Never invent a quantity, date, budget, or region.",
    "Dates must use YYYY-MM-DD. The app uses Nigerian naira (NGN) only. Return budgetCents as an integer number of kobo (1 NGN = 100 kobo) and set currency to NGN.",
    "title should be a short item title, not a full sentence.",
    "confidence is a number from 0 to 1 describing how completely the message was understood.",
  ].join("\n");
};

const callVultr = async (rawText: string, overrides: RequestParseOverrides) =>
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
            { role: "system", content: systemPrompt() },
            {
              role: "user",
              content: JSON.stringify({ request: rawText, knownFields: overrides }),
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
        operation: "parse request",
        cause,
        retryable: true,
      }),
  });

const parseAiFields = (content: string) => {
  const json = Result.try({
    try: () => JSON.parse(content) as unknown,
    catch: (cause) =>
      new AiError({
        operation: "parse request JSON",
        cause,
        retryable: false,
      }),
  });

  if (json.isErr()) {
    return json;
  }

  const parsed = aiFieldsSchema.safeParse(json.value);

  if (!parsed.success) {
    return Result.err(
      new AiError({
        operation: "validate request JSON",
        cause: parsed.error,
        retryable: false,
      }),
    );
  }

  return Result.ok(parsed.data);
};

const addDays = (days: number) =>
  new Date(Date.now() + days * 24 * 60 * 60 * 1_000).toISOString().slice(0, 10);

const isFutureDate = (value: string) => value >= new Date().toISOString().slice(0, 10);

const heuristicsFromText = (text: string) => {
  const quantityMatch = text.match(
    /\b(\d{1,5})\s+(?:[a-z-]+\s+){0,3}(?:units?|pieces?|pcs?|boxes?|packs?|chairs?|mice|mouse|keyboards?|monitors?|laptops?|headsets?|webcams?|docks?|toners?|reams?|notebooks?|pens?)/i,
  );
  const isoDateMatch = text.match(/\b(20\d{2}-\d{2}-\d{2})\b/);
  const relativeDaysMatch = text.match(/\b(?:within|in|after)\s+(\d{1,3})\s+days?\b/i);
  const budgetMatch = text.match(
    /(?:budget|up to|max(?:imum)?(?: of)?)\s*(?:is|of|:)?\s*(?:around|about|approximately)?\s*(?:usd|\$|ngn|₦|naira)?\s*([\d,]+(?:\.\d{1,2})?)/i,
  );
  const lower = text.toLowerCase();
  const region = KNOWN_REGIONS.find((candidate) => lower.includes(candidate.toLowerCase())) ?? null;
  const firstSegment =
    text
      .split(/[\n.!?]/)
      .at(0)
      ?.trim() ?? "";

  return {
    title: firstSegment.length > 0 ? firstSegment.slice(0, 120) : null,
    category: categoryFromText(text),
    quantity: quantityMatch ? Number(quantityMatch[1]) : null,
    neededBy:
      isoDateMatch?.[1] ?? (relativeDaysMatch ? addDays(Number(relativeDaysMatch[1])) : null),
    deliveryRegion: region,
    budgetCents: budgetMatch ? Math.round(Number(budgetMatch[1].replaceAll(",", "")) * 100) : null,
  };
};

export const parseRequestDraft = async ({
  rawText,
  overrides,
}: {
  rawText: string;
  overrides: RequestParseOverrides;
}): Promise<RequestDraft> => {
  const startedAt = Date.now();
  const fallbackReasons: string[] = [];
  let fields: AiFields | null = null;

  const aiMessage = await callVultr(rawText, overrides);

  if (aiMessage.isErr()) {
    fallbackReasons.push(aiMessage.error.message);
  } else {
    const parsed = parseAiFields(aiMessage.value);

    if (parsed.isErr()) {
      fallbackReasons.push(parsed.error.message);
    } else {
      fields = parsed.value;
    }
  }

  const heuristics = heuristicsFromText(rawText);
  const aiNeededBy = fields?.neededBy ?? null;
  const proposedNeededBy = overrides.neededBy ?? aiNeededBy ?? heuristics.neededBy;
  const neededBy = proposedNeededBy && isFutureDate(proposedNeededBy) ? proposedNeededBy : null;
  const priority = overrides.priority ?? fields?.priority ?? "balanced";
  const currency = (overrides.currency ?? "NGN").toUpperCase();
  const usedFallback = fallbackReasons.length > 0;

  return {
    title: overrides.title ?? fields?.title ?? heuristics.title,
    category: overrides.category ?? fields?.category ?? heuristics.category,
    quantity: overrides.quantity ?? fields?.quantity ?? heuristics.quantity,
    unit: overrides.unit ?? fields?.unit ?? "unit",
    deliveryRegion: overrides.deliveryRegion ?? fields?.deliveryRegion ?? heuristics.deliveryRegion,
    neededBy,
    budgetCents: overrides.budgetCents ?? fields?.budgetCents ?? heuristics.budgetCents,
    currency,
    priority,
    notes: fields?.notes ?? null,
    confidence: fields?.confidence ?? (usedFallback ? 0.4 : 0.65),
    usedFallback,
    aiMeta: {
      model: serverEnv.VULTR_INFERENCE_MODEL,
      latencyMs: Date.now() - startedAt,
      fallbackReason: usedFallback ? fallbackReasons.join("; ") : null,
      promptVersion: PROMPT_VERSION,
    },
  };
};
