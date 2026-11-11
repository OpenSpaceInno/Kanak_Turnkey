import { eq, and, isNull } from "drizzle-orm";
import {
  db,
  usersTable,
  leadsTable,
  leadActivitiesTable,
  siteVisitsTable,
  drawingsTable,
  boqsTable,
  boqItemsTable,
  negotiationsTable,
  projectsTable,
  tasksTable,
  budgetItemsTable,
  raBillsTable,
  expensesTable,
  invoicesTable,
  vendorInvoicesTable,
  financialInstrumentsTable,
  vendorsTable,
  materialRequestsTable,
  rfqsTable,
  quotationsTable,
  purchaseOrdersTable,
  materialsTable,
  stockTransfersTable,
  stakeholdersTable,
  communicationsTable,
  meetingsTable,
  documentsTable,
  notificationsTable,
  auditLogsTable,
  rolesTable,
  companySettingsTable,
} from "@workspace/db";
import { logger } from "./lib/logger";
import { hashPassword } from "./lib/password";

async function ensureWarehouseSeed(): Promise<void> {
  try {
    const [warehouseMat] = await db
      .select()
      .from(materialsTable)
      .where(eq(materialsTable.locationType, "warehouse"))
      .limit(1);

    if (!warehouseMat) {
      logger.info("Seeding Central In-House Warehouse materials...");
      await db.insert(materialsTable).values([
        {
          projectId: null,
          name: "Cement — OPC 53 grade",
          unit: "bag",
          locationType: "warehouse",
          locationName: "Central In-House Warehouse",
          quantityOnHand: "650",
          quantityCommitted: "150",
          quantityConsumed: "0",
          minimumStock: "200",
          reorderLevel: "300",
          unitCost: "380",
        },
        {
          projectId: null,
          name: "TMT steel bars 12mm",
          unit: "kg",
          locationType: "warehouse",
          locationName: "Central In-House Warehouse",
          quantityOnHand: "5200",
          quantityCommitted: "800",
          quantityConsumed: "0",
          minimumStock: "2000",
          reorderLevel: "2500",
          unitCost: "68",
        },
        {
          projectId: null,
          name: "Copper wire 4mm",
          unit: "m",
          locationType: "warehouse",
          locationName: "Central In-House Warehouse",
          quantityOnHand: "1200",
          quantityCommitted: "200",
          quantityConsumed: "0",
          minimumStock: "300",
          reorderLevel: "500",
          unitCost: "115",
        },
        {
          projectId: null,
          name: "Vitrified Tiles 600x600",
          unit: "sqft",
          locationType: "warehouse",
          locationName: "Central In-House Warehouse",
          quantityOnHand: "2400",
          quantityCommitted: "0",
          quantityConsumed: "0",
          minimumStock: "500",
          reorderLevel: "800",
          unitCost: "55",
        },
      ]);
    }

    const [existingTransfer] = await db.select().from(stockTransfersTable).limit(1);
    if (!existingTransfer) {
      const [firstProject] = await db.select().from(projectsTable).limit(1);
      const [firstUser] = await db.select().from(usersTable).limit(1);
      if (firstProject && firstUser) {
        logger.info("Seeding initial stock transfers...");
        await db.insert(stockTransfersTable).values([
          {
            transferNumber: "TR-20260515-0001",
            materialName: "Cement — OPC 53 grade",
            fromProjectId: null,
            toProjectId: firstProject.id,
            quantity: "150",
            unit: "bag",
            status: "dispatched",
            dispatchDate: new Date(),
            notes: "Internal stock transfer from central warehouse for Tower 2 foundation.",
            createdById: firstUser.id,
          },
          {
            transferNumber: "TR-20260518-0002",
            materialName: "Copper wire 4mm",
            fromProjectId: null,
            toProjectId: firstProject.id,
            quantity: "200",
            unit: "m",
            status: "pending",
            notes: "Transfer scheduled for electrical riser work.",
            createdById: firstUser.id,
          },
        ]);
      }
    }
  } catch (err) {
    logger.error({ err }, "ensureWarehouseSeed failed");
  }
}

async function ensureFinanceSeed(): Promise<void> {
  try {
    const [existingRa] = await db.select().from(raBillsTable).limit(1);
    const projects = await db.select().from(projectsTable);
    const users = await db.select().from(usersTable);
    const pos = await db.select().from(purchaseOrdersTable);
    const vendors = await db.select().from(vendorsTable);

    const p1 = projects[0]?.id || 1;
    const p2 = projects[1]?.id || 2;
    const adminUser = users[0]?.id || 1;

    if (!existingRa && p1) {
      logger.info("Seeding initial Running Account (RA) Bills...");
      await db.insert(raBillsTable).values([
        {
          projectId: p1,
          billNumber: "RA-SEN-2026-001",
          milestone: "50% Structural RCC Slab Completed",
          description: "Certified progress bill for Tower 2 Level 4 structural casting.",
          workCompletionPercent: "50.00",
          grossAmount: "3200000",
          retentionPercent: "5.00",
          retentionAmount: "160000",
          advanceDeduction: "200000",
          netBillableAmount: "2840000",
          amount: "2840000",
          supportingDocsUrl: "JMS_Tower2_L4_RCC.pdf, Concrete_Cube_28Day_Test.pdf",
          status: "submitted",
          createdById: adminUser,
        },
        {
          projectId: p2,
          billNumber: "RA-CTY-2026-002",
          milestone: "MEP Electrical Riser & Conduit Installation",
          description: "Running bill for electrical shafts and DB dressing floors 1 to 12.",
          workCompletionPercent: "72.00",
          grossAmount: "4500000",
          retentionPercent: "5.00",
          retentionAmount: "225000",
          advanceDeduction: "0",
          netBillableAmount: "4275000",
          amount: "4275000",
          supportingDocsUrl: "JMS_MEP_Shafts_F1_12.pdf",
          status: "approved",
          pmApprovedById: adminUser,
          pmApprovedAt: new Date(),
          createdById: adminUser,
        },
        {
          projectId: p2,
          billNumber: "RA-CTY-2026-001",
          milestone: "Basement HVAC Ducting & Plant Room Installation",
          description: "Primary chiller installation and primary chilled water headers.",
          workCompletionPercent: "100.00",
          grossAmount: "2000000",
          retentionPercent: "5.00",
          retentionAmount: "100000",
          advanceDeduction: "0",
          netBillableAmount: "1900000",
          amount: "1900000",
          supportingDocsUrl: "JMS_Basement_Chillers.pdf, Pressure_Test_Certificate.pdf",
          status: "invoiced",
          pmApprovedById: adminUser,
          pmApprovedAt: new Date(),
          createdById: adminUser,
        },
      ]);
    }

    // Ensure site petty cash vouchers exist in expensesTable
    const [existingSiteExp] = await db
      .select()
      .from(expensesTable)
      .where(eq(expensesTable.paymentMode, "petty_cash"))
      .limit(1);

    if (!existingSiteExp && p1) {
      logger.info("Seeding initial Site Petty Cash & Field Expenses...");
      await db.insert(expensesTable).values([
        {
          projectId: p1,
          description: "10 bags OPC-53 cement for urgent column honeycombing repair",
          amount: "3800",
          category: "materials",
          paymentMode: "petty_cash",
          vendorOrShopName: "Shree Ganesh Hardware & Cement",
          billReferenceNumber: "CM-4821",
          materialName: "Cement — OPC 53 grade",
          materialQuantity: "10",
          materialUnit: "bag",
          creditedToInventory: true,
          expenseDate: new Date().toISOString().split("T")[0],
          status: "submitted",
          submittedById: adminUser,
        },
        {
          projectId: p1,
          description: "Diesel fuel for 125kVA generator during power shutdown (60 L)",
          amount: "5400",
          category: "fuel",
          paymentMode: "petty_cash",
          vendorOrShopName: "HP Auto Fuel Hinjewadi",
          billReferenceNumber: "HP-99381",
          expenseDate: new Date().toISOString().split("T")[0],
          status: "approved",
          submittedById: adminUser,
          approvedById: adminUser,
          approvedAt: new Date(),
        },
        {
          projectId: p2,
          description: "Urgent core cutting drill bits and anchor fasteners",
          amount: "2200",
          category: "tools",
          paymentMode: "site_upi",
          vendorOrShopName: "Peenya Industrial Fasteners",
          billReferenceNumber: "UPI-TXN-7721",
          expenseDate: new Date().toISOString().split("T")[0],
          status: "settled",
          submittedById: adminUser,
          approvedById: adminUser,
          approvedAt: new Date(),
          settledAt: new Date(),
          settlementReference: "FLOAT-SETTLE-001",
        },
      ]);
    }

    // Ensure PO linkage on vendor invoices if missing
    if (pos.length > 0) {
      const [vinv] = await db.select().from(vendorInvoicesTable).limit(1);
      if (vinv && !vinv.poAmount) {
        logger.info("Enriching vendor invoices with PO & matching data...");
        for (const po of pos) {
          await db
            .update(vendorInvoicesTable)
            .set({
              poAmount: po.totalAmount,
              grnNumber: po.grnNumber,
              isMatched: po.inspectionStatus === "passed",
              matchedAt: po.inspectionStatus === "passed" ? new Date() : null,
              status: po.inspectionStatus === "passed" ? "matched" : "discrepancy",
            })
            .where(eq(vendorInvoicesTable.purchaseOrderId, po.id));
        }
      }
    }
  } catch (err) {
    logger.error({ err }, "ensureFinanceSeed failed");
  }
}

export async function ensureTrack1ClientBillingSeed(): Promise<void> {
  try {
    const [firstProject] = await db.select().from(projectsTable).limit(1);
    const [secondProject] = await db.select().from(projectsTable).offset(1).limit(1);
    const [firstUser] = await db.select().from(usersTable).limit(1);

    if (!firstProject || !firstUser) return;

    const p1Id = firstProject.id;
    const p2Id = secondProject ? secondProject.id : p1Id;
    const today = new Date().toISOString().split("T")[0];

    logger.info("Verifying & Seeding Track 1 Client Billing (AR) states...");

    // 1. Backfill legacy null fields on existing RA Bills
    const existingBills = await db.select().from(raBillsTable);
    for (const b of existingBills) {
      if (!b.grossAmount || !b.netBillableAmount) {
        const amt = Number(b.amount || 2000000);
        const ret = Math.round(amt * 0.05);
        await db
          .update(raBillsTable)
          .set({
            grossAmount: String(amt),
            retentionPercent: "5.00",
            retentionAmount: String(ret),
            advanceDeduction: "0",
            netBillableAmount: String(amt - ret),
            workCompletionPercent: b.workCompletionPercent || "50.00",
            supportingDocsUrl: b.supportingDocsUrl || "Joint_Measurement_Sheet.pdf, QC_Test_Cert.pdf",
          })
          .where(eq(raBillsTable.id, b.id));
      }
    }

    // 2. Backfill legacy null totalWithTax on existing Invoices
    const existingInvoices = await db.select().from(invoicesTable);
    for (const inv of existingInvoices) {
      if (!inv.totalWithTax) {
        const base = Number(inv.amount || 1000000);
        const tax = Math.round(base * 0.18);
        await db
          .update(invoicesTable)
          .set({
            taxRate: "18.00",
            taxAmount: String(tax),
            totalWithTax: String(base + tax),
            gstin: inv.gstin || "27AABCK1234F1Z5",
          })
          .where(eq(invoicesTable.id, inv.id));
      }
    }

    // 3. Ensure a Draft RA Bill exists (Ready for Verification & Submission)
    const [draftRa] = await db
      .select()
      .from(raBillsTable)
      .where(eq(raBillsTable.status, "draft"))
      .limit(1);

    if (!draftRa) {
      await db.insert(raBillsTable).values({
        projectId: p1Id,
        billNumber: "RA-SEN-2026-004",
        milestone: "Flooring Screed & False Ceiling Measurement (Floor 6)",
        description: "Joint measurements recorded on site by Site Engineer for 12,000 sqft false ceiling grid and floor screed.",
        workCompletionPercent: "45.00",
        grossAmount: "2200000",
        retentionPercent: "5.00",
        retentionAmount: "110000",
        advanceDeduction: "50000",
        netBillableAmount: "2040000",
        amount: "2040000",
        supportingDocsUrl: "JMS_Floor6_FalseCeiling.pdf, Measurement_Book_Vol3.pdf",
        status: "draft",
        createdById: firstUser.id,
      });
    }

    // 4. Ensure an RA Bill in 'revision_requested' exists (Showing PM remarks & Resubmission)
    const [revRa] = await db
      .select()
      .from(raBillsTable)
      .where(eq(raBillsTable.status, "revision_requested"))
      .limit(1);

    if (!revRa) {
      await db.insert(raBillsTable).values({
        projectId: p1Id,
        billNumber: "RA-SEN-2026-003",
        milestone: "Glazing & External Facade Cladding",
        description: "Facade bracket fixing and double-glazed unit installation floors 1 to 4.",
        workCompletionPercent: "60.00",
        grossAmount: "4200000",
        retentionPercent: "5.00",
        retentionAmount: "210000",
        advanceDeduction: "0",
        netBillableAmount: "3990000",
        amount: "3990000",
        supportingDocsUrl: "JMS_Facade_F1_4.pdf",
        status: "revision_requested",
        revisionRemarks: "Deduct west elevation panels pending wind load test certification (approx ₹4.5L). Resubmit with updated JMS.",
        createdById: firstUser.id,
      });
    }

    // 5. Ensure an RA Bill in 'approved' exists (Ready to Generate Tax Invoice)
    const [approvedRa] = await db
      .select()
      .from(raBillsTable)
      .where(and(eq(raBillsTable.status, "approved"), isNull(raBillsTable.invoiceId)))
      .limit(1);

    if (!approvedRa) {
      await db.insert(raBillsTable).values({
        projectId: p2Id,
        billNumber: "RA-CTY-2026-004",
        milestone: "Plumbing & Sanitary Lines (Tower A Floors 1-8)",
        description: "Certified progress bill approved by Project Manager, ready for Tax Invoice issuance.",
        workCompletionPercent: "80.00",
        grossAmount: "1800000",
        retentionPercent: "5.00",
        retentionAmount: "90000",
        advanceDeduction: "0",
        netBillableAmount: "1710000",
        amount: "1710000",
        supportingDocsUrl: "JMS_Plumbing_TowerA.pdf, Hydrostatic_Pressure_Test.pdf",
        status: "approved",
        pmApprovedById: firstUser.id,
        pmApprovedAt: new Date(),
        createdById: firstUser.id,
      });
    }

    // 6. Ensure a Client Invoice in 'draft' exists (Ready to Send to Client)
    const [draftInv] = await db
      .select()
      .from(invoicesTable)
      .where(eq(invoicesTable.status, "draft"))
      .limit(1);

    if (!draftInv) {
      await db.insert(invoicesTable).values({
        projectId: p2Id,
        invoiceNumber: "INV-2026-0051",
        clientName: secondProject?.clientName || "Citygate Developers",
        amount: "1710000",
        gstin: "27AABCC8831K1ZX",
        taxRate: "18.00",
        taxAmount: "307800",
        totalWithTax: "2017800",
        invoiceDate: today,
        dueDate: new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0],
        status: "draft",
      });
    }

    // 7. Ensure an Overdue Client Invoice with Reminders exists
    const [overdueInv] = await db
      .select()
      .from(invoicesTable)
      .where(eq(invoicesTable.status, "overdue"))
      .limit(1);

    if (!overdueInv) {
      await db.insert(invoicesTable).values({
        projectId: p1Id,
        invoiceNumber: "INV-2026-0038",
        clientName: firstProject.clientName || "Sentinel Realty",
        amount: "1800000",
        gstin: "27AABCK1234F1Z5",
        taxRate: "18.00",
        taxAmount: "324000",
        totalWithTax: "2124000",
        invoiceDate: "2026-03-01",
        dueDate: "2026-04-01",
        paymentRemindersCount: 2,
        lastReminderDate: new Date(),
        reminderNotes: "[15-Apr] Sent formal reminder letter #1 to client Accounts Payable.\n[28-Apr] Telephonic follow-up with VP Commercial, promised clearance by month-end.",
        status: "overdue",
      });
    }

    // 8. Ensure a Paid Client Invoice ready for Bank Reconciliation exists
    const [paidInv] = await db
      .select()
      .from(invoicesTable)
      .where(and(eq(invoicesTable.status, "paid"), eq(invoicesTable.reconciled, false)))
      .limit(1);

    if (!paidInv) {
      await db.insert(invoicesTable).values({
        projectId: p1Id,
        invoiceNumber: "INV-2026-0044",
        clientName: firstProject.clientName || "Sentinel Realty",
        amount: "1200000",
        gstin: "27AABCK1234F1Z5",
        taxRate: "18.00",
        taxAmount: "216000",
        totalWithTax: "1416000",
        invoiceDate: "2026-04-10",
        dueDate: "2026-05-10",
        paymentDate: "2026-05-02",
        paymentReference: "UTR-HDFC-991823719",
        tdsAmount: "24000",
        netReceivedAmount: "1392000",
        reconciled: false,
        status: "paid",
      });
    }
  } catch (err) {
    logger.error({ err }, "ensureTrack1ClientBillingSeed failed");
  }
}

export async function ensureTrack2VendorInvoicingSeed(): Promise<void> {
  try {
    const [firstProject] = await db.select().from(projectsTable).limit(1);
    const [secondProject] = await db.select().from(projectsTable).offset(1).limit(1);
    const [firstUser] = await db.select().from(usersTable).limit(1);
    const allVendors = await db.select().from(vendorsTable);

    if (!firstProject || !firstUser || allVendors.length < 2) return;

    const p1Id = firstProject.id;
    const p2Id = secondProject ? secondProject.id : p1Id;
    const today = new Date().toISOString().split("T")[0];
    const schedDate = new Date(Date.now() + 3 * 86400000).toISOString().split("T")[0];
    const dueDate30 = new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0];

    const v1 = allVendors[0]!; // Aarav Steel
    const v2 = allVendors[1]!; // Polaris Electricals
    const v3 = allVendors[2] || v1; // Helios HVAC
    const v4 = allVendors[3] || v2; // Ridgeline Interiors

    logger.info("Verifying & Seeding Track 2 Vendor Invoicing (AP 3-Way Match) states...");

    // Helper to ensure a dedicated PO for finance matching
    async function ensureFinPo(
      poNum: string,
      desc: string,
      amt: string,
      vendId: number,
      projId: number,
      grn: string
    ) {
      const [existing] = await db
        .select()
        .from(purchaseOrdersTable)
        .where(eq(purchaseOrdersTable.poNumber, poNum))
        .limit(1);

      if (existing) return existing;

      const [newPo] = await db
        .insert(purchaseOrdersTable)
        .values({
          projectId: projId,
          vendorId: vendId,
          poNumber: poNum,
          description: desc,
          totalAmount: amt,
          deliveryDate: today,
          deliveryDestination: "site",
          status: "delivered",
          inspectionStatus: "passed",
          inspectedAt: new Date(),
          inspectedById: firstUser.id,
          inspectionNotes: "Material received at site in full. Quality & quantity verified against DC.",
          grnNumber: grn,
          createdById: firstUser.id,
        })
        .returning();

      return newPo!;
    }

    const po1 = await ensureFinPo(
      "PO-FIN-2026-001",
      "Structural Steel Beams — 12 Tonnes ISMB 300",
      "960000",
      v1.id,
      p1Id,
      "GRN-2026-0960"
    );

    const po2 = await ensureFinPo(
      "PO-FIN-2026-002",
      "Fire Fighting Valves & Piping Systems",
      "1450000",
      v2.id,
      p1Id,
      "GRN-2026-1450"
    );

    const po3 = await ensureFinPo(
      "PO-FIN-2026-003",
      "VRV Air Conditioning Units — 8 Units",
      "2800000",
      v3.id,
      p2Id,
      "GRN-2026-2800"
    );

    const po4 = await ensureFinPo(
      "PO-FIN-2026-004",
      "Acoustic Glass Partition Panels — 4,200 sqft",
      "1125000",
      v4.id,
      p1Id,
      "GRN-2026-1125"
    );

    const po5 = await ensureFinPo(
      "PO-FIN-2026-005",
      "High Voltage Transformers & Busbars",
      "1680000",
      v2.id,
      p2Id,
      "GRN-2026-1680"
    );

    // 1. Stage 1: Received Bill awaiting 3-Way Match
    const [recInv] = await db
      .select()
      .from(vendorInvoicesTable)
      .where(eq(vendorInvoicesTable.invoiceNumber, "VINV-2026-REC01"))
      .limit(1);

    if (!recInv) {
      await db.insert(vendorInvoicesTable).values({
        projectId: p1Id,
        vendorId: v1.id,
        purchaseOrderId: po1.id,
        invoiceNumber: "VINV-2026-REC01",
        amount: "960000",
        poAmount: "960000",
        grnNumber: po1.grnNumber,
        status: "received",
        isMatched: false,
        invoiceDate: today,
        dueDate: dueDate30,
      });
    }

    // 2. Stage 2: Discrepancy Flagged (Price variance) ready to resolve
    const [discInv] = await db
      .select()
      .from(vendorInvoicesTable)
      .where(eq(vendorInvoicesTable.invoiceNumber, "VINV-2026-DISC02"))
      .limit(1);

    if (!discInv) {
      await db.insert(vendorInvoicesTable).values({
        projectId: p1Id,
        vendorId: v2.id,
        purchaseOrderId: po2.id,
        invoiceNumber: "VINV-2026-DISC02",
        amount: "1495000",
        poAmount: "1450000",
        grnNumber: po2.grnNumber,
        status: "discrepancy",
        isMatched: false,
        discrepancyType: "price_variance",
        discrepancyNotes: "Invoiced amount ₹14,95,000 exceeds PO amount ₹14,50,000 by ₹45,000 (unapproved expediting surcharge).",
        invoiceDate: today,
        dueDate: dueDate30,
      });
    }

    // 3. Stage 3: 3-Way Matched ready for payment approval
    const [mchInv] = await db
      .select()
      .from(vendorInvoicesTable)
      .where(eq(vendorInvoicesTable.invoiceNumber, "VINV-2026-MCH03"))
      .limit(1);

    if (!mchInv) {
      await db.insert(vendorInvoicesTable).values({
        projectId: p2Id,
        vendorId: v3.id,
        purchaseOrderId: po3.id,
        invoiceNumber: "VINV-2026-MCH03",
        amount: "2800000",
        poAmount: "2800000",
        grnNumber: po3.grnNumber,
        status: "matched",
        isMatched: true,
        matchedAt: new Date(),
        invoiceDate: today,
        dueDate: dueDate30,
      });
    }

    // 4. Stage 4: Approved for Payment ready to schedule
    const [appInv] = await db
      .select()
      .from(vendorInvoicesTable)
      .where(eq(vendorInvoicesTable.invoiceNumber, "VINV-2026-APP04"))
      .limit(1);

    if (!appInv) {
      await db.insert(vendorInvoicesTable).values({
        projectId: p1Id,
        vendorId: v4.id,
        purchaseOrderId: po4.id,
        invoiceNumber: "VINV-2026-APP04",
        amount: "1125000",
        poAmount: "1125000",
        grnNumber: po4.grnNumber,
        status: "approved_for_payment",
        isMatched: true,
        matchedAt: new Date(),
        invoiceDate: today,
        dueDate: dueDate30,
      });
    }

    // 5. Stage 5: Scheduled ready for disbursement
    const [schInv] = await db
      .select()
      .from(vendorInvoicesTable)
      .where(eq(vendorInvoicesTable.invoiceNumber, "VINV-2026-SCH05"))
      .limit(1);

    if (!schInv) {
      await db.insert(vendorInvoicesTable).values({
        projectId: p2Id,
        vendorId: v2.id,
        purchaseOrderId: po5.id,
        invoiceNumber: "VINV-2026-SCH05",
        amount: "1680000",
        poAmount: "1680000",
        grnNumber: po5.grnNumber,
        status: "scheduled",
        isMatched: true,
        matchedAt: new Date(),
        scheduledPaymentDate: schedDate,
        invoiceDate: today,
        dueDate: dueDate30,
      });
    }
  } catch (err) {
    logger.error({ err }, "ensureTrack2VendorInvoicingSeed failed");
  }
}

export async function ensureTrack3PettyCashSeed(): Promise<void> {
  try {
    const [firstProject] = await db.select().from(projectsTable).limit(1);
    const [secondProject] = await db.select().from(projectsTable).offset(1).limit(1);
    const [thirdProject] = await db.select().from(projectsTable).offset(2).limit(1);
    const [firstUser] = await db.select().from(usersTable).limit(1);

    if (!firstProject || !firstUser) return;

    const p1Id = firstProject.id;
    const p2Id = secondProject ? secondProject.id : p1Id;
    const p3Id = thirdProject ? thirdProject.id : p1Id;
    const today = new Date().toISOString().split("T")[0];

    logger.info("Verifying & Seeding Track 3 Site Petty Cash & Imprest Float states...");

    // 1. Correct legacy large-ticket expenses mistakenly tagged petty_cash
    const allExpenses = await db.select().from(expensesTable);
    for (const e of allExpenses) {
      if (Number(e.amount) > 50000 && e.paymentMode === "petty_cash") {
        await db
          .update(expensesTable)
          .set({ paymentMode: "bank_transfer" })
          .where(eq(expensesTable.id, e.id));
      }
    }

    // 2. Ensure reasonable Sanctioned Floats on projects
    if (!firstProject.pettyCashFloat || Number(firstProject.pettyCashFloat) < 50000) {
      await db
        .update(projectsTable)
        .set({ pettyCashFloat: "50000" })
        .where(eq(projectsTable.id, p1Id));
    }
    if (secondProject && (!secondProject.pettyCashFloat || Number(secondProject.pettyCashFloat) < 75000)) {
      await db
        .update(projectsTable)
        .set({ pettyCashFloat: "75000" })
        .where(eq(projectsTable.id, p2Id));
    }
    if (thirdProject && (!thirdProject.pettyCashFloat || Number(thirdProject.pettyCashFloat) < 40000)) {
      await db
        .update(projectsTable)
        .set({ pettyCashFloat: "40000" })
        .where(eq(projectsTable.id, p3Id));
    }

    // 3. Scenario 1: Submitted Spot Material Purchase (Ready for PM Review & Approval)
    const [subExp] = await db
      .select()
      .from(expensesTable)
      .where(eq(expensesTable.billReferenceNumber, "CM-NF-8821"))
      .limit(1);

    if (!subExp) {
      await db.insert(expensesTable).values({
        projectId: p1Id,
        description: "20 boxes heavy-duty wedge anchor bolts & masonry drill bits",
        amount: "4200",
        category: "materials",
        expenseDate: today,
        receiptUrl: "SiteCashMemo_NF8821.jpg",
        status: "submitted",
        paymentMode: "petty_cash",
        vendorOrShopName: "National Fasteners & Tool Store, MIDC",
        billReferenceNumber: "CM-NF-8821",
        materialName: "Hilti Wedge Anchor Bolts 12x100mm",
        materialQuantity: "20",
        materialUnit: "box",
        creditedToInventory: true,
        submittedById: firstUser.id,
      });

      // Also ensure the material is reflected in site materials
      const [existingMat] = await db
        .select()
        .from(materialsTable)
        .where(
          and(
            eq(materialsTable.projectId, p1Id),
            eq(materialsTable.name, "Hilti Wedge Anchor Bolts 12x100mm"),
          ),
        )
        .limit(1);

      if (!existingMat) {
        await db.insert(materialsTable).values({
          projectId: p1Id,
          name: "Hilti Wedge Anchor Bolts 12x100mm",
          unit: "box",
          locationType: "site",
          locationName: "Site Emergency Store",
          quantityOnHand: "20",
          quantityCommitted: "0",
          quantityConsumed: "0",
          minimumStock: "5",
          reorderLevel: "3",
          unitCost: "210",
        });
      }
    }

    // 4. Scenario 2: Approved Standby Generator Fuel (Ready for Float Settlement)
    const [appExp] = await db
      .select()
      .from(expensesTable)
      .where(eq(expensesTable.billReferenceNumber, "IOC-PUN-0912"))
      .limit(1);

    if (!appExp) {
      await db.insert(expensesTable).values({
        projectId: p2Id,
        description: "Emergency 40L diesel for standby tower crane generator during power outage",
        amount: "3840",
        category: "fuel",
        expenseDate: today,
        receiptUrl: "DieselReceipt_IOC0912.jpg",
        status: "approved",
        paymentMode: "petty_cash",
        vendorOrShopName: "Indian Oil Corporation Outlet #44",
        billReferenceNumber: "IOC-PUN-0912",
        materialName: "Diesel Fuel",
        materialQuantity: "40",
        materialUnit: "liter",
        creditedToInventory: false,
        submittedById: firstUser.id,
        approvedById: firstUser.id,
        approvedAt: new Date(),
      });
    }

    // 5. Scenario 3: Settled Emergency Foundation Honeycombing Repair
    const [setExp] = await db
      .select()
      .from(expensesTable)
      .where(eq(expensesTable.billReferenceNumber, "CM-9941"))
      .limit(1);

    if (!setExp) {
      await db.insert(expensesTable).values({
        projectId: p1Id,
        description: "15 emergency bags cement for foundation honeycombing repair",
        amount: "5700",
        category: "materials",
        expenseDate: today,
        receiptUrl: "SiteCashMemo_CM9941.jpg",
        status: "settled",
        paymentMode: "petty_cash",
        vendorOrShopName: "MIDC Bhosari Building Materials",
        billReferenceNumber: "CM-9941",
        materialName: "Cement — OPC 53 grade",
        materialQuantity: "15",
        materialUnit: "bag",
        creditedToInventory: true,
        submittedById: firstUser.id,
        approvedById: firstUser.id,
        approvedAt: new Date(),
        settledAt: new Date(),
        settlementReference: "FLOAT-RECON-NOV-01",
      });
    }

    // 6. Scenario 4: Out-of-pocket Reimbursable Expense
    const [reimExp] = await db
      .select()
      .from(expensesTable)
      .where(eq(expensesTable.billReferenceNumber, "AWB-BLR-8921"))
      .limit(1);

    if (!reimExp) {
      await db.insert(expensesTable).values({
        projectId: p3Id,
        description: "Courier charges for architectural blueprints to client HQ",
        amount: "850",
        category: "tools",
        expenseDate: today,
        receiptUrl: "BlueDart_AWB8921.jpg",
        status: "submitted",
        paymentMode: "personal_reimbursement",
        vendorOrShopName: "Blue Dart Express Ltd",
        billReferenceNumber: "AWB-BLR-8921",
        creditedToInventory: false,
        submittedById: firstUser.id,
      });
    }
  } catch (err) {
    logger.error({ err }, "ensureTrack3PettyCashSeed failed");
  }
}

export async function ensureProcurementFlowSeed(): Promise<void> {
  try {
    const [firstProject] = await db.select().from(projectsTable).limit(1);
    const [secondProject] = await db.select().from(projectsTable).offset(1).limit(1);
    const [firstUser] = await db.select().from(usersTable).limit(1);
    const allVendors = await db.select().from(vendorsTable);

    logger.info({ p1: firstProject?.id, u: firstUser?.id, vCount: allVendors.length }, "ensureProcurementFlowSeed check");

    if (!firstProject || !firstUser || allVendors.length < 2) return;

    const p1Id = firstProject.id;
    const p2Id = secondProject ? secondProject.id : p1Id;
    const v1Id = allVendors[0]!.id;
    const v2Id = allVendors[1]!.id;
    const v3Id = allVendors[2] ? allVendors[2]!.id : v1Id;

    // 1. Pending Material Requests
    const [pendingMr] = await db
      .select()
      .from(materialRequestsTable)
      .where(eq(materialRequestsTable.status, "pending"))
      .limit(1);

    if (!pendingMr) {
      logger.info("Seeding pending Material Requests for testing approval & rejection...");
      await db.insert(materialRequestsTable).values([
        {
          projectId: p1Id,
          title: "Basement Epoxy Flooring — 4,500 sqft",
          description: "Anti-skid industrial epoxy coating for basement parking ramp & driveways. Needs urgent dispatch.",
          quantity: "4500",
          unit: "sqft",
          status: "pending",
          priority: "high",
          requiredByDate: "2026-05-25",
          siteStockAtRequest: "0",
          warehouseStockAtRequest: "0",
          toProcureQuantity: "4500",
          createdById: firstUser.id,
        },
        {
          projectId: p2Id,
          title: "LED Panel Lights 2x2 — 350 Nos",
          description: "40W warm white modular ceiling lights for office cafeteria & breakout zone.",
          quantity: "350",
          unit: "Nos",
          status: "pending",
          priority: "medium",
          requiredByDate: "2026-06-02",
          siteStockAtRequest: "0",
          warehouseStockAtRequest: "50",
          toProcureQuantity: "300",
          createdById: firstUser.id,
        },
      ]);
    }

    // 2. Rejected Material Request
    const [rejectedMr] = await db
      .select()
      .from(materialRequestsTable)
      .where(eq(materialRequestsTable.status, "rejected"))
      .limit(1);

    if (!rejectedMr) {
      await db.insert(materialRequestsTable).values({
        projectId: p1Id,
        title: "Diesel Generator 125 kVA Rental",
        description: "Temporary backup generator for Tower B night shift.",
        quantity: "1",
        unit: "Nos",
        status: "rejected",
        priority: "low",
        rejectionReason: "Sufficient power load sanctioned by local grid; rental generator rejected by project manager.",
        createdById: firstUser.id,
      });
    }

    // 3. RFQ with quotes received (Comparative Statement ready for evaluation)
    const [quotesReceivedRfq] = await db
      .select()
      .from(rfqsTable)
      .where(eq(rfqsTable.status, "quotes_received"))
      .limit(1);

    if (!quotesReceivedRfq) {
      logger.info("Seeding RFQ with competitive vendor quotes for Comparative Statement testing...");
      const [newRfq] = await db
        .insert(rfqsTable)
        .values({
          projectId: p1Id,
          title: "Acoustic Ceiling Tiles — 8,500 sqft",
          description: "Mineral fiber 600x600 ceiling panels with NRC 0.70 rating for conference floor.",
          status: "quotes_received",
          deadlineDate: "2026-05-30",
          termsAndConditions: "F.O.R Site delivery, unblemished packaging, 100% replacement warranty on transit damage.",
          invitedVendorIds: JSON.stringify([v1Id, v2Id, v3Id]),
          createdById: firstUser.id,
        })
        .returning();

      if (newRfq) {
        await db.insert(quotationsTable).values([
          {
            rfqId: newRfq.id,
            vendorId: v2Id,
            amount: "722500",
            unitPrice: "85",
            taxAmount: "130050",
            freightCharges: "15000",
            deliveryDays: 18,
            paymentTerms: "30 Days Net",
            notes: "L1 lowest bid. 10-year surface guarantee against sagging.",
            isSelected: false,
          },
          {
            rfqId: newRfq.id,
            vendorId: v1Id,
            amount: "765000",
            unitPrice: "90",
            taxAmount: "137700",
            freightCharges: "12000",
            deliveryDays: 14,
            paymentTerms: "50% Advance, 50% on Delivery",
            notes: "Includes standard accessories and perimeter trim channels.",
            isSelected: false,
          },
          {
            rfqId: newRfq.id,
            vendorId: v3Id,
            amount: "785000",
            unitPrice: "92",
            taxAmount: "141300",
            freightCharges: "10000",
            deliveryDays: 8,
            paymentTerms: "Immediate NEFT on delivery",
            notes: "Premium German brand, fastest 8-day delivery from regional depot.",
            isSelected: false,
          },
        ]);
      }
    }

    // 4. Draft RFQ ready to send
    const [draftRfq] = await db
      .select()
      .from(rfqsTable)
      .where(eq(rfqsTable.status, "draft"))
      .limit(1);

    if (!draftRfq) {
      await db.insert(rfqsTable).values({
        projectId: p2Id,
        title: "Fire Hydrant Landing Valves & Flow Sensors",
        description: "Gunmetal landing valves with instantaneous coupling and dual flow switches.",
        status: "draft",
        deadlineDate: "2026-06-10",
        createdById: firstUser.id,
      });
    }

    // 5. PO in 'issued' (waiting for acknowledgment)
    const [issuedPo] = await db
      .select()
      .from(purchaseOrdersTable)
      .where(eq(purchaseOrdersTable.status, "issued"))
      .limit(1);

    if (!issuedPo) {
      logger.info("Seeding issued PO awaiting vendor acknowledgment...");
      await db.insert(purchaseOrdersTable).values({
        projectId: p1Id,
        vendorId: v1Id,
        poNumber: "PO-SEN-2026-021",
        description: "Plumbing CPVC pipes & high-pressure fittings",
        totalAmount: "345000",
        deliveryDate: "2026-05-28",
        status: "issued",
        inspectionStatus: "pending",
        createdById: firstUser.id,
      });
    }

    // 6. PO in 'in_transit' (with transporter & follow-up log)
    const [inTransitPo] = await db
      .select()
      .from(purchaseOrdersTable)
      .where(eq(purchaseOrdersTable.status, "in_transit"))
      .limit(1);

    if (!inTransitPo) {
      logger.info("Seeding in-transit PO with tracking details...");
      await db.insert(purchaseOrdersTable).values({
        projectId: p1Id,
        vendorId: v2Id,
        poNumber: "PO-SEN-2026-018",
        description: "Modular electrical distribution panels & main switchboards",
        totalAmount: "520000",
        deliveryDate: "2026-05-20",
        status: "in_transit",
        inspectionStatus: "pending",
        transporterName: "Gati KWE Express",
        trackingNumber: "GATI-8829104",
        followUpCount: 2,
        followUpNotes: "[18-May] Spoke with dispatch desk, truck departed Bhiwandi hub.\n[19-May] Driver confirmed passing toll plaza, expected arrival tomorrow 10 AM.",
        createdById: firstUser.id,
      });
    }

    // 7. PO in 'rejected_and_returned' (QC Failed, showing replacement re-order flow)
    const [rejectedPo] = await db
      .select()
      .from(purchaseOrdersTable)
      .where(eq(purchaseOrdersTable.status, "rejected_and_returned"))
      .limit(1);

    if (!rejectedPo) {
      logger.info("Seeding QC Rejected PO to test replacement RFQ flow...");
      await db.insert(purchaseOrdersTable).values({
        projectId: p2Id,
        vendorId: v1Id,
        poNumber: "PO-CTY-2026-016",
        description: "Italian Marble Slabs 18mm — 600 sqft",
        totalAmount: "480000",
        deliveryDate: "2026-05-12",
        status: "rejected_and_returned",
        inspectionStatus: "failed",
        inspectionNotes: "QC Failed: 28% slabs delivered with edge chipping and hairline fractures. Lot rejected and returned to vendor. Replacement RFQ required.",
        createdById: firstUser.id,
      });
    }

    // 8. Stock Deficit Material (Stock below reorder level)
    const [deficitMat] = await db
      .select()
      .from(materialsTable)
      .where(eq(materialsTable.name, "Fire Rated Door Hardware Kits"))
      .limit(1);

    if (!deficitMat) {
      logger.info("Seeding material with deficit to test low-stock matrix warnings...");
      await db.insert(materialsTable).values({
        projectId: p1Id,
        name: "Fire Rated Door Hardware Kits",
        unit: "Sets",
        locationType: "site",
        locationName: "Hinjewadi Tech Park Site Store",
        quantityOnHand: "4",
        quantityCommitted: "0",
        quantityConsumed: "20",
        minimumStock: "25",
        reorderLevel: "20",
        unitCost: "4500",
      });
    }
  } catch (err) {
    logger.error({ err }, "ensureProcurementFlowSeed failed");
  }
}

export async function ensurePreConstructionSeed(): Promise<void> {
  try {
    const users = await db.select().from(usersTable);
    if (!users.length) return;
    const admin = users.find((u) => u.roles?.includes("admin")) || users[0]!;
    const pm = users.find((u) => u.roles?.includes("project_manager")) || users[0]!;
    const eng = users.find((u) => u.roles?.includes("engineer")) || users[0]!;

    logger.info("Verifying & Seeding Pre-Construction & Sales (Leads) pipeline...");

    // 0. Stage: Lead Intake (lead_creation) — Lead: Harshvardhan Singhania
    const [existingIntakeLead] = await db
      .select()
      .from(leadsTable)
      .where(and(eq(leadsTable.stage, "lead_creation"), eq(leadsTable.status, "new")))
      .limit(1);

    if (!existingIntakeLead) {
      const [newIntake] = await db
        .insert(leadsTable)
        .values({
          leadNumber: "LD-2026-INTAKE",
          customerName: "Harshvardhan Singhania",
          company: "Singhania Logistics Parks",
          contactEmail: "h.singhania@singhanialogistics.com",
          contactPhone: "+91 99300 22114",
          projectType: "Automated Distribution Center",
          location: "Bhiwandi Outer Ring, Thane",
          budgetEstimate: "78000000",
          leadSource: "Direct Enterprise Inquiry",
          status: "new",
          stage: "lead_creation",
          priority: "urgent",
          ownerId: pm.id,
          expectedClosureDate: "2026-10-15",
          notes: "320,000 sqft warehouse with heavy floor slab loading requirement (8 MT/sqm) and integrated fire sprinkler matrix.",
        })
        .returning();

      await db.insert(leadActivitiesTable).values({
        leadId: newIntake!.id,
        activityType: "call",
        title: "Inbound RFP intake call with Singhania team",
        description: "Discussed engineering feasibility of 14m clear height and rapid dock-leveler installation schedule.",
        createdById: pm.id,
      });
    }

    // 1. Stage: Drawings (Design & Drawings Approval) — Lead: Vikramaditya Oberoi
    const [existingDrawLead] = await db
      .select()
      .from(leadsTable)
      .where(eq(leadsTable.leadNumber, "LD-2026-DRAWINGS"))
      .limit(1);

    if (!existingDrawLead) {
      const [newDrawLead] = await db
        .insert(leadsTable)
        .values({
          leadNumber: "LD-2026-DRAWINGS",
          customerName: "Vikramaditya Oberoi",
          company: "Oberoi Luxury Hotels & Residences",
          contactEmail: "v.oberoi@oberoihotels.in",
          contactPhone: "+91 98200 88990",
          projectType: "Luxury Penthouse & Club Fitout",
          location: "Worli Sea Face, Mumbai",
          budgetEstimate: "42000000",
          leadSource: "Architect Referral",
          status: "qualified",
          stage: "drawings",
          priority: "high",
          ownerId: pm.id,
          expectedClosureDate: "2026-07-15",
          notes: "Super-luxury fitout with Italian statuario marble, acoustic private cinema, and sea-view terrace lounge.",
        })
        .returning();
      const drawingLeadId = newDrawLead!.id;

      await db.insert(leadActivitiesTable).values([
        {
          leadId: drawingLeadId,
          activityType: "meeting",
          title: "Design kick-off meeting with Oberoi architects",
          description: "Aligned on material finishes schedule, moodboard concepts, and structural acoustic loads.",
          createdById: pm.id,
        },
        {
          leadId: drawingLeadId,
          activityType: "call",
          title: "Follow-up on MEP spatial coordination",
          description: "Discussed VRV condenser placement on the service terrace with MEP consultants.",
          createdById: eng.id,
        },
      ]);

      await db.insert(siteVisitsTable).values({
        leadId: drawingLeadId,
        visitDate: "2026-05-02",
        visitTime: "11:00",
        engineerId: eng.id,
        siteAddress: "Sea Face Enclave, Worli, Mumbai 400018",
        latitude: 19.0176,
        longitude: 72.8151,
        measurements: "7,800 sqft duplex interior + 2,400 sqft terrace deck.",
        observations: "Core slab structure in sound condition; waterproofing on terrace deck verified. Elevator lobby requires special acoustic dampening.",
        status: "completed",
      });

      await db.insert(drawingsTable).values([
        {
          leadId: drawingLeadId,
          fileName: "Oberoi_Worli_Architectural_FloorPlan_Rev2.dwg",
          fileType: "application/dwg",
          fileSize: 4250000,
          version: 2,
          status: "submitted",
          reviewerComments: "Under client review — verify emergency corridor width per local fire safety bye-laws.",
          uploadedById: eng.id,
        },
        {
          leadId: drawingLeadId,
          fileName: "Oberoi_Worli_MEP_Combined_Services_Rev1.pdf",
          fileType: "application/pdf",
          fileSize: 3100000,
          version: 1,
          status: "approved",
          reviewerComments: "Approved by MEP principal consultant. Ready to proceed to BOQ estimation.",
          uploadedById: eng.id,
          reviewedById: pm.id,
        },
        {
          leadId: drawingLeadId,
          fileName: "Oberoi_Acoustic_Club_Cinema_3D_Render_v1.pdf",
          fileType: "application/pdf",
          fileSize: 8400000,
          version: 1,
          status: "draft",
          reviewerComments: "Concept renders for client styling approval.",
          uploadedById: eng.id,
        },
      ]);
    }

    // 2. Stage: Negotiation — Lead 4 (Asha Healthcare): Ensure approved BOQ exists
    const [lead4] = await db.select().from(leadsTable).where(eq(leadsTable.id, 4)).limit(1);
    if (lead4) {
      const [existingBoq4] = await db.select().from(boqsTable).where(eq(boqsTable.leadId, lead4.id)).limit(1);
      if (!existingBoq4) {
        const [boq4] = await db
          .insert(boqsTable)
          .values({
            leadId: lead4.id,
            version: 1,
            status: "approved",
            createdById: pm.id,
            approvedById: admin.id,
          })
          .returning();

        const boq4Items = [
          { name: "Medical Gas Pipeline System & Manifold", cat: "MEP Medical", qty: 1, unit: "lot", up: 16500000, tax: 18, margin: 15 },
          { name: "Cleanroom Modular Wall Cladding & Ceilings", cat: "Interiors", qty: 12500, unit: "sqft", up: 1150, tax: 18, margin: 12 },
          { name: "Antibacterial Vinyl Seamless Flooring", cat: "Finishes", qty: 14200, unit: "sqft", up: 260, tax: 18, margin: 10 },
          { name: "AHU with HEPA Filtration & Laminar Flow", cat: "HVAC", qty: 6, unit: "units", up: 1250000, tax: 18, margin: 14 },
        ];

        let sub = 0, taxT = 0, marT = 0;
        for (let i = 0; i < boq4Items.length; i++) {
          const it = boq4Items[i]!;
          const base = it.qty * it.up;
          const tax = (base * it.tax) / 100;
          const mar = (base * it.margin) / 100;
          sub += base;
          taxT += tax;
          marT += mar;
          await db.insert(boqItemsTable).values({
            boqId: boq4!.id,
            itemName: it.name,
            category: it.cat,
            quantity: String(it.qty),
            unit: it.unit,
            unitPrice: String(it.up),
            taxPercent: String(it.tax),
            marginPercent: String(it.margin),
            totalPrice: (base + tax + mar).toFixed(2),
            sortOrder: i,
          });
        }
        await db.update(boqsTable).set({
          subtotal: sub.toFixed(2),
          taxTotal: taxT.toFixed(2),
          marginTotal: marT.toFixed(2),
          grandTotal: (sub + taxT + marT).toFixed(2),
        }).where(eq(boqsTable.id, boq4!.id));
      }
    }

    // 3. Stage: Won & Converted Project — Lead: Deepak Mittal / FinTech Ventures Hub
    const [existingWonLead] = await db
      .select()
      .from(leadsTable)
      .where(eq(leadsTable.leadNumber, "LD-2026-WON"))
      .limit(1);

    if (!existingWonLead) {
      let wonProjId: number;
      const [existingProject] = await db
        .select()
        .from(projectsTable)
        .where(eq(projectsTable.name, "FinTech Ventures Hub — Hitec City"))
        .limit(1);

      if (existingProject) {
        wonProjId = existingProject.id;
      } else {
        const [newProj] = await db
          .insert(projectsTable)
          .values({
            name: "FinTech Ventures Hub — Hitec City",
            type: "Commercial Fit-out",
            location: "Hitec City, Hyderabad",
            clientName: "FinTech Ventures Hub",
            startDate: "2026-04-01",
            endDate: "2026-11-30",
            budget: "64500000",
            description: "Converted from won lead LD-2026-WON. 45,000 sqft Grade-A tech workspace.",
            status: "planning",
            progress: 10,
            teamSize: 24,
            createdById: admin.id,
          })
          .returning();
        wonProjId = newProj!.id;

        await db.insert(stakeholdersTable).values({
          projectId: wonProjId,
          name: "Deepak Mittal",
          email: "deepak.mittal@fintechhub.in",
          phone: "+91 97110 55443",
          organization: "FinTech Ventures Hub",
          role: "Client",
          accessLevel: "read",
        });

        const budgetCategories = [
          { code: "BOQ-001", cat: "Civil & Drywall Partitions", amt: "18500000" },
          { code: "BOQ-002", cat: "Electrical & Data Networking", amt: "21000000" },
          { code: "BOQ-003", cat: "HVAC & Air Management", amt: "14200000" },
          { code: "BOQ-004", cat: "Acoustic Ceilings & Finishes", amt: "10800000" },
        ];
        for (const b of budgetCategories) {
          await db.insert(budgetItemsTable).values({
            projectId: wonProjId,
            costCode: b.code,
            description: b.cat,
            budgeted: b.amt,
            actual: "0",
            committed: "0",
          });
        }

        const wonLifecycle = [
          { title: "Contract signing & mobilization", phase: "Initiation", days: 7, offset: 0 },
          { title: "Statutory clearances & fire NOC submission", phase: "Planning", days: 21, offset: 7 },
          { title: "Detailed GFC Drawings & MEP submittals", phase: "Planning", days: 30, offset: 14 },
          { title: "Procurement of HVAC chillers & panels", phase: "Procurement", days: 45, offset: 28 },
          { title: "Electrical conduiting & drywall framing", phase: "Execution", days: 60, offset: 45 },
          { title: "Modular workstations & acoustic ceiling install", phase: "Execution", days: 45, offset: 90 },
          { title: "Integrated testing & client snagging", phase: "Closeout", days: 14, offset: 135 },
          { title: "Client final handover & DLP inception", phase: "Closeout", days: 7, offset: 150 },
        ];
        const baseDate = new Date("2026-04-01T00:00:00.000Z");
        for (const t of wonLifecycle) {
          const sDate = new Date(baseDate);
          sDate.setUTCDate(sDate.getUTCDate() + t.offset);
          const eDate = new Date(sDate);
          eDate.setUTCDate(eDate.getUTCDate() + t.days);
          await db.insert(tasksTable).values({
            projectId: wonProjId,
            title: t.title,
            description: `[${t.phase}] ${t.title}`,
            startDate: sDate.toISOString().slice(0, 10),
            endDate: eDate.toISOString().slice(0, 10),
            priority: "medium",
            status: t.offset === 0 ? "in_progress" : "todo",
            progress: t.offset === 0 ? 80 : 0,
            createdById: admin.id,
          });
        }
      }

      const [wonLead] = await db
        .insert(leadsTable)
        .values({
          leadNumber: "LD-2026-WON",
          customerName: "Deepak Mittal",
          company: "FinTech Ventures Hub",
          contactEmail: "deepak.mittal@fintechhub.in",
          contactPhone: "+91 97110 55443",
          projectType: "Commercial Tech Park Fit-out",
          location: "Hitec City, Hyderabad",
          budgetEstimate: "65000000",
          leadSource: "Client Referral",
          status: "won",
          stage: "finalization",
          priority: "high",
          ownerId: pm.id,
          expectedClosureDate: "2026-04-15",
          wonProjectId: wonProjId,
          notes: "Won after 2 competitive rounds. Converted to project 'FinTech Ventures Hub — Hitec City'.",
        })
        .returning();

      const [wonBoq] = await db
        .insert(boqsTable)
        .values({
          leadId: wonLead!.id,
          version: 1,
          status: "approved",
          subtotal: "52000000",
          taxTotal: "7800000",
          marginTotal: "4700000",
          grandTotal: "64500000",
          createdById: pm.id,
          approvedById: admin.id,
        })
        .returning();

      await db.insert(boqItemsTable).values([
        {
          boqId: wonBoq!.id,
          itemName: "Civil partitions & acoustic drywall",
          category: "Civil",
          quantity: "45000",
          unit: "sqft",
          unitPrice: "410",
          taxPercent: "18",
          marginPercent: "10",
          totalPrice: "23706000",
          sortOrder: 0,
        },
        {
          boqId: wonBoq!.id,
          itemName: "MEP Electrical, UPS & High-Density Data",
          category: "MEP",
          quantity: "1",
          unit: "lot",
          unitPrice: "21000000",
          taxPercent: "18",
          marginPercent: "12",
          totalPrice: "27300000",
          sortOrder: 1,
        },
        {
          boqId: wonBoq!.id,
          itemName: "HVAC Precision Cooling & Fresh Air Ducts",
          category: "HVAC",
          quantity: "1",
          unit: "lot",
          unitPrice: "12500000",
          taxPercent: "18",
          marginPercent: "11",
          totalPrice: "16125000",
          sortOrder: 2,
        },
      ]);

      await db.insert(negotiationsTable).values([
        {
          leadId: wonLead!.id,
          roundNumber: 1,
          revisedAmount: "66000000",
          discountPercent: "4.50",
          status: "approved",
          requiresApproval: false,
          notes: "Initial discount counter-offer approved.",
          createdById: pm.id,
          approvedById: admin.id,
        },
        {
          leadId: wonLead!.id,
          roundNumber: 2,
          revisedAmount: "64500000",
          discountPercent: "6.80",
          status: "approved",
          requiresApproval: false,
          notes: "Final contract terms locked; lead won.",
          createdById: pm.id,
          approvedById: admin.id,
        },
      ]);
    }
  } catch (err) {
    logger.error({ err }, "ensurePreConstructionSeed failed");
  }
}

async function ensureRolesAndCompanySeed(): Promise<void> {
  try {
    // 1. All 10 System Roles Definition
    const SYSTEM_ROLES = [
      {
        key: "admin",
        name: "Administrator",
        description: "Full system administration, settings configuration, user management, and financial authorization.",
        isSystem: true,
        permissions: [
          "leads:view", "leads:create", "leads:edit", "boq:manage", "leads:convert",
          "projects:view", "projects:manage", "tasks:manage", "dpr:create", "field:muster", "field:snags", "drawings:manage",
          "procurement:requests", "procurement:approve_mr", "procurement:rfq_quotes", "procurement:po", "store:grn", "store:issue", "stock:view", "stock:transfer",
          "finance:ar_view", "finance:ar_manage", "subcontractor:claims", "finance:ap_view", "finance:ap_manage", "finance:petty_cash", "finance:instruments",
          "users:manage", "roles:manage", "company:configure", "audit:view"
        ],
      },
      {
        key: "project_manager",
        name: "Project Manager",
        description: "Site execution, project scheduling, task assignments, DPRs, material approvals, and RA bill verification.",
        isSystem: true,
        permissions: [
          "leads:view",
          "projects:view", "projects:manage", "tasks:manage", "dpr:create", "field:muster", "field:snags", "drawings:manage",
          "procurement:requests", "procurement:approve_mr", "stock:view", "stock:transfer",
          "finance:ar_view", "finance:ar_manage", "subcontractor:claims", "finance:petty_cash"
        ],
      },
      {
        key: "engineer",
        name: "Site Engineer",
        description: "On-site quality supervision, daily progress logging (DPR), material requests, and technical drawing reviews.",
        isSystem: true,
        permissions: [
          "projects:view", "tasks:manage", "dpr:create", "field:snags", "drawings:manage",
          "procurement:requests", "stock:view", "finance:petty_cash"
        ],
      },
      {
        key: "supervisor",
        name: "Site Supervisor / Foreman",
        description: "Direct field gang management, trade muster attendance, daily work execution logging, snag capture, and site consumable indents.",
        isSystem: true,
        permissions: [
          "projects:view", "tasks:manage", "dpr:create", "field:muster", "field:snags", "drawings:manage",
          "procurement:requests", "stock:view"
        ],
      },
      {
        key: "storekeeper",
        name: "Storekeeper / Material Controller",
        description: "Site store operations, physical goods receipt note (GRN), delivery challan inspection, material issue to trade gangs, and stock balance tracking.",
        isSystem: true,
        permissions: [
          "projects:view", "procurement:requests", "procurement:po", "store:grn", "store:issue",
          "stock:view", "stock:transfer", "drawings:manage"
        ],
      },
      {
        key: "subcontractor",
        name: "Subcontractor / Trade Partner",
        description: "Assigned subcontract work packages, joint measurement claims submission, certified work quantities, and subcontractor RA bills.",
        isSystem: true,
        permissions: [
          "projects:view", "tasks:manage", "drawings:manage", "subcontractor:claims", "finance:ar_view"
        ],
      },
      {
        key: "accountant",
        name: "Accountant / Finance Officer",
        description: "Client billing (AR), vendor invoice verification (AP 3-way match), petty cash floats, and bank guarantees.",
        isSystem: true,
        permissions: [
          "projects:view",
          "finance:ar_view", "finance:ar_manage", "finance:ap_view", "finance:ap_manage", "finance:petty_cash", "finance:instruments"
        ],
      },
      {
        key: "procurement_officer",
        name: "Procurement Officer",
        description: "Material requisition approvals, RFQs, vendor quote comparison, PO issuance, and warehouse stock tracking.",
        isSystem: true,
        permissions: [
          "projects:view",
          "procurement:requests", "procurement:approve_mr", "procurement:rfq_quotes", "procurement:po", "store:grn", "store:issue", "stock:view", "stock:transfer"
        ],
      },
      {
        key: "sales_manager",
        name: "Sales & Estimation Manager",
        description: "Lead prospecting, customer meetings, site visits, BOQ estimation, and contract negotiation.",
        isSystem: true,
        permissions: [
          "leads:view", "leads:create", "leads:edit", "boq:manage", "leads:convert", "projects:view"
        ],
      },
      {
        key: "viewer",
        name: "Stakeholder / Viewer",
        description: "Read-only visibility into projects, financial summaries, and inventory metrics.",
        isSystem: true,
        permissions: [
          "leads:view", "projects:view", "stock:view", "finance:ar_view", "finance:ap_view"
        ],
      },
    ];

    const existingRoles = await db.select().from(rolesTable);
    const existingKeys = new Set(existingRoles.map((r: any) => r.key));

    for (const r of SYSTEM_ROLES) {
      if (!existingKeys.has(r.key)) {
        logger.info(`Seeding missing system role: ${r.name} (${r.key})...`);
        await db.insert(rolesTable).values(r);
      }
    }

    // 2. Company Settings
    const existingCompany = await db.select().from(companySettingsTable).limit(1);
    if (!existingCompany || existingCompany.length === 0) {
      logger.info("Seeding corporate profile and company settings...");
      await db.insert(companySettingsTable).values([
        {
          companyName: "Kanak Turnkey Solutions Pvt. Ltd.",
          legalEntityType: "Private Limited",
          gstin: "27AABCK1234F1Z5",
          pan: "AABCK1234F",
          cin: "U45200MH2021PTC123456",
          email: "billing@kanakturnkey.com",
          phone: "+91 22 6789 4321",
          website: "https://kanakturnkey.com",
          address: "Unit 801-804, Platinum Techno Park, Sector 30A, Vashi",
          city: "Navi Mumbai",
          state: "Maharashtra",
          pincode: "400703",
          country: "India",
          bankName: "HDFC Bank Ltd.",
          bankAccountName: "Kanak Turnkey Solutions Private Limited",
          bankAccountNumber: "50200055443322",
          bankIfsc: "HDFC0000123",
          bankBranch: "Vashi Sector 30A Branch, Navi Mumbai",
          currency: "INR",
          currencySymbol: "₹",
          logoUrl: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=128&auto=format&fit=crop&q=80",
          termsAndConditions: "1. All payments strictly payable within 30 days of RA Bill / Invoice submission.\n2. Retention release upon issuance of Defect Liability Period (DLP) certificate.\n3. GST 18% applied as per prevailing CBIC norms.",
        },
      ]);
    }

    // 3. Ensure existing users have passwords, phone numbers, and designations
    const allUsers = await db.select().from(usersTable);
    const { hash, salt } = hashPassword("Kanak@123");
    for (const u of allUsers) {
      const updates: any = {};
      if (!u.passwordHash) {
        updates.passwordHash = hash;
        updates.passwordSalt = salt;
      }
      if (!u.phone) {
        if (u.email.includes("ananya")) updates.phone = "+91 98201 11223";
        else if (u.email.includes("rohan")) updates.phone = "+91 98202 22334";
        else if (u.email.includes("priya")) updates.phone = "+91 98203 33445";
        else if (u.email.includes("vikram")) updates.phone = "+91 98204 44556";
        else if (u.email.includes("neha")) updates.phone = "+91 98205 55667";
        else if (u.email.includes("kavita")) updates.phone = "+91 98206 66778";
        else updates.phone = "+91 98207 77889";
      }
      if (!u.designation) {
        if (u.roles?.includes("admin")) updates.designation = "Managing Director & CEO";
        else if (u.roles?.includes("project_manager")) updates.designation = "Senior Project Manager";
        else if (u.roles?.includes("engineer")) updates.designation = "Lead Site Engineer";
        else if (u.roles?.includes("accountant")) updates.designation = "Chief Financial Controller";
        else if (u.roles?.includes("procurement_officer")) updates.designation = "Head of Procurement & Contracts";
        else if (u.roles?.includes("sales_manager")) updates.designation = "VP - Business Development";
        else updates.designation = "Project Associate";
      }
      if (!u.department) {
        if (u.roles?.includes("admin")) updates.department = "Executive Management";
        else if (u.roles?.includes("project_manager")) updates.department = "Operations & Projects";
        else if (u.roles?.includes("engineer")) updates.department = "Site Engineering";
        else if (u.roles?.includes("accountant")) updates.department = "Finance & Accounts";
        else if (u.roles?.includes("procurement_officer")) updates.department = "Supply Chain";
        else if (u.roles?.includes("sales_manager")) updates.department = "Pre-Construction & Sales";
        else updates.department = "General Operations";
      }
      if (!u.status) {
        updates.status = "active";
      }

      if (Object.keys(updates).length > 0) {
        await db.update(usersTable).set(updates).where(eq(usersTable.id, u.id));
      }
    }

    // 4. Ensure admin user has all 10 roles
    const adminUser = allUsers.find((u) => u.email === "ananya.rao@kanak.in");
    if (adminUser) {
      const allRoleKeys = [
        "admin", "project_manager", "sales_manager", "engineer", "supervisor",
        "storekeeper", "subcontractor", "accountant", "procurement_officer", "viewer"
      ];
      await db.update(usersTable).set({ roles: allRoleKeys }).where(eq(usersTable.id, adminUser.id));
    }

    // 5. Ensure dedicated user exists for Site Supervisor
    const [existingSupervisor] = await db.select().from(usersTable).where(eq(usersTable.email, "rajesh.verma@kanak.in")).limit(1);
    if (!existingSupervisor) {
      await db.insert(usersTable).values([
        {
          name: "Rajesh Verma",
          email: "rajesh.verma@kanak.in",
          passwordHash: hash,
          passwordSalt: salt,
          roles: ["supervisor", "viewer"],
          activeRole: "supervisor",
          phone: "+91 98208 88990",
          designation: "Senior Site Supervisor / Foreman",
          department: "Field Operations & Supervision",
          status: "active",
        },
      ]);
    }

    // 6. Ensure dedicated user exists for Storekeeper
    const [existingStorekeeper] = await db.select().from(usersTable).where(eq(usersTable.email, "dinesh.patel@kanak.in")).limit(1);
    if (!existingStorekeeper) {
      await db.insert(usersTable).values([
        {
          name: "Dinesh Patel",
          email: "dinesh.patel@kanak.in",
          passwordHash: hash,
          passwordSalt: salt,
          roles: ["storekeeper", "procurement_officer", "viewer"],
          activeRole: "storekeeper",
          phone: "+91 98209 99001",
          designation: "Head Site Storekeeper",
          department: "Supply Chain & Procurement",
          status: "active",
        },
      ]);
    }

    // 7. Ensure dedicated user exists for Subcontractor
    const [existingSubcontractor] = await db.select().from(usersTable).where(eq(usersTable.email, "apex.mep@turnkeypartners.com")).limit(1);
    if (!existingSubcontractor) {
      await db.insert(usersTable).values([
        {
          name: "Apex Engineering (Suresh Nair)",
          email: "apex.mep@turnkeypartners.com",
          passwordHash: hash,
          passwordSalt: salt,
          roles: ["subcontractor", "viewer"],
          activeRole: "subcontractor",
          phone: "+91 98210 10102",
          designation: "Subcontractor Supervisor - MEP & Finishes",
          department: "Trade Contractors & Subcontractors",
          status: "active",
        },
      ]);
    }
  } catch (err) {
    logger.error({ err }, "ensureRolesAndCompanySeed failed");
  }
}

export async function seedIfEmpty(): Promise<void> {
  try {
    const [existingUser] = await db.select().from(usersTable).limit(1);
    if (existingUser) {
      logger.info("Seed data already present, verifying warehouse & finance data...");
      await ensureWarehouseSeed();
      await ensureProcurementFlowSeed();
      await ensureFinanceSeed();
      await ensureTrack1ClientBillingSeed();
      await ensureTrack2VendorInvoicingSeed();
      await ensureTrack3PettyCashSeed();
      await ensurePreConstructionSeed();
      await ensureRolesAndCompanySeed();
      return;
    }
  } catch (error: any) {
    logger.warn({ err: error?.message || error }, "Database not available, skipping seed");
    return;
  }
  
  logger.info("Seeding database");

  const [admin, pm, eng, acct, proc, viewer] = await db
    .insert(usersTable)
    .values([
      {
        email: "ananya.rao@kanak.in",
        name: "Ananya Rao",
        avatarUrl: null,
        roles: [
          "admin",
          "project_manager",
          "sales_manager",
          "engineer",
          "accountant",
          "procurement_officer",
          "viewer",
        ],
        activeRole: "admin",
      },
      {
        email: "rohan.mehta@kanak.in",
        name: "Rohan Mehta",
        avatarUrl: null,
        roles: ["project_manager", "viewer"],
        activeRole: "project_manager",
      },
      {
        email: "priya.iyer@kanak.in",
        name: "Priya Iyer",
        avatarUrl: null,
        roles: ["engineer", "viewer"],
        activeRole: "engineer",
      },
      {
        email: "vikram.shah@kanak.in",
        name: "Vikram Shah",
        avatarUrl: null,
        roles: ["accountant", "viewer"],
        activeRole: "accountant",
      },
      {
        email: "neha.kapoor@kanak.in",
        name: "Neha Kapoor",
        avatarUrl: null,
        roles: ["procurement_officer", "viewer"],
        activeRole: "procurement_officer",
      },
      {
        email: "arjun.singh@kanak.in",
        name: "Arjun Singh",
        avatarUrl: null,
        roles: ["viewer"],
        activeRole: "viewer",
      },
      {
        email: "kavita.sharma@kanak.in",
        name: "Kavita Sharma",
        avatarUrl: null,
        roles: ["sales_manager", "viewer"],
        activeRole: "sales_manager",
      },
    ])
    .returning();

  const today = new Date();
  const ymd = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, "0")}${String(today.getDate()).padStart(2, "0")}`;

  const leads = await db
    .insert(leadsTable)
    .values([
      {
        leadNumber: `LD-${ymd}-0001`,
        customerName: "Mahesh Bhatia",
        company: "Lumina Hospitality Group",
        contactEmail: "mahesh@luminahg.in",
        contactPhone: "+91 98765 43210",
        projectType: "Hotel Interior Fit-out",
        location: "Bandra West, Mumbai",
        budgetEstimate: "32500000",
        leadSource: "Referral",
        status: "qualified",
        stage: "boq",
        priority: "high",
        ownerId: pm!.id,
        expectedClosureDate: "2026-06-15",
        notes: "Boutique hotel renovation, 42 rooms.",
      },
      {
        leadNumber: `LD-${ymd}-0002`,
        customerName: "Sara D'Souza",
        company: "Verde Workspaces",
        contactEmail: "sara@verdews.com",
        contactPhone: "+91 99887 65432",
        projectType: "Office Build-out",
        location: "Whitefield, Bengaluru",
        budgetEstimate: "18000000",
        leadSource: "Inbound web",
        status: "contacted",
        stage: "site_visit",
        priority: "medium",
        ownerId: pm!.id,
        expectedClosureDate: "2026-07-30",
        notes: "Two-floor co-working buildout.",
      },
      {
        leadNumber: `LD-${ymd}-0003`,
        customerName: "Ritesh Khanna",
        company: "Northshore Residences",
        contactEmail: "ritesh@northshore.in",
        contactPhone: "+91 90000 11122",
        projectType: "Residential Tower MEP",
        location: "Powai, Mumbai",
        budgetEstimate: "84000000",
        leadSource: "Tender",
        status: "new",
        stage: "lead_creation",
        priority: "urgent",
        ownerId: admin!.id,
        expectedClosureDate: "2026-09-20",
        notes: "EMD already deposited.",
      },
      {
        leadNumber: `LD-${ymd}-0004`,
        customerName: "Kavita Menon",
        company: "Asha Healthcare",
        contactEmail: "kavita@ashahc.org",
        contactPhone: "+91 91234 55667",
        projectType: "Hospital Wing Expansion",
        location: "Koramangala, Bengaluru",
        budgetEstimate: "56000000",
        leadSource: "Referral",
        status: "qualified",
        stage: "negotiation",
        priority: "high",
        ownerId: pm!.id,
        expectedClosureDate: "2026-08-10",
        notes: "Two rounds of negotiation completed.",
      },
      {
        leadNumber: `LD-${ymd}-0005`,
        customerName: "Devansh Patel",
        company: "Patel Logistics",
        contactEmail: "devansh@patellog.in",
        contactPhone: "+91 93456 11223",
        projectType: "Warehouse Build",
        location: "Bhiwandi, Maharashtra",
        budgetEstimate: "22000000",
        leadSource: "Cold outreach",
        status: "lost",
        stage: "negotiation",
        priority: "low",
        ownerId: admin!.id,
        expectedClosureDate: "2026-04-01",
        notes: "Lost to local contractor on price.",
      },
    ])
    .returning();

  await db.insert(leadActivitiesTable).values([
    {
      leadId: leads[0]!.id,
      activityType: "call",
      title: "Discovery call with Mahesh",
      description:
        "Walked through scope, timeline, and budget expectations. Decision-maker is the GM.",
      createdById: pm!.id,
    },
    {
      leadId: leads[0]!.id,
      activityType: "email",
      title: "Sent capability deck",
      description: "Shared past hospitality projects portfolio.",
      createdById: pm!.id,
    },
    {
      leadId: leads[1]!.id,
      activityType: "meeting",
      title: "Walkthrough at Verde HQ",
      description: "Toured both floors, took preliminary measurements.",
      createdById: eng!.id,
    },
    {
      leadId: leads[3]!.id,
      activityType: "note",
      title: "Negotiation round 2 completed",
      description: "Counter-offer at 5.5% discount sent.",
      createdById: pm!.id,
    },
  ]);

  await db.insert(siteVisitsTable).values([
    {
      leadId: leads[0]!.id,
      visitDate: "2026-04-12",
      visitTime: "10:30",
      engineerId: eng!.id,
      siteAddress: "Pali Hill, Bandra West, Mumbai 400050",
      latitude: 19.0596,
      longitude: 72.8295,
      measurements: "Total carpet area 18,400 sqft across 42 rooms + lobby.",
      observations:
        "Existing electrical needs full rework. HVAC ducting can be retained.",
      status: "completed",
    },
    {
      leadId: leads[1]!.id,
      visitDate: "2026-04-25",
      visitTime: "14:00",
      engineerId: eng!.id,
      siteAddress: "ITPL Main Road, Whitefield, Bengaluru 560066",
      latitude: 12.9698,
      longitude: 77.7499,
      measurements: "11,200 sqft per floor, 22,400 sqft total.",
      observations: "Floor plates in shell condition, ready for fit-out.",
      status: "pending",
    },
  ]);

  await db.insert(drawingsTable).values([
    {
      leadId: leads[0]!.id,
      fileName: "Lumina_Lobby_Concept_v3.pdf",
      fileType: "application/pdf",
      fileSize: 2840000,
      version: 3,
      status: "approved",
      reviewerComments: "Approved by client for BOQ stage.",
      uploadedById: eng!.id,
      reviewedById: pm!.id,
    },
    {
      leadId: leads[0]!.id,
      fileName: "Lumina_Room_Type_A_Rev2.dwg",
      fileType: "application/dwg",
      fileSize: 1520000,
      version: 2,
      status: "submitted",
      uploadedById: eng!.id,
    },
    {
      leadId: leads[3]!.id,
      fileName: "Asha_Wing_HVAC_Plan_v1.pdf",
      fileType: "application/pdf",
      fileSize: 3210000,
      version: 1,
      status: "draft",
      uploadedById: eng!.id,
    },
  ]);

  const [boq1] = await db
    .insert(boqsTable)
    .values({
      leadId: leads[0]!.id,
      version: 1,
      status: "submitted",
      createdById: pm!.id,
    })
    .returning();

  const items: Array<{
    qty: number;
    up: number;
    tax: number;
    margin: number;
    name: string;
    cat: string;
    unit: string;
  }> = [
    { qty: 42, up: 185000, tax: 18, margin: 12, name: "Guest room fit-out package", cat: "Interior", unit: "room" },
    { qty: 1, up: 2400000, tax: 18, margin: 15, name: "Lobby millwork & finishes", cat: "Interior", unit: "lot" },
    { qty: 18400, up: 65, tax: 18, margin: 10, name: "Vinyl flooring premium grade", cat: "Materials", unit: "sqft" },
    { qty: 1, up: 1850000, tax: 18, margin: 14, name: "MEP electrical rework", cat: "MEP", unit: "lot" },
  ];

  let sub = 0,
    taxT = 0,
    marT = 0;
  for (let i = 0; i < items.length; i++) {
    const it = items[i]!;
    const base = it.qty * it.up;
    const tax = (base * it.tax) / 100;
    const mar = (base * it.margin) / 100;
    const total = base + tax + mar;
    sub += base;
    taxT += tax;
    marT += mar;
    await db.insert(boqItemsTable).values({
      boqId: boq1!.id,
      itemName: it.name,
      category: it.cat,
      quantity: String(it.qty),
      unit: it.unit,
      unitPrice: String(it.up),
      taxPercent: String(it.tax),
      marginPercent: String(it.margin),
      totalPrice: total.toFixed(2),
      sortOrder: i,
    });
  }
  const { eq } = await import("drizzle-orm");
  await db
    .update(boqsTable)
    .set({
      subtotal: sub.toFixed(2),
      taxTotal: taxT.toFixed(2),
      marginTotal: marT.toFixed(2),
      grandTotal: (sub + taxT + marT).toFixed(2),
    })
    .where(eq(boqsTable.id, boq1!.id));

  await db.insert(negotiationsTable).values([
    {
      leadId: leads[3]!.id,
      roundNumber: 1,
      revisedAmount: "53000000",
      discountPercent: "5.36",
      status: "approved",
      requiresApproval: false,
      notes: "First counter accepted.",
      createdById: pm!.id,
      approvedById: admin!.id,
    },
    {
      leadId: leads[3]!.id,
      roundNumber: 2,
      revisedAmount: "51500000",
      discountPercent: "8.04",
      status: "pending",
      requiresApproval: true,
      notes: "Awaiting admin approval — discount exceeds 5%.",
      createdById: pm!.id,
    },
  ]);

  const projects = await db
    .insert(projectsTable)
    .values([
      {
        name: "Sentinel Tech Park — Phase 2",
        type: "Commercial Build-out",
        location: "Hinjewadi, Pune",
        clientName: "Sentinel Realty",
        startDate: "2026-01-15",
        endDate: "2026-12-20",
        budget: "62000000",
        description:
          "180,000 sqft commercial build-out across two floor plates with shared amenities deck.",
        status: "execution",
        progress: 47,
        teamSize: 38,
        createdById: admin!.id,
      },
      {
        name: "Citygate Residences",
        type: "Residential MEP",
        location: "Andheri East, Mumbai",
        clientName: "Citygate Developers",
        startDate: "2025-09-01",
        endDate: "2026-08-30",
        budget: "94000000",
        description:
          "MEP install across 24-floor residential tower. 188 apartments.",
        status: "execution",
        progress: 72,
        teamSize: 52,
        createdById: admin!.id,
      },
      {
        name: "Asha Hospital East Wing",
        type: "Healthcare Fit-out",
        location: "Koramangala, Bengaluru",
        clientName: "Asha Healthcare",
        startDate: "2026-05-01",
        endDate: "2027-02-28",
        budget: "56000000",
        description: "ICU, OT, and patient ward fit-out for 4-floor wing.",
        status: "planning",
        progress: 8,
        teamSize: 12,
        createdById: pm!.id,
      },
      {
        name: "Northbrook Logistics Hub",
        type: "Industrial",
        location: "Bhiwandi, Maharashtra",
        clientName: "Northbrook Group",
        startDate: "2025-04-10",
        endDate: "2026-03-15",
        budget: "38000000",
        description: "180,000 sqft warehouse with cold storage.",
        status: "archived",
        progress: 100,
        teamSize: 22,
        createdById: admin!.id,
      },
      {
        name: "Maplewood Towers Lobby Refresh",
        type: "Interior",
        location: "Gurgaon, Haryana",
        clientName: "Maplewood Society",
        startDate: "2026-03-01",
        endDate: "2026-05-30",
        budget: "8500000",
        description: "Premium lobby refresh across two towers.",
        status: "procurement",
        progress: 25,
        teamSize: 8,
        createdById: pm!.id,
      },
    ])
    .returning();

  await db.insert(tasksTable).values([
    {
      projectId: projects[0]!.id,
      title: "Floor 4 ceiling grid installation",
      description: "Install T-grid and integrate with HVAC diffusers.",
      assignedToId: eng!.id,
      startDate: "2026-04-15",
      endDate: "2026-04-28",
      priority: "high",
      status: "in_progress",
      progress: 60,
      createdById: pm!.id,
    },
    {
      projectId: projects[0]!.id,
      title: "Procure flooring materials for Floor 5",
      assignedToId: proc!.id,
      startDate: "2026-04-20",
      endDate: "2026-05-02",
      priority: "medium",
      status: "todo",
      progress: 0,
      createdById: pm!.id,
    },
    {
      projectId: projects[0]!.id,
      title: "Client snag review walkthrough",
      assignedToId: pm!.id,
      startDate: "2026-04-22",
      endDate: "2026-04-22",
      priority: "high",
      status: "in_review",
      progress: 80,
      createdById: pm!.id,
    },
    {
      projectId: projects[1]!.id,
      title: "Riser shaft electrical pull",
      assignedToId: eng!.id,
      startDate: "2026-04-10",
      endDate: "2026-05-10",
      priority: "high",
      status: "in_progress",
      progress: 55,
      createdById: pm!.id,
    },
    {
      projectId: projects[1]!.id,
      title: "Floors 18-20 plumbing test",
      assignedToId: eng!.id,
      startDate: "2026-04-18",
      endDate: "2026-04-24",
      priority: "medium",
      status: "completed",
      progress: 100,
      createdById: pm!.id,
    },
    {
      projectId: projects[2]!.id,
      title: "Site mobilization plan",
      assignedToId: pm!.id,
      startDate: "2026-04-25",
      endDate: "2026-05-05",
      priority: "high",
      status: "todo",
      progress: 10,
      createdById: pm!.id,
    },
  ]);

  await db.insert(budgetItemsTable).values([
    {
      projectId: projects[0]!.id,
      costCode: "MAT-100",
      description: "Materials — flooring & finishes",
      budgeted: "12500000",
      actual: "5800000",
      committed: "3200000",
    },
    {
      projectId: projects[0]!.id,
      costCode: "LAB-200",
      description: "Labor — civil & MEP",
      budgeted: "18000000",
      actual: "9400000",
      committed: "0",
    },
    {
      projectId: projects[0]!.id,
      costCode: "EQP-300",
      description: "Equipment rental",
      budgeted: "4200000",
      actual: "1850000",
      committed: "600000",
    },
    {
      projectId: projects[0]!.id,
      costCode: "SUB-400",
      description: "Subcontractor — HVAC",
      budgeted: "9800000",
      actual: "4200000",
      committed: "2100000",
    },
    {
      projectId: projects[1]!.id,
      costCode: "MAT-100",
      description: "Materials — MEP",
      budgeted: "28000000",
      actual: "21000000",
      committed: "3500000",
    },
    {
      projectId: projects[1]!.id,
      costCode: "LAB-200",
      description: "Labor — install",
      budgeted: "32000000",
      actual: "23000000",
      committed: "0",
    },
  ]);

  await db.insert(raBillsTable).values([
    {
      projectId: projects[0]!.id,
      billNumber: "RA-SEN-001",
      description: "Milestone 1: Civil & shell ready",
      amount: "12000000",
      milestone: "Civil shell completion",
      status: "approved",
      createdById: pm!.id,
    },
    {
      projectId: projects[0]!.id,
      billNumber: "RA-SEN-002",
      description: "Milestone 2: MEP rough-in",
      amount: "9500000",
      milestone: "MEP rough-in",
      status: "submitted",
      createdById: pm!.id,
    },
    {
      projectId: projects[1]!.id,
      billNumber: "RA-CTY-005",
      description: "Floors 1-12 MEP complete",
      amount: "18000000",
      milestone: "Lower 12 floors complete",
      status: "invoiced",
      createdById: pm!.id,
    },
  ]);

  await db.insert(expensesTable).values([
    {
      projectId: projects[0]!.id,
      description: "Site office cabin rental — April",
      amount: "85000",
      category: "equipment",
      expenseDate: "2026-04-01",
      status: "approved",
      submittedById: eng!.id,
      approvedById: pm!.id,
    },
    {
      projectId: projects[0]!.id,
      description: "Steel rebar advance",
      amount: "1240000",
      category: "materials",
      expenseDate: "2026-04-08",
      status: "approved",
      submittedById: proc!.id,
      approvedById: pm!.id,
    },
    {
      projectId: projects[1]!.id,
      description: "Crane operator — week 14",
      amount: "320000",
      category: "labor",
      expenseDate: "2026-04-12",
      status: "submitted",
      submittedById: eng!.id,
    },
    {
      projectId: projects[1]!.id,
      description: "HVAC subcontractor advance",
      amount: "2800000",
      category: "subcontractor",
      expenseDate: "2026-04-15",
      status: "draft",
      submittedById: proc!.id,
    },
  ]);

  await db.insert(invoicesTable).values([
    {
      projectId: projects[0]!.id,
      invoiceNumber: "INV-2026-0042",
      clientName: "Sentinel Realty",
      amount: "12000000",
      invoiceDate: "2026-03-15",
      dueDate: "2026-04-14",
      paymentDate: "2026-04-10",
      reconciled: true,
      status: "paid",
    },
    {
      projectId: projects[1]!.id,
      invoiceNumber: "INV-2026-0048",
      clientName: "Citygate Developers",
      amount: "18000000",
      invoiceDate: "2026-03-28",
      dueDate: "2026-04-27",
      reconciled: false,
      status: "sent",
    },
    {
      projectId: projects[1]!.id,
      invoiceNumber: "INV-2026-0031",
      clientName: "Citygate Developers",
      amount: "9400000",
      invoiceDate: "2026-02-10",
      dueDate: "2026-03-12",
      reconciled: false,
      status: "overdue",
    },
  ]);

  const vendors = await db
    .insert(vendorsTable)
    .values([
      {
        name: "Aarav Steel & Cement",
        contactPerson: "Aarav Joshi",
        email: "aarav@aaravsc.in",
        phone: "+91 90909 12345",
        address: "MIDC Bhosari, Pune",
        category: "Materials",
        rating: "4.6",
        status: "active",
      },
      {
        name: "Polaris Electricals",
        contactPerson: "Sneha Pillai",
        email: "sneha@polariselec.in",
        phone: "+91 98989 22220",
        address: "Peenya, Bengaluru",
        category: "MEP",
        rating: "4.3",
        status: "active",
      },
      {
        name: "Helios HVAC Systems",
        contactPerson: "Karan Bedi",
        email: "karan@helioshvac.in",
        phone: "+91 91919 55444",
        address: "Andheri MIDC, Mumbai",
        category: "HVAC",
        rating: "4.8",
        status: "active",
      },
      {
        name: "Ridgeline Interiors",
        contactPerson: "Maya Nair",
        email: "maya@ridgeline.in",
        phone: "+91 93939 33330",
        address: "HSR Layout, Bengaluru",
        category: "Interior",
        rating: "4.1",
        status: "active",
      },
      {
        name: "Sahyadri Tools Rental",
        contactPerson: "Imran Sheikh",
        email: "imran@sahyadritools.in",
        phone: "+91 95959 77770",
        address: "Bhiwandi, Maharashtra",
        category: "Equipment",
        rating: "3.9",
        status: "inactive",
      },
    ])
    .returning();

  const matReqs = await db
    .insert(materialRequestsTable)
    .values([
      {
        projectId: projects[0]!.id,
        title: "Vinyl flooring — Floor 5",
        description: "Premium grade, 12,000 sqft.",
        quantity: "12000",
        unit: "sqft",
        status: "rfq_sent",
        createdById: eng!.id,
      },
      {
        projectId: projects[0]!.id,
        title: "Suspended ceiling tiles — Floors 4-6",
        quantity: "8500",
        unit: "sqft",
        status: "approved",
        createdById: eng!.id,
      },
      {
        projectId: projects[1]!.id,
        title: "Copper wiring 4mm — riser shaft",
        quantity: "4500",
        unit: "m",
        status: "pending",
        createdById: eng!.id,
      },
    ])
    .returning();

  const [rfq1] = await db
    .insert(rfqsTable)
    .values({
      projectId: projects[0]!.id,
      materialRequestId: matReqs[0]!.id,
      title: "Vinyl flooring — Floor 5 (12,000 sqft premium)",
      description:
        "Need premium-grade vinyl flooring with 10-year warranty. Delivery to Hinjewadi site.",
      status: "quotes_received",
      createdById: proc!.id,
    })
    .returning();

  await db.insert(quotationsTable).values([
    {
      rfqId: rfq1!.id,
      vendorId: vendors[0]!.id,
      amount: "780000",
      deliveryDays: 14,
      notes: "Includes installation labor.",
      isSelected: false,
    },
    {
      rfqId: rfq1!.id,
      vendorId: vendors[3]!.id,
      amount: "742000",
      deliveryDays: 18,
      notes: "Material only. 10-year warranty included.",
      isSelected: true,
    },
    {
      rfqId: rfq1!.id,
      vendorId: vendors[1]!.id,
      amount: "815000",
      deliveryDays: 10,
      notes: "Premium German brand, fastest delivery.",
      isSelected: false,
    },
  ]);

  await db.update(rfqsTable).set({ status: "awarded" }).where(eq(rfqsTable.id, rfq1!.id));

  await db.insert(rfqsTable).values({
    projectId: projects[1]!.id,
    title: "Copper wiring 4mm — 4500m",
    description: "For riser shaft electrical pull.",
    status: "draft",
    createdById: proc!.id,
  });

  const pos = await db
    .insert(purchaseOrdersTable)
    .values([
      {
        projectId: projects[0]!.id,
        vendorId: vendors[3]!.id,
        poNumber: "PO-SEN-2026-014",
        description: "Vinyl flooring — Floor 5, 12000 sqft.",
        totalAmount: "742000",
        deliveryDate: "2026-05-10",
        status: "acknowledged",
        inspectionStatus: "pending",
        createdById: proc!.id,
      },
      {
        projectId: projects[0]!.id,
        vendorId: vendors[1]!.id,
        poNumber: "PO-SEN-2026-015",
        description: "MEP electrical rework materials.",
        totalAmount: "1820000",
        deliveryDate: "2026-04-30",
        status: "in_transit",
        inspectionStatus: "pending",
        createdById: proc!.id,
      },
      {
        projectId: projects[1]!.id,
        vendorId: vendors[2]!.id,
        poNumber: "PO-CTY-2026-009",
        description: "HVAC chillers — 4 units.",
        totalAmount: "4800000",
        deliveryDate: "2026-04-12",
        status: "delivered",
        inspectionStatus: "passed",
        createdById: proc!.id,
      },
    ])
    .returning();

  await db.insert(vendorInvoicesTable).values([
    {
      projectId: projects[1]!.id,
      vendorId: vendors[2]!.id,
      purchaseOrderId: pos[2]!.id,
      invoiceNumber: "HVAC-2026-018",
      amount: "4800000",
      status: "matched",
    },
    {
      projectId: projects[0]!.id,
      vendorId: vendors[1]!.id,
      purchaseOrderId: pos[1]!.id,
      invoiceNumber: "POL-INV-2026-204",
      amount: "1850000",
      discrepancyNotes: "Invoiced amount exceeds PO by INR 30,000.",
      status: "discrepancy",
    },
  ]);

  await db.insert(materialsTable).values([
    // Central In-House Warehouse stock
    {
      projectId: null,
      name: "Cement — OPC 53 grade",
      unit: "bag",
      locationType: "warehouse",
      locationName: "Central In-House Warehouse",
      quantityOnHand: "650",
      quantityCommitted: "150",
      quantityConsumed: "0",
      minimumStock: "200",
      reorderLevel: "300",
      unitCost: "380",
    },
    {
      projectId: null,
      name: "TMT steel bars 12mm",
      unit: "kg",
      locationType: "warehouse",
      locationName: "Central In-House Warehouse",
      quantityOnHand: "5200",
      quantityCommitted: "800",
      quantityConsumed: "0",
      minimumStock: "2000",
      reorderLevel: "2500",
      unitCost: "68",
    },
    {
      projectId: null,
      name: "Copper wire 4mm",
      unit: "m",
      locationType: "warehouse",
      locationName: "Central In-House Warehouse",
      quantityOnHand: "1200",
      quantityCommitted: "200",
      quantityConsumed: "0",
      minimumStock: "300",
      reorderLevel: "500",
      unitCost: "115",
    },
    {
      projectId: null,
      name: "Vitrified Tiles 600x600",
      unit: "sqft",
      locationType: "warehouse",
      locationName: "Central In-House Warehouse",
      quantityOnHand: "2400",
      quantityCommitted: "0",
      quantityConsumed: "0",
      minimumStock: "500",
      reorderLevel: "800",
      unitCost: "55",
    },
    // Project Site stocks
    {
      projectId: projects[0]!.id,
      name: "Cement — OPC 53 grade",
      unit: "bag",
      locationType: "site",
      locationName: "Hinjewadi Tech Park Site Store",
      quantityOnHand: "320",
      quantityCommitted: "180",
      quantityConsumed: "1240",
      minimumStock: "200",
      reorderLevel: "250",
      unitCost: "380",
    },
    {
      projectId: projects[0]!.id,
      name: "TMT steel bars 12mm",
      unit: "kg",
      locationType: "site",
      locationName: "Hinjewadi Tech Park Site Store",
      quantityOnHand: "1850",
      quantityCommitted: "900",
      quantityConsumed: "8200",
      minimumStock: "2000",
      reorderLevel: "2500",
      unitCost: "68",
    },
    {
      projectId: projects[1]!.id,
      name: "PVC conduit 25mm",
      unit: "m",
      locationType: "site",
      locationName: "Bandra Commercial Complex Site",
      quantityOnHand: "640",
      quantityCommitted: "0",
      quantityConsumed: "5400",
      minimumStock: "500",
      reorderLevel: "600",
      unitCost: "28",
    },
    {
      projectId: projects[1]!.id,
      name: "Copper wire 4mm",
      unit: "m",
      locationType: "site",
      locationName: "Bandra Commercial Complex Site",
      quantityOnHand: "120",
      quantityCommitted: "4500",
      quantityConsumed: "12800",
      minimumStock: "300",
      reorderLevel: "400",
      unitCost: "115",
    },
  ]);

  await db.insert(stockTransfersTable).values([
    {
      transferNumber: "TR-20260515-0001",
      materialName: "Cement — OPC 53 grade",
      fromProjectId: null,
      toProjectId: projects[0]!.id,
      quantity: "150",
      unit: "bag",
      status: "dispatched",
      dispatchDate: new Date(),
      notes: "Internal stock transfer from central warehouse for Tower 2 foundation.",
      createdById: proc!.id,
    },
    {
      transferNumber: "TR-20260518-0002",
      materialName: "Copper wire 4mm",
      fromProjectId: null,
      toProjectId: projects[1]!.id,
      quantity: "200",
      unit: "m",
      status: "pending",
      notes: "Transfer scheduled for electrical riser work.",
      createdById: proc!.id,
    },
  ]);

  await db.insert(financialInstrumentsTable).values([
    {
      projectId: projects[1]!.id,
      instrumentType: "emd",
      amount: "940000",
      issueDate: "2025-08-15",
      expiryDate: "2026-05-15",
      bankName: "HDFC Bank",
      referenceNumber: "EMD-CTY-2025-009",
      status: "active",
      notes: "Auto-release on project closure.",
      createdById: acct!.id,
    },
    {
      projectId: projects[0]!.id,
      instrumentType: "bank_guarantee",
      bgSubType: "performance",
      amount: "3100000",
      issueDate: "2026-01-10",
      expiryDate: "2027-01-10",
      bankName: "ICICI Bank",
      referenceNumber: "BG-SEN-2026-PG-002",
      status: "active",
      notes: "5% performance BG, valid through DLP.",
      createdById: acct!.id,
    },
    {
      projectId: projects[0]!.id,
      instrumentType: "bank_guarantee",
      bgSubType: "advance_payment",
      amount: "6200000",
      issueDate: "2026-01-20",
      expiryDate: "2026-07-20",
      bankName: "ICICI Bank",
      referenceNumber: "BG-SEN-2026-AP-003",
      status: "active",
      notes: "Against 10% mobilization advance.",
      createdById: acct!.id,
    },
    {
      projectId: projects[3]!.id,
      instrumentType: "retention_dlp",
      amount: "1900000",
      issueDate: "2026-03-15",
      expiryDate: "2027-03-15",
      retentionPercent: "5.0",
      status: "active",
      notes: "Retention held for 12-month DLP.",
      createdById: acct!.id,
    },
    {
      projectId: projects[3]!.id,
      instrumentType: "bank_guarantee",
      bgSubType: "performance",
      amount: "1900000",
      issueDate: "2025-04-01",
      expiryDate: "2026-04-30",
      bankName: "Axis Bank",
      referenceNumber: "BG-NBK-2025-PG-001",
      status: "expired",
      notes: "Released after final acceptance.",
      createdById: acct!.id,
    },
  ]);

  await db.insert(stakeholdersTable).values([
    {
      projectId: projects[0]!.id,
      name: "Sentinel Realty — PMO",
      email: "pmo@sentinelrealty.in",
      organization: "Sentinel Realty",
      role: "Client PMO",
      accessLevel: "write",
    },
    {
      projectId: projects[0]!.id,
      name: "Studio Vellichor",
      email: "design@vellichor.in",
      organization: "Studio Vellichor",
      role: "Architect",
      accessLevel: "read",
    },
    {
      projectId: projects[1]!.id,
      name: "Citygate Site Engineer",
      email: "site@citygate.in",
      organization: "Citygate Developers",
      role: "Client representative",
      accessLevel: "write",
    },
  ]);

  await db.insert(communicationsTable).values([
    {
      projectId: projects[0]!.id,
      communicationType: "email",
      subject: "Re: Floor 5 finishes — sample approval",
      content: "Approved samples 2A and 4B. Please proceed with PO.",
      communicationDate: new Date("2026-04-18T10:30:00Z"),
      participants: "Mahesh, Rohan, Studio Vellichor",
      createdById: pm!.id,
    },
    {
      projectId: projects[1]!.id,
      communicationType: "phone",
      subject: "Crane availability discussion",
      content: "Confirmed crane available from April 22 for 10 days.",
      communicationDate: new Date("2026-04-19T14:00:00Z"),
      participants: "Rohan, Imran (Sahyadri)",
      createdById: pm!.id,
    },
  ]);

  await db.insert(meetingsTable).values([
    {
      projectId: projects[0]!.id,
      title: "Weekly site review — Sentinel",
      meetingDate: new Date("2026-04-26T05:00:00Z"),
      duration: 60,
      location: "Sentinel site office, Hinjewadi",
      agenda:
        "1. Floor 4 ceiling progress\n2. Floor 5 procurement status\n3. Snag review schedule",
      participants: "Rohan, Priya, Sentinel PMO",
      createdById: pm!.id,
    },
    {
      projectId: projects[1]!.id,
      title: "Citygate monthly steering",
      meetingDate: new Date("2026-04-30T11:30:00Z"),
      duration: 90,
      location: "Citygate corporate office",
      agenda: "Monthly progress, RA bill 6 approval, change orders.",
      participants: "Ananya, Rohan, Citygate leadership",
      createdById: admin!.id,
    },
  ]);

  await db.insert(documentsTable).values([
    {
      projectId: projects[0]!.id,
      fileName: "Sentinel_MSA_v3_signed.pdf",
      fileType: "application/pdf",
      fileSize: 2840000,
      category: "contract",
      version: 3,
      status: "active",
      uploadedById: admin!.id,
    },
    {
      projectId: projects[0]!.id,
      fileName: "Floor4_AsBuilt_Apr2026.dwg",
      fileType: "application/dwg",
      fileSize: 1520000,
      category: "drawing",
      version: 1,
      status: "active",
      uploadedById: eng!.id,
    },
    {
      projectId: projects[1]!.id,
      fileName: "Citygate_HSE_Audit_Mar2026.pdf",
      fileType: "application/pdf",
      fileSize: 3210000,
      category: "report",
      version: 1,
      status: "active",
      uploadedById: pm!.id,
    },
  ]);

  await db.insert(notificationsTable).values([
    {
      userId: admin!.id,
      notificationType: "approval_required",
      title: "Negotiation round 2 needs approval",
      message:
        "Asha Healthcare lead — discount of 8.04% exceeds 5% threshold.",
      isRead: false,
    },
    {
      userId: admin!.id,
      notificationType: "instrument_expiring",
      title: "EMD expiring in 22 days",
      message: "Citygate Residences EMD (HDFC) expires on 2026-05-15.",
      isRead: false,
    },
    {
      userId: admin!.id,
      notificationType: "low_stock",
      title: "Copper wire 4mm below minimum",
      message: "Citygate site shows 120m on hand vs 300m minimum.",
      isRead: false,
    },
    {
      userId: admin!.id,
      notificationType: "invoice_overdue",
      title: "Invoice INV-2026-0031 is overdue",
      message: "Citygate Developers, INR 94,00,000.",
      isRead: true,
    },
    {
      userId: admin!.id,
      notificationType: "vendor_invoice_discrepancy",
      title: "Vendor invoice discrepancy flagged",
      message: "Polaris Electricals invoice exceeds PO by INR 30,000.",
      isRead: false,
    },
  ]);

  await db.insert(auditLogsTable).values([
    {
      userId: admin!.id,
      activity: "User signed in",
      resourceType: "session",
      ipAddress: "10.20.4.18",
      status: "success",
    },
    {
      userId: pm!.id,
      activity: "Created lead LD-" + ymd + "-0001",
      resourceType: "lead",
      resourceId: leads[0]!.id,
      ipAddress: "10.20.4.42",
      status: "success",
    },
    {
      userId: pm!.id,
      activity: "Submitted BOQ v1 for Lumina Hospitality Group",
      resourceType: "boq",
      resourceId: boq1!.id,
      ipAddress: "10.20.4.42",
      status: "success",
    },
    {
      userId: proc!.id,
      activity: "Selected quotation from Ridgeline Interiors",
      resourceType: "quotation",
      ipAddress: "10.20.4.55",
      status: "success",
    },
    {
      userId: acct!.id,
      activity: "Recorded BG performance INR 31,00,000",
      resourceType: "financial_instrument",
      ipAddress: "10.20.4.71",
      status: "success",
    },
    {
      userId: viewer!.id,
      activity: "Attempted to delete project (denied)",
      resourceType: "project",
      resourceId: projects[0]!.id,
      ipAddress: "10.20.4.99",
      status: "denied",
    },
  ]);

  await ensureRolesAndCompanySeed();

  logger.info("Seed complete");
}
