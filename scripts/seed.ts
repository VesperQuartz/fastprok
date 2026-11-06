import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { hashPassword } from "better-auth/crypto";
import { db, pool } from "@/lib/db";
import {
  account,
  organizationMembers,
  organizations,
  user,
  vendorContacts,
  vendors,
} from "@/repo/schema";

const DEMO_PASSWORD = "demo1234";

const ensureUser = async ({ name, email }: { name: string; email: string }) => {
  const existing = await db.select().from(user).where(eq(user.email, email)).limit(1);

  if (existing.at(0)) {
    return existing[0];
  }

  const userId = randomUUID();
  const password = await hashPassword(DEMO_PASSWORD);

  await db.insert(user).values({
    id: userId,
    name,
    email,
    emailVerified: true,
    role: "user",
  });

  await db.insert(account).values({
    id: randomUUID(),
    accountId: userId,
    providerId: "credential",
    userId,
    password,
    updatedAt: new Date(),
  });

  const created = await db.select().from(user).where(eq(user.id, userId)).limit(1);

  return created[0]!;
};

const ensureOrganization = async (name: string) => {
  const existing = await db
    .select()
    .from(organizations)
    .where(eq(organizations.name, name))
    .limit(1);

  if (existing.at(0)) {
    return existing[0];
  }

  const created = await db.insert(organizations).values({ name }).returning();

  return created[0]!;
};

const ensureMembership = async ({
  organizationId,
  userId,
  role,
}: {
  organizationId: string;
  userId: string;
  role: "requester" | "approver" | "both";
}) => {
  const existing = await db
    .select()
    .from(organizationMembers)
    .where(eq(organizationMembers.userId, userId))
    .limit(1);

  if (existing.at(0)) {
    return existing[0];
  }

  const created = await db
    .insert(organizationMembers)
    .values({ organizationId, userId, role })
    .returning();

  return created[0]!;
};

type VendorSeed = {
  name: string;
  contactEmail: string;
  categories: string[];
  regions: string[];
  leadTimeDays: number;
  onTimeCount: number;
  lateCount: number;
  invitationCount: number;
  responseCount: number;
  contact?: {
    name: string;
    email: string;
  };
};

const vendorSeeds: VendorSeed[] = [
  {
    name: "Lagos Office Supply",
    contactEmail: "lilbrown3000+vendor-a@gmail.com",
    categories: ["office-furniture", "office-supplies"],
    regions: ["Lagos", "Nigeria"],
    leadTimeDays: 7,
    onTimeCount: 8,
    lateCount: 1,
    invitationCount: 12,
    responseCount: 10,
    contact: { name: "Vendor A", email: "lilbrown3000+vendor-a@gmail.com" },
  },
  {
    name: "Abuja Ergonomics",
    contactEmail: "lilbrown3000+vendor-b@gmail.com",
    categories: ["office-furniture"],
    regions: ["Lagos", "Abuja", "Nigeria"],
    leadTimeDays: 10,
    onTimeCount: 5,
    lateCount: 2,
    invitationCount: 8,
    responseCount: 6,
    contact: { name: "Vendor B", email: "lilbrown3000+vendor-b@gmail.com" },
  },
  {
    name: "West Africa Interiors",
    contactEmail: "lilbrown3000+vendor-c@gmail.com",
    categories: ["office-furniture", "interiors"],
    regions: ["Lagos", "Nigeria"],
    leadTimeDays: 14,
    onTimeCount: 3,
    lateCount: 3,
    invitationCount: 6,
    responseCount: 4,
    contact: { name: "Vendor C", email: "lilbrown3000+vendor-c@gmail.com" },
  },
  {
    name: "Euro Chairs GmbH",
    contactEmail: "lilbrown3000+vendor-eu@gmail.com",
    categories: ["office-furniture"],
    regions: ["Europe"],
    leadTimeDays: 21,
    onTimeCount: 9,
    lateCount: 0,
    invitationCount: 10,
    responseCount: 9,
  },
];

const ensureVendor = async (seed: VendorSeed) => {
  const existing = await db.select().from(vendors).where(eq(vendors.name, seed.name)).limit(1);

  if (existing.at(0)) {
    return existing[0];
  }

  const created = await db
    .insert(vendors)
    .values({
      name: seed.name,
      contactEmail: seed.contactEmail,
      categories: seed.categories,
      regions: seed.regions,
      leadTimeDays: seed.leadTimeDays,
      onTimeCount: seed.onTimeCount,
      lateCount: seed.lateCount,
      invitationCount: seed.invitationCount,
      responseCount: seed.responseCount,
    })
    .returning();

  return created[0]!;
};

const ensureVendorContact = async ({ vendorId, userId }: { vendorId: string; userId: string }) => {
  const existing = await db
    .select()
    .from(vendorContacts)
    .where(eq(vendorContacts.userId, userId))
    .limit(1);

  if (existing.at(0)) {
    return;
  }

  await db.insert(vendorContacts).values({ vendorId, userId });
};

const buyer = await ensureUser({
  name: "Tunde Buyer",
  email: "lilbrown3000+buyer@gmail.com",
});
const approver = await ensureUser({
  name: "Ada Approver",
  email: "lilbrown3000+approver@gmail.com",
});
const organization = await ensureOrganization("Acme Manufacturing");

await ensureMembership({
  organizationId: organization.id,
  userId: buyer.id,
  role: "requester",
});
await ensureMembership({
  organizationId: organization.id,
  userId: approver.id,
  role: "approver",
});

for (const seed of vendorSeeds) {
  const vendor = await ensureVendor(seed);

  if (!seed.contact) {
    continue;
  }

  const contact = await ensureUser(seed.contact);
  await ensureVendorContact({ vendorId: vendor.id, userId: contact.id });
}

console.log("Demo data seeded.");
console.log("Buyer:    lilbrown3000+buyer@gmail.com / demo1234");
console.log("Approver: lilbrown3000+approver@gmail.com / demo1234");
console.log("Vendors:  lilbrown3000+vendor-a@gmail.com / demo1234");
console.log("          lilbrown3000+vendor-b@gmail.com / demo1234");
console.log("          lilbrown3000+vendor-c@gmail.com / demo1234");

await pool.end();
