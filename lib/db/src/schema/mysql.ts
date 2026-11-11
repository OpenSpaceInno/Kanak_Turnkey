import {
  mysqlTable,
  serial,
  int,
  varchar,
  text,
  decimal,
  tinyint,
  boolean,
  date,
  datetime,
  json,
  double,
} from "drizzle-orm/mysql-core";

const ts = () => ({
  createdAt: datetime("created_at").notNull().default(new Date()),
  updatedAt: datetime("updated_at").notNull().default(new Date()),
});

// 1. Users
export const usersTable = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  avatarUrl: text("avatar_url"),
  roles: json("roles").$type<string[]>().notNull(),
  activeRole: varchar("active_role", { length: 50 }).notNull().default("admin"),
  ...ts(),
});

// 2. Projects
export const projectsTable = mysqlTable("projects", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  type: varchar("type", { length: 128 }),
  location: varchar("location", { length: 255 }),
  clientName: varchar("client_name", { length: 255 }),
  startDate: date("start_date", { mode: "string" }),
  endDate: date("end_date", { mode: "string" }),
  budget: decimal("budget", { precision: 14, scale: 2 }),
  pettyCashFloat: decimal("petty_cash_float", { precision: 14, scale: 2 }).default("50000.00"),
  description: text("description"),
  status: varchar("status", { length: 32 }).notNull().default("planning"),
  progress: int("progress").notNull().default(0),
  teamSize: int("team_size"),
  createdById: int("created_by_id"),
  ...ts(),
});

// 3. Leads
export const leadsTable = mysqlTable("leads", {
  id: int("id").autoincrement().primaryKey(),
  leadNumber: varchar("lead_number", { length: 64 }).notNull().unique(),
  customerName: varchar("customer_name", { length: 255 }).notNull(),
  company: varchar("company", { length: 255 }),
  contactEmail: varchar("contact_email", { length: 255 }),
  contactPhone: varchar("contact_phone", { length: 64 }),
  projectType: varchar("project_type", { length: 128 }),
  location: varchar("location", { length: 255 }),
  budgetEstimate: decimal("budget_estimate", { precision: 14, scale: 2 }),
  leadSource: varchar("lead_source", { length: 128 }),
  status: varchar("status", { length: 32 }).notNull().default("new"),
  stage: varchar("stage", { length: 32 }).notNull().default("lead_creation"),
  priority: varchar("priority", { length: 16 }).notNull().default("medium"),
  ownerId: int("owner_id"),
  expectedClosureDate: date("expected_closure_date", { mode: "string" }),
  wonProjectId: int("won_project_id"),
  notes: text("notes"),
  ...ts(),
});

// 4. Lead Activities
export const leadActivitiesTable = mysqlTable("lead_activities", {
  id: int("id").autoincrement().primaryKey(),
  leadId: int("lead_id").notNull(),
  activityType: varchar("activity_type", { length: 64 }).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  createdById: int("created_by_id"),
  ...ts(),
});

// 5. Site Visits
export const siteVisitsTable = mysqlTable("site_visits", {
  id: int("id").autoincrement().primaryKey(),
  leadId: int("lead_id").notNull(),
  visitDate: date("visit_date", { mode: "string" }).notNull(),
  visitTime: varchar("visit_time", { length: 16 }),
  engineerId: int("engineer_id"),
  siteAddress: text("site_address"),
  latitude: double("latitude"),
  longitude: double("longitude"),
  measurements: text("measurements"),
  observations: text("observations"),
  status: varchar("status", { length: 32 }).notNull().default("pending"),
  ...ts(),
});

// 6. Drawings
export const drawingsTable = mysqlTable("drawings", {
  id: int("id").autoincrement().primaryKey(),
  leadId: int("lead_id").notNull(),
  fileName: varchar("file_name", { length: 255 }).notNull(),
  fileType: varchar("file_type", { length: 64 }),
  fileSize: int("file_size"),
  fileUrl: text("file_url"),
  version: int("version").notNull().default(1),
  status: varchar("status", { length: 32 }).notNull().default("draft"),
  reviewerComments: text("reviewer_comments"),
  uploadedById: int("uploaded_by_id"),
  reviewedById: int("reviewed_by_id"),
  uploadedAt: datetime("uploaded_at").notNull().default(new Date()),
});

// 7. BOQs
export const boqsTable = mysqlTable("boqs", {
  id: int("id").autoincrement().primaryKey(),
  leadId: int("lead_id").notNull(),
  version: int("version").notNull().default(1),
  status: varchar("status", { length: 32 }).notNull().default("draft"),
  subtotal: decimal("subtotal", { precision: 14, scale: 2 }).notNull().default("0"),
  taxTotal: decimal("tax_total", { precision: 14, scale: 2 }).notNull().default("0"),
  marginTotal: decimal("margin_total", { precision: 14, scale: 2 }).notNull().default("0"),
  grandTotal: decimal("grand_total", { precision: 14, scale: 2 }).notNull().default("0"),
  createdById: int("created_by_id"),
  approvedById: int("approved_by_id"),
  ...ts(),
});

// 8. BOQ Items
export const boqItemsTable = mysqlTable("boq_items", {
  id: int("id").autoincrement().primaryKey(),
  boqId: int("boq_id").notNull(),
  itemName: varchar("item_name", { length: 255 }).notNull(),
  category: varchar("category", { length: 128 }),
  quantity: decimal("quantity", { precision: 14, scale: 2 }).notNull(),
  unit: varchar("unit", { length: 32 }),
  unitPrice: decimal("unit_price", { precision: 14, scale: 2 }).notNull(),
  taxPercent: decimal("tax_percent", { precision: 6, scale: 2 }).notNull().default("0"),
  marginPercent: decimal("margin_percent", { precision: 6, scale: 2 }).notNull().default("0"),
  totalPrice: decimal("total_price", { precision: 14, scale: 2 }).notNull().default("0"),
  sortOrder: int("sort_order").notNull().default(0),
});

// 9. Negotiations
export const negotiationsTable = mysqlTable("negotiations", {
  id: int("id").autoincrement().primaryKey(),
  leadId: int("lead_id").notNull(),
  roundNumber: int("round_number").notNull().default(1),
  revisedAmount: decimal("revised_amount", { precision: 14, scale: 2 }),
  discountPercent: decimal("discount_percent", { precision: 6, scale: 2 }),
  status: varchar("status", { length: 32 }).notNull().default("pending"),
  requiresApproval: tinyint("requires_approval").notNull().default(0),
  notes: text("notes"),
  createdById: int("created_by_id"),
  approvedById: int("approved_by_id"),
  ...ts(),
});

// 10. Tasks
export const tasksTable = mysqlTable("tasks", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("project_id").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  assignedToId: int("assigned_to_id"),
  startDate: date("start_date", { mode: "string" }),
  endDate: date("end_date", { mode: "string" }),
  priority: varchar("priority", { length: 16 }).notNull().default("medium"),
  status: varchar("status", { length: 32 }).notNull().default("todo"),
  progress: int("progress").notNull().default(0),
  parentTaskId: int("parent_task_id"),
  createdById: int("created_by_id"),
  ...ts(),
});

// 11. Budget Items
export const budgetItemsTable = mysqlTable("budget_items", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("project_id").notNull(),
  costCode: varchar("cost_code", { length: 64 }).notNull(),
  description: varchar("description", { length: 255 }).notNull(),
  budgeted: decimal("budgeted", { precision: 14, scale: 2 }).notNull().default("0"),
  actual: decimal("actual", { precision: 14, scale: 2 }).notNull().default("0"),
  committed: decimal("committed", { precision: 14, scale: 2 }).notNull().default("0"),
});

// 12. RA Bills (Client AR)
export const raBillsTable = mysqlTable("ra_bills", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("project_id").notNull(),
  billNumber: varchar("bill_number", { length: 64 }).notNull(),
  description: text("description"),
  amount: decimal("amount", { precision: 14, scale: 2 }).notNull(),
  milestone: varchar("milestone", { length: 255 }),
  status: varchar("status", { length: 32 }).notNull().default("draft"),
  workCompletionPercent: decimal("work_completion_percent", { precision: 5, scale: 2 }),
  verifiedById: int("verified_by_id"),
  verifiedAt: datetime("verified_at"),
  grossAmount: decimal("gross_amount", { precision: 14, scale: 2 }),
  retentionPercent: decimal("retention_percent", { precision: 5, scale: 2 }).default("5.00"),
  retentionAmount: decimal("retention_amount", { precision: 14, scale: 2 }).default("0"),
  advanceDeduction: decimal("advance_deduction", { precision: 14, scale: 2 }).default("0"),
  netBillableAmount: decimal("net_billable_amount", { precision: 14, scale: 2 }),
  supportingDocsUrl: text("supporting_docs_url"),
  pmApprovedById: int("pm_approved_by_id"),
  pmApprovedAt: datetime("pm_approved_at"),
  revisionRemarks: text("revision_remarks"),
  invoiceId: int("invoice_id"),
  createdById: int("created_by_id"),
  ...ts(),
});

// 13. Client Invoices
export const invoicesTable = mysqlTable("invoices", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("project_id").notNull(),
  invoiceNumber: varchar("invoice_number", { length: 64 }).notNull(),
  clientName: varchar("client_name", { length: 255 }).notNull(),
  amount: decimal("amount", { precision: 14, scale: 2 }).notNull(),
  invoiceDate: date("invoice_date", { mode: "string" }).notNull(),
  dueDate: date("due_date", { mode: "string" }).notNull(),
  paymentDate: date("payment_date", { mode: "string" }),
  reconciled: tinyint("reconciled").notNull().default(0),
  status: varchar("status", { length: 32 }).notNull().default("draft"),
  raBillId: int("ra_bill_id"),
  gstin: varchar("gstin", { length: 32 }),
  taxRate: decimal("tax_rate", { precision: 5, scale: 2 }).default("18.00"),
  taxAmount: decimal("tax_amount", { precision: 14, scale: 2 }).default("0"),
  totalWithTax: decimal("total_with_tax", { precision: 14, scale: 2 }),
  sentDate: date("sent_date", { mode: "string" }),
  paymentRemindersCount: int("payment_reminders_count").notNull().default(0),
  lastReminderDate: datetime("last_reminder_date"),
  reminderNotes: text("reminder_notes"),
  paymentReference: varchar("payment_reference", { length: 128 }),
  tdsAmount: decimal("tds_amount", { precision: 14, scale: 2 }).default("0"),
  netReceivedAmount: decimal("net_received_amount", { precision: 14, scale: 2 }),
  reconciledAt: datetime("reconciled_at"),
  reconciledById: int("reconciled_by_id"),
  closedAt: datetime("closed_at"),
  ...ts(),
});

// 14. Vendors
export const vendorsTable = mysqlTable("vendors", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  contactPerson: varchar("contact_person", { length: 255 }),
  email: varchar("email", { length: 255 }),
  phone: varchar("phone", { length: 64 }),
  address: text("address"),
  category: varchar("category", { length: 128 }),
  rating: decimal("rating", { precision: 3, scale: 1 }).notNull().default("0"),
  status: varchar("status", { length: 16 }).notNull().default("active"),
  ...ts(),
});

// 15. Material Requests
export const materialRequestsTable = mysqlTable("material_requests", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("project_id").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  quantity: decimal("quantity", { precision: 14, scale: 2 }).notNull(),
  unit: varchar("unit", { length: 32 }).notNull(),
  status: varchar("status", { length: 32 }).notNull().default("pending"),
  priority: varchar("priority", { length: 16 }).notNull().default("medium"),
  requiredByDate: date("required_by_date", { mode: "string" }),
  rejectionReason: text("rejection_reason"),
  approvedById: int("approved_by_id"),
  approvedAt: datetime("approved_at"),
  siteStockAtRequest: decimal("site_stock_at_request", { precision: 14, scale: 2 }),
  warehouseStockAtRequest: decimal("warehouse_stock_at_request", { precision: 14, scale: 2 }),
  toProcureQuantity: decimal("to_procure_quantity", { precision: 14, scale: 2 }),
  createdById: int("created_by_id"),
  ...ts(),
});

// 16. RFQs
export const rfqsTable = mysqlTable("rfqs", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("project_id").notNull(),
  materialRequestId: int("material_request_id"),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  status: varchar("status", { length: 32 }).notNull().default("draft"),
  deadlineDate: date("deadline_date", { mode: "string" }),
  termsAndConditions: text("terms_and_conditions"),
  invitedVendorIds: text("invited_vendor_ids"),
  createdById: int("created_by_id"),
  ...ts(),
});

// 17. Quotations
export const quotationsTable = mysqlTable("quotations", {
  id: int("id").autoincrement().primaryKey(),
  rfqId: int("rfq_id").notNull(),
  vendorId: int("vendor_id").notNull(),
  amount: decimal("amount", { precision: 14, scale: 2 }).notNull(),
  unitPrice: decimal("unit_price", { precision: 14, scale: 2 }),
  taxAmount: decimal("tax_amount", { precision: 14, scale: 2 }),
  freightCharges: decimal("freight_charges", { precision: 14, scale: 2 }),
  deliveryDays: int("delivery_days").notNull(),
  paymentTerms: varchar("payment_terms", { length: 128 }),
  notes: text("notes"),
  isSelected: tinyint("is_selected").notNull().default(0),
  ...ts(),
});

// 18. Purchase Orders
export const purchaseOrdersTable = mysqlTable("purchase_orders", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("project_id").notNull(),
  vendorId: int("vendor_id").notNull(),
  poNumber: varchar("po_number", { length: 64 }).notNull(),
  description: text("description"),
  totalAmount: decimal("total_amount", { precision: 14, scale: 2 }).notNull(),
  deliveryDate: date("delivery_date", { mode: "string" }),
  deliveryDestination: varchar("delivery_destination", { length: 32 }).notNull().default("site"),
  status: varchar("status", { length: 32 }).notNull().default("draft"),
  inspectionStatus: varchar("inspection_status", { length: 16 }).notNull().default("pending"),
  rfqId: int("rfq_id"),
  quotationId: int("quotation_id"),
  materialRequestId: int("material_request_id"),
  trackingNumber: varchar("tracking_number", { length: 128 }),
  transporterName: varchar("transporter_name", { length: 255 }),
  acknowledgmentDate: date("acknowledgment_date", { mode: "string" }),
  followUpCount: int("follow_up_count").notNull().default(0),
  lastFollowUpDate: datetime("last_follow_up_date"),
  followUpNotes: text("follow_up_notes"),
  inspectedById: int("inspected_by_id"),
  inspectedAt: datetime("inspected_at"),
  inspectionNotes: text("inspection_notes"),
  grnNumber: varchar("grn_number", { length: 64 }),
  createdById: int("created_by_id"),
  ...ts(),
});

// 19. Vendor Invoices (3-Way Matching AP)
export const vendorInvoicesTable = mysqlTable("vendor_invoices", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("project_id").notNull(),
  vendorId: int("vendor_id").notNull(),
  purchaseOrderId: int("purchase_order_id"),
  invoiceNumber: varchar("invoice_number", { length: 64 }).notNull(),
  amount: decimal("amount", { precision: 14, scale: 2 }).notNull(),
  discrepancyNotes: text("discrepancy_notes"),
  status: varchar("status", { length: 32 }).notNull().default("received"),
  paymentDate: date("payment_date", { mode: "string" }),
  invoiceDate: date("invoice_date", { mode: "string" }),
  dueDate: date("due_date", { mode: "string" }),
  taxAmount: decimal("tax_amount", { precision: 14, scale: 2 }),
  poAmount: decimal("po_amount", { precision: 14, scale: 2 }),
  grnNumber: varchar("grn_number", { length: 64 }),
  isMatched: tinyint("is_matched").notNull().default(0),
  matchedAt: datetime("matched_at"),
  discrepancyType: varchar("discrepancy_type", { length: 64 }),
  resolutionNotes: text("resolution_notes"),
  resolvedAt: datetime("resolved_at"),
  scheduledPaymentDate: date("scheduled_payment_date", { mode: "string" }),
  paymentReference: varchar("payment_reference", { length: 128 }),
  paymentMode: varchar("payment_mode", { length: 32 }).default("neft"),
  paidAmount: decimal("paid_amount", { precision: 14, scale: 2 }),
  ...ts(),
});

// 20. Materials (Multi-Location Inventory)
export const materialsTable = mysqlTable("materials", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("project_id"),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  unit: varchar("unit", { length: 32 }).notNull(),
  locationType: varchar("location_type", { length: 32 }).notNull().default("site"),
  locationName: varchar("location_name", { length: 128 }),
  quantityOnHand: decimal("quantity_on_hand", { precision: 14, scale: 2 }).notNull().default("0"),
  quantityCommitted: decimal("quantity_committed", { precision: 14, scale: 2 }).notNull().default("0"),
  quantityConsumed: decimal("quantity_consumed", { precision: 14, scale: 2 }).notNull().default("0"),
  minimumStock: decimal("minimum_stock", { precision: 14, scale: 2 }).notNull().default("0"),
  reorderLevel: decimal("reorder_level", { precision: 14, scale: 2 }).notNull().default("0"),
  unitCost: decimal("unit_cost", { precision: 14, scale: 2 }).default("0"),
});

// 21. Stock Transfers
export const stockTransfersTable = mysqlTable("stock_transfers", {
  id: int("id").autoincrement().primaryKey(),
  transferNumber: varchar("transfer_number", { length: 64 }).notNull().unique(),
  materialName: varchar("material_name", { length: 255 }).notNull(),
  fromProjectId: int("from_project_id"),
  toProjectId: int("to_project_id").notNull(),
  quantity: decimal("quantity", { precision: 14, scale: 2 }).notNull(),
  unit: varchar("unit", { length: 32 }).notNull(),
  status: varchar("status", { length: 32 }).notNull().default("pending"),
  dispatchDate: datetime("dispatch_date"),
  receivedDate: datetime("received_date"),
  notes: text("notes"),
  createdById: int("created_by_id"),
  ...ts(),
});

// 22. Expenses (Site Petty Cash & Field Expenses)
export const expensesTable = mysqlTable("expenses", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("project_id").notNull(),
  description: varchar("description", { length: 255 }).notNull(),
  amount: decimal("amount", { precision: 14, scale: 2 }).notNull(),
  category: varchar("category", { length: 32 }).notNull(),
  expenseDate: date("expense_date", { mode: "string" }).notNull(),
  receiptUrl: text("receipt_url"),
  status: varchar("status", { length: 32 }).notNull().default("draft"),
  paymentMode: varchar("payment_mode", { length: 32 }).notNull().default("petty_cash"),
  vendorOrShopName: varchar("vendor_or_shop_name", { length: 255 }),
  billReferenceNumber: varchar("bill_reference_number", { length: 64 }),
  materialName: varchar("material_name", { length: 255 }),
  materialQuantity: decimal("material_quantity", { precision: 14, scale: 2 }),
  materialUnit: varchar("material_unit", { length: 32 }),
  creditedToInventory: tinyint("credited_to_inventory").notNull().default(0),
  submittedById: int("submitted_by_id"),
  approvedById: int("approved_by_id"),
  approvedAt: datetime("approved_at"),
  settledAt: datetime("settled_at"),
  settlementReference: varchar("settlement_reference", { length: 128 }),
  ...ts(),
});

// 23. Financial Instruments
export const financialInstrumentsTable = mysqlTable("financial_instruments", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("project_id"),
  instrumentType: varchar("instrument_type", { length: 32 }).notNull(),
  bgSubType: varchar("bg_sub_type", { length: 32 }),
  amount: decimal("amount", { precision: 14, scale: 2 }).notNull(),
  issueDate: date("issue_date", { mode: "string" }),
  expiryDate: date("expiry_date", { mode: "string" }),
  releaseDate: date("release_date", { mode: "string" }),
  bankName: varchar("bank_name", { length: 255 }),
  referenceNumber: varchar("reference_number", { length: 128 }),
  retentionPercent: decimal("retention_percent", { precision: 6, scale: 2 }),
  status: varchar("status", { length: 32 }).notNull().default("active"),
  notes: text("notes"),
  createdById: int("created_by_id"),
  ...ts(),
});

// 24. Stakeholders
export const stakeholdersTable = mysqlTable("stakeholders", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("project_id").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }),
  phone: varchar("phone", { length: 64 }),
  organization: varchar("organization", { length: 255 }),
  role: varchar("role", { length: 128 }),
  accessLevel: varchar("access_level", { length: 16 }).notNull().default("read"),
});

// 25. Communications
export const communicationsTable = mysqlTable("communications", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("project_id"),
  stakeholderId: int("stakeholder_id"),
  communicationType: varchar("communication_type", { length: 16 }).notNull(),
  subject: varchar("subject", { length: 255 }).notNull(),
  content: text("content"),
  communicationDate: datetime("communication_date").notNull(),
  participants: text("participants"),
  createdById: int("created_by_id"),
  ...ts(),
});

// 26. Meetings
export const meetingsTable = mysqlTable("meetings", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("project_id").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  meetingDate: datetime("meeting_date").notNull(),
  duration: int("duration").notNull().default(60),
  location: varchar("location", { length: 255 }),
  agenda: text("agenda"),
  minutes: text("minutes"),
  participants: text("participants"),
  createdById: int("created_by_id"),
  ...ts(),
});

// 27. Documents
export const documentsTable = mysqlTable("documents", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("project_id").notNull(),
  fileName: varchar("file_name", { length: 255 }).notNull(),
  fileType: varchar("file_type", { length: 64 }),
  fileSize: int("file_size"),
  fileUrl: text("file_url"),
  category: varchar("category", { length: 32 }).notNull().default("general"),
  version: int("version").notNull().default(1),
  status: varchar("status", { length: 16 }).notNull().default("active"),
  uploadedById: int("uploaded_by_id"),
  uploadedAt: datetime("uploaded_at").notNull().default(new Date()),
});

// 28. Notifications
export const notificationsTable = mysqlTable("notifications", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id"),
  notificationType: varchar("notification_type", { length: 64 }).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message"),
  isRead: tinyint("is_read").notNull().default(0),
  createdAt: datetime("created_at").notNull().default(new Date()),
});

// 29. Audit Logs
export const auditLogsTable = mysqlTable("audit_logs", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id"),
  activity: varchar("activity", { length: 255 }).notNull(),
  resourceType: varchar("resource_type", { length: 64 }).notNull(),
  resourceId: int("resource_id"),
  ipAddress: varchar("ip_address", { length: 64 }),
  status: varchar("status", { length: 32 }).notNull().default("success"),
  metadata: text("metadata"),
  createdAt: datetime("created_at").notNull().default(new Date()),
});

// 30. Task Templates
export const taskTemplatesTable = mysqlTable("task_templates", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  projectType: varchar("project_type", { length: 128 }),
  isDefault: tinyint("is_default").notNull().default(0),
  createdById: int("created_by_id"),
  ...ts(),
});

// 31. Task Template Items
export const taskTemplateItemsTable = mysqlTable("task_template_items", {
  id: int("id").autoincrement().primaryKey(),
  templateId: int("template_id").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  phase: varchar("phase", { length: 128 }),
  priority: varchar("priority", { length: 16 }).notNull().default("medium"),
  estimatedDays: int("estimated_days"),
  sortOrder: int("sort_order").notNull().default(0),
  createdAt: datetime("created_at").notNull().default(new Date()),
});

// 32. Punch List Items
export const punchListItemsTable = mysqlTable("punch_list_items", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("project_id").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  category: varchar("category", { length: 64 }).notNull().default("general"),
  priority: varchar("priority", { length: 16 }).notNull().default("medium"),
  status: varchar("status", { length: 32 }).notNull().default("open"),
  assignedToId: int("assigned_to_id"),
  dueDate: date("due_date", { mode: "string" }),
  resolvedAt: datetime("resolved_at"),
  resolvedById: int("resolved_by_id"),
  createdById: int("created_by_id"),
  ...ts(),
});

