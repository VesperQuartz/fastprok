import { z } from "zod";
import { provisionAccount } from "@/domain/account-provision";
import { CATEGORY_IDS } from "@/domain/categories";
import { sessionProcedure } from "@/lib/orpc/procedures";
import { unwrapResult } from "@/lib/result/orpc";

const provisionInput = z
  .object({
    accountType: z.enum(["organization", "vendor"]),
    accountName: z.string().trim().min(2).max(120),
    categories: z.array(z.enum(CATEGORY_IDS)).max(3).default([]),
    regions: z.array(z.string().trim().min(1).max(40)).max(10).default([]),
  })
  .superRefine((value, context) => {
    if (value.accountType === "vendor" && value.categories.length === 0) {
      context.addIssue({
        code: "custom",
        path: ["categories"],
        message: "Pick at least one category.",
      });
    }

    if (value.accountType === "vendor" && value.regions.length === 0) {
      context.addIssue({
        code: "custom",
        path: ["regions"],
        message: "Add at least one delivery region.",
      });
    }
  });

export const provision = sessionProcedure
  .route({ method: "POST", path: "/account/provision" })
  .input(provisionInput)
  .handler(async ({ input, context }) =>
    unwrapResult(provisionAccount(context.user.id, context.user.email, input)),
  );

export default {
  provision,
};
