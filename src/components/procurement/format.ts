export const formatMoney = (cents: number, currency = "USD") =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(cents / 100);

export const formatDate = (value: string) =>
  new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(`${value}T12:00:00Z`));

export const formatDateTime = (value: string) =>
  new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));

export const timeLeft = (value: string) => {
  const remaining = new Date(value).getTime() - Date.now();

  if (remaining <= 0) {
    return "deadline passed";
  }

  const minutes = Math.ceil(remaining / 60_000);

  if (minutes < 60) {
    return `${minutes} min left`;
  }

  const hours = Math.floor(minutes / 60);

  if (hours < 24) {
    return `${hours} hr ${minutes % 60} min left`;
  }

  return `${Math.ceil(hours / 24)} days left`;
};

const ACTION_LABELS: Record<string, string> = {
  "request.created": "Request created",
  "request.parsed": "AI parsed the request",
  "vendors.matched": "Vendors matched",
  "request.invited": "Vendors invited",
  "vendor.reminded": "Reminder sent to vendor",
  "vendors.widened": "Vendor pool widened",
  "quotes.ranked": "Quotes ranked",
  "request.no_quotes": "No quotes received",
  "quote.submitted": "Quote submitted",
  "quote.updated": "Quote updated",
  "quote.approved": "Quote approved",
};

export const actionLabel = (action: string) => ACTION_LABELS[action] ?? action;

const text = (value: unknown) => (typeof value === "string" ? value : null);
const count = (value: unknown) => (typeof value === "number" ? value : null);

export const describeAction = (action: string, detail: Record<string, unknown> | null) => {
  if (!detail) {
    return null;
  }

  if (action === "vendor.reminded") {
    const vendor = text(detail.vendorName);
    const reminderCount = count(detail.reminderCount);

    return vendor ? `${vendor}${reminderCount ? ` · reminder ${reminderCount}` : ""}` : null;
  }

  if (action === "quote.submitted" || action === "quote.updated") {
    const vendor = text(detail.vendorName);
    const total = count(detail.totalPriceCents);

    return [vendor, total !== null ? formatMoney(total) : null].filter(Boolean).join(" · ");
  }

  if (action === "vendors.widened") {
    const invited = Array.isArray(detail.invited) ? detail.invited.length : null;
    const deadline = text(detail.newDeadline);

    return [
      invited !== null ? `${invited} new vendor${invited === 1 ? "" : "s"}` : null,
      deadline ? `deadline ${formatDateTime(deadline)}` : null,
    ]
      .filter(Boolean)
      .join(" · ");
  }

  if (action === "quotes.ranked") {
    const quoteCount = count(detail.quoteCount);
    const valid = count(detail.validQuoteCount);

    return quoteCount !== null
      ? `${quoteCount} quote${quoteCount === 1 ? "" : "s"} · ${valid ?? 0} met every requirement`
      : null;
  }

  if (action === "request.parsed") {
    const fallback = detail.usedFallback === true;
    const latency = count(detail.latencyMs);

    return fallback
      ? "AI unavailable, heuristic fallback used"
      : latency !== null
        ? `AI structured the request in ${(latency / 1000).toFixed(1)}s`
        : null;
  }

  if (action === "request.invited") {
    const invited = count(detail.count);

    return invited !== null ? `${invited} vendor${invited === 1 ? "" : "s"}` : null;
  }

  if (action === "quote.approved") {
    const vendor = text(detail.vendorName);
    const note = text(detail.note);

    return [vendor, note].filter(Boolean).join(" · ");
  }

  return null;
};
