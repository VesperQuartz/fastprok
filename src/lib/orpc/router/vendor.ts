import { z } from "zod";
import { submitQuote } from "@/domain/quote-submit";
import { getVendorRequest, listVendorInbox } from "@/domain/request-view";
import { vendorProcedure } from "@/lib/orpc/procedures";
import { unwrapResult } from "@/lib/result/orpc";

const requestIdInput = z.object({ requestId: z.uuid() });

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const quoteInput = requestIdInput.extend({
  unitPriceCents: z.number().int().min(1).max(1_000_000_000),
  quantityOffered: z.number().int().min(1).max(100_000),
  deliveryDate: isoDate,
  warrantyMonths: z.number().int().min(0).max(120).default(0),
  validUntil: isoDate.nullable().default(null),
  notes: z.string().trim().max(2_000).nullable().default(null),
});

export const inbox = vendorProcedure
  .route({ method: "GET", path: "/vendor/requests" })
  .handler(async ({ context }) => unwrapResult(listVendorInbox(context.actor)));

export const get = vendorProcedure
  .route({ method: "GET", path: "/vendor/requests/{requestId}" })
  .input(requestIdInput)
  .handler(async ({ input, context }) =>
    unwrapResult(getVendorRequest(context.actor, input.requestId)),
  );

export const submit = vendorProcedure
  .route({ method: "POST", path: "/vendor/requests/{requestId}/quote" })
  .input(quoteInput)
  .handler(async ({ input, context }) => {
    const { requestId, ...quote } = input;

    return unwrapResult(submitQuote(context.actor, { requestId, ...quote }));
  });

export const vendorProcedures = {
  inbox,
  get,
  submit,
};
