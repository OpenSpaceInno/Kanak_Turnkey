import path from "node:path";
import * as schema from "./schema/index";
import { SCHEMA_SQL } from "./schema-sql";

const INCREMENTAL_MIGRATIONS_SQL = `
  CREATE TABLE IF NOT EXISTS "stock_transfers" (
    "id" serial PRIMARY KEY NOT NULL,
    "transfer_number" varchar(64) NOT NULL UNIQUE,
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
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL
  );
  ALTER TABLE "materials" ADD COLUMN IF NOT EXISTS "location_type" varchar(32) DEFAULT 'site' NOT NULL;
  ALTER TABLE "materials" ADD COLUMN IF NOT EXISTS "location_name" varchar(128);
  ALTER TABLE "materials" ADD COLUMN IF NOT EXISTS "reorder_level" numeric(14, 2) DEFAULT '0' NOT NULL;
  ALTER TABLE "materials" ADD COLUMN IF NOT EXISTS "unit_cost" numeric(14, 2) DEFAULT '0';
  ALTER TABLE "material_requests" ADD COLUMN IF NOT EXISTS "priority" varchar(16) DEFAULT 'medium' NOT NULL;
  ALTER TABLE "material_requests" ADD COLUMN IF NOT EXISTS "required_by_date" date;
  ALTER TABLE "material_requests" ADD COLUMN IF NOT EXISTS "rejection_reason" text;
  ALTER TABLE "material_requests" ADD COLUMN IF NOT EXISTS "approved_by_id" integer;
  ALTER TABLE "material_requests" ADD COLUMN IF NOT EXISTS "approved_at" timestamp with time zone;
  ALTER TABLE "material_requests" ADD COLUMN IF NOT EXISTS "site_stock_at_request" numeric(14, 2);
  ALTER TABLE "material_requests" ADD COLUMN IF NOT EXISTS "warehouse_stock_at_request" numeric(14, 2);
  ALTER TABLE "material_requests" ADD COLUMN IF NOT EXISTS "to_procure_quantity" numeric(14, 2);
  ALTER TABLE "rfqs" ADD COLUMN IF NOT EXISTS "deadline_date" date;
  ALTER TABLE "rfqs" ADD COLUMN IF NOT EXISTS "terms_and_conditions" text;
  ALTER TABLE "rfqs" ADD COLUMN IF NOT EXISTS "invited_vendor_ids" text;
  ALTER TABLE "quotations" ADD COLUMN IF NOT EXISTS "unit_price" numeric(14, 2);
  ALTER TABLE "quotations" ADD COLUMN IF NOT EXISTS "tax_amount" numeric(14, 2);
  ALTER TABLE "quotations" ADD COLUMN IF NOT EXISTS "freight_charges" numeric(14, 2);
  ALTER TABLE "quotations" ADD COLUMN IF NOT EXISTS "payment_terms" varchar(128);
  ALTER TABLE "purchase_orders" ADD COLUMN IF NOT EXISTS "delivery_destination" varchar(32) DEFAULT 'site' NOT NULL;
  ALTER TABLE "purchase_orders" ADD COLUMN IF NOT EXISTS "rfq_id" integer;
  ALTER TABLE "purchase_orders" ADD COLUMN IF NOT EXISTS "quotation_id" integer;
  ALTER TABLE "purchase_orders" ADD COLUMN IF NOT EXISTS "material_request_id" integer;
  ALTER TABLE "purchase_orders" ADD COLUMN IF NOT EXISTS "tracking_number" varchar(128);
  ALTER TABLE "purchase_orders" ADD COLUMN IF NOT EXISTS "transporter_name" varchar(255);
  ALTER TABLE "purchase_orders" ADD COLUMN IF NOT EXISTS "acknowledgment_date" date;
  ALTER TABLE "purchase_orders" ADD COLUMN IF NOT EXISTS "follow_up_count" integer DEFAULT 0 NOT NULL;
  ALTER TABLE "purchase_orders" ADD COLUMN IF NOT EXISTS "last_follow_up_date" timestamp with time zone;
  ALTER TABLE "purchase_orders" ADD COLUMN IF NOT EXISTS "follow_up_notes" text;
  ALTER TABLE "purchase_orders" ADD COLUMN IF NOT EXISTS "inspected_notes" text;
  ALTER TABLE "purchase_orders" ADD COLUMN IF NOT EXISTS "inspection_notes" text;
  ALTER TABLE "purchase_orders" ADD COLUMN IF NOT EXISTS "grn_number" varchar(64);

  -- Projects: Petty Cash Float
  ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "petty_cash_float" numeric(14, 2) DEFAULT '50000.00';

  -- RA Bills (Track 1)
  ALTER TABLE "ra_bills" ADD COLUMN IF NOT EXISTS "work_completion_percent" numeric(5, 2);
  ALTER TABLE "ra_bills" ADD COLUMN IF NOT EXISTS "verified_by_id" integer;
  ALTER TABLE "ra_bills" ADD COLUMN IF NOT EXISTS "verified_at" timestamp with time zone;
  ALTER TABLE "ra_bills" ADD COLUMN IF NOT EXISTS "gross_amount" numeric(14, 2);
  ALTER TABLE "ra_bills" ADD COLUMN IF NOT EXISTS "retention_percent" numeric(5, 2) DEFAULT '5.00';
  ALTER TABLE "ra_bills" ADD COLUMN IF NOT EXISTS "retention_amount" numeric(14, 2) DEFAULT '0';
  ALTER TABLE "ra_bills" ADD COLUMN IF NOT EXISTS "advance_deduction" numeric(14, 2) DEFAULT '0';
  ALTER TABLE "ra_bills" ADD COLUMN IF NOT EXISTS "net_billable_amount" numeric(14, 2);
  ALTER TABLE "ra_bills" ADD COLUMN IF NOT EXISTS "supporting_docs_url" text;
  ALTER TABLE "ra_bills" ADD COLUMN IF NOT EXISTS "pm_approved_by_id" integer;
  ALTER TABLE "ra_bills" ADD COLUMN IF NOT EXISTS "pm_approved_at" timestamp with time zone;
  ALTER TABLE "ra_bills" ADD COLUMN IF NOT EXISTS "revision_remarks" text;
  ALTER TABLE "ra_bills" ADD COLUMN IF NOT EXISTS "invoice_id" integer;

  -- Client Invoices (Track 1)
  ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "ra_bill_id" integer;
  ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "gstin" varchar(32);
  ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "tax_rate" numeric(5, 2) DEFAULT '18.00';
  ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "tax_amount" numeric(14, 2) DEFAULT '0';
  ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "total_with_tax" numeric(14, 2);
  ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "sent_date" date;
  ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "payment_reminders_count" integer DEFAULT 0 NOT NULL;
  ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "last_reminder_date" timestamp with time zone;
  ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "reminder_notes" text;
  ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "payment_reference" varchar(128);
  ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "tds_amount" numeric(14, 2) DEFAULT '0';
  ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "net_received_amount" numeric(14, 2);
  ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "reconciled_at" timestamp with time zone;
  ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "reconciled_by_id" integer;
  ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "closed_at" timestamp with time zone;

  -- Vendor Invoices (Track 2)
  ALTER TABLE "vendor_invoices" ADD COLUMN IF NOT EXISTS "invoice_date" date;
  ALTER TABLE "vendor_invoices" ADD COLUMN IF NOT EXISTS "due_date" date;
  ALTER TABLE "vendor_invoices" ADD COLUMN IF NOT EXISTS "tax_amount" numeric(14, 2);
  ALTER TABLE "vendor_invoices" ADD COLUMN IF NOT EXISTS "po_amount" numeric(14, 2);
  ALTER TABLE "vendor_invoices" ADD COLUMN IF NOT EXISTS "grn_number" varchar(64);
  ALTER TABLE "vendor_invoices" ADD COLUMN IF NOT EXISTS "is_matched" boolean DEFAULT false NOT NULL;
  ALTER TABLE "vendor_invoices" ADD COLUMN IF NOT EXISTS "matched_at" timestamp with time zone;
  ALTER TABLE "vendor_invoices" ADD COLUMN IF NOT EXISTS "discrepancy_type" varchar(64);
  ALTER TABLE "vendor_invoices" ADD COLUMN IF NOT EXISTS "resolution_notes" text;
  ALTER TABLE "vendor_invoices" ADD COLUMN IF NOT EXISTS "resolved_at" timestamp with time zone;
  ALTER TABLE "vendor_invoices" ADD COLUMN IF NOT EXISTS "scheduled_payment_date" date;
  ALTER TABLE "vendor_invoices" ADD COLUMN IF NOT EXISTS "payment_reference" varchar(128);
  ALTER TABLE "vendor_invoices" ADD COLUMN IF NOT EXISTS "payment_mode" varchar(32) DEFAULT 'neft';
  ALTER TABLE "vendor_invoices" ADD COLUMN IF NOT EXISTS "paid_amount" numeric(14, 2);

  -- Site Expenses & Field Purchases (Track 3)
  ALTER TABLE "expenses" ADD COLUMN IF NOT EXISTS "payment_mode" varchar(32) DEFAULT 'petty_cash' NOT NULL;
  ALTER TABLE "expenses" ADD COLUMN IF NOT EXISTS "vendor_or_shop_name" varchar(255);
  ALTER TABLE "expenses" ADD COLUMN IF NOT EXISTS "bill_reference_number" varchar(64);
  ALTER TABLE "expenses" ADD COLUMN IF NOT EXISTS "material_name" varchar(255);
  ALTER TABLE "expenses" ADD COLUMN IF NOT EXISTS "material_quantity" numeric(14, 2);
  ALTER TABLE "expenses" ADD COLUMN IF NOT EXISTS "material_unit" varchar(32);
  ALTER TABLE "expenses" ADD COLUMN IF NOT EXISTS "credited_to_inventory" boolean DEFAULT false NOT NULL;
  ALTER TABLE "expenses" ADD COLUMN IF NOT EXISTS "approved_at" timestamp with time zone;
  ALTER TABLE "expenses" ADD COLUMN IF NOT EXISTS "settled_at" timestamp with time zone;
  ALTER TABLE "expenses" ADD COLUMN IF NOT EXISTS "settlement_reference" varchar(128);

  -- User Management & Settings
  ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "password_hash" varchar(255);
  ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "password_salt" varchar(64);
  ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "phone" varchar(64);
  ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "designation" varchar(128);
  ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "department" varchar(128);
  ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "status" varchar(32) DEFAULT 'active' NOT NULL;

  CREATE TABLE IF NOT EXISTS "roles" (
    "id" serial PRIMARY KEY NOT NULL,
    "key" varchar(64) NOT NULL UNIQUE,
    "name" varchar(128) NOT NULL,
    "description" text,
    "is_system" boolean DEFAULT false NOT NULL,
    "permissions" text[] DEFAULT '{}' NOT NULL,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL
  );

  CREATE TABLE IF NOT EXISTS "company_settings" (
    "id" serial PRIMARY KEY NOT NULL,
    "company_name" varchar(255) DEFAULT 'Kanak Turnkey Solutions Pvt. Ltd.' NOT NULL,
    "legal_entity_type" varchar(128) DEFAULT 'Private Limited',
    "gstin" varchar(32) DEFAULT '27AABCK1234F1Z5',
    "pan" varchar(32) DEFAULT 'AABCK1234F',
    "cin" varchar(64) DEFAULT 'U45200MH2021PTC123456',
    "email" varchar(255) DEFAULT 'contact@kanakturnkey.com',
    "phone" varchar(64) DEFAULT '+91 98765 43210',
    "website" varchar(255) DEFAULT 'https://kanakturnkey.com',
    "address" text DEFAULT 'Tower 4, Level 8, Tech Park, Powai',
    "city" varchar(128) DEFAULT 'Mumbai',
    "state" varchar(128) DEFAULT 'Maharashtra',
    "pincode" varchar(32) DEFAULT '400076',
    "country" varchar(128) DEFAULT 'India',
    "bank_name" varchar(128) DEFAULT 'HDFC Bank',
    "bank_account_name" varchar(255) DEFAULT 'Kanak Turnkey Solutions Pvt Ltd',
    "bank_account_number" varchar(64) DEFAULT '50200012345678',
    "bank_ifsc" varchar(32) DEFAULT 'HDFC0000123',
    "bank_branch" varchar(128) DEFAULT 'Powai Branch, Mumbai',
    "currency" varchar(16) DEFAULT 'INR',
    "currency_symbol" varchar(8) DEFAULT '₹',
    "logo_url" text,
    "terms_and_conditions" text DEFAULT 'Payment due within 30 days of invoice date. 18% p.a. interest applicable on overdue bills.',
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL
  );
`;

async function initializeSchema(
  queryFn: (sql: string) => Promise<{ rows: unknown[] }>,
  execFn: (sql: string) => Promise<unknown>,
  label: string,
) {
  try {
    const checkResult = await queryFn(`
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'users' 
      LIMIT 1;
    `);
    if (checkResult.rows.length === 0) {
      await execFn(SCHEMA_SQL);
      console.log(`📋 Initialized base database schema in ${label}`);
    }
    await execFn(INCREMENTAL_MIGRATIONS_SQL);
  } catch (e: any) {
    console.warn(`Schema initialization notice (${label}):`, e?.message);
  }
}

const DATABASE_URL = process.env.DATABASE_URL || "";
const isPostgres = DATABASE_URL.startsWith("postgres://") || DATABASE_URL.startsWith("postgresql://");

let db: any;
let pool: any = null;

if (isPostgres) {
  // PostgreSQL setup (Docker PostgreSQL, Supabase, or external PG)
  const { drizzle: pgDrizzle } = await import("drizzle-orm/node-postgres");
  const pg = await import("pg");
  const { Pool } = pg.default;

  pool = new Pool({ connectionString: DATABASE_URL });
  await initializeSchema(
    (sql) => pool.query(sql),
    (sql) => pool.query(sql),
    "PostgreSQL",
  );
  db = pgDrizzle(pool, { schema });

  console.log("✅ Connected to PostgreSQL database");
} else {
  // PGlite setup (WASM-based local PostgreSQL with persistent storage)
  try {
    const { PGlite } = await import("@electric-sql/pglite");
    const { drizzle: pgliteDrizzle } = await import("drizzle-orm/pglite");

    // Store data locally in .pgdata relative to workspace
    const dataDir = process.env.PGDATA_PATH || path.resolve(process.cwd(), ".pgdata");
    const client = new PGlite(dataDir);
    await client.waitReady;

    await initializeSchema(
      (sql) => client.query(sql),
      (sql) => client.exec(sql),
      "local PGlite",
    );

    db = pgliteDrizzle(client, { schema });
    console.log("✅ Connected to local PGlite (PostgreSQL) database");
  } catch (error: any) {
    console.error("❌ Failed to initialize PGlite:", error);
    throw error;
  }
}

export { db, pool };
export * from "./schema/index";
