import { Router, type IRouter } from "express";
import { eq, desc, and, isNull } from "drizzle-orm";
import {
  db,
  vendorsTable,
  materialRequestsTable,
  rfqsTable,
  quotationsTable,
  purchaseOrdersTable,
  materialsTable,
  stockTransfersTable,
  projectsTable,
  usersTable,
  budgetItemsTable,
  notificationsTable,
  auditLogsTable,
} from "@workspace/db";
import { numKeys } from "../lib/transforms";
import { getCurrentUser } from "../lib/session";
import { generateNumber } from "../lib/numbers";
import { ensureProcurementFlowSeed } from "../seed";
import { gateInProduction } from "../lib/auth-middleware";

const router: IRouter = Router();

router.post("/procurement/seed-demo-flow", gateInProduction, async (_req, res): Promise<void> => {
  await ensureProcurementFlowSeed();
  res.json({ success: true, message: "Procurement demo flow seeded" });
});

const fVendor = (r: Record<string, unknown>) => numKeys(r, ["rating"]);
const fMatReq = (r: Record<string, unknown>) =>
  numKeys(r, [
    "quantity",
    "siteStockAtRequest",
    "warehouseStockAtRequest",
    "toProcureQuantity",
  ]);
const fQuote = (r: Record<string, unknown>) =>
  numKeys(r, ["amount", "unitPrice", "taxAmount", "freightCharges"]);
const fPo = (r: Record<string, unknown>) => numKeys(r, ["totalAmount"]);
const fMat = (r: Record<string, unknown>) =>
  numKeys(r, [
    "quantityOnHand",
    "quantityCommitted",
    "quantityConsumed",
    "minimumStock",
    "reorderLevel",
    "unitCost",
  ]);
const fTransfer = (r: Record<string, unknown>) => numKeys(r, ["quantity"]);

// ============================================================================
// 1. Unified Stock Matrix & Deficit Overview
// ============================================================================
router.get("/procurement/stock-matrix", async (_req, res): Promise<void> => {
  const allMaterials = await db
    .select({
      m: materialsTable,
      projectName: projectsTable.name,
    })
    .from(materialsTable)
    .leftJoin(projectsTable, eq(projectsTable.id, materialsTable.projectId));

  const allProjects = await db.select().from(projectsTable).orderBy(projectsTable.name);
  const pendingMrs = await db.select().from(materialRequestsTable);
  const activePos = await db.select().from(purchaseOrdersTable);

  // Group materials by name (case-insensitive) & unit
  const groupMap = new Map<string, {
    materialName: string;
    unit: string;
    inHouseStock: number;
    siteStock: number;
    totalOnHand: number;
    minimumStock: number;
    reorderLevel: number;
    unitCost: number;
    openMrQuantity: number;
    inTransitPoQuantity: number;
    toProcureQuantity: number;
    sites: Array<{ projectId: number | null; projectName: string; quantity: number }>;
  }>();

  for (const row of allMaterials) {
    const key = `${row.m.name.trim().toLowerCase()}||${row.m.unit.trim().toLowerCase()}`;
    const onHand = Number(row.m.quantityOnHand || 0);
    const isWarehouse = row.m.locationType === "warehouse" || row.m.projectId === null;

    if (!groupMap.has(key)) {
      groupMap.set(key, {
        materialName: row.m.name,
        unit: row.m.unit,
        inHouseStock: 0,
        siteStock: 0,
        totalOnHand: 0,
        minimumStock: Number(row.m.minimumStock || 0),
        reorderLevel: Number(row.m.reorderLevel || 0),
        unitCost: Number(row.m.unitCost || 0),
        openMrQuantity: 0,
        inTransitPoQuantity: 0,
        toProcureQuantity: 0,
        sites: [],
      });
    }

    const item = groupMap.get(key)!;
    if (isWarehouse) {
      item.inHouseStock += onHand;
    } else {
      item.siteStock += onHand;
      item.sites.push({
        projectId: row.m.projectId,
        projectName: row.projectName || `Project #${row.m.projectId}`,
        quantity: onHand,
      });
    }
    item.totalOnHand = item.inHouseStock + item.siteStock;
    if (Number(row.m.minimumStock || 0) > item.minimumStock) {
      item.minimumStock = Number(row.m.minimumStock || 0);
    }
    if (Number(row.m.reorderLevel || 0) > item.reorderLevel) {
      item.reorderLevel = Number(row.m.reorderLevel || 0);
    }
    if (Number(row.m.unitCost || 0) > 0) {
      item.unitCost = Number(row.m.unitCost || 0);
    }
  }

  // Aggregate pending MR quantities
  for (const mr of pendingMrs) {
    if (mr.status === "pending" || mr.status === "approved") {
      for (const [key, item] of groupMap.entries()) {
        if (mr.title.toLowerCase().includes(item.materialName.toLowerCase())) {
          item.openMrQuantity += Number(mr.quantity || 0);
        }
      }
    }
  }

  // Aggregate in-transit PO quantities
  for (const po of activePos) {
    if (["issued", "acknowledged", "in_transit"].includes(po.status)) {
      for (const [key, item] of groupMap.entries()) {
        if (po.description?.toLowerCase().includes(item.materialName.toLowerCase())) {
          item.inTransitPoQuantity += 1;
        }
      }
    }
  }

  // Compute Net To Procure
  for (const item of groupMap.values()) {
    const demand = Math.max(item.minimumStock, item.openMrQuantity);
    item.toProcureQuantity = Math.max(0, demand - item.totalOnHand);
  }

  res.json({
    summary: {
      totalMaterialsTracked: groupMap.size,
      totalInHouseValuation: Array.from(groupMap.values()).reduce(
        (sum, m) => sum + m.inHouseStock * (m.unitCost || 0),
        0
      ),
      totalSiteStockValuation: Array.from(groupMap.values()).reduce(
        (sum, m) => sum + m.siteStock * (m.unitCost || 0),
        0
      ),
      itemsNeedingProcurement: Array.from(groupMap.values()).filter(
        (m) => m.toProcureQuantity > 0
      ).length,
    },
    materials: Array.from(groupMap.values()),
    projects: allProjects,
  });
});

// ============================================================================
// 2. Vendors
// ============================================================================
router.get(["/vendors", "/procurement/vendors"], async (_req, res): Promise<void> => {
  const rows = await db.select().from(vendorsTable).orderBy(vendorsTable.name);
  res.json(rows.map(fVendor));
});

router.post(["/vendors", "/procurement/vendors"], async (req, res): Promise<void> => {
  const b = req.body ?? {};
  const [v] = await db
    .insert(vendorsTable)
    .values({
      name: b.name,
      contactPerson: b.contactPerson ?? null,
      email: b.email ?? null,
      phone: b.phone ?? null,
      address: b.address ?? null,
      category: b.category ?? null,
      rating: b.rating != null ? String(b.rating) : "0",
      status: b.status ?? "active",
    })
    .returning();
  res.status(201).json(fVendor(v!));
});

router.patch("/vendors/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  const b = req.body ?? {};
  const update: Record<string, unknown> = {};
  for (const k of [
    "name",
    "contactPerson",
    "email",
    "phone",
    "address",
    "category",
    "status",
  ]) {
    if (b[k] !== undefined) update[k] = b[k];
  }
  if (b.rating !== undefined) update.rating = String(b.rating);
  const [v] = await db
    .update(vendorsTable)
    .set(update)
    .where(eq(vendorsTable.id, id))
    .returning();
  if (!v) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(fVendor(v));
});

// ============================================================================
// 3. Material Requests (Requisition & Approval Flow)
// ============================================================================
router.get(["/material-requests", "/procurement/requests"], async (_req, res): Promise<void> => {
  const rows = await db
    .select({
      m: materialRequestsTable,
      p: projectsTable.name,
      u: usersTable.name,
      approver: usersTable.name,
    })
    .from(materialRequestsTable)
    .leftJoin(projectsTable, eq(projectsTable.id, materialRequestsTable.projectId))
    .leftJoin(usersTable, eq(usersTable.id, materialRequestsTable.createdById))
    .orderBy(desc(materialRequestsTable.createdAt));

  res.json(
    rows.map((r) => ({
      ...fMatReq(r.m),
      projectName: r.p,
      createdByName: r.u,
    }))
  );
});

router.post(["/material-requests", "/procurement/requests"], async (req, res): Promise<void> => {
  const b = req.body ?? {};
  const me = await getCurrentUser();

  // Check live warehouse and site stock
  const [siteMat] = await db
    .select()
    .from(materialsTable)
    .where(
      and(
        eq(materialsTable.projectId, b.projectId),
        eq(materialsTable.name, b.title)
      )
    )
    .limit(1);

  const [warehouseMat] = await db
    .select()
    .from(materialsTable)
    .where(
      and(
        isNull(materialsTable.projectId),
        eq(materialsTable.name, b.title)
      )
    )
    .limit(1);

  const siteStock = Number(siteMat?.quantityOnHand || 0);
  const warehouseStock = Number(warehouseMat?.quantityOnHand || 0);
  const reqQty = Number(b.quantity || 0);
  const toProcure = Math.max(0, reqQty - (siteStock + warehouseStock));

  const [m] = await db
    .insert(materialRequestsTable)
    .values({
      projectId: b.projectId,
      title: b.title,
      description: b.description ?? null,
      quantity: String(b.quantity),
      unit: b.unit,
      priority: b.priority ?? "medium",
      requiredByDate: b.requiredByDate ?? null,
      siteStockAtRequest: String(siteStock),
      warehouseStockAtRequest: String(warehouseStock),
      toProcureQuantity: String(toProcure),
      createdById: me.id,
    })
    .returning();

  res.status(201).json(fMatReq(m!));
});

router.post("/material-requests/:id/approve", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  const me = await getCurrentUser();

  const [m] = await db
    .update(materialRequestsTable)
    .set({
      status: "approved",
      approvedById: me.id,
      approvedAt: new Date(),
    })
    .where(eq(materialRequestsTable.id, id))
    .returning();

  if (!m) {
    res.status(404).json({ error: "Material request not found" });
    return;
  }

  // Notify creator
  if (m.createdById) {
    await db.insert(notificationsTable).values({
      userId: m.createdById,
      notificationType: "material_request_approved",
      title: "Material Request Approved",
      message: `Your request "${m.title}" for ${m.quantity} ${m.unit} has been approved by ${me.name}.`,
    });
  }

  res.json(fMatReq(m));
});

router.post("/material-requests/:id/reject", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  const me = await getCurrentUser();
  const reason = (req.body?.reason || "Material request rejected by reviewer.").toString();

  const [m] = await db
    .update(materialRequestsTable)
    .set({
      status: "rejected",
      rejectionReason: reason,
      approvedById: me.id,
      approvedAt: new Date(),
    })
    .where(eq(materialRequestsTable.id, id))
    .returning();

  if (!m) {
    res.status(404).json({ error: "Material request not found" });
    return;
  }

  if (m.createdById) {
    await db.insert(notificationsTable).values({
      userId: m.createdById,
      notificationType: "material_request_rejected",
      title: "Material Request Rejected",
      message: `Your request "${m.title}" was rejected: ${reason}`,
    });
  }

  res.json(fMatReq(m));
});

router.post("/material-requests/:id/transfer", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  const me = await getCurrentUser();

  const [mr] = await db
    .select()
    .from(materialRequestsTable)
    .where(eq(materialRequestsTable.id, id));

  if (!mr) {
    res.status(404).json({ error: "Material request not found" });
    return;
  }

  const transferQty = req.body?.quantity != null ? String(req.body.quantity) : mr.quantity;
  const transferNum = await generateNumber("TR", stockTransfersTable);

  const [transfer] = await db
    .insert(stockTransfersTable)
    .values({
      transferNumber: transferNum,
      materialName: mr.title,
      fromProjectId: null, // Central Warehouse
      toProjectId: mr.projectId,
      quantity: transferQty,
      unit: mr.unit,
      status: "pending",
      notes: `Initiated from Material Request #${mr.id}`,
      createdById: me.id,
    })
    .returning();

  // If full quantity fulfilled via transfer, update MR
  if (Number(transferQty) >= Number(mr.quantity)) {
    await db
      .update(materialRequestsTable)
      .set({ status: "fulfilled" })
      .where(eq(materialRequestsTable.id, id));
  }

  res.status(201).json(fTransfer(transfer!));
});

router.patch("/material-requests/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  const update: Record<string, unknown> = {};
  if (req.body?.status !== undefined) update.status = req.body.status;
  if (req.body?.priority !== undefined) update.priority = req.body.priority;
  if (req.body?.rejectionReason !== undefined) update.rejectionReason = req.body.rejectionReason;

  const [m] = await db
    .update(materialRequestsTable)
    .set(update)
    .where(eq(materialRequestsTable.id, id))
    .returning();

  if (!m) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(fMatReq(m));
});

// ============================================================================
// 4. Stock Transfers (In-House Warehouse <-> Project Sites)
// ============================================================================
router.get(["/stock-transfers", "/procurement/transfers"], async (_req, res): Promise<void> => {
  const rows = await db
    .select({
      t: stockTransfersTable,
      toProject: projectsTable.name,
      creator: usersTable.name,
    })
    .from(stockTransfersTable)
    .leftJoin(projectsTable, eq(projectsTable.id, stockTransfersTable.toProjectId))
    .leftJoin(usersTable, eq(usersTable.id, stockTransfersTable.createdById))
    .orderBy(desc(stockTransfersTable.createdAt));

  res.json(
    rows.map((r) => ({
      ...fTransfer(r.t),
      fromLocationName: r.t.fromProjectId ? `Project #${r.t.fromProjectId}` : "Central In-House Warehouse",
      toLocationName: r.toProject || `Project #${r.t.toProjectId}`,
      createdByName: r.creator,
    }))
  );
});

router.post(["/stock-transfers", "/procurement/transfers"], async (req, res): Promise<void> => {
  const b = req.body ?? {};
  const me = await getCurrentUser();
  const transferNum = await generateNumber("TR", stockTransfersTable);

  const [t] = await db
    .insert(stockTransfersTable)
    .values({
      transferNumber: transferNum,
      materialName: b.materialName,
      fromProjectId: b.fromProjectId ?? null,
      toProjectId: b.toProjectId,
      quantity: String(b.quantity),
      unit: b.unit,
      status: "pending",
      notes: b.notes ?? null,
      createdById: me.id,
    })
    .returning();

  res.status(201).json(fTransfer(t!));
});

router.post("/stock-transfers/:id/dispatch", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  const updated = await db.transaction(async (tx) => {
    const [t] = await tx.select().from(stockTransfersTable).where(eq(stockTransfersTable.id, id));
    if (!t) return null;

    // Deduct from source warehouse or site
    const sourceCondition = t.fromProjectId
      ? and(eq(materialsTable.projectId, t.fromProjectId), eq(materialsTable.name, t.materialName))
      : and(isNull(materialsTable.projectId), eq(materialsTable.name, t.materialName));

    const [sourceMat] = await tx.select().from(materialsTable).where(sourceCondition).limit(1);

    if (sourceMat) {
      const cur = Number(sourceMat.quantityOnHand || 0);
      const toDeduct = Number(t.quantity);
      await tx
        .update(materialsTable)
        .set({ quantityOnHand: String(Math.max(0, cur - toDeduct)) })
        .where(eq(materialsTable.id, sourceMat.id));
    }

    const [upd] = await tx
      .update(stockTransfersTable)
      .set({
        status: "dispatched",
        dispatchDate: new Date(),
      })
      .where(eq(stockTransfersTable.id, id))
      .returning();

    return upd;
  });

  if (!updated) {
    res.status(404).json({ error: "Transfer not found" });
    return;
  }

  res.json(fTransfer(updated));
});

router.post("/stock-transfers/:id/receive", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  const updated = await db.transaction(async (tx) => {
    const [t] = await tx.select().from(stockTransfersTable).where(eq(stockTransfersTable.id, id));
    if (!t) return null;

    // Credit to destination project site
    const destCondition = and(
      eq(materialsTable.projectId, t.toProjectId),
      eq(materialsTable.name, t.materialName)
    );
    const [destMat] = await tx.select().from(materialsTable).where(destCondition).limit(1);

    if (destMat) {
      const cur = Number(destMat.quantityOnHand || 0);
      await tx
        .update(materialsTable)
        .set({ quantityOnHand: String(cur + Number(t.quantity)) })
        .where(eq(materialsTable.id, destMat.id));
    } else {
      await tx.insert(materialsTable).values({
        projectId: t.toProjectId,
        name: t.materialName,
        unit: t.unit,
        locationType: "site",
        quantityOnHand: String(t.quantity),
        quantityCommitted: "0",
        quantityConsumed: "0",
        minimumStock: "0",
        reorderLevel: "0",
      });
    }

    const [upd] = await tx
      .update(stockTransfersTable)
      .set({
        status: "received",
        receivedDate: new Date(),
      })
      .where(eq(stockTransfersTable.id, id))
      .returning();

    return upd;
  });

  if (!updated) {
    res.status(404).json({ error: "Transfer not found" });
    return;
  }

  res.json(fTransfer(updated));
});

// ============================================================================
// 5. RFQs & Quotation Comparison (L1 Matrix)
// ============================================================================
router.get("/rfqs", async (_req, res): Promise<void> => {
  const rows = await db
    .select({ r: rfqsTable, p: projectsTable.name })
    .from(rfqsTable)
    .leftJoin(projectsTable, eq(projectsTable.id, rfqsTable.projectId))
    .orderBy(desc(rfqsTable.createdAt));
  res.json(rows.map((r) => ({ ...r.r, projectName: r.p })));
});

router.post("/rfqs", async (req, res): Promise<void> => {
  const b = req.body ?? {};
  const me = await getCurrentUser();
  const [r] = await db
    .insert(rfqsTable)
    .values({
      projectId: b.projectId,
      materialRequestId: b.materialRequestId ?? null,
      title: b.title,
      description: b.description ?? null,
      deadlineDate: b.deadlineDate ?? null,
      termsAndConditions: b.termsAndConditions ?? null,
      invitedVendorIds: b.invitedVendorIds ? JSON.stringify(b.invitedVendorIds) : null,
      createdById: me.id,
    })
    .returning();
  res.status(201).json(r);
});

router.get("/rfqs/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  const [r] = await db
    .select({ r: rfqsTable, p: projectsTable.name })
    .from(rfqsTable)
    .leftJoin(projectsTable, eq(projectsTable.id, rfqsTable.projectId))
    .where(eq(rfqsTable.id, id));

  if (!r) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  const quotations = await db
    .select({
      q: quotationsTable,
      vn: vendorsTable.name,
      rating: vendorsTable.rating,
    })
    .from(quotationsTable)
    .leftJoin(vendorsTable, eq(vendorsTable.id, quotationsTable.vendorId))
    .where(eq(quotationsTable.rfqId, id))
    .orderBy(quotationsTable.amount);

  // Mark lowest quote as L1
  const sortedQuotes = quotations.map((q, idx) => ({
    ...fQuote(q.q),
    vendorName: q.vn,
    vendorRating: Number(q.rating || 0),
    isL1: idx === 0,
  }));

  res.json({
    ...r.r,
    projectName: r.p,
    quotations: sortedQuotes,
  });
});

router.post("/rfqs/:id/send", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  const vendorIds = req.body?.vendorIds;

  const [r] = await db
    .update(rfqsTable)
    .set({
      status: "sent",
      invitedVendorIds: vendorIds ? JSON.stringify(vendorIds) : undefined,
    })
    .where(eq(rfqsTable.id, id))
    .returning();

  if (!r) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(r);
});

router.post("/rfqs/:id/convert-to-po", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  const me = await getCurrentUser();

  const [rfq] = await db.select().from(rfqsTable).where(eq(rfqsTable.id, id));
  if (!rfq) {
    res.status(404).json({ error: "RFQ not found" });
    return;
  }

  // Find selected quote or specified quote
  let quoteId = req.body?.quotationId;
  let quote;
  if (quoteId) {
    [quote] = await db.select().from(quotationsTable).where(eq(quotationsTable.id, quoteId));
  } else {
    [quote] = await db
      .select()
      .from(quotationsTable)
      .where(and(eq(quotationsTable.rfqId, id), eq(quotationsTable.isSelected, true)));
  }

  if (!quote) {
    // Fall back to lowest quote
    const [lowest] = await db
      .select()
      .from(quotationsTable)
      .where(eq(quotationsTable.rfqId, id))
      .orderBy(quotationsTable.amount)
      .limit(1);
    quote = lowest;
  }

  if (!quote) {
    res.status(400).json({ error: "No quotations received for this RFQ yet." });
    return;
  }

  // Mark winning quote as selected
  await db.update(quotationsTable).set({ isSelected: false }).where(eq(quotationsTable.rfqId, id));
  await db.update(quotationsTable).set({ isSelected: true }).where(eq(quotationsTable.id, quote.id));

  const poNumber = await generateNumber("PO", purchaseOrdersTable);
  const deliveryDays = quote.deliveryDays || 7;
  const targetDate = new Date(Date.now() + deliveryDays * 86400000).toISOString().split("T")[0];

  const [po] = await db
    .insert(purchaseOrdersTable)
    .values({
      projectId: rfq.projectId,
      vendorId: quote.vendorId,
      poNumber,
      description: `Purchase for ${rfq.title}`,
      totalAmount: quote.amount,
      deliveryDate: targetDate,
      status: "issued",
      inspectionStatus: "pending",
      rfqId: rfq.id,
      quotationId: quote.id,
      materialRequestId: rfq.materialRequestId,
      createdById: me.id,
    })
    .returning();

  await db.update(rfqsTable).set({ status: "awarded" }).where(eq(rfqsTable.id, id));

  res.status(201).json(fPo(po!));
});

router.patch("/rfqs/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  const b = req.body ?? {};
  const update: Record<string, unknown> = {};
  for (const k of ["status", "title", "description", "deadlineDate", "termsAndConditions"]) {
    if (b[k] !== undefined) update[k] = b[k];
  }
  const [r] = await db
    .update(rfqsTable)
    .set(update)
    .where(eq(rfqsTable.id, id))
    .returning();
  if (!r) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(r);
});

router.post("/rfqs/:rfqId/quotations", async (req, res): Promise<void> => {
  const rfqId = parseInt(req.params.rfqId as string, 10);
  const b = req.body ?? {};

  const [q] = await db
    .insert(quotationsTable)
    .values({
      rfqId,
      vendorId: b.vendorId,
      amount: String(b.amount),
      unitPrice: b.unitPrice != null ? String(b.unitPrice) : null,
      taxAmount: b.taxAmount != null ? String(b.taxAmount) : null,
      freightCharges: b.freightCharges != null ? String(b.freightCharges) : null,
      deliveryDays: b.deliveryDays || 7,
      paymentTerms: b.paymentTerms ?? null,
      notes: b.notes ?? null,
    })
    .returning();

  await db
    .update(rfqsTable)
    .set({ status: "quotes_received" })
    .where(eq(rfqsTable.id, rfqId));

  res.status(201).json(fQuote(q!));
});

router.post("/quotations/:id/select", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  const [q] = await db
    .select()
    .from(quotationsTable)
    .where(eq(quotationsTable.id, id));
  if (!q) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  await db
    .update(quotationsTable)
    .set({ isSelected: false })
    .where(eq(quotationsTable.rfqId, q.rfqId));
  const [updated] = await db
    .update(quotationsTable)
    .set({ isSelected: true })
    .where(eq(quotationsTable.id, id))
    .returning();
  await db
    .update(rfqsTable)
    .set({ status: "awarded" })
    .where(eq(rfqsTable.id, q.rfqId));
  res.json(fQuote(updated!));
});

// ============================================================================
// 6. Purchase Orders (PO Tracking, Inspection, & Auto-Fulfillment)
// ============================================================================
router.get(["/purchase-orders", "/procurement/orders"], async (_req, res): Promise<void> => {
  const rows = await db
    .select({
      po: purchaseOrdersTable,
      p: projectsTable.name,
      vn: vendorsTable.name,
    })
    .from(purchaseOrdersTable)
    .leftJoin(projectsTable, eq(projectsTable.id, purchaseOrdersTable.projectId))
    .leftJoin(vendorsTable, eq(vendorsTable.id, purchaseOrdersTable.vendorId))
    .orderBy(desc(purchaseOrdersTable.createdAt));
  res.json(
    rows.map((r) => ({ ...fPo(r.po), projectName: r.p, vendorName: r.vn }))
  );
});

router.post(["/purchase-orders", "/procurement/orders"], async (req, res): Promise<void> => {
  const b = req.body ?? {};
  const me = await getCurrentUser();
  const poNumber =
    b.poNumber || (await generateNumber("PO", purchaseOrdersTable));
  const [po] = await db
    .insert(purchaseOrdersTable)
    .values({
      projectId: b.projectId,
      vendorId: b.vendorId,
      poNumber,
      description: b.description ?? null,
      totalAmount: String(b.totalAmount),
      deliveryDate: b.deliveryDate ?? null,
      deliveryDestination: b.deliveryDestination ?? "site",
      status: b.status ?? "draft",
      createdById: me.id,
    })
    .returning();
  res.status(201).json(fPo(po!));
});

router.post("/purchase-orders/:id/acknowledge", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  const today = new Date().toISOString().split("T")[0];

  const [po] = await db
    .update(purchaseOrdersTable)
    .set({
      status: "acknowledged",
      acknowledgmentDate: today,
    })
    .where(eq(purchaseOrdersTable.id, id))
    .returning();

  if (!po) {
    res.status(404).json({ error: "PO not found" });
    return;
  }
  res.json(fPo(po));
});

router.post("/purchase-orders/:id/track", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  const b = req.body ?? {};

  const [po] = await db
    .update(purchaseOrdersTable)
    .set({
      status: "in_transit",
      trackingNumber: b.trackingNumber ?? undefined,
      transporterName: b.transporterName ?? undefined,
      deliveryDate: b.expectedDeliveryDate ?? undefined,
    })
    .where(eq(purchaseOrdersTable.id, id))
    .returning();

  if (!po) {
    res.status(404).json({ error: "PO not found" });
    return;
  }
  res.json(fPo(po));
});

router.post("/purchase-orders/:id/follow-up", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  const [existing] = await db.select().from(purchaseOrdersTable).where(eq(purchaseOrdersTable.id, id));

  if (!existing) {
    res.status(404).json({ error: "PO not found" });
    return;
  }

  const count = (existing.followUpCount || 0) + 1;
  const newNotes = req.body?.notes
    ? `${existing.followUpNotes ? existing.followUpNotes + "\n" : ""}[${new Date().toLocaleDateString()}] ${req.body.notes}`
    : existing.followUpNotes;

  const [po] = await db
    .update(purchaseOrdersTable)
    .set({
      followUpCount: count,
      lastFollowUpDate: new Date(),
      followUpNotes: newNotes,
    })
    .where(eq(purchaseOrdersTable.id, id))
    .returning();

  res.json(fPo(po!));
});

router.post("/purchase-orders/:id/receive", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  const [po] = await db
    .update(purchaseOrdersTable)
    .set({ status: "received" })
    .where(eq(purchaseOrdersTable.id, id))
    .returning();

  if (!po) {
    res.status(404).json({ error: "PO not found" });
    return;
  }
  res.json(fPo(po));
});

router.post("/purchase-orders/:id/inspect", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  const me = await getCurrentUser();
  const { passed, notes, quantityReceived } = req.body ?? {};

  const [po] = await db.select().from(purchaseOrdersTable).where(eq(purchaseOrdersTable.id, id));
  if (!po) {
    res.status(404).json({ error: "PO not found" });
    return;
  }

  if (passed) {
    const grnNumber = await generateNumber("GRN", purchaseOrdersTable);
    const updatedPo = await db.transaction(async (tx) => {
      const [upd] = await tx
        .update(purchaseOrdersTable)
        .set({
          inspectionStatus: "passed",
          status: "delivered",
          inspectedById: me.id,
          inspectedAt: new Date(),
          inspectionNotes: notes || "Quality check approved. All materials conforming to specification.",
          grnNumber,
        })
        .where(eq(purchaseOrdersTable.id, id))
        .returning();

      // 1. Credit Stock (Site or Central Warehouse)
      const targetProjectId = po.deliveryDestination === "warehouse" ? null : po.projectId;
      const materialName = po.description?.replace("Purchase for ", "").replace("PO for ", "") || "Procured Material";
      const qtyToAdd = Number(quantityReceived || 1);

      const condition = targetProjectId
        ? and(eq(materialsTable.projectId, targetProjectId), eq(materialsTable.name, materialName))
        : and(isNull(materialsTable.projectId), eq(materialsTable.name, materialName));

      const [existingMat] = await tx.select().from(materialsTable).where(condition).limit(1);

      if (existingMat) {
        await tx
          .update(materialsTable)
          .set({
            quantityOnHand: String(Number(existingMat.quantityOnHand || 0) + qtyToAdd),
          })
          .where(eq(materialsTable.id, existingMat.id));
      } else {
        await tx.insert(materialsTable).values({
          projectId: targetProjectId,
          name: materialName,
          unit: "Nos",
          locationType: targetProjectId ? "site" : "warehouse",
          quantityOnHand: String(qtyToAdd),
          quantityCommitted: "0",
          quantityConsumed: "0",
          minimumStock: "10",
          reorderLevel: "5",
          unitCost: String(Math.round(Number(po.totalAmount) / qtyToAdd)),
        });
      }

      // 2. Mark linked MR fulfilled if exists
      if (po.materialRequestId) {
        await tx
          .update(materialRequestsTable)
          .set({ status: "fulfilled" })
          .where(eq(materialRequestsTable.id, po.materialRequestId));
      }

      // 3. Update Project Cost / Budget Actuals
      const [budgetItem] = await tx
        .select()
        .from(budgetItemsTable)
        .where(eq(budgetItemsTable.projectId, po.projectId))
        .limit(1);

      if (budgetItem) {
        const curActual = Number(budgetItem.actual || 0);
        await tx
          .update(budgetItemsTable)
          .set({
            actual: String(curActual + Number(po.totalAmount)),
          })
          .where(eq(budgetItemsTable.id, budgetItem.id));
      }

      // 4. Log Audit
      await tx.insert(auditLogsTable).values({
        userId: me.id,
        activity: `Quality Inspection Passed for ${po.poNumber} (GRN: ${grnNumber}). Stock credited & Project Cost updated.`,
        resourceType: "purchase_order",
        resourceId: po.id,
        status: "success",
      });

      return upd;
    });

    res.json(fPo(updatedPo!));
  } else {
    // Quality Rejected branch in atomic transaction
    const updatedPo = await db.transaction(async (tx) => {
      const [upd] = await tx
        .update(purchaseOrdersTable)
        .set({
          inspectionStatus: "failed",
          status: "rejected_and_returned",
          inspectedById: me.id,
          inspectedAt: new Date(),
          inspectionNotes: notes || "Quality check failed. Material returned to vendor.",
        })
        .where(eq(purchaseOrdersTable.id, id))
        .returning();

      await tx.insert(auditLogsTable).values({
        userId: me.id,
        activity: `Quality Inspection Rejected for ${po.poNumber}. Material returned to vendor.`,
        resourceType: "purchase_order",
        resourceId: po.id,
        status: "rejected",
      });

      return upd;
    });

    res.json(fPo(updatedPo!));
  }
});

router.patch("/purchase-orders/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  const b = req.body ?? {};
  const update: Record<string, unknown> = {};
  if (b.status !== undefined) update.status = b.status;
  if (b.inspectionStatus !== undefined) update.inspectionStatus = b.inspectionStatus;
  if (b.trackingNumber !== undefined) update.trackingNumber = b.trackingNumber;
  if (b.transporterName !== undefined) update.transporterName = b.transporterName;

  const [po] = await db
    .update(purchaseOrdersTable)
    .set(update)
    .where(eq(purchaseOrdersTable.id, id))
    .returning();

  if (!po) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(fPo(po));
});

// ============================================================================
// 7. Materials & Site Consumption
// ============================================================================
router.get(["/materials", "/procurement/materials"], async (_req, res): Promise<void> => {
  const rows = await db
    .select({ m: materialsTable, p: projectsTable.name })
    .from(materialsTable)
    .leftJoin(projectsTable, eq(projectsTable.id, materialsTable.projectId))
    .orderBy(materialsTable.name);
  res.json(rows.map((r) => ({ ...fMat(r.m), projectName: r.p })));
});

router.post(["/materials", "/procurement/materials"], async (req, res): Promise<void> => {
  const b = req.body ?? {};
  const [m] = await db
    .insert(materialsTable)
    .values({
      projectId: b.projectId ?? null,
      name: b.name,
      description: b.description ?? null,
      unit: b.unit,
      locationType: b.projectId ? "site" : "warehouse",
      locationName: b.locationName ?? null,
      quantityOnHand: String(b.quantityOnHand ?? 0),
      quantityCommitted: String(b.quantityCommitted ?? 0),
      quantityConsumed: String(b.quantityConsumed ?? 0),
      minimumStock: String(b.minimumStock ?? 0),
      reorderLevel: String(b.reorderLevel ?? 0),
      unitCost: String(b.unitCost ?? 0),
    })
    .returning();
  res.status(201).json(fMat(m!));
});

router.post("/materials/:id/consume", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  const me = await getCurrentUser();
  const qtyToConsume = Number(req.body?.quantity || 0);

  const [mat] = await db.select().from(materialsTable).where(eq(materialsTable.id, id));
  if (!mat) {
    res.status(404).json({ error: "Material not found" });
    return;
  }

  const currentOnHand = Number(mat.quantityOnHand || 0);
  const currentConsumed = Number(mat.quantityConsumed || 0);
  const newOnHand = Math.max(0, currentOnHand - qtyToConsume);
  const newConsumed = currentConsumed + qtyToConsume;

  const [updated] = await db
    .update(materialsTable)
    .set({
      quantityOnHand: String(newOnHand),
      quantityConsumed: String(newConsumed),
    })
    .where(eq(materialsTable.id, id))
    .returning();

  await db.insert(auditLogsTable).values({
    userId: me.id,
    activity: `Consumed ${qtyToConsume} ${mat.unit} of "${mat.name}" on site.`,
    resourceType: "material",
    resourceId: mat.id,
    status: "success",
  });

  res.json(fMat(updated!));
});

router.patch("/materials/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  const b = req.body ?? {};
  const update: Record<string, unknown> = {};
  for (const k of ["projectId", "name", "description", "unit", "locationType", "locationName"]) {
    if (b[k] !== undefined) update[k] = b[k];
  }
  for (const k of [
    "quantityOnHand",
    "quantityCommitted",
    "quantityConsumed",
    "minimumStock",
    "reorderLevel",
    "unitCost",
  ]) {
    if (b[k] !== undefined) update[k] = String(b[k]);
  }
  const [m] = await db
    .update(materialsTable)
    .set(update)
    .where(eq(materialsTable.id, id))
    .returning();
  if (!m) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(fMat(m));
});

export default router;
