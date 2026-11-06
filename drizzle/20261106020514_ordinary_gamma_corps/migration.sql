CREATE TYPE "actor_type" AS ENUM('human', 'agent', 'system');--> statement-breakpoint
CREATE TYPE "email_status" AS ENUM('pending', 'sending', 'sent', 'failed', 'deferred');--> statement-breakpoint
CREATE TYPE "invitation_status" AS ENUM('invited', 'responded', 'declined', 'expired');--> statement-breakpoint
CREATE TYPE "membership_role" AS ENUM('requester', 'approver', 'both');--> statement-breakpoint
CREATE TYPE "quote_status" AS ENUM('submitted', 'withdrawn', 'won', 'lost', 'expired');--> statement-breakpoint
CREATE TYPE "request_priority" AS ENUM('balanced', 'cost', 'speed', 'reliability');--> statement-breakpoint
CREATE TYPE "request_status" AS ENUM('draft', 'quoting', 'awaiting_approval', 'approved', 'cancelled', 'no_quotes', 'needs_human');--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL UNIQUE,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	"impersonated_by" text
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY,
	"name" text NOT NULL,
	"email" text NOT NULL UNIQUE,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"role" text,
	"banned" boolean DEFAULT false,
	"ban_reason" text,
	"ban_expires" timestamp
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "agent_actions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"run_id" uuid,
	"request_id" uuid,
	"actor_type" "actor_type" DEFAULT 'system'::"actor_type" NOT NULL,
	"actor_user_id" text,
	"action" text NOT NULL,
	"detail" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "agent_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"status" text DEFAULT 'running' NOT NULL,
	"summary" jsonb,
	"error" text,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "email_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"event_key" text NOT NULL,
	"recipient_user_id" text,
	"intended_to_email" text NOT NULL,
	"to_email" text NOT NULL,
	"subject" text NOT NULL,
	"html" text NOT NULL,
	"status" "email_status" DEFAULT 'pending'::"email_status" NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"last_error" text,
	"scheduled_at" timestamp with time zone DEFAULT now() NOT NULL,
	"sent_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invitations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"request_id" uuid NOT NULL,
	"vendor_id" uuid NOT NULL,
	"status" "invitation_status" DEFAULT 'invited'::"invitation_status" NOT NULL,
	"invited_at" timestamp with time zone DEFAULT now() NOT NULL,
	"responded_at" timestamp with time zone,
	"reminder_count" integer DEFAULT 0 NOT NULL,
	"last_reminded_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"event_key" text NOT NULL,
	"user_id" text NOT NULL,
	"request_id" uuid,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organization_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"organization_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"role" "membership_role" DEFAULT 'requester'::"membership_role" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organizations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quote_revisions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"quote_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"snapshot" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quotes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"request_id" uuid NOT NULL,
	"vendor_id" uuid NOT NULL,
	"submitted_by_user_id" text NOT NULL,
	"unit_price_cents" integer NOT NULL,
	"total_price_cents" integer NOT NULL,
	"quantity_offered" integer NOT NULL,
	"delivery_date" date NOT NULL,
	"warranty_months" integer DEFAULT 0 NOT NULL,
	"valid_until" date,
	"notes" text,
	"status" "quote_status" DEFAULT 'submitted'::"quote_status" NOT NULL,
	"first_submitted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"organization_id" uuid NOT NULL,
	"created_by_user_id" text NOT NULL,
	"title" text NOT NULL,
	"raw_text" text NOT NULL,
	"category" text NOT NULL,
	"quantity" integer NOT NULL,
	"unit" text DEFAULT 'unit' NOT NULL,
	"delivery_region" text NOT NULL,
	"needed_by" date NOT NULL,
	"budget_cents" integer,
	"currency" char(3) DEFAULT 'USD' NOT NULL,
	"priority" "request_priority" DEFAULT 'balanced'::"request_priority" NOT NULL,
	"status" "request_status" DEFAULT 'draft'::"request_status" NOT NULL,
	"deadline_at" timestamp with time zone NOT NULL,
	"widened_at" timestamp with time zone,
	"parsed" jsonb,
	"ai_meta" jsonb,
	"recommendation" jsonb,
	"ranked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vendor_contacts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"vendor_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vendors" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"name" text NOT NULL,
	"contact_email" text NOT NULL,
	"categories" text[] DEFAULT '{}'::text[] NOT NULL,
	"regions" text[] DEFAULT '{}'::text[] NOT NULL,
	"lead_time_days" integer DEFAULT 7 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"on_time_count" integer DEFAULT 0 NOT NULL,
	"late_count" integer DEFAULT 0 NOT NULL,
	"invitation_count" integer DEFAULT 0 NOT NULL,
	"response_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "account_issuer_accountId_uidx" ON "account" ("account_id");--> statement-breakpoint
CREATE INDEX "account_userId_idx" ON "account" ("user_id");--> statement-breakpoint
CREATE INDEX "session_userId_idx" ON "session" ("user_id");--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "verification" ("identifier");--> statement-breakpoint
CREATE INDEX "agent_actions_request_idx" ON "agent_actions" ("request_id");--> statement-breakpoint
CREATE INDEX "agent_actions_run_idx" ON "agent_actions" ("run_id");--> statement-breakpoint
CREATE INDEX "agent_actions_created_idx" ON "agent_actions" ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "email_log_event_key_uidx" ON "email_log" ("event_key");--> statement-breakpoint
CREATE INDEX "email_log_status_scheduled_idx" ON "email_log" ("status","scheduled_at");--> statement-breakpoint
CREATE UNIQUE INDEX "invitations_request_vendor_uidx" ON "invitations" ("request_id","vendor_id");--> statement-breakpoint
CREATE INDEX "invitations_vendor_idx" ON "invitations" ("vendor_id");--> statement-breakpoint
CREATE UNIQUE INDEX "notifications_event_key_uidx" ON "notifications" ("event_key");--> statement-breakpoint
CREATE INDEX "notifications_user_created_idx" ON "notifications" ("user_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "organization_members_org_user_uidx" ON "organization_members" ("organization_id","user_id");--> statement-breakpoint
CREATE INDEX "organization_members_user_idx" ON "organization_members" ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "quote_revisions_quote_version_uidx" ON "quote_revisions" ("quote_id","version");--> statement-breakpoint
CREATE UNIQUE INDEX "quotes_request_vendor_uidx" ON "quotes" ("request_id","vendor_id");--> statement-breakpoint
CREATE INDEX "quotes_request_idx" ON "quotes" ("request_id");--> statement-breakpoint
CREATE INDEX "quotes_vendor_idx" ON "quotes" ("vendor_id");--> statement-breakpoint
CREATE INDEX "requests_organization_idx" ON "requests" ("organization_id");--> statement-breakpoint
CREATE INDEX "requests_status_idx" ON "requests" ("status");--> statement-breakpoint
CREATE INDEX "requests_deadline_idx" ON "requests" ("deadline_at");--> statement-breakpoint
CREATE UNIQUE INDEX "vendor_contacts_vendor_user_uidx" ON "vendor_contacts" ("vendor_id","user_id");--> statement-breakpoint
CREATE INDEX "vendor_contacts_user_idx" ON "vendor_contacts" ("user_id");--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "agent_actions" ADD CONSTRAINT "agent_actions_run_id_agent_runs_id_fkey" FOREIGN KEY ("run_id") REFERENCES "agent_runs"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "agent_actions" ADD CONSTRAINT "agent_actions_request_id_requests_id_fkey" FOREIGN KEY ("request_id") REFERENCES "requests"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "agent_actions" ADD CONSTRAINT "agent_actions_actor_user_id_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "user"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "email_log" ADD CONSTRAINT "email_log_recipient_user_id_user_id_fkey" FOREIGN KEY ("recipient_user_id") REFERENCES "user"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_request_id_requests_id_fkey" FOREIGN KEY ("request_id") REFERENCES "requests"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_vendor_id_vendors_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_request_id_requests_id_fkey" FOREIGN KEY ("request_id") REFERENCES "requests"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "organization_members" ADD CONSTRAINT "organization_members_organization_id_organizations_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "organization_members" ADD CONSTRAINT "organization_members_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "quote_revisions" ADD CONSTRAINT "quote_revisions_quote_id_quotes_id_fkey" FOREIGN KEY ("quote_id") REFERENCES "quotes"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_request_id_requests_id_fkey" FOREIGN KEY ("request_id") REFERENCES "requests"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_vendor_id_vendors_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_submitted_by_user_id_user_id_fkey" FOREIGN KEY ("submitted_by_user_id") REFERENCES "user"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "requests" ADD CONSTRAINT "requests_organization_id_organizations_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "requests" ADD CONSTRAINT "requests_created_by_user_id_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "user"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "vendor_contacts" ADD CONSTRAINT "vendor_contacts_vendor_id_vendors_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "vendor_contacts" ADD CONSTRAINT "vendor_contacts_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;