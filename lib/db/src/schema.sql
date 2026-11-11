◇ injected env (3) from ..\..\.env // tip: ⌘ override existing { override: true }
CREATE TABLE "audit_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"activity" varchar(255) NOT NULL,
	"resource_type" varchar(64) NOT NULL,
	"resource_id" integer,
	"ip_address" varchar(64),
	"status" varchar(32) DEFAULT 'success' NOT NULL,
	"metadata" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "boq_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"boq_id" integer NOT NULL,
	"item_name" varchar(255) NOT NULL,
	"category" varchar(128),
	"quantity" numeric(14, 2) NOT NULL,
	"unit" varchar(32),
	"unit_price" numeric(14, 2) NOT NULL,
	"tax_percent" numeric(6, 2) DEFAULT '0' NOT NULL,
	"margin_percent" numeric(6, 2) DEFAULT '0' NOT NULL,
	"total_price" numeric(14, 2) DEFAULT '0' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);

CREATE TABLE "boqs" (
	"id" serial PRIMARY KEY NOT NULL,
	"lead_id" integer NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"status" varchar(32) DEFAULT 'draft' NOT NULL,
	"subtotal" numeric(14, 2) DEFAULT '0' NOT NULL,
	"tax_total" numeric(14, 2) DEFAULT '0' NOT NULL,
	"margin_total" numeric(14, 2) DEFAULT '0' NOT NULL,
	"grand_total" numeric(14, 2) DEFAULT '0' NOT NULL,
	"created_by_id" integer,
	"approved_by_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "budget_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"cost_code" varchar(64) NOT NULL,
	"description" varchar(255) NOT NULL,
	"budgeted" numeric(14, 2) DEFAULT '0' NOT NULL,
	"actual" numeric(14, 2) DEFAULT '0' NOT NULL,
	"committed" numeric(14, 2) DEFAULT '0' NOT NULL
);

CREATE TABLE "communications" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer,
	"stakeholder_id" integer,
	"communication_type" varchar(16) NOT NULL,
	"subject" varchar(255) NOT NULL,
	"content" text,
	"communication_date" timestamp with time zone NOT NULL,
	"participants" text,
	"created_by_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "documents" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"file_name" varchar(255) NOT NULL,
	"file_type" varchar(64),
	"file_size" integer,
	"file_url" text,
	"category" varchar(32) DEFAULT 'general' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"status" varchar(16) DEFAULT 'active' NOT NULL,
	"uploaded_by_id" integer,
	"uploaded_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "drawings" (
	"id" serial PRIMARY KEY NOT NULL,
	"lead_id" integer NOT NULL,
	"file_name" varchar(255) NOT NULL,
	"file_type" varchar(64),
	"file_size" integer,
	"file_url" text,
	"version" integer DEFAULT 1 NOT NULL,
	"status" varchar(32) DEFAULT 'draft' NOT NULL,
	"reviewer_comments" text,
	"uploaded_by_id" integer,
	"reviewed_by_id" integer,
	"uploaded_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "expenses" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"description" varchar(255) NOT NULL,
	"amount" numeric(14, 2) NOT NULL,
	"category" varchar(32) NOT NULL,
	"expense_date" date NOT NULL,
	"receipt_url" text,
	"status" varchar(32) DEFAULT 'draft' NOT NULL,
	"submitted_by_id" integer,
	"approved_by_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "financial_instruments" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer,
	"instrument_type" varchar(32) NOT NULL,
	"bg_sub_type" varchar(32),
	"amount" numeric(14, 2) NOT NULL,
	"issue_date" date,
	"expiry_date" date,
	"release_date" date,
	"bank_name" varchar(255),
	"reference_number" varchar(128),
	"retention_percent" numeric(6, 2),
	"status" varchar(32) DEFAULT 'active' NOT NULL,
	"notes" text,
	"created_by_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "invoices" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"invoice_number" varchar(64) NOT NULL,
	"client_name" varchar(255) NOT NULL,
	"amount" numeric(14, 2) NOT NULL,
	"invoice_date" date NOT NULL,
	"due_date" date NOT NULL,
	"payment_date" date,
	"reconciled" boolean DEFAULT false NOT NULL,
	"status" varchar(32) DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "lead_activities" (
	"id" serial PRIMARY KEY NOT NULL,
	"lead_id" integer NOT NULL,
	"activity_type" varchar(64) NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"created_by_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "leads" (
	"id" serial PRIMARY KEY NOT NULL,
	"lead_number" varchar(64) NOT NULL,
	"customer_name" varchar(255) NOT NULL,
	"company" varchar(255),
	"contact_email" varchar(255),
	"contact_phone" varchar(64),
	"project_type" varchar(128),
	"location" varchar(255),
	"budget_estimate" numeric(14, 2),
	"lead_source" varchar(128),
	"status" varchar(32) DEFAULT 'new' NOT NULL,
	"stage" varchar(32) DEFAULT 'lead_creation' NOT NULL,
	"priority" varchar(16) DEFAULT 'medium' NOT NULL,
	"owner_id" integer,
	"expected_closure_date" date,
	"won_project_id" integer,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "leads_lead_number_unique" UNIQUE("lead_number")
);

CREATE TABLE "material_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"quantity" numeric(14, 2) NOT NULL,
	"unit" varchar(32) NOT NULL,
	"status" varchar(32) DEFAULT 'pending' NOT NULL,
	"priority" varchar(16) DEFAULT 'medium' NOT NULL,
	"required_by_date" date,
	"rejection_reason" text,
	"approved_by_id" integer,
	"approved_at" timestamp with time zone,
	"site_stock_at_request" numeric(14, 2),
	"warehouse_stock_at_request" numeric(14, 2),
	"to_procure_quantity" numeric(14, 2),
	"created_by_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "materials" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer,
	"name" varchar(255) NOT NULL,
	"description" text,
	"unit" varchar(32) NOT NULL,
	"location_type" varchar(32) DEFAULT 'site' NOT NULL,
	"location_name" varchar(128),
	"quantity_on_hand" numeric(14, 2) DEFAULT '0' NOT NULL,
	"quantity_committed" numeric(14, 2) DEFAULT '0' NOT NULL,
	"quantity_consumed" numeric(14, 2) DEFAULT '0' NOT NULL,
	"minimum_stock" numeric(14, 2) DEFAULT '0' NOT NULL,
	"reorder_level" numeric(14, 2) DEFAULT '0' NOT NULL,
	"unit_cost" numeric(14, 2) DEFAULT '0'
);

CREATE TABLE "meetings" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"title" varchar(255) NOT NULL,
	"meeting_date" timestamp with time zone NOT NULL,
	"duration" integer DEFAULT 60 NOT NULL,
	"location" varchar(255),
	"agenda" text,
	"minutes" text,
	"participants" text,
	"created_by_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "negotiations" (
	"id" serial PRIMARY KEY NOT NULL,
	"lead_id" integer NOT NULL,
	"round_number" integer DEFAULT 1 NOT NULL,
	"revised_amount" numeric(14, 2),
	"discount_percent" numeric(6, 2),
	"status" varchar(32) DEFAULT 'pending' NOT NULL,
	"requires_approval" boolean DEFAULT false NOT NULL,
	"notes" text,
	"created_by_id" integer,
	"approved_by_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "notifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"notification_type" varchar(64) NOT NULL,
	"title" varchar(255) NOT NULL,
	"message" text,
	"is_read" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "projects" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"type" varchar(128),
	"location" varchar(255),
	"client_name" varchar(255),
	"start_date" date,
	"end_date" date,
	"budget" numeric(14, 2),
	"description" text,
	"status" varchar(32) DEFAULT 'planning' NOT NULL,
	"progress" integer DEFAULT 0 NOT NULL,
	"team_size" integer,
	"created_by_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "punch_list_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"category" varchar(64) DEFAULT 'general' NOT NULL,
	"priority" varchar(16) DEFAULT 'medium' NOT NULL,
	"status" varchar(32) DEFAULT 'open' NOT NULL,
	"assigned_to_id" integer,
	"due_date" date,
	"resolved_at" timestamp with time zone,
	"resolved_by_id" integer,
	"created_by_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "purchase_orders" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"vendor_id" integer NOT NULL,
	"po_number" varchar(64) NOT NULL,
	"description" text,
	"total_amount" numeric(14, 2) NOT NULL,
	"delivery_date" date,
	"delivery_destination" varchar(32) DEFAULT 'site' NOT NULL,
	"status" varchar(32) DEFAULT 'draft' NOT NULL,
	"inspection_status" varchar(16) DEFAULT 'pending' NOT NULL,
	"rfq_id" integer,
	"quotation_id" integer,
	"material_request_id" integer,
	"tracking_number" varchar(128),
	"transporter_name" varchar(255),
	"acknowledgment_date" date,
	"follow_up_count" integer DEFAULT 0 NOT NULL,
	"last_follow_up_date" timestamp with time zone,
	"follow_up_notes" text,
	"inspected_by_id" integer,
	"inspected_at" timestamp with time zone,
	"inspection_notes" text,
	"grn_number" varchar(64),
	"created_by_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "quotations" (
	"id" serial PRIMARY KEY NOT NULL,
	"rfq_id" integer NOT NULL,
	"vendor_id" integer NOT NULL,
	"amount" numeric(14, 2) NOT NULL,
	"unit_price" numeric(14, 2),
	"tax_amount" numeric(14, 2),
	"freight_charges" numeric(14, 2),
	"delivery_days" integer NOT NULL,
	"payment_terms" varchar(128),
	"notes" text,
	"is_selected" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "ra_bills" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"bill_number" varchar(64) NOT NULL,
	"description" text,
	"amount" numeric(14, 2) NOT NULL,
	"milestone" varchar(255),
	"status" varchar(32) DEFAULT 'draft' NOT NULL,
	"created_by_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "rfqs" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"material_request_id" integer,
	"title" varchar(255) NOT NULL,
	"description" text,
	"status" varchar(32) DEFAULT 'draft' NOT NULL,
	"deadline_date" date,
	"terms_and_conditions" text,
	"invited_vendor_ids" text,
	"created_by_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "site_visits" (
	"id" serial PRIMARY KEY NOT NULL,
	"lead_id" integer NOT NULL,
	"visit_date" date NOT NULL,
	"visit_time" varchar(16),
	"engineer_id" integer,
	"site_address" text,
	"latitude" double precision,
	"longitude" double precision,
	"measurements" text,
	"observations" text,
	"status" varchar(32) DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "stakeholders" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"name" varchar(255) NOT NULL,
	"email" varchar(255),
	"phone" varchar(64),
	"organization" varchar(255),
	"role" varchar(128),
	"access_level" varchar(16) DEFAULT 'read' NOT NULL
);

CREATE TABLE "stock_transfers" (
	"id" serial PRIMARY KEY NOT NULL,
	"transfer_number" varchar(64) NOT NULL,
	"material_name" varchar(255) NOT NULL,
	"from_project_id" integer,
	"to_project_id" integer NOT NULL,
	"quantity" numeric(14, 2) NOT NULL,
	"unit" varchar(32) NOT NULL,
	"status" varchar(32) DEFAULT 'pending' NOT NULL,
	"dispatch_date" timestamp with time zone,
	"received_date" timestamp with time zone,
	"notes" text,
	"created_by_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "stock_transfers_transfer_number_unique" UNIQUE("transfer_number")
);

CREATE TABLE "task_template_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"template_id" integer NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"phase" varchar(128),
	"priority" varchar(16) DEFAULT 'medium' NOT NULL,
	"estimated_days" integer,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "task_templates" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"project_type" varchar(128),
	"is_default" boolean DEFAULT false NOT NULL,
	"created_by_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "tasks" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"assigned_to_id" integer,
	"start_date" date,
	"end_date" date,
	"priority" varchar(16) DEFAULT 'medium' NOT NULL,
	"status" varchar(32) DEFAULT 'todo' NOT NULL,
	"progress" integer DEFAULT 0 NOT NULL,
	"parent_task_id" integer,
	"created_by_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" varchar(255) NOT NULL,
	"name" varchar(255) NOT NULL,
	"avatar_url" text,
	"roles" text[] DEFAULT '{}' NOT NULL,
	"active_role" varchar(50) DEFAULT 'admin' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);

CREATE TABLE "vendor_invoices" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"vendor_id" integer NOT NULL,
	"purchase_order_id" integer,
	"invoice_number" varchar(64) NOT NULL,
	"amount" numeric(14, 2) NOT NULL,
	"discrepancy_notes" text,
	"status" varchar(32) DEFAULT 'received' NOT NULL,
	"payment_date" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "vendors" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"contact_person" varchar(255),
	"email" varchar(255),
	"phone" varchar(64),
	"address" text,
	"category" varchar(128),
	"rating" numeric(3, 1) DEFAULT '0' NOT NULL,
	"status" varchar(16) DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

