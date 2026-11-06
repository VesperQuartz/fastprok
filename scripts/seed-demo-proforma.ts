import { and, desc, eq } from "drizzle-orm";
import { db, pool } from "@/lib/db";
import { putObject, removeObject } from "@/lib/storage";
import { agentActions, quoteDocuments, quotes, requests, vendors } from "@/repo/schema";

const fixture = Bun.file("scripts/fixtures/demo-proforma.pdf");
const body = await fixture.arrayBuffer();

const rows = await db
  .select({
    quoteId: quotes.id,
    quoteUpdatedAt: quotes.updatedAt,
    requestId: requests.id,
    requestTitle: requests.title,
    vendorName: vendors.name,
    submittedByUserId: quotes.submittedByUserId,
  })
  .from(quotes)
  .innerJoin(requests, eq(quotes.requestId, requests.id))
  .innerJoin(vendors, eq(quotes.vendorId, vendors.id))
  .where(and(eq(requests.title, "USB-C docking stations"), eq(vendors.name, "Yaba Gadgets")))
  .orderBy(desc(quotes.updatedAt))
  .limit(1);

const target = rows.at(0);

if (!target) {
  console.error("Could not find the Yaba Gadgets quote for USB-C docking stations.");
  await pool.end();
  process.exit(1);
}

const storageKey = `quotes/${target.quoteId}/proforma-demo.pdf`;
const uploaded = await putObject({
  key: storageKey,
  body,
  contentType: "application/pdf",
  fileName: "Yaba-Gadgets-Proforma-Invoice.pdf",
});

if (uploaded.isErr()) {
  console.error("Could not upload the demo proforma.", uploaded.error);
  await pool.end();
  process.exit(1);
}

const existing = await db
  .select({ storageKey: quoteDocuments.storageKey })
  .from(quoteDocuments)
  .where(eq(quoteDocuments.quoteId, target.quoteId))
  .limit(1);
const previousKey = existing.at(0)?.storageKey ?? null;

await db
  .insert(quoteDocuments)
  .values({
    quoteId: target.quoteId,
    storageKey,
    fileName: "Yaba-Gadgets-Proforma-Invoice.pdf",
    mimeType: "application/pdf",
    sizeBytes: fixture.size,
    uploadedByUserId: target.submittedByUserId,
  })
  .onConflictDoUpdate({
    target: quoteDocuments.quoteId,
    set: {
      storageKey,
      fileName: "Yaba-Gadgets-Proforma-Invoice.pdf",
      mimeType: "application/pdf",
      sizeBytes: fixture.size,
      updatedAt: new Date(),
    },
  });

if (!previousKey) {
  await db.insert(agentActions).values({
    requestId: target.requestId,
    actorType: "human",
    actorUserId: target.submittedByUserId,
    action: "quote.proforma_uploaded",
    detail: {
      quoteId: target.quoteId,
      vendorName: target.vendorName,
      fileName: "Yaba-Gadgets-Proforma-Invoice.pdf",
      sizeBytes: fixture.size,
    },
  });
}

if (previousKey && previousKey !== storageKey) {
  const removed = await removeObject(previousKey);

  if (removed.isErr()) {
    console.error("Could not remove the previous demo proforma.", removed.error);
  }
}

console.log(
  `Seeded proforma invoice for ${target.vendorName} on ${target.requestTitle} (${target.quoteId}).`,
);

await pool.end();
