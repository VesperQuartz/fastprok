import type { Recommendation, RequestPriority, RankedQuote } from "@/repo/schema";

const DAY_MS = 24 * 60 * 60 * 1_000;

export type RankingQuote = {
  id: string;
  vendorId: string;
  vendorName: string;
  totalPriceCents: number;
  deliveryDate: string;
  quantityOffered: number;
  warrantyMonths: number;
  firstSubmittedAt: Date;
  onTimeCount: number;
  lateCount: number;
  invitationCount: number;
  responseCount: number;
};

export type RankingRequest = {
  quantity: number;
  neededBy: string;
  priority: RequestPriority;
  budgetCents: number | null;
  deadlineAt: Date;
};

const WEIGHTS: Record<
  RequestPriority,
  { cost: number; delivery: number; reliability: number; warranty: number }
> = {
  balanced: { cost: 0.35, delivery: 0.3, reliability: 0.3, warranty: 0.05 },
  cost: { cost: 0.6, delivery: 0.15, reliability: 0.2, warranty: 0.05 },
  speed: { cost: 0.15, delivery: 0.6, reliability: 0.2, warranty: 0.05 },
  reliability: { cost: 0.15, delivery: 0.2, reliability: 0.6, warranty: 0.05 },
};

const ratio = (numerator: number, denominator: number, fallback: number) =>
  denominator === 0 ? fallback : numerator / denominator;

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

const quoteReliability = (quote: RankingQuote) =>
  ratio(quote.onTimeCount, quote.onTimeCount + quote.lateCount, 0.7) * 0.65 +
  ratio(quote.responseCount, quote.invitationCount, 0.7) * 0.35;

const quoteFlags = (quote: RankingQuote, request: RankingRequest) => {
  const flags: string[] = [];

  if (quote.quantityOffered < request.quantity) {
    flags.push("partial_quantity");
  }

  if (quote.deliveryDate > request.neededBy) {
    flags.push("late_delivery");
  }

  if (request.budgetCents !== null && quote.totalPriceCents > request.budgetCents) {
    flags.push("over_budget");
  }

  if (quote.firstSubmittedAt.getTime() > request.deadlineAt.getTime()) {
    flags.push("late_submission");
  }

  return flags;
};

const meetsHardCriteria = (quote: RankingQuote, request: RankingRequest) =>
  quote.quantityOffered >= request.quantity &&
  quote.deliveryDate <= request.neededBy &&
  quote.firstSubmittedAt.getTime() <= request.deadlineAt.getTime();

const summarize = (ranked: RankedQuote[], request: RankingRequest) => {
  if (ranked.length === 0) {
    return `No quotes were received for ${request.quantity} units needed by ${request.neededBy}.`;
  }

  const winner = ranked[0];
  const missing = ranked.filter((quote) => quote.tier > 1).length;

  return [
    `Ranked ${ranked.length} quote${ranked.length === 1 ? "" : "s"} for ${request.quantity} units needed by ${request.neededBy}.`,
    `Top pick: ${winner.vendorName} at ${(winner.totalPriceCents / 100).toFixed(2)} USD, delivering ${winner.deliveryDate}.`,
    missing > 0
      ? `${missing} quote${missing === 1 ? "" : "s"} missed the quantity or delivery requirement.`
      : "Every quote meets the quantity and delivery requirements.",
  ].join(" ");
};

export const rankQuotes = ({
  request,
  quotes,
}: {
  request: RankingRequest;
  quotes: RankingQuote[];
}): Recommendation => {
  const valid = quotes.filter((quote) => meetsHardCriteria(quote, request));
  const scoringSet = valid.length > 0 ? valid : quotes;
  const weights = WEIGHTS[request.priority];
  const costs = scoringSet.map((quote) => quote.totalPriceCents);
  const deliveryTimes = scoringSet.map((quote) => Date.parse(quote.deliveryDate));
  const costMin = Math.min(...costs);
  const costMax = Math.max(...costs);
  const timeMin = Math.min(...deliveryTimes);
  const timeMax = Math.max(...deliveryTimes);

  const scored = quotes.map((quote) => {
    const flags = quoteFlags(quote, request);
    const validQuote = meetsHardCriteria(quote, request);
    const cost =
      costMax === costMin ? 1 : clamp01((costMax - quote.totalPriceCents) / (costMax - costMin));
    const deliveryTime = Date.parse(quote.deliveryDate);
    const delivery =
      timeMax === timeMin ? 1 : clamp01((timeMax - deliveryTime) / (timeMax - timeMin));
    const reliability = quoteReliability(quote);
    const warranty = clamp01(quote.warrantyMonths / 24);
    const score =
      cost * weights.cost +
      delivery * weights.delivery +
      reliability * weights.reliability +
      warranty * weights.warranty;

    return {
      quote,
      flags,
      validQuote,
      score,
      breakdown: {
        cost: Math.round(cost * 10_000) / 10_000,
        delivery: Math.round(delivery * 10_000) / 10_000,
        reliability: Math.round(reliability * 10_000) / 10_000,
        warranty: Math.round(warranty * 10_000) / 10_000,
      },
    };
  });

  scored.sort(
    (left, right) =>
      Number(right.validQuote) - Number(left.validQuote) ||
      right.score - left.score ||
      left.quote.firstSubmittedAt.getTime() - right.quote.firstSubmittedAt.getTime() ||
      left.quote.id.localeCompare(right.quote.id),
  );

  const ranked: RankedQuote[] = scored.map((entry, index) => ({
    quoteId: entry.quote.id,
    vendorId: entry.quote.vendorId,
    vendorName: entry.quote.vendorName,
    rank: index + 1,
    tier: entry.validQuote ? 1 : 2,
    scoreBps: Math.round(entry.score * 10_000),
    totalPriceCents: entry.quote.totalPriceCents,
    deliveryDate: entry.quote.deliveryDate,
    quantityOffered: entry.quote.quantityOffered,
    warrantyMonths: entry.quote.warrantyMonths,
    flags: entry.flags,
    breakdown: entry.breakdown,
  }));

  return {
    ranked,
    winner: ranked.find((quote) => quote.tier === 1) ?? null,
    generatedAt: new Date().toISOString(),
    reason: summarize(ranked, request),
    quoteCount: ranked.length,
  };
};

export const deliveryDaysAfter = (deliveryDate: string, from = new Date()) =>
  Math.max(0, Math.ceil((Date.parse(`${deliveryDate}T23:59:59Z`) - from.getTime()) / DAY_MS));
