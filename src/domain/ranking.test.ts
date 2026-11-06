import { describe, expect, it } from "vite-plus/test";
import { rankQuotes, type RankingQuote, type RankingRequest } from "./ranking";

const request: RankingRequest = {
  quantity: 20,
  neededBy: "2026-11-20",
  priority: "balanced",
  budgetCents: 100_000,
  deadlineAt: new Date("2026-11-10T12:00:00Z"),
};

const quote = (overrides: Partial<RankingQuote> & Pick<RankingQuote, "id">): RankingQuote => ({
  vendorId: `vendor-${overrides.id}`,
  vendorName: `Vendor ${overrides.id}`,
  totalPriceCents: 80_000,
  deliveryDate: "2026-11-15",
  quantityOffered: 20,
  warrantyMonths: 12,
  firstSubmittedAt: new Date("2026-11-08T12:00:00Z"),
  onTimeCount: 9,
  lateCount: 1,
  invitationCount: 10,
  responseCount: 9,
  ...overrides,
});

describe("rankQuotes", () => {
  it("returns no winner when there are no quotes", () => {
    const result = rankQuotes({ request, quotes: [] });

    expect(result.ranked).toEqual([]);
    expect(result.winner).toBeNull();
    expect(result.quoteCount).toBe(0);
  });

  it("ranks a cheaper, faster, reliable quote first", () => {
    const result = rankQuotes({
      request,
      quotes: [
        quote({ id: "slow", totalPriceCents: 76_000, deliveryDate: "2026-11-19" }),
        quote({
          id: "fast",
          totalPriceCents: 80_000,
          deliveryDate: "2026-11-13",
          onTimeCount: 10,
          lateCount: 0,
        }),
        quote({ id: "pricey", totalPriceCents: 95_000, deliveryDate: "2026-11-16" }),
      ],
    });

    expect(result.winner?.quoteId).toBe("fast");
    expect(result.ranked.map((entry) => entry.rank)).toEqual([1, 2, 3]);
    expect(result.ranked.every((entry) => entry.tier === 1)).toBe(true);
  });

  it("ranks quotes that miss the needed-by date below valid quotes", () => {
    const result = rankQuotes({
      request,
      quotes: [
        quote({ id: "late", totalPriceCents: 50_000, deliveryDate: "2026-11-25" }),
        quote({ id: "valid", totalPriceCents: 90_000, deliveryDate: "2026-11-18" }),
      ],
    });

    expect(result.winner?.quoteId).toBe("valid");
    expect(result.ranked[1]?.quoteId).toBe("late");
    expect(result.ranked[1]?.flags).toContain("late_delivery");
  });

  it("flags partial quantities and over-budget quotes", () => {
    const result = rankQuotes({
      request,
      quotes: [
        quote({
          id: "partial",
          quantityOffered: 5,
          totalPriceCents: 120_000,
          deliveryDate: "2026-11-12",
        }),
      ],
    });

    expect(result.ranked[0]?.flags).toEqual(
      expect.arrayContaining(["partial_quantity", "over_budget"]),
    );
    expect(result.ranked[0]?.tier).toBe(2);
    expect(result.winner).toBeNull();
  });

  it("changes the winner when the priority mode changes", () => {
    const quotes = [
      quote({ id: "cheap", totalPriceCents: 60_000, deliveryDate: "2026-11-19" }),
      quote({
        id: "quick",
        totalPriceCents: 99_000,
        deliveryDate: "2026-11-11",
        onTimeCount: 10,
        lateCount: 0,
      }),
    ];

    const cheapest = rankQuotes({ request: { ...request, priority: "cost" }, quotes });
    const fastest = rankQuotes({ request: { ...request, priority: "speed" }, quotes });

    expect(cheapest.winner?.quoteId).toBe("cheap");
    expect(fastest.winner?.quoteId).toBe("quick");
  });

  it("breaks ties with the earlier submission", () => {
    const result = rankQuotes({
      request,
      quotes: [
        quote({ id: "b", firstSubmittedAt: new Date("2026-11-09T09:00:00Z") }),
        quote({ id: "a", firstSubmittedAt: new Date("2026-11-08T09:00:00Z") }),
      ],
    });

    expect(result.winner?.quoteId).toBe("a");
  });

  it("gives the same ranking for the same input", () => {
    const quotes = [
      quote({ id: "one" }),
      quote({ id: "two", totalPriceCents: 81_000 }),
      quote({ id: "three", deliveryDate: "2026-11-14" }),
    ];

    const first = rankQuotes({ request, quotes });
    const second = rankQuotes({ request, quotes: [...quotes] });

    expect(second.ranked.map((entry) => entry.quoteId)).toEqual(
      first.ranked.map((entry) => entry.quoteId),
    );
    expect(second.ranked.map((entry) => entry.scoreBps)).toEqual(
      first.ranked.map((entry) => entry.scoreBps),
    );
  });
});
