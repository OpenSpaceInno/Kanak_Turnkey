import { Router, type IRouter } from "express";
import { db, rolesTable, usersTable, auditLogsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { getCurrentUser } from "../lib/session";

const router: IRouter = Router();

export const AVAILABLE_PERMISSIONS = [
  // Module 1: Pre-Construction & Sales
  { key: "leads:view", label: "View Leads & Prospects", module: "Pre-Construction", description: "View inquiry list, site visit records, and activity logs" },
  { key: "leads:create", label: "Create Leads", module: "Pre-Construction", description: "Register new customer inquiries and project requests" },
  { key: "leads:edit", label: "Edit Leads", module: "Pre-Construction", description: "Update lead stage, priority, assign owners, and add notes" },
  { key: "boq:manage", label: "Manage BOQ & Estimation", module: "Pre-Construction", description: "Create/edit line items, units, quantities, margins, and taxes" },
  { key: "leads:convert", label: "Convert to Project", module: "Pre-Construction", description: "Convert won leads into active execution turnkey projects" },

  // Module 2: Projects & Sites
  { key: "projects:view", label: "View Projects & Overview", module: "Projects & Sites", description: "Access project dashboard, schedule, and team view" },
  { key: "projects:manage", label: "Manage Projects", module: "Projects & Sites", description: "Create, configure project parameters, budget, and dates" },
  { key: "tasks:manage", label: "Manage Tasks & Milestones", module: "Projects & Sites", description: "Create, assign, update progress and schedule on Gantt/Kanban" },
  { key: "dpr:create", label: "Log Daily Progress (DPR)", module: "Projects & Sites", description: "Record daily workforce counts, machinery, impediments, and work narrative" },
  { key: "field:muster", label: "Log Trade Gang Muster", module: "Projects & Sites", description: "Record daily labor gang counts by trade (masons, carpenters, rebar, helpers)" },
  { key: "field:snags", label: "Snap Site Defects & Snags", module: "Projects & Sites", description: "Capture site punch items with camera proof and severity tag" },
  { key: "drawings:manage", label: "Manage Site Drawings", module: "Projects & Sites", description: "Upload architectural, MEP, structural revisions and review remarks" },

  // Module 3: Procurement & Stock
  { key: "procurement:requests", label: "Raise Material Requests", module: "Procurement & Stock", description: "Create site material indent requests for BOM items" },
  { key: "procurement:approve_mr", label: "Approve Material Requests", module: "Procurement & Stock", description: "Review, approve or reject indented material requests" },
  { key: "procurement:rfq_quotes", label: "RFQs & Comparative Analysis", module: "Procurement & Stock", description: "Create RFQs, invite vendors, enter quotes and evaluate landed cost" },
  { key: "procurement:po", label: "Issue Purchase Orders (PO)", module: "Procurement & Stock", description: "Generate official POs, dispatch to vendors, log GRN receipts" },
  { key: "store:grn", label: "Goods Receipt Notes (GRN)", module: "Procurement & Stock", description: "Receive inbound PO consignments, verify delivery challans, and update store inventory" },
  { key: "store:issue", label: "Issue Site Materials", module: "Procurement & Stock", description: "Issue stock consumables from site store to foremen and active work packages" },
  { key: "stock:view", label: "View Inventory & Stock", module: "Procurement & Stock", description: "Monitor site & warehouse stock levels, buffer reorder alerts" },
  { key: "stock:transfer", label: "Transfer Materials", module: "Procurement & Stock", description: "Transfer stock between central warehouse and project sites" },

  // Module 4: Finance & Accounting
  { key: "finance:ar_view", label: "View Client Billing (AR)", module: "Finance & Accounts", description: "View Running Account (RA) bills, GST invoices, and collection aging" },
  { key: "finance:ar_manage", label: "Manage Client Billing (AR)", module: "Finance & Accounts", description: "Generate RA bills, approve measurements, issue tax invoices, record TDS & receipts" },
  { key: "subcontractor:claims", label: "Submit Measurement Claims", module: "Finance & Accounts", description: "Submit completed work quantity measurements and physical sheets for verification" },
  { key: "finance:ap_view", label: "View Vendor Invoicing (AP)", module: "Finance & Accounts", description: "View vendor invoices, 3-way match validation, and payout schedules" },
  { key: "finance:ap_manage", label: "Manage Vendor Invoicing (AP)", module: "Finance & Accounts", description: "Resolve discrepancies, issue debit notes, and execute payment payouts" },
  { key: "finance:petty_cash", label: "Site Petty Cash & Imprest", module: "Finance & Accounts", description: "Log field cash purchases, disburse floats, and reconcile imprest vouchers" },
  { key: "finance:instruments", label: "Financial Instruments & BGs", module: "Finance & Accounts", description: "Manage bank guarantees, retention money deductions, and release settlements" },

  // Module 5: Settings & Administration
  { key: "users:manage", label: "Manage Users", module: "Settings & Admin", description: "Invite, create, edit, deactivate users and reset passwords" },
  { key: "roles:manage", label: "Manage Roles & Permissions", module: "Settings & Admin", description: "Create custom roles and configure access permission matrices" },
  { key: "company:configure", label: "Company Information & Bank", module: "Settings & Admin", description: "Configure corporate profile, GSTIN, PAN, and invoice banking details" },
  { key: "audit:view", label: "View Audit Trail Logs", module: "Settings & Admin", description: "Inspect system security events, changes, and user activities" },
];

router.get("/permissions", async (_req, res): Promise<void> => {
  res.json(AVAILABLE_PERMISSIONS);
});

router.get("/roles", async (_req, res): Promise<void> => {
  const roles = await db.select().from(rolesTable).orderBy(rolesTable.id);
  const users = await db.select({ roles: usersTable.roles }).from(usersTable);

  const roleCounts: Record<string, number> = {};
  for (const u of users) {
    if (Array.isArray(u.roles)) {
      for (const r of u.roles) {
        roleCounts[r] = (roleCounts[r] || 0) + 1;
      }
    }
  }

  res.json(
    roles.map((r) => ({
      id: r.id,
      key: r.key,
      name: r.name,
      description: r.description,
      isSystem: r.isSystem,
      permissions: r.permissions ?? [],
      userCount: roleCounts[r.key] || 0,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    })),
  );
});

router.post("/roles", async (req, res): Promise<void> => {
  const { name, key, description, permissions = [] } = req.body || {};
  if (!name) {
    res.status(400).json({ error: "Role name is required" });
    return;
  }

  const roleKey = (key || name.toLowerCase().replace(/[^a-z0-9_]/g, "_")).trim();
  const [existing] = await db.select().from(rolesTable).where(eq(rolesTable.key, roleKey)).limit(1);
  if (existing) {
    res.status(409).json({ error: "A role with this key or identifier already exists" });
    return;
  }

  const [newRole] = await db
    .insert(rolesTable)
    .values([
      {
        key: roleKey,
        name: name.trim(),
        description: description || null,
        isSystem: false,
        permissions: Array.isArray(permissions) ? permissions : [],
      },
    ])
    .returning();

  const me = await getCurrentUser();
  await db.insert(auditLogsTable).values([
    {
      userId: me.id,
      activity: `Created role: ${newRole!.name} (${newRole!.key})`,
      resourceType: "role",
      resourceId: newRole!.id,
      status: "success",
    },
  ]);

  res.status(201).json({
    ...newRole,
    userCount: 0,
  });
});

router.patch("/roles/:id", async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0]! : req.params.id!, 10);
  const [role] = await db.select().from(rolesTable).where(eq(rolesTable.id, id)).limit(1);
  if (!role) {
    res.status(404).json({ error: "Role not found" });
    return;
  }

  const updates: any = {};
  if (req.body.name !== undefined) updates.name = req.body.name.trim();
  if (req.body.description !== undefined) updates.description = req.body.description;
  if (req.body.permissions !== undefined && Array.isArray(req.body.permissions)) {
    updates.permissions = req.body.permissions;
  }

  const [updatedRole] = await db
    .update(rolesTable)
    .set(updates)
    .where(eq(rolesTable.id, id))
    .returning();

  const me = await getCurrentUser();
  await db.insert(auditLogsTable).values([
    {
      userId: me.id,
      activity: `Updated role permissions: ${updatedRole!.name}`,
      resourceType: "role",
      resourceId: updatedRole!.id,
      status: "success",
    },
  ]);

  res.json(updatedRole);
});

router.delete("/roles/:id", async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0]! : req.params.id!, 10);
  const [role] = await db.select().from(rolesTable).where(eq(rolesTable.id, id)).limit(1);
  if (!role) {
    res.status(404).json({ error: "Role not found" });
    return;
  }

  if (role.isSystem) {
    res.status(400).json({ error: "System roles cannot be deleted" });
    return;
  }

  const usersWithRole = await db.select().from(usersTable);
  const isAssigned = usersWithRole.some((u) => u.roles?.includes(role.key));
  if (isAssigned) {
    res.status(400).json({ error: "Cannot delete a role that is currently assigned to users. Reassign users first." });
    return;
  }

  await db.delete(rolesTable).where(eq(rolesTable.id, id));

  const me = await getCurrentUser();
  await db.insert(auditLogsTable).values([
    {
      userId: me.id,
      activity: `Deleted role: ${role.name}`,
      resourceType: "role",
      resourceId: id,
      status: "success",
    },
  ]);

  res.json({ success: true, message: "Role deleted successfully" });
});

export default router;

