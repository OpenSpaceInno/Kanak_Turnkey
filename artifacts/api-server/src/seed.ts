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
  stakeholdersTable,
  communicationsTable,
  meetingsTable,
  documentsTable,
  notificationsTable,
  auditLogsTable,
} from "@workspace/db";
import { logger } from "./lib/logger";

export async function seedIfEmpty(): Promise<void> {
  const [existingUser] = await db.select().from(usersTable).limit(1);
  if (existingUser) {
    logger.info("Seed data already present, skipping");
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
        status: "in_progress",
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
        status: "in_progress",
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
        status: "completed",
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
        status: "on_hold",
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
    {
      projectId: projects[0]!.id,
      name: "Cement — OPC 53 grade",
      unit: "bag",
      quantityOnHand: "320",
      quantityCommitted: "180",
      quantityConsumed: "1240",
      minimumStock: "200",
    },
    {
      projectId: projects[0]!.id,
      name: "TMT steel bars 12mm",
      unit: "kg",
      quantityOnHand: "1850",
      quantityCommitted: "900",
      quantityConsumed: "8200",
      minimumStock: "2000",
    },
    {
      projectId: projects[1]!.id,
      name: "PVC conduit 25mm",
      unit: "m",
      quantityOnHand: "640",
      quantityCommitted: "0",
      quantityConsumed: "5400",
      minimumStock: "500",
    },
    {
      projectId: projects[1]!.id,
      name: "Copper wire 4mm",
      unit: "m",
      quantityOnHand: "120",
      quantityCommitted: "4500",
      quantityConsumed: "12800",
      minimumStock: "300",
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

  logger.info("Seed complete");
}
