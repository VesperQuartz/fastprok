import { categoryLabel, type CategoryId } from "./categories";

const DAY_MS = 24 * 60 * 60 * 1_000;

export type VendorCandidate = {
  id: string;
  name: string;
  contactEmail: string;
  categories: string[];
  regions: string[];
  leadTimeDays: number;
  onTimeCount: number;
  lateCount: number;
  invitationCount: number;
  responseCount: number;
};

export type VendorMatch = {
  vendor: VendorCandidate;
  score: number;
  reasons: string[];
};

const ratio = (numerator: number, denominator: number, fallback: number) =>
  denominator === 0 ? fallback : numerator / denominator;

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

const regionMatches = (regions: string[], deliveryRegion: string) => {
  const wanted = deliveryRegion.toLowerCase();

  return regions.some((region) => {
    const candidate = region.toLowerCase();

    return candidate === wanted || candidate === "nigeria";
  });
};

const daysUntil = (neededBy: string) =>
  Math.max(0, Math.ceil((Date.parse(`${neededBy}T23:59:59Z`) - Date.now()) / DAY_MS));

export const matchVendors = ({
  vendors,
  category,
  deliveryRegion,
  neededBy,
  limit,
}: {
  vendors: VendorCandidate[];
  category: CategoryId;
  deliveryRegion: string;
  neededBy: string;
  limit: number;
}): VendorMatch[] => {
  const availableDays = daysUntil(neededBy);

  const eligible = vendors.filter(
    (vendor) =>
      vendor.categories.includes(category) &&
      regionMatches(vendor.regions, deliveryRegion) &&
      vendor.leadTimeDays <= availableDays,
  );

  const scored = eligible.map((vendor) => {
    const reliability = ratio(vendor.onTimeCount, vendor.onTimeCount + vendor.lateCount, 0.7);
    const responseRate = ratio(vendor.responseCount, vendor.invitationCount, 0.7);
    const leadTimeFit = clamp01(1 - vendor.leadTimeDays / Math.max(availableDays, 1));
    const score =
      Math.round((reliability * 0.45 + responseRate * 0.25 + leadTimeFit * 0.3) * 10_000) / 10_000;

    const deliveryHistory = vendor.onTimeCount + vendor.lateCount;
    const reasons = [
      `sells ${categoryLabel(category)}`,
      `delivers to ${deliveryRegion}`,
      `${vendor.leadTimeDays}-day lead time fits the ${availableDays}-day window`,
      deliveryHistory === 0
        ? "no delivery history yet"
        : `${vendor.onTimeCount}/${deliveryHistory} deliveries on time`,
      vendor.invitationCount === 0
        ? "new to the marketplace"
        : `${vendor.responseCount}/${vendor.invitationCount} past invitations answered`,
    ];

    return { vendor, score, reasons };
  });

  return scored
    .sort(
      (left, right) =>
        right.score - left.score ||
        left.vendor.leadTimeDays - right.vendor.leadTimeDays ||
        left.vendor.name.localeCompare(right.vendor.name),
    )
    .slice(0, limit);
};
