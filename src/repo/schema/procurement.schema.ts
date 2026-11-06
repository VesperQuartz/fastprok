import { sql } from "drizzle-orm";
import {
  boolean,
  char,
  date,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { user } from "./auth.schema";

export const membershipRole = pgEnum("membership_role", ["requester", "approver", "both"]);

export const requestStatus = pgEnum("request_status", [
  "draft",
  "quoting",
  "awaiting_approval",
  "approved",
  "cancelled",
  "no_quotes",
  "needs_human",
]);

export const requestPriority = pgEnum("request_priority", [
  "balanced",
  "cost",
  "speed",
  "reliability",
]);

export const invitationStatus = pgEnum("invitation_status", [
  "invited",
  "responded",
  "declined",
  "expired",
]);

export const quoteStatus = pgEnum("quote_status", [
  "submitted",
  "withdrawn",
  "won",
  "lost",
  "expired",
]);

export const actorType = pgEnum("actor_type", ["human", "agent", "system"]);

export const emailStatus = pgEnum("email_status", [
  "pending",
  "sending",
  "sent",
  "failed",
  "deferred",
]);

export type RequestPriority = (typeof requestPriority.enumValues)[number];
export type RequestStatus = (typeof requestStatus.enumValues)[number];
export type MembershipRole = (typeof membershipRole.enumValues)[number];

export type ParsedRequest = {
  title: string;
  category: string;
  quantity: number;
  unit: string;
  deliveryRegion: string;
  neededBy: string;
  budgetCents: number | null;
  currency: string;
  priority: RequestPriority;
  notes: string | null;
  confidence: number;
  usedFallback: boolean;
};

export type AiMeta = {
  model: string;
  latencyMs: number;
  fallbackReason: string | null;
  promptVersion: string;
};

export type RankedQuote = {
  quoteId: string;
  vendorId: string;
  vendorName: string;
  rank: number;
  tier: number;
  scoreBps: number;
  totalPriceCents: number;
  deliveryDate: string;
  quantityOffered: number;
  warrantyMonths: number;
  flags: string[];
  breakdown: {
    cost: number;
    delivery: number;
    reliability: number;
    warranty: number;
  };
};

export type Recommendation = {
  ranked: RankedQuote[];
  winner: RankedQuote | null;
  generatedAt: string;
  reason: string;
  quoteCount: number;
};

export type QuoteSnapshot = {
  unitPriceCents: number;
  totalPriceCents: number;
  quantityOffered: number;
  deliveryDate: string;
  warrantyMonths: number;
  validUntil: string | null;
  notes: string | null;
  version: number;
};

export type AgentRunSummary = {
  requestsChecked: number;
  remindersSent: number;
  requestsWidened: number;
  requestsRanked: number;
  escalations: number;
  emailsSent: number;
  emailsDeferred: number;
};

export const organizations = pgTable("organizations", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const organizationMembers = pgTable(
  "organization_members",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    role: membershipRole("role").notNull().default("requester"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("organization_members_org_user_uidx").on(table.organizationId, table.userId),
    index("organization_members_user_idx").on(table.userId),
  ],
);

export const vendors = pgTable("vendors", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  contactEmail: text("contact_email").notNull(),
  categories: text("categories")
    .array()
    .notNull()
    .default(sql`'{}'::text[]`),
  regions: text("regions")
    .array()
    .notNull()
    .default(sql`'{}'::text[]`),
  leadTimeDays: integer("lead_time_days").notNull().default(7),
  active: boolean("active").notNull().default(true),
  onTimeCount: integer("on_time_count").notNull().default(0),
  lateCount: integer("late_count").notNull().default(0),
  invitationCount: integer("invitation_count").notNull().default(0),
  responseCount: integer("response_count").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const vendorContacts = pgTable(
  "vendor_contacts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    vendorId: uuid("vendor_id")
      .notNull()
      .references(() => vendors.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("vendor_contacts_vendor_user_uidx").on(table.vendorId, table.userId),
    index("vendor_contacts_user_idx").on(table.userId),
  ],
);

export const requests = pgTable(
  "requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    createdByUserId: text("created_by_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    title: text("title").notNull(),
    rawText: text("raw_text").notNull(),
    category: text("category").notNull(),
    quantity: integer("quantity").notNull(),
    unit: text("unit").notNull().default("unit"),
    deliveryRegion: text("delivery_region").notNull(),
    neededBy: date("needed_by", { mode: "string" }).notNull(),
    budgetCents: integer("budget_cents"),
    currency: char("currency", { length: 3 }).notNull().default("USD"),
    priority: requestPriority("priority").notNull().default("balanced"),
    status: requestStatus("status").notNull().default("draft"),
    deadlineAt: timestamp("deadline_at", { withTimezone: true }).notNull(),
    widenedAt: timestamp("widened_at", { withTimezone: true }),
    parsed: jsonb("parsed").$type<ParsedRequest>(),
    aiMeta: jsonb("ai_meta").$type<AiMeta>(),
    recommendation: jsonb("recommendation").$type<Recommendation>(),
    rankedAt: timestamp("ranked_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("requests_organization_idx").on(table.organizationId),
    index("requests_status_idx").on(table.status),
    index("requests_deadline_idx").on(table.deadlineAt),
  ],
);

export const invitations = pgTable(
  "invitations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    requestId: uuid("request_id")
      .notNull()
      .references(() => requests.id, { onDelete: "cascade" }),
    vendorId: uuid("vendor_id")
      .notNull()
      .references(() => vendors.id, { onDelete: "cascade" }),
    status: invitationStatus("status").notNull().default("invited"),
    invitedAt: timestamp("invited_at", { withTimezone: true }).defaultNow().notNull(),
    respondedAt: timestamp("responded_at", { withTimezone: true }),
    reminderCount: integer("reminder_count").notNull().default(0),
    lastRemindedAt: timestamp("last_reminded_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("invitations_request_vendor_uidx").on(table.requestId, table.vendorId),
    index("invitations_vendor_idx").on(table.vendorId),
  ],
);

export const quotes = pgTable(
  "quotes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    requestId: uuid("request_id")
      .notNull()
      .references(() => requests.id, { onDelete: "cascade" }),
    vendorId: uuid("vendor_id")
      .notNull()
      .references(() => vendors.id, { onDelete: "cascade" }),
    submittedByUserId: text("submitted_by_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    unitPriceCents: integer("unit_price_cents").notNull(),
    totalPriceCents: integer("total_price_cents").notNull(),
    quantityOffered: integer("quantity_offered").notNull(),
    deliveryDate: date("delivery_date", { mode: "string" }).notNull(),
    warrantyMonths: integer("warranty_months").notNull().default(0),
    validUntil: date("valid_until", { mode: "string" }),
    notes: text("notes"),
    status: quoteStatus("status").notNull().default("submitted"),
    firstSubmittedAt: timestamp("first_submitted_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex("quotes_request_vendor_uidx").on(table.requestId, table.vendorId),
    index("quotes_request_idx").on(table.requestId),
    index("quotes_vendor_idx").on(table.vendorId),
  ],
);

export const quoteRevisions = pgTable(
  "quote_revisions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    quoteId: uuid("quote_id")
      .notNull()
      .references(() => quotes.id, { onDelete: "cascade" }),
    version: integer("version").notNull(),
    snapshot: jsonb("snapshot").$type<QuoteSnapshot>().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [uniqueIndex("quote_revisions_quote_version_uidx").on(table.quoteId, table.version)],
);

export const agentRuns = pgTable("agent_runs", {
  id: uuid("id").primaryKey().defaultRandom(),
  status: text("status").notNull().default("running"),
  summary: jsonb("summary").$type<AgentRunSummary>(),
  error: text("error"),
  startedAt: timestamp("started_at", { withTimezone: true }).defaultNow().notNull(),
  finishedAt: timestamp("finished_at", { withTimezone: true }),
});

export const agentActions = pgTable(
  "agent_actions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    runId: uuid("run_id").references(() => agentRuns.id, { onDelete: "set null" }),
    requestId: uuid("request_id").references(() => requests.id, { onDelete: "set null" }),
    actorType: actorType("actor_type").notNull().default("system"),
    actorUserId: text("actor_user_id").references(() => user.id, { onDelete: "set null" }),
    action: text("action").notNull(),
    detail: jsonb("detail").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("agent_actions_request_idx").on(table.requestId),
    index("agent_actions_run_idx").on(table.runId),
    index("agent_actions_created_idx").on(table.createdAt),
  ],
);

export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    eventKey: text("event_key").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    requestId: uuid("request_id").references(() => requests.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    title: text("title").notNull(),
    body: text("body").notNull(),
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("notifications_event_key_uidx").on(table.eventKey),
    index("notifications_user_created_idx").on(table.userId, table.createdAt),
  ],
);

export const emailLog = pgTable(
  "email_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    eventKey: text("event_key").notNull(),
    recipientUserId: text("recipient_user_id").references(() => user.id, { onDelete: "set null" }),
    intendedToEmail: text("intended_to_email").notNull(),
    toEmail: text("to_email").notNull(),
    subject: text("subject").notNull(),
    html: text("html").notNull(),
    status: emailStatus("status").notNull().default("pending"),
    attempts: integer("attempts").notNull().default(0),
    lastError: text("last_error"),
    scheduledAt: timestamp("scheduled_at", { withTimezone: true }).defaultNow().notNull(),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex("email_log_event_key_uidx").on(table.eventKey),
    index("email_log_status_scheduled_idx").on(table.status, table.scheduledAt),
  ],
);
