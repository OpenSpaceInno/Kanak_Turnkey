import { Router, type IRouter } from "express";
import { eq, desc, and, sql, isNull, inArray } from "drizzle-orm";
import {
  db,
  expensesTable,
  invoicesTable,
  vendorInvoicesTable,
  financialInstrumentsTable,
  projectsTable,
  vendorsTable,
  usersTable,
  raBillsTable,
  purchaseOrdersTable,
  budgetItemsTable,
  materialsTable,
  notificationsTable,
  auditLogsTable,
} from "@workspace/db";
import { numKeys } from "../lib/transforms";
import { getCurrentUser } from "../lib/session";
import { generateNumber } from "../lib/numbers";
import { ensureTrack1ClientBillingSeed } from "../seed";

const router: IRouter = Router();

router.post("/finance/seed-track1", async (_req, res): Promise<void> => {
  await ensureTrack1ClientBillingSeed();
  res.json({ success: true, message: "Track 1 Client Billing (AR) demo flow seeded" });
});

const fAmt = (r: Record<string, unknown>) =>
  numKeys(r, [
    "amount",
    "taxRate",
    "taxAmount",
    "totalWithTax",
    "tdsAmount",
    "netReceivedAmount",
  ]);

const fVendorInv = (r: Record<string, unknown>) =>
  numKeys(r, ["amount", "taxAmount", "poAmount", "paidAmount"]);

const fRa = (r: Record<string, unknown>) =>
  numKeys(r, [
    "amount",
    "grossAmount",
    "retentionPercent",
    "retentionAmount",
    "advanceDeduction",
    "netBillableAmount",
    "workCompletionPercent",
  ]);

const fExp = (r: Record<string, unknown>) =>
  numKeys(r, ["amount", "materialQuantity"]);

const fInst = (r: Record<string, unknown>) =>
  numKeys(r, ["amount", "retentionPercent"]);

// ============================================================================
// 1. Finance Executive Overview & Real-Time Cash Flow Metrics
// ============================================================================
router.get("/finance/overview", async (_req, res): Promise<void> => {
  const [invoices, vendorInvoices, expenses, raBills, projects] =
    await Promise.all([
      db.select().from(invoicesTable),
      db.select().from(vendorInvoicesTable),
      db.select().from(expensesTable),
      db.select().from(raBillsTable),
      db.select().from(projectsTable),
    ]);

  const today = new Date().toISOString().split("T")[0];

  // Inflow (Client Billing)
  const totalBilled = invoices.reduce(
    (sum, inv) => sum + Number(inv.amount || 0),
    0,
  );
  const totalCollected = invoices
    .filter((inv) => ["paid", "reconciled", "closed"].includes(inv.status))
    .reduce(
      (sum, inv) =>
        sum + Number(inv.netReceivedAmount || inv.amount || 0),
      0,
    );
  const outstandingReceivables = Math.max(0, totalBilled - totalCollected);
  const overdueInvoices = invoices.filter(
    (inv) =>
      inv.dueDate < today &&
      !["paid", "reconciled", "closed"].includes(inv.status),
  );

  // Outflow (Vendor Invoices & Field Expenses)
  const totalVendorInvoiced = vendorInvoices.reduce(
    (sum, vi) => sum + Number(vi.amount || 0),
    0,
  );
  const totalVendorPaid = vendorInvoices
    .filter((vi) => vi.status === "paid")
    .reduce((sum, vi) => sum + Number(vi.paidAmount || vi.amount || 0), 0);

  const totalExpensesLogged = expenses.reduce(
    (sum, e) => sum + Number(e.amount || 0),
    0,
  );
  const totalExpensesSettled = expenses
    .filter((e) =>
      ["approved", "settled", "reimbursed"].includes(e.status),
    )
    .reduce((sum, e) => sum + Number(e.amount || 0), 0);

  const totalOutflow = totalVendorPaid + totalExpensesSettled;
  const netOperatingCashFlow = totalCollected - totalOutflow;

  // Site Petty Cash Floats
  const pettyCashFloats = projects.map((p) => {
    const pFloat = Number(p.pettyCashFloat || 50000);
    const pExpenses = expenses.filter(
      (e) =>
        e.projectId === p.id &&
        e.paymentMode === "petty_cash" &&
        e.status !== "rejected",
    );
    const spent = pExpenses.reduce(
      (sum, e) => sum + Number(e.amount || 0),
      0,
    );
    const pendingApprovalCount = pExpenses.filter(
      (e) => e.status === "submitted",
    ).length;
    return {
      projectId: p.id,
      projectName: p.name,
      sanctionedFloat: pFloat,
      spent,
      currentBalance: Math.max(0, pFloat - spent),
      pendingApprovalCount,
    };
  });

  const totalSanctionedFloat = pettyCashFloats.reduce(
    (sum, pf) => sum + pf.sanctionedFloat,
    0,
  );
  const totalCurrentFloat = pettyCashFloats.reduce(
    (sum, pf) => sum + pf.currentBalance,
    0,
  );

  // Action Counters
  const pendingRaApprovals = raBills.filter((r) =>
    ["submitted", "verified"].includes(r.status),
  ).length;
  const activeDiscrepancies = vendorInvoices.filter(
    (vi) => vi.status === "discrepancy",
  ).length;
  const pendingFieldExpenses = expenses.filter(
    (e) => e.status === "submitted",
  ).length;
  const pendingVendorPayments = vendorInvoices.filter((vi) =>
    ["approved_for_payment", "scheduled"].includes(vi.status),
  ).length;

  res.json({
    inflow: {
      totalBilled,
      totalCollected,
      outstandingReceivables,
      overdueCount: overdueInvoices.length,
      collectionRate:
        totalBilled > 0
          ? Math.round((totalCollected / totalBilled) * 100)
          : 0,
    },
    outflow: {
      totalVendorInvoiced,
      totalVendorPaid,
      totalExpensesLogged,
      totalExpensesSettled,
      totalOutflow,
      pendingVendorPayments,
    },
    netOperatingCashFlow,
    pettyCash: {
      totalSanctionedFloat,
      totalCurrentFloat,
      pendingFieldExpenses,
      sites: pettyCashFloats,
    },
    actionsRequired: {
      pendingRaApprovals,
      activeDiscrepancies,
      overdueInvoices: overdueInvoices.length,
      pendingFieldExpenses,
    },
  });
});

// ============================================================================
// 2. Track 1: Client Billing & RA Bill Lifecycle (AR)
// ============================================================================
router.get("/ra-bills", async (req, res): Promise<void> => {
  const projectId = req.query.projectId
    ? parseInt(req.query.projectId as string, 10)
    : null;

  const baseQuery = db
    .select({
      r: raBillsTable,
      p: projectsTable.name,
      c: usersTable.name,
    })
    .from(raBillsTable)
    .leftJoin(projectsTable, eq(projectsTable.id, raBillsTable.projectId))
    .leftJoin(usersTable, eq(usersTable.id, raBillsTable.createdById));

  const rows = projectId
    ? await baseQuery
        .where(eq(raBillsTable.projectId, projectId))
        .orderBy(desc(raBillsTable.createdAt))
    : await baseQuery.orderBy(desc(raBillsTable.createdAt));

  res.json(
    rows.map((r) => ({
      ...fRa(r.r),
      projectName: r.p,
      createdByName: r.c,
    })),
  );
});

router.post("/ra-bills", async (req, res): Promise<void> => {
  const b = req.body ?? {};
  if (!b.projectId) {
    res.status(400).json({ error: "projectId is required" });
    return;
  }

  const me = await getCurrentUser();
  const gross = Number(b.grossAmount || b.amount || 0);
  const retPercent = Number(b.retentionPercent ?? 5);
  const retAmount = Number(
    b.retentionAmount ?? (gross * retPercent) / 100,
  );
  const advance = Number(b.advanceDeduction ?? 0);
  const netBillable = Number(
    b.netBillableAmount ?? Math.max(0, gross - retAmount - advance),
  );

  const existing = await db
    .select()
    .from(raBillsTable)
    .where(eq(raBillsTable.projectId, b.projectId));
  const seq = String(existing.length + 1).padStart(3, "0");
  const billNumber = b.billNumber || `RA-${b.projectId}-${seq}`;

  const [bill] = await db
    .insert(raBillsTable)
    .values({
      projectId: b.projectId,
      billNumber,
      milestone: b.milestone ?? "Monthly Progress Milestone",
      description: b.description ?? null,
      workCompletionPercent: b.workCompletionPercent
        ? String(b.workCompletionPercent)
        : null,
      grossAmount: String(gross),
      retentionPercent: String(retPercent),
      retentionAmount: String(retAmount),
      advanceDeduction: String(advance),
      netBillableAmount: String(netBillable),
      amount: String(netBillable),
      supportingDocsUrl: b.supportingDocsUrl ?? null,
      status: b.status ?? "draft",
      createdById: me.id,
    })
    .returning();

  res.status(201).json(fRa(bill!));
});

router.post("/ra-bills/:id/verify", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  const me = await getCurrentUser();

  const [bill] = await db
    .update(raBillsTable)
    .set({
      status: "verified",
      verifiedById: me.id,
      verifiedAt: new Date(),
    })
    .where(eq(raBillsTable.id, id))
    .returning();

  if (!bill) {
    res.status(404).json({ error: "RA bill not found" });
    return;
  }
  res.json(fRa(bill));
});

router.post("/ra-bills/:id/submit", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);

  const [bill] = await db
    .update(raBillsTable)
    .set({ status: "submitted" })
    .where(eq(raBillsTable.id, id))
    .returning();

  if (!bill) {
    res.status(404).json({ error: "RA bill not found" });
    return;
  }
  res.json(fRa(bill));
});

router.post("/ra-bills/:id/approve", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  const me = await getCurrentUser();

  const [bill] = await db
    .update(raBillsTable)
    .set({
      status: "approved",
      pmApprovedById: me.id,
      pmApprovedAt: new Date(),
      revisionRemarks: null,
    })
    .where(eq(raBillsTable.id, id))
    .returning();

  if (!bill) {
    res.status(404).json({ error: "RA bill not found" });
    return;
  }
  res.json(fRa(bill));
});

router.post("/ra-bills/:id/request-revision", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  const remarks = req.body?.remarks || "Revisions required in measurement sheets.";

  const [bill] = await db
    .update(raBillsTable)
    .set({
      status: "revision_requested",
      revisionRemarks: remarks,
    })
    .where(eq(raBillsTable.id, id))
    .returning();

  if (!bill) {
    res.status(404).json({ error: "RA bill not found" });
    return;
  }
  res.json(fRa(bill));
});

router.post("/ra-bills/:id/generate-invoice", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  const [bill] = await db.select().from(raBillsTable).where(eq(raBillsTable.id, id));

  if (!bill) {
    res.status(404).json({ error: "RA bill not found" });
    return;
  }

  const [project] = await db
    .select()
    .from(projectsTable)
    .where(eq(projectsTable.id, bill.projectId));

  const invoiceNumber = await generateNumber("INV", invoicesTable);
  const today = new Date().toISOString().split("T")[0];
  const dueDate = new Date(Date.now() + 30 * 86400000)
    .toISOString()
    .split("T")[0];

  const netAmount = Number(bill.netBillableAmount || bill.amount);
  const taxRate = 18.0;
  const taxAmount = (netAmount * taxRate) / 100;
  const totalWithTax = netAmount + taxAmount;

  const [invoice] = await db
    .insert(invoicesTable)
    .values({
      projectId: bill.projectId,
      raBillId: bill.id,
      invoiceNumber,
      clientName: project?.clientName || "Valued Client",
      amount: String(netAmount),
      gstin: req.body?.gstin || "27AABCK1234F1Z5",
      taxRate: String(taxRate),
      taxAmount: String(taxAmount),
      totalWithTax: String(totalWithTax),
      invoiceDate: today,
      dueDate,
      status: "draft",
    })
    .returning();

  await db
    .update(raBillsTable)
    .set({
      status: "invoiced",
      invoiceId: invoice!.id,
    })
    .where(eq(raBillsTable.id, id));

  res.status(201).json(fAmt(invoice!));
});

// ============================================================================
// 3. Client Tax Invoices Lifecycle (Track 1 AR)
// ============================================================================
router.get("/invoices", async (req, res): Promise<void> => {
  const projectId = req.query.projectId
    ? parseInt(req.query.projectId as string, 10)
    : null;

  const baseQuery = db
    .select({
      i: invoicesTable,
      p: projectsTable.name,
      raNumber: raBillsTable.billNumber,
    })
    .from(invoicesTable)
    .leftJoin(projectsTable, eq(projectsTable.id, invoicesTable.projectId))
    .leftJoin(raBillsTable, eq(raBillsTable.id, invoicesTable.raBillId));

  const rows = projectId
    ? await baseQuery
        .where(eq(invoicesTable.projectId, projectId))
        .orderBy(desc(invoicesTable.invoiceDate))
    : await baseQuery.orderBy(desc(invoicesTable.invoiceDate));

  res.json(
    rows.map((r) => ({
      ...fAmt(r.i),
      projectName: r.p,
      raBillNumber: r.raNumber,
    })),
  );
});

router.post("/invoices", async (req, res): Promise<void> => {
  const b = req.body ?? {};
  const invoiceNumber =
    b.invoiceNumber || (await generateNumber("INV", invoicesTable));
  const amount = Number(b.amount || 0);
  const taxRate = Number(b.taxRate ?? 18);
  const taxAmount = Number(b.taxAmount ?? (amount * taxRate) / 100);
  const totalWithTax = Number(b.totalWithTax ?? amount + taxAmount);

  const [i] = await db
    .insert(invoicesTable)
    .values({
      projectId: b.projectId,
      raBillId: b.raBillId ?? null,
      invoiceNumber,
      clientName: b.clientName,
      amount: String(amount),
      gstin: b.gstin ?? null,
      taxRate: String(taxRate),
      taxAmount: String(taxAmount),
      totalWithTax: String(totalWithTax),
      invoiceDate: b.invoiceDate || new Date().toISOString().split("T")[0],
      dueDate: b.dueDate,
      status: b.status ?? "draft",
    })
    .returning();

  res.status(201).json(fAmt(i!));
});

router.post("/invoices/:id/send", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  const today = new Date().toISOString().split("T")[0];

  const [i] = await db
    .update(invoicesTable)
    .set({
      status: "sent",
      sentDate: today,
    })
    .where(eq(invoicesTable.id, id))
    .returning();

  if (!i) {
    res.status(404).json({ error: "Invoice not found" });
    return;
  }
  res.json(fAmt(i));
});

router.post("/invoices/:id/send-reminder", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  const [existing] = await db.select().from(invoicesTable).where(eq(invoicesTable.id, id));

  if (!existing) {
    res.status(404).json({ error: "Invoice not found" });
    return;
  }

  const count = (existing.paymentRemindersCount || 0) + 1;
  const remarks = req.body?.notes
    ? `${existing.reminderNotes ? existing.reminderNotes + "\n" : ""}[${new Date().toLocaleDateString()}] Reminder #${count}: ${req.body.notes}`
    : `${existing.reminderNotes ? existing.reminderNotes + "\n" : ""}[${new Date().toLocaleDateString()}] Sent automated payment reminder #${count}`;

  const [i] = await db
    .update(invoicesTable)
    .set({
      paymentRemindersCount: count,
      lastReminderDate: new Date(),
      reminderNotes: remarks,
      status: existing.status === "draft" ? "sent" : existing.status,
    })
    .where(eq(invoicesTable.id, id))
    .returning();

  res.json(fAmt(i!));
});

router.post("/invoices/:id/record-payment", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  const b = req.body ?? {};

  const [existing] = await db.select().from(invoicesTable).where(eq(invoicesTable.id, id));
  if (!existing) {
    res.status(404).json({ error: "Invoice not found" });
    return;
  }

  const invoiceAmount = Number(existing.totalWithTax || existing.amount);
  const tds = Number(b.tdsAmount ?? (invoiceAmount * 0.02)); // Default 2% TDS u/s 194C
  const netReceived = Number(b.netReceivedAmount ?? (invoiceAmount - tds));
  const paymentDate = b.paymentDate || new Date().toISOString().split("T")[0];

  const [i] = await db
    .update(invoicesTable)
    .set({
      status: "paid",
      paymentDate,
      paymentReference: b.paymentReference || "NEFT-INFLOW-" + Date.now(),
      tdsAmount: String(tds),
      netReceivedAmount: String(netReceived),
    })
    .where(eq(invoicesTable.id, id))
    .returning();

  res.json(fAmt(i!));
});

router.post("/invoices/:id/reconcile", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  const me = await getCurrentUser();

  const [i] = await db
    .update(invoicesTable)
    .set({
      reconciled: true,
      reconciledAt: new Date(),
      reconciledById: me.id,
      status: "reconciled",
    })
    .where(eq(invoicesTable.id, id))
    .returning();

  if (!i) {
    res.status(404).json({ error: "Invoice not found" });
    return;
  }
  res.json(fAmt(i));
});

router.post("/invoices/:id/close", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);

  const [i] = await db
    .update(invoicesTable)
    .set({
      status: "closed",
      closedAt: new Date(),
    })
    .where(eq(invoicesTable.id, id))
    .returning();

  if (!i) {
    res.status(404).json({ error: "Invoice not found" });
    return;
  }
  res.json(fAmt(i));
});

// ============================================================================
// 4. Track 2: Vendor Invoices & 3-Way PO/GRN Matching (AP)
// ============================================================================
router.get("/vendor-invoices", async (req, res): Promise<void> => {
  const projectId = req.query.projectId
    ? parseInt(req.query.projectId as string, 10)
    : null;

  const baseQuery = db
    .select({
      v: vendorInvoicesTable,
      p: projectsTable.name,
      vn: vendorsTable.name,
      poNumber: purchaseOrdersTable.poNumber,
      poTotal: purchaseOrdersTable.totalAmount,
      poInspectionStatus: purchaseOrdersTable.inspectionStatus,
      poGrn: purchaseOrdersTable.grnNumber,
    })
    .from(vendorInvoicesTable)
    .leftJoin(projectsTable, eq(projectsTable.id, vendorInvoicesTable.projectId))
    .leftJoin(vendorsTable, eq(vendorsTable.id, vendorInvoicesTable.vendorId))
    .leftJoin(
      purchaseOrdersTable,
      eq(purchaseOrdersTable.id, vendorInvoicesTable.purchaseOrderId),
    );

  const rows = projectId
    ? await baseQuery
        .where(eq(vendorInvoicesTable.projectId, projectId))
        .orderBy(desc(vendorInvoicesTable.createdAt))
    : await baseQuery.orderBy(desc(vendorInvoicesTable.createdAt));

  res.json(
    rows.map((r) => ({
      ...fVendorInv(r.v),
      projectName: r.p,
      vendorName: r.vn,
      poNumber: r.poNumber,
      poTotalAmount: r.poTotal ? Number(r.poTotal) : null,
      poInspectionStatus: r.poInspectionStatus,
      poGrnNumber: r.poGrn,
    })),
  );
});

router.post("/vendor-invoices", async (req, res): Promise<void> => {
  const b = req.body ?? {};
  const invoiceNumber =
    b.invoiceNumber || (await generateNumber("VINV", vendorInvoicesTable));
  const amount = Number(b.amount || 0);

  let poAmount: number | null = null;
  let grnNumber: string | null = null;
  let isMatched = false;
  let status = b.status || "received";
  let discrepancyType: string | null = null;
  let discrepancyNotes = b.discrepancyNotes || null;

  if (b.purchaseOrderId) {
    const [po] = await db
      .select()
      .from(purchaseOrdersTable)
      .where(eq(purchaseOrdersTable.id, b.purchaseOrderId));

    if (po) {
      poAmount = Number(po.totalAmount || 0);
      grnNumber = po.grnNumber || null;

      // Automated 3-way match
      const amountMatches = Math.abs(amount - poAmount) <= 1; // minor rounding allowance
      const inspectionPassed = po.inspectionStatus === "passed";

      if (amountMatches && inspectionPassed) {
        isMatched = true;
        status = "matched";
      } else if (!amountMatches) {
        isMatched = false;
        status = "discrepancy";
        discrepancyType = "price_variance";
        const diff = amount - poAmount;
        discrepancyNotes = `Invoiced amount ₹${amount.toLocaleString()} ${diff > 0 ? "exceeds" : "is below"} PO amount ₹${poAmount.toLocaleString()} by ₹${Math.abs(diff).toLocaleString()}.`;
      } else if (!inspectionPassed) {
        isMatched = false;
        status = "discrepancy";
        discrepancyType = "inspection_pending";
        discrepancyNotes = `PO goods receipt inspection is '${po.inspectionStatus}'. Cannot approve payment prior to QC pass.`;
      }
    }
  }

  const [vi] = await db
    .insert(vendorInvoicesTable)
    .values({
      projectId: b.projectId,
      vendorId: b.vendorId,
      purchaseOrderId: b.purchaseOrderId ?? null,
      invoiceNumber,
      amount: String(amount),
      invoiceDate: b.invoiceDate || new Date().toISOString().split("T")[0],
      dueDate: b.dueDate || null,
      taxAmount: b.taxAmount ? String(b.taxAmount) : null,
      poAmount: poAmount ? String(poAmount) : null,
      grnNumber,
      isMatched,
      matchedAt: isMatched ? new Date() : null,
      discrepancyType,
      discrepancyNotes,
      status,
    })
    .returning();

  res.status(201).json(fVendorInv(vi!));
});

router.post("/vendor-invoices/:id/match", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  const [vi] = await db.select().from(vendorInvoicesTable).where(eq(vendorInvoicesTable.id, id));

  if (!vi) {
    res.status(404).json({ error: "Vendor invoice not found" });
    return;
  }

  if (!vi.purchaseOrderId) {
    res.status(400).json({ error: "Invoice has no linked Purchase Order" });
    return;
  }

  const [po] = await db
    .select()
    .from(purchaseOrdersTable)
    .where(eq(purchaseOrdersTable.id, vi.purchaseOrderId));

  if (!po) {
    res.status(404).json({ error: "Linked Purchase Order not found" });
    return;
  }

  const invAmt = Number(vi.amount);
  const poAmt = Number(po.totalAmount);
  const amountMatches = Math.abs(invAmt - poAmt) <= 1;
  const inspectionPassed = po.inspectionStatus === "passed";

  let status = vi.status;
  let isMatched = false;
  let discrepancyType: string | null = null;
  let discrepancyNotes = vi.discrepancyNotes;

  if (amountMatches && inspectionPassed) {
    isMatched = true;
    status = "matched";
    discrepancyNotes = null;
  } else if (!amountMatches) {
    isMatched = false;
    status = "discrepancy";
    discrepancyType = "price_variance";
    const diff = invAmt - poAmt;
    discrepancyNotes = `Invoiced amount ₹${invAmt.toLocaleString()} exceeds PO amount ₹${poAmt.toLocaleString()} by ₹${Math.abs(diff).toLocaleString()}.`;
  } else {
    isMatched = false;
    status = "discrepancy";
    discrepancyType = "inspection_pending";
    discrepancyNotes = `Goods receipt inspection is '${po.inspectionStatus}'. Awaiting QC pass.`;
  }

  const [updated] = await db
    .update(vendorInvoicesTable)
    .set({
      poAmount: String(poAmt),
      grnNumber: po.grnNumber,
      isMatched,
      matchedAt: isMatched ? new Date() : null,
      status,
      discrepancyType,
      discrepancyNotes,
    })
    .where(eq(vendorInvoicesTable.id, id))
    .returning();

  res.json(fVendorInv(updated!));
});

router.post("/vendor-invoices/:id/raise-discrepancy", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  const { discrepancyType, notes } = req.body ?? {};

  const [vi] = await db
    .update(vendorInvoicesTable)
    .set({
      status: "discrepancy",
      isMatched: false,
      discrepancyType: discrepancyType || "rate_mismatch",
      discrepancyNotes: notes || "Discrepancy raised by commercial manager.",
    })
    .where(eq(vendorInvoicesTable.id, id))
    .returning();

  if (!vi) {
    res.status(404).json({ error: "Vendor invoice not found" });
    return;
  }
  res.json(fVendorInv(vi));
});

router.post("/vendor-invoices/:id/resolve-discrepancy", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  const { resolutionNotes, adjustedAmount } = req.body ?? {};

  const updateFields: Record<string, any> = {
    status: "matched",
    isMatched: true,
    resolutionNotes: resolutionNotes || "Variance resolved and approved by commercial controller.",
    resolvedAt: new Date(),
  };

  if (adjustedAmount !== undefined && adjustedAmount !== null && !isNaN(Number(adjustedAmount))) {
    updateFields.amount = String(Number(adjustedAmount));
  }

  const [vi] = await db
    .update(vendorInvoicesTable)
    .set(updateFields)
    .where(eq(vendorInvoicesTable.id, id))
    .returning();

  if (!vi) {
    res.status(404).json({ error: "Vendor invoice not found" });
    return;
  }
  res.json(fVendorInv(vi));
});

router.post("/vendor-invoices/:id/approve", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);

  const [vi] = await db
    .update(vendorInvoicesTable)
    .set({ status: "approved_for_payment" })
    .where(eq(vendorInvoicesTable.id, id))
    .returning();

  if (!vi) {
    res.status(404).json({ error: "Vendor invoice not found" });
    return;
  }
  res.json(fVendorInv(vi));
});

router.post("/vendor-invoices/:id/schedule-payment", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  const { scheduledPaymentDate } = req.body ?? {};

  const [vi] = await db
    .update(vendorInvoicesTable)
    .set({
      status: "scheduled",
      scheduledPaymentDate:
        scheduledPaymentDate ||
        new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0],
    })
    .where(eq(vendorInvoicesTable.id, id))
    .returning();

  if (!vi) {
    res.status(404).json({ error: "Vendor invoice not found" });
    return;
  }
  res.json(fVendorInv(vi));
});

router.post("/vendor-invoices/:id/process-payment", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  const b = req.body ?? {};

  const [existing] = await db
    .select()
    .from(vendorInvoicesTable)
    .where(eq(vendorInvoicesTable.id, id));

  if (!existing) {
    res.status(404).json({ error: "Vendor invoice not found" });
    return;
  }

  const paidAmount = Number(b.paidAmount || existing.amount);
  const paymentDate = b.paymentDate || new Date().toISOString().split("T")[0];
  const paymentReference = b.paymentReference || "UTR-CORP-" + Date.now();
  const paymentMode = b.paymentMode || "neft";

  const [vi] = await db
    .update(vendorInvoicesTable)
    .set({
      status: "paid",
      paymentDate,
      paidAmount: String(paidAmount),
      paymentReference,
      paymentMode,
    })
    .where(eq(vendorInvoicesTable.id, id))
    .returning();

  // Synchronize Project Budget Actual Expenditure
  try {
    const [budget] = await db
      .select()
      .from(budgetItemsTable)
      .where(
        and(
          eq(budgetItemsTable.projectId, existing.projectId),
          eq(budgetItemsTable.costCode, "MAT"),
        ),
      )
      .limit(1);

    if (budget) {
      await db
        .update(budgetItemsTable)
        .set({
          actual: String(Number(budget.actual || 0) + paidAmount),
        })
        .where(eq(budgetItemsTable.id, budget.id));
    }
  } catch (e) {
    // Non-fatal budget sync
  }

  res.json(fVendorInv(vi!));
});

router.post("/finance/reset-track2-demo", async (req, res): Promise<void> => {
  await db
    .update(vendorInvoicesTable)
    .set({
      status: "received",
      isMatched: false,
      matchedAt: null,
      resolutionNotes: null,
      resolvedAt: null,
    })
    .where(eq(vendorInvoicesTable.invoiceNumber, "VINV-2026-REC01"));

  await db
    .update(vendorInvoicesTable)
    .set({
      status: "discrepancy",
      isMatched: false,
      matchedAt: null,
      amount: "1495000",
      discrepancyType: "price_variance",
      discrepancyNotes: "Invoiced amount ₹14,95,000 exceeds PO amount ₹14,50,000 by ₹45,000 (unapproved expediting surcharge).",
      resolutionNotes: null,
      resolvedAt: null,
    })
    .where(eq(vendorInvoicesTable.invoiceNumber, "VINV-2026-DISC02"));

  res.json({ success: true, message: "Track 2 demo states reset successfully." });
});

router.post("/finance/reset-track3-demo", async (req, res): Promise<void> => {
  await db
    .update(expensesTable)
    .set({
      status: "submitted",
      approvedById: null,
      approvedAt: null,
      settledAt: null,
      settlementReference: null,
    })
    .where(eq(expensesTable.billReferenceNumber, "CM-NF-8821"));

  await db
    .update(expensesTable)
    .set({
      status: "approved",
      settledAt: null,
      settlementReference: null,
    })
    .where(eq(expensesTable.billReferenceNumber, "IOC-PUN-0912"));

  res.json({ success: true, message: "Track 3 demo states reset successfully." });
});

// ============================================================================
// 5. Track 3: Site Petty Cash & Field Purchases (Spot Procurements)
// ============================================================================
router.get("/expenses", async (req, res): Promise<void> => {
  const projectId = req.query.projectId
    ? parseInt(req.query.projectId as string, 10)
    : null;

  const baseQuery = db
    .select({
      e: expensesTable,
      p: projectsTable.name,
      u: usersTable.name,
    })
    .from(expensesTable)
    .leftJoin(projectsTable, eq(projectsTable.id, expensesTable.projectId))
    .leftJoin(usersTable, eq(usersTable.id, expensesTable.submittedById));

  const rows = projectId
    ? await baseQuery
        .where(eq(expensesTable.projectId, projectId))
        .orderBy(desc(expensesTable.expenseDate))
    : await baseQuery.orderBy(desc(expensesTable.expenseDate));

  res.json(
    rows.map((r) => ({
      ...fExp(r.e),
      projectName: r.p,
      submittedByName: r.u,
    })),
  );
});

router.post("/expenses/quick-voucher", async (req, res): Promise<void> => {
  const b = req.body ?? {};
  if (!b.projectId || !b.amount || !b.description) {
    res.status(400).json({
      error: "projectId, amount, and description are required",
    });
    return;
  }

  const me = await getCurrentUser();
  const amount = Number(b.amount);
  const expenseDate =
    b.expenseDate || new Date().toISOString().split("T")[0];
  const paymentMode = b.paymentMode || "petty_cash";

  let creditedToInventory = false;

  // Auto-credit Site Inventory if physical materials were purchased on cash
  if (b.materialName && Number(b.materialQuantity) > 0) {
    const qty = Number(b.materialQuantity);
    const [existingMat] = await db
      .select()
      .from(materialsTable)
      .where(
        and(
          eq(materialsTable.projectId, b.projectId),
          eq(materialsTable.name, b.materialName),
        ),
      )
      .limit(1);

    if (existingMat) {
      await db
        .update(materialsTable)
        .set({
          quantityOnHand: String(
            Number(existingMat.quantityOnHand || 0) + qty,
          ),
        })
        .where(eq(materialsTable.id, existingMat.id));
    } else {
      await db.insert(materialsTable).values({
        projectId: b.projectId,
        name: b.materialName,
        unit: b.materialUnit || "Nos",
        locationType: "site",
        locationName: "Site Emergency Store",
        quantityOnHand: String(qty),
        quantityCommitted: "0",
        quantityConsumed: "0",
        minimumStock: "10",
        reorderLevel: "5",
        unitCost: String(amount / qty),
      });
    }
    creditedToInventory = true;
  }

  const [e] = await db
    .insert(expensesTable)
    .values({
      projectId: b.projectId,
      description: b.description,
      amount: String(amount),
      category: b.category || "materials",
      expenseDate,
      receiptUrl: b.receiptUrl ?? null,
      paymentMode,
      vendorOrShopName: b.vendorOrShopName ?? null,
      billReferenceNumber: b.billReferenceNumber ?? null,
      materialName: b.materialName ?? null,
      materialQuantity: b.materialQuantity
        ? String(b.materialQuantity)
        : null,
      materialUnit: b.materialUnit ?? null,
      creditedToInventory,
      status: "submitted",
      submittedById: me.id,
    })
    .returning();

  res.status(201).json(fExp(e!));
});

router.post("/expenses/:id/approve", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  const me = await getCurrentUser();

  const [e] = await db
    .update(expensesTable)
    .set({
      status: "approved",
      approvedById: me.id,
      approvedAt: new Date(),
    })
    .where(eq(expensesTable.id, id))
    .returning();

  if (!e) {
    res.status(404).json({ error: "Expense not found" });
    return;
  }

  // Sync Project Budget Actuals
  try {
    const [budget] = await db
      .select()
      .from(budgetItemsTable)
      .where(
        and(
          eq(budgetItemsTable.projectId, e.projectId),
          eq(budgetItemsTable.costCode, "SITE_EXP"),
        ),
      )
      .limit(1);

    if (budget) {
      await db
        .update(budgetItemsTable)
        .set({
          actual: String(Number(budget.actual || 0) + Number(e.amount)),
        })
        .where(eq(budgetItemsTable.id, budget.id));
    }
  } catch (err) {
    // Non-fatal
  }

  res.json(fExp(e));
});

router.post("/expenses/:id/settle", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  const b = req.body ?? {};

  const [e] = await db
    .update(expensesTable)
    .set({
      status: "settled",
      settledAt: new Date(),
      settlementReference:
        b.settlementReference || "FLOAT-SETTLE-" + Date.now(),
    })
    .where(eq(expensesTable.id, id))
    .returning();

  if (!e) {
    res.status(404).json({ error: "Expense not found" });
    return;
  }
  res.json(fExp(e));
});

router.post("/finance/replenish-float", async (req, res): Promise<void> => {
  const { projectId, amount } = req.body ?? {};
  if (!projectId || !amount) {
    res.status(400).json({ error: "projectId and amount are required" });
    return;
  }

  const [project] = await db
    .select()
    .from(projectsTable)
    .where(eq(projectsTable.id, projectId));

  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  const currentFloat = Number(project.pettyCashFloat || 50000);
  const newFloat = currentFloat + Number(amount);

  await db
    .update(projectsTable)
    .set({ pettyCashFloat: String(newFloat) })
    .where(eq(projectsTable.id, projectId));

  res.json({
    projectId,
    previousFloat: currentFloat,
    replenishedAmount: Number(amount),
    newSanctionedFloat: newFloat,
    message: `Replenished ₹${Number(amount).toLocaleString()} to site petty cash float.`,
  });
});

// ============================================================================
// 6. Financial Instruments (BGs, EMDs, Retention Monies)
// ============================================================================
router.get("/financial-instruments", async (_req, res): Promise<void> => {
  const rows = await db
    .select({ f: financialInstrumentsTable, p: projectsTable.name })
    .from(financialInstrumentsTable)
    .leftJoin(
      projectsTable,
      eq(projectsTable.id, financialInstrumentsTable.projectId),
    )
    .orderBy(desc(financialInstrumentsTable.createdAt));

  res.json(
    rows.map((r) => ({
      ...fInst(r.f),
      projectName: r.p,
      instrumentNumber: r.f.referenceNumber,
    })),
  );
});

router.post("/financial-instruments", async (req, res): Promise<void> => {
  const b = req.body ?? {};
  const me = await getCurrentUser();
  const [f] = await db
    .insert(financialInstrumentsTable)
    .values({
      projectId: b.projectId ?? null,
      instrumentType: b.instrumentType,
      bgSubType: b.bgSubType ?? null,
      amount: String(b.amount),
      issueDate: b.issueDate ?? null,
      expiryDate: b.expiryDate ?? null,
      releaseDate: b.releaseDate ?? null,
      bankName: b.bankName ?? null,
      referenceNumber:
        b.referenceNumber ||
        b.instrumentNumber ||
        (await generateNumber("FI", financialInstrumentsTable)),
      retentionPercent:
        b.retentionPercent != null ? String(b.retentionPercent) : null,
      status: b.status ?? "active",
      notes: b.notes ?? null,
      createdById: me.id,
    })
    .returning();

  res.status(201).json(fInst(f!));
});

router.patch("/financial-instruments/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  const b = req.body ?? {};
  const update: Record<string, unknown> = {};

  for (const k of [
    "instrumentType",
    "bgSubType",
    "issueDate",
    "expiryDate",
    "releaseDate",
    "bankName",
    "referenceNumber",
    "status",
    "notes",
    "projectId",
  ]) {
    if (b[k] !== undefined) update[k] = b[k];
  }
  if (b.amount !== undefined) update.amount = String(b.amount);
  if (b.retentionPercent !== undefined)
    update.retentionPercent =
      b.retentionPercent == null ? null : String(b.retentionPercent);

  const [f] = await db
    .update(financialInstrumentsTable)
    .set(update)
    .where(eq(financialInstrumentsTable.id, id))
    .returning();

  if (!f) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(fInst(f));
});

export default router;
