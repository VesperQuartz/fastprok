import { eq } from "drizzle-orm";
import { Result } from "better-result";
import type { CategoryId } from "@/domain/categories";
import { withTransaction } from "@/lib/result/database";
import type { AppError } from "@/lib/result/errors";
import { organizationMembers, organizations, vendorContacts, vendors } from "@/repo/schema";

export type ProvisionAccountInput = {
  accountType: "organization" | "vendor";
  accountName: string;
  categories: CategoryId[];
  regions: string[];
};

export type ProvisionedAccount = {
  kind: "buyer" | "vendor";
  name: string;
};

export const provisionAccount = async (
  userId: string,
  email: string,
  input: ProvisionAccountInput,
): Promise<Result<ProvisionedAccount, AppError>> =>
  withTransaction<ProvisionedAccount, AppError>("provision account", async (tx) => {
    const existingOrganization = await tx
      .select({ name: organizations.name })
      .from(organizationMembers)
      .innerJoin(organizations, eq(organizationMembers.organizationId, organizations.id))
      .where(eq(organizationMembers.userId, userId))
      .limit(1);

    if (existingOrganization.length > 0) {
      return Result.ok({ kind: "buyer", name: existingOrganization[0].name });
    }

    const existingVendor = await tx
      .select({ name: vendors.name })
      .from(vendorContacts)
      .innerJoin(vendors, eq(vendorContacts.vendorId, vendors.id))
      .where(eq(vendorContacts.userId, userId))
      .limit(1);

    if (existingVendor.length > 0) {
      return Result.ok({ kind: "vendor", name: existingVendor[0].name });
    }

    if (input.accountType === "organization") {
      const created = await tx
        .insert(organizations)
        .values({ name: input.accountName })
        .returning({ id: organizations.id, name: organizations.name });
      const organization = created.at(0);

      if (!organization) {
        throw new Error("Organization insert returned no row.");
      }

      await tx.insert(organizationMembers).values({
        organizationId: organization.id,
        userId,
        role: "both",
      });

      return Result.ok({ kind: "buyer", name: organization.name });
    }

    const created = await tx
      .insert(vendors)
      .values({
        name: input.accountName,
        contactEmail: email,
        categories: input.categories,
        regions: input.regions,
      })
      .returning({ id: vendors.id, name: vendors.name });
    const vendor = created.at(0);

    if (!vendor) {
      throw new Error("Vendor insert returned no row.");
    }

    await tx.insert(vendorContacts).values({
      vendorId: vendor.id,
      userId,
    });

    return Result.ok({ kind: "vendor", name: vendor.name });
  });
