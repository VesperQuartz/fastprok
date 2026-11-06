export const DEFAULT_CURRENCY = "NGN";

export const formatMoney = (minorUnits: number, currency = DEFAULT_CURRENCY) =>
  new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(minorUnits / 100);
