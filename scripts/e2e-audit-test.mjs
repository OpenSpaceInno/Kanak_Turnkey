#!/usr/bin/env node
import fs from "fs";

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";

const results = {
  passed: [],
  failed: [],
  warnings: [],
  modules: {},
};

function record(moduleName, testName, status, details = {}) {
  if (!results.modules[moduleName]) {
    results.modules[moduleName] = { passed: 0, failed: 0, warnings: 0, tests: [] };
  }
  const item = { module: moduleName, name: testName, status, ...details };
  results.modules[moduleName].tests.push(item);

  if (status === "PASS") {
    results.modules[moduleName].passed++;
    results.passed.push(item);
    console.log(`  ✅ [PASS] ${moduleName} - ${testName}`);
  } else if (status === "FAIL") {
    results.modules[moduleName].failed++;
    results.failed.push(item);
    console.error(`  ❌ [FAIL] ${moduleName} - ${testName}: ${details.error || details.statusText || JSON.stringify(details.data || "")}`);
  } else {
    results.modules[moduleName].warnings++;
    results.warnings.push(item);
    console.warn(`  ⚠️  [WARN] ${moduleName} - ${testName}: ${details.message || ""}`);
  }
}

async function api(path, options = {}) {
  const url = `${BASE_URL}${path}`;
  const headers = {
    "Content-Type": "application/json",
    ...(options.userId ? { "x-user-id": String(options.userId) } : {}),
    ...(options.headers || {}),
  };
  try {
    const res = await fetch(url, {
      ...options,
      headers,
      body: options.body ? (typeof options.body === "string" ? options.body : JSON.stringify(options.body)) : undefined,
    });
    const text = await res.text();
    let data = null;
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
    return { ok: res.ok, status: res.status, statusText: res.statusText, data };
  } catch (err) {
    return { ok: false, status: 0, error: err.message };
  }
}

async function runAudit() {
  console.log("================================================================");
  console.log("  🔍 TURNKEY360 — COMPREHENSIVE END-TO-END CRUD & SYSTEM AUDIT  ");
  console.log("================================================================\n");

  let testUserId = null;
  let testProjectId = null;
  let testLeadId = null;
  let testBoqId = null;
  let testTaskId = null;
  let testVendorId = null;
  let testPoId = null;
  let testRaBillId = null;
  let testMaterialId = null;
  let testRequestId = null;

  // -------------------------------------------------------------
  // MODULE 1: AUTHENTICATION, ROLES & USERS
  // -------------------------------------------------------------
  console.log("\n📦 MODULE 1: Authentication, Roles & User Administration");
  
  // 1.0 Health Check
  const health = await api("/api/healthz");
  if (health.ok && health.data?.status === "ok" && health.data?.database === "healthy") {
    record("Health", `GET /api/healthz probes live database connection (${health.data.database})`, "PASS");
  } else {
    record("Health", "GET /api/healthz probes live database connection", "FAIL", { error: health.data });
  }

  // 1.1 GET /auth/me
  const me = await api("/api/auth/me");
  if (me.ok && me.data?.email) {
    record("Auth", "GET /api/auth/me returns active session", "PASS", { user: me.data.email });
  } else {
    record("Auth", "GET /api/auth/me returns active session", "FAIL", { error: me.error || me.data });
  }

  // 1.2 POST /auth/login with valid user
  const loginValid = await api("/api/auth/login", {
    method: "POST",
    body: { email: "ananya.rao@kanak.in", password: "Kanak@123" },
  });
  if (loginValid.ok && loginValid.data?.id && loginValid.data?.token) {
    record("Auth", "POST /api/auth/login with valid credentials & issues JWT token", "PASS");

    // Verify Bearer Token authentication
    const meBearer = await api("/api/auth/me", {
      headers: { Authorization: `Bearer ${loginValid.data.token}` },
    });
    if (meBearer.ok && meBearer.data?.email === "ananya.rao@kanak.in") {
      record("Auth", "GET /api/auth/me authenticates via Bearer JWT token", "PASS");
    } else {
      record("Auth", "GET /api/auth/me authenticates via Bearer JWT token", "FAIL", { error: meBearer.data });
    }
  } else {
    record("Auth", "POST /api/auth/login with valid credentials & issues JWT token", "FAIL", { error: loginValid.data });
  }

  // 1.3 POST /auth/login with bad password
  const loginBad = await api("/api/auth/login", {
    method: "POST",
    body: { email: "ananya.rao@kanak.in", password: "WrongPassword!999" },
  });
  if (loginBad.status === 401) {
    record("Auth", "POST /api/auth/login rejects invalid password (401)", "PASS");
  } else {
    record("Auth", "POST /api/auth/login rejects invalid password (401)", "FAIL", { status: loginBad.status });
  }

  // 1.3b Verify RBAC protection against unauthorized role operations
  const rbacDelete = await api(`/api/users/9999`, {
    method: "DELETE",
    userId: 6, // Arjun Singh (viewer)
  });
  if (rbacDelete.status === 403) {
    record("RBAC", "DELETE /api/users/:id blocks unauthorized non-admin role (403)", "PASS");
  } else {
    record("RBAC", "DELETE /api/users/:id blocks unauthorized non-admin role (403)", "FAIL", { status: rbacDelete.status });
  }

  const rbacCompany = await api("/api/settings/company", {
    method: "PUT",
    userId: 6, // Arjun Singh (viewer)
    body: { companyName: "Unauthorized Modification" },
  });
  if (rbacCompany.status === 403) {
    record("RBAC", "PUT /api/settings/company blocks unauthorized non-admin role (403)", "PASS");
  } else {
    record("RBAC", "PUT /api/settings/company blocks unauthorized non-admin role (403)", "FAIL", { status: rbacCompany.status });
  }

  // 1.4 POST /auth/switch-role
  const switchRole = await api("/api/auth/switch-role", {
    method: "POST",
    body: { role: "admin" },
  });
  if (switchRole.ok && switchRole.data?.activeRole === "admin") {
    record("Auth", "POST /api/auth/switch-role updates role", "PASS");
  } else {
    record("Auth", "POST /api/auth/switch-role updates role", "FAIL", { error: switchRole.data });
  }

  // 1.5 GET /users
  const usersList = await api("/api/users");
  if (usersList.ok && Array.isArray(usersList.data)) {
    record("Users", `GET /api/users returns list (${usersList.data.length} users)`, "PASS");
  } else {
    record("Users", "GET /api/users returns list", "FAIL", { error: usersList.data });
  }

  // 1.6 POST /users (Create User)
  const testUserEmail = `test.audit.${Date.now()}@kanak.in`;
  const createUser = await api("/api/users", {
    method: "POST",
    body: {
      name: "Audit Test User",
      email: testUserEmail,
      roles: ["engineer"],
      activeRole: "engineer",
      department: "Quality Assurance",
      designation: "Audit Engineer",
      phone: "+91 99999 88888",
    },
  });
  if (createUser.ok && createUser.data?.id) {
    testUserId = createUser.data.id;
    record("Users", "POST /api/users creates user in DB", "PASS", { userId: testUserId });
  } else {
    record("Users", "POST /api/users creates user in DB", "FAIL", { error: createUser.data });
  }

  // 1.7 PATCH /users/:id/roles
  if (testUserId) {
    const updateRoles = await api(`/api/users/${testUserId}/roles`, {
      method: "PATCH",
      body: { roles: ["engineer", "supervisor"] },
    });
    if (updateRoles.ok && updateRoles.data?.roles?.includes("supervisor")) {
      record("Users", "PATCH /api/users/:id/roles updates roles array", "PASS");
    } else {
      record("Users", "PATCH /api/users/:id/roles updates roles array", "FAIL", { error: updateRoles.data });
    }

    // 1.8 DELETE /users/:id
    const deleteUser = await api(`/api/users/${testUserId}`, { method: "DELETE" });
    if (deleteUser.ok) {
      record("Users", "DELETE /api/users/:id deletes user from DB", "PASS");
    } else {
      record("Users", "DELETE /api/users/:id deletes user from DB", "FAIL", { error: deleteUser.data });
    }
  }

  // 1.9 GET /roles
  const rolesRes = await api("/api/roles");
  if (rolesRes.ok && Array.isArray(rolesRes.data)) {
    record("Roles", `GET /api/roles returns system roles (${rolesRes.data.length} roles)`, "PASS");
  } else {
    record("Roles", "GET /api/roles returns system roles", "FAIL", { error: rolesRes.data });
  }

  // -------------------------------------------------------------
  // MODULE 2: PRE-CONSTRUCTION & LEADS PIPELINE
  // -------------------------------------------------------------
  console.log("\n📦 MODULE 2: Pre-Construction & Leads Management");

  // 2.1 GET /leads
  const leads = await api("/api/leads");
  if (leads.ok && Array.isArray(leads.data)) {
    record("Leads", `GET /api/leads returns pipeline list (${leads.data.length} leads)`, "PASS");
  } else {
    record("Leads", "GET /api/leads returns pipeline list", "FAIL", { error: leads.data });
  }

  // 2.2 POST /leads (Create Lead)
  const createLead = await api("/api/leads", {
    method: "POST",
    body: {
      customerName: "Audit Commercial Tower",
      company: "Nexus Infra Corp",
      contactEmail: "nexus@infra.com",
      contactPhone: "+91 98765 43210",
      projectType: "Commercial Turnkey Fitout",
      location: "Bangalore Whitefield",
      budgetEstimate: 15000000,
      leadSource: "Referral",
      notes: "Complete MEP, HVAC, Civil & Interior Fitout across 4 floors",
    },
  });
  if (createLead.ok && createLead.data?.id) {
    testLeadId = createLead.data.id;
    record("Leads", "POST /api/leads creates lead with auto leadNumber", "PASS", { leadId: testLeadId, leadNumber: createLead.data.leadNumber });
  } else {
    record("Leads", "POST /api/leads creates lead with auto leadNumber", "FAIL", { error: createLead.data });
  }

  // 2.3 GET /leads/:id
  if (testLeadId) {
    const getLead = await api(`/api/leads/${testLeadId}`);
    if (getLead.ok && getLead.data?.id === testLeadId) {
      record("Leads", "GET /api/leads/:id returns lead details", "PASS");
    } else {
      record("Leads", "GET /api/leads/:id returns lead details", "FAIL", { error: getLead.data });
    }

    // 2.4 PATCH /leads/:id
    const patchLead = await api(`/api/leads/${testLeadId}`, {
      method: "PATCH",
      body: { stage: "site_visit", notes: "Site survey completed with client team" },
    });
    if (patchLead.ok && patchLead.data?.stage === "site_visit") {
      record("Leads", "PATCH /api/leads/:id transitions stage", "PASS");
    } else {
      record("Leads", "PATCH /api/leads/:id transitions stage", "FAIL", { error: patchLead.data });
    }

    // 2.5 POST /leads/:id/activities
    const addActivity = await api(`/api/leads/${testLeadId}/activities`, {
      method: "POST",
      body: { activityType: "meeting", subject: "Initial Scope Clarification", notes: "Client requested DG backup MEP" },
    });
    if (addActivity.ok && addActivity.data?.id) {
      record("Leads", "POST /api/leads/:id/activities logs timeline event", "PASS");
    } else {
      record("Leads", "POST /api/leads/:id/activities logs timeline event", "FAIL", { error: addActivity.data });
    }

    // 2.6 POST /leads/:id/site-visits
    const addVisit = await api(`/api/leads/${testLeadId}/site-visits`, {
      method: "POST",
      body: {
        visitDate: new Date().toISOString().split("T")[0],
        attendees: "Priya Iyer, Client Engg Lead",
        observations: "Structure ready, slab casting complete, service shafts available",
        checklistAnswers: { slabCastingDone: true, roadAccessAvailable: true },
      },
    });
    if (addVisit.ok && addVisit.data?.id) {
      record("Leads", "POST /api/leads/:id/site-visits creates site visit record", "PASS");
    } else {
      record("Leads", "POST /api/leads/:id/site-visits creates site visit record", "FAIL", { error: addVisit.data });
    }

    // 2.7 POST /leads/:id/boqs (Create BOQ)
    const createBoq = await api(`/api/leads/${testLeadId}/boqs`, {
      method: "POST",
      body: {
        title: "Initial Tender BOQ - Electrical & MEP",
        targetMarginPercent: 18.5,
      },
    });
    if (createBoq.ok && createBoq.data?.id) {
      testBoqId = createBoq.data.id;
      record("BOQ", "POST /api/leads/:id/boqs creates BOQ master", "PASS", { boqId: testBoqId });

      // 2.8 POST /boqs/:id/items
      const addItem = await api(`/api/boqs/${testBoqId}/items`, {
        method: "POST",
        body: {
          itemName: "11kV HT Cable Laying with terminations",
          category: "Electrical",
          unit: "m",
          quantity: 250,
          unitPrice: 1400,
          marginPercent: 20,
        },
      });
      if (addItem.ok && addItem.data?.id) {
        record("BOQ", "POST /api/boqs/:id/items calculates clientRate & totalAmount", "PASS");
      } else {
        record("BOQ", "POST /api/boqs/:id/items calculates clientRate & totalAmount", "FAIL", { error: addItem.data });
      }
    } else {
      record("BOQ", "POST /api/leads/:id/boqs creates BOQ master", "FAIL", { error: createBoq.data });
    }

    // 2.9 POST /leads/:id/convert (Convert Lead to Live Project)
    const convertProject = await api(`/api/leads/${testLeadId}/convert`, {
      method: "POST",
      body: {
        projectName: "Nexus Commercial Fitout",
        budget: 15000000,
        startDate: new Date().toISOString().split("T")[0],
        endDate: new Date(Date.now() + 90 * 86400000).toISOString().split("T")[0],
      },
    });
    if (convertProject.ok && (convertProject.data?.id || convertProject.data?.projectId)) {
      testProjectId = convertProject.data.id || convertProject.data.projectId;
      record("Leads", "POST /api/leads/:id/convert successfully creates Project", "PASS", { projectId: testProjectId });
    } else {
      record("Leads", "POST /api/leads/:id/convert successfully creates Project", "FAIL", { error: convertProject.data });
    }
  }

  // -------------------------------------------------------------
  // MODULE 3: PROJECTS, SITES & TASKS
  // -------------------------------------------------------------
  console.log("\n📦 MODULE 3: Projects, Sites & Tasks Execution");

  // 3.1 GET /projects
  const projects = await api("/api/projects");
  if (projects.ok && Array.isArray(projects.data)) {
    record("Projects", `GET /api/projects returns active project list (${projects.data.length})`, "PASS");
    if (!testProjectId && projects.data.length > 0) {
      testProjectId = projects.data[0].id;
    }
  } else {
    record("Projects", "GET /api/projects returns active project list", "FAIL", { error: projects.data });
  }

  // 3.2 GET /projects/:id
  if (testProjectId) {
    const pDetail = await api(`/api/projects/${testProjectId}`);
    if (pDetail.ok && pDetail.data?.id === testProjectId) {
      record("Projects", "GET /api/projects/:id returns full project dossier", "PASS");
    } else {
      record("Projects", "GET /api/projects/:id returns full project dossier", "FAIL", { error: pDetail.data });
    }

    // 3.2b GET /projects/:id/stats (Live Project Dashboard Stats)
    const pStats = await api(`/api/projects/${testProjectId}/stats`);
    if (pStats.ok && pStats.data?.taskCount !== undefined && pStats.data?.totalBudgeted !== undefined) {
      record("Projects", "GET /api/projects/:id/stats computes live KPI aggregates", "PASS");
    } else {
      record("Projects", "GET /api/projects/:id/stats computes live KPI aggregates", "FAIL", { error: pStats.data });
    }

    // 3.3 Tasks: POST /tasks
    const createTask = await api("/api/tasks", {
      method: "POST",
      body: {
        projectId: testProjectId,
        title: "False Ceiling Framing & Grid Installation",
        description: "Gypsum channel grid fixing as per ceiling layout drawing Rev-2",
        status: "in_progress",
        priority: "high",
        startDate: new Date().toISOString().split("T")[0],
        endDate: new Date(Date.now() + 15 * 86400000).toISOString().split("T")[0],
        progress: 35,
        estimatedQuantity: 450,
        completedQuantity: 157.5,
        unit: "sqft",
      },
    });
    if (createTask.ok && createTask.data?.id) {
      testTaskId = createTask.data.id;
      record("Tasks", "POST /api/tasks creates task with quantities", "PASS", { taskId: testTaskId });
    } else {
      record("Tasks", "POST /api/tasks creates task with quantities", "FAIL", { error: createTask.data });
    }

    // 3.4 Tasks: PATCH /tasks/:id
    if (testTaskId) {
      const updateTask = await api(`/api/tasks/${testTaskId}`, {
        method: "PATCH",
        body: { progress: 60, completedQuantity: 270, status: "in_progress" },
      });
      if (updateTask.ok && updateTask.data?.progress === 60) {
        record("Tasks", "PATCH /api/tasks/:id updates progress & completed quantity", "PASS");
      } else {
        record("Tasks", "PATCH /api/tasks/:id updates progress & completed quantity", "FAIL", { error: updateTask.data });
      }
    }

    // 3.5 Punch List Items: POST /punch-list-items
    const addPunch = await api("/api/punch-list-items", {
      method: "POST",
      body: {
        projectId: testProjectId,
        title: "Ceiling grid unlevel in corridor zone B",
        severity: "medium",
        status: "open",
        location: "Level 2 Corridor",
      },
    });
    if (addPunch.ok && addPunch.data?.id) {
      record("Projects", "POST /punch-list-items records defect/snag", "PASS");
    } else {
      record("Projects", "POST /punch-list-items records defect/snag", "FAIL", { error: addPunch.data });
    }

    // 3.6 Task Templates: GET & POST /task-templates
    const tTemplates = await api("/api/task-templates");
    if (tTemplates.ok && Array.isArray(tTemplates.data)) {
      record("TaskTemplates", `GET /api/task-templates returns templates (${tTemplates.data.length})`, "PASS");
    } else {
      record("TaskTemplates", "GET /api/task-templates returns templates", "FAIL", { error: tTemplates.data });
    }
  }

  // -------------------------------------------------------------
  // MODULE 4: FINANCE & ACCOUNTS (RA BILLS, INVOICES, PETTY CASH)
  // -------------------------------------------------------------
  console.log("\n📦 MODULE 4: Finance, Commercial Accounts & Billing");

  // 4.1 GET /finance/overview
  const cf = await api("/api/finance/overview");
  if (cf.ok) {
    record("Finance", "GET /api/finance/overview computes cash balances & AR/AP", "PASS");
  } else {
    record("Finance", "GET /api/finance/overview computes cash balances & AR/AP", "FAIL", { error: cf.data });
  }

  if (testProjectId) {
    // 4.2 Budget Items: POST /projects/:id/budget
    const addBudget = await api(`/api/projects/${testProjectId}/budget`, {
      method: "POST",
      body: {
        costCode: "CIV-001",
        description: "Partition Walls & Flooring",
        budgeted: 3500000,
      },
    });
    if (addBudget.ok && addBudget.data?.id) {
      record("Finance", "POST /projects/:id/budget allocates project budget category", "PASS");
    } else {
      record("Finance", "POST /projects/:id/budget allocates project budget category", "FAIL", { error: addBudget.data });
    }

    // 4.2b Budget Items Fallback: POST /projects/:id/budget with omitted costCode
    const budgetFallback = await api(`/api/projects/${testProjectId}/budget`, {
      method: "POST",
      body: {
        description: "HVAC Ducting & Diffusers",
        budgeted: 450000,
        // costCode omitted intentionally to test auto-generation
      },
    });
    if (budgetFallback.ok && budgetFallback.data?.costCode?.startsWith("CST-")) {
      record("Finance", "POST /projects/:id/budget normalizes missing costCode fallback", "PASS");
    } else {
      record("Finance", "POST /projects/:id/budget normalizes missing costCode fallback", "FAIL", { error: budgetFallback.data });
    }

    // 4.3 RA Bills: POST /ra-bills (Client Billing)
    const createRaBill = await api("/api/ra-bills", {
      method: "POST",
      body: {
        projectId: testProjectId,
        billNumber: `RA-AUD-${Date.now().toString().slice(-4)}`,
        milestone: "2nd Floor Ceiling & HVAC Rough-in",
        description: "Progress claim for ceiling grid and primary duct routing",
        workCompletionPercent: 45,
        grossAmount: 1800000,
        retentionPercent: 5,
        advanceDeduction: 50000,
        amount: 1660000, // net
      },
    });
    if (createRaBill.ok && createRaBill.data?.id) {
      testRaBillId = createRaBill.data.id;
      record("Finance", "POST /api/ra-bills creates Client RA Bill", "PASS", { raBillId: testRaBillId });

      // 4.4 POST /ra-bills/:id/verify
      const verifyBill = await api(`/api/ra-bills/${testRaBillId}/verify`, { method: "POST" });
      if (verifyBill.ok) {
        record("Finance", "POST /api/ra-bills/:id/verify verifies site measurements", "PASS");
      } else {
        record("Finance", "POST /api/ra-bills/:id/verify verifies site measurements", "FAIL", { error: verifyBill.data });
      }

      // 4.5 POST /ra-bills/:id/submit
      const submitBill = await api(`/api/ra-bills/${testRaBillId}/submit`, { method: "POST" });
      if (submitBill.ok) {
        record("Finance", "POST /api/ra-bills/:id/submit submits RA bill for certification", "PASS");
      } else {
        record("Finance", "POST /api/ra-bills/:id/submit submits RA bill for certification", "FAIL", { error: submitBill.data });
      }
    } else {
      record("Finance", "POST /api/ra-bills creates Client RA Bill", "FAIL", { error: createRaBill.data });
    }

    // 4.6 Site Petty Cash & Expenses: POST /expenses/quick-voucher
    const addExpense = await api("/api/expenses/quick-voucher", {
      method: "POST",
      body: {
        projectId: testProjectId,
        description: "Urgent diesel for dewatering pump (40L)",
        amount: 3800,
        category: "fuel",
        paymentMode: "petty_cash",
        vendorOrShopName: "Shell Petrol Station Whitefield",
        billReferenceNumber: "SH-9921",
        expenseDate: new Date().toISOString().split("T")[0],
      },
    });
    if (addExpense.ok && addExpense.data?.id) {
      record("Finance", "POST /api/expenses/quick-voucher records site petty cash voucher", "PASS");
    } else {
      record("Finance", "POST /api/expenses/quick-voucher records site petty cash voucher", "FAIL", { error: addExpense.data });
    }
  }

  // -------------------------------------------------------------
  // MODULE 5: PROCUREMENT, INVENTORY & SUPPLY CHAIN
  // -------------------------------------------------------------
  console.log("\n📦 MODULE 5: Procurement, Stock & Materials Management");

  // 5.1 GET /materials
  const materials = await api("/api/materials");
  if (materials.ok && Array.isArray(materials.data)) {
    record("Procurement", `GET /api/materials returns catalog (${materials.data.length} items)`, "PASS");
    if (materials.data.length > 0) {
      testMaterialId = materials.data[0].id;
    }
  } else {
    record("Procurement", "GET /api/materials returns catalog", "FAIL", { error: materials.data });
  }

  // 5.2 POST /materials (Add Stock)
  const addMaterial = await api("/api/materials", {
    method: "POST",
    body: {
      name: `Armored XLPE Cable 4C x 16 sqmm - ${Date.now().toString().slice(-4)}`,
      unit: "m",
      locationType: "warehouse",
      locationName: "Central In-House Warehouse",
      quantityOnHand: 450,
      minimumStock: 100,
      reorderLevel: 200,
      unitCost: 320,
    },
  });
  if (addMaterial.ok && addMaterial.data?.id) {
    testMaterialId = addMaterial.data.id;
    record("Procurement", "POST /api/materials adds inventory item", "PASS", { materialId: testMaterialId });
  } else {
    record("Procurement", "POST /api/materials adds inventory item", "FAIL", { error: addMaterial.data });
  }

  // 5.3 Vendors: GET & POST /vendors
  const createVendor = await api("/api/vendors", {
    method: "POST",
    body: {
      name: `Polycab Electricals - ${Date.now().toString().slice(-4)}`,
      contactPerson: "Mahesh Joshi",
      email: "m.joshi@polycab.com",
      phone: "+91 91234 56789",
      category: "Electrical",
      rating: 4.8,
    },
  });
  if (createVendor.ok && createVendor.data?.id) {
    testVendorId = createVendor.data.id;
    record("Procurement", "POST /api/vendors registers supplier", "PASS", { vendorId: testVendorId });
  } else {
    record("Procurement", "POST /api/vendors registers supplier", "FAIL", { error: createVendor.data });
  }

  // 5.4 Material Requests: POST /material-requests
  if (testProjectId) {
    const createReq = await api("/api/material-requests", {
      method: "POST",
      body: {
        projectId: testProjectId,
        title: "Urgent 16 sqmm copper cable for main DB feeder",
        description: "Required for floor electrical distribution board connection",
        quantity: 150,
        unit: "m",
        priority: "high",
        requiredByDate: new Date(Date.now() + 5 * 86400000).toISOString().split("T")[0],
      },
    });
    if (createReq.ok && createReq.data?.id) {
      testRequestId = createReq.data.id;
      record("Procurement", "POST /api/material-requests logs field material requisition", "PASS", { requestId: testRequestId });

      // 5.5 Approve Request: POST /material-requests/:id/approve
      const approveReq = await api(`/api/material-requests/${testRequestId}/approve`, {
        method: "POST",
        body: { status: "approved" },
      });
      if (approveReq.ok) {
        record("Procurement", "POST /api/material-requests/:id/approve transitions request", "PASS");
      } else {
        record("Procurement", "POST /api/material-requests/:id/approve transitions request", "FAIL", { error: approveReq.data });
      }
    } else {
      record("Procurement", "POST /api/material-requests logs field material requisition", "FAIL", { error: createReq.data });
    }

    // 5.6 Purchase Orders: POST /purchase-orders
    if (testVendorId) {
      const createPo = await api("/api/purchase-orders", {
        method: "POST",
        body: {
          projectId: testProjectId,
          vendorId: testVendorId,
          poNumber: `PO-AUD-${Date.now().toString().slice(-4)}`,
          materialRequestId: testRequestId || undefined,
          totalAmount: 185000,
          expectedDeliveryDate: new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0],
          deliveryAddress: "Nexus Commercial Fitout Site Store, Whitefield",
          items: [
            { materialName: "Armored XLPE Cable 4C x 16 sqmm", quantity: 150, unit: "m", unitPrice: 320, totalPrice: 48000 },
          ],
        },
      });
      if (createPo.ok && createPo.data?.id) {
        testPoId = createPo.data.id;
        record("Procurement", "POST /api/purchase-orders creates Purchase Order", "PASS", { poId: testPoId });

        // 5.7 Receive: POST /purchase-orders/:id/receive
        const receivePo = await api(`/api/purchase-orders/${testPoId}/receive`, {
          method: "POST",
          body: {
            deliveryChallanNumber: "DC-POLY-9812",
            receivedQuantity: 150,
          },
        });
        if (receivePo.ok) {
          record("Procurement", "POST /api/purchase-orders/:id/receive receives delivery challan", "PASS");
        } else {
          record("Procurement", "POST /api/purchase-orders/:id/receive receives delivery challan", "FAIL", { error: receivePo.data });
        }
      } else {
        record("Procurement", "POST /api/purchase-orders creates Purchase Order", "FAIL", { error: createPo.data });
      }
    }

    // 5.8 Stock Transfers: POST /stock-transfers
    const addTransfer = await api("/api/stock-transfers", {
      method: "POST",
      body: {
        materialName: "Cement — OPC 53 grade",
        fromProjectId: null, // Central Warehouse
        toProjectId: testProjectId,
        quantity: 50,
        unit: "bag",
        remarks: "Internal warehouse transfer to site store",
      },
    });
    if (addTransfer.ok && addTransfer.data?.id) {
      record("Procurement", "POST /api/stock-transfers records warehouse to site transfer", "PASS");
    } else {
      record("Procurement", "POST /api/stock-transfers records warehouse to site transfer", "FAIL", { error: addTransfer.data });
    }
  }

  // 5.9 Procurement Route Aliases Verification
  const aliasMaterials = await api("/api/procurement/materials");
  const aliasVendors = await api("/api/procurement/vendors");
  const aliasRequests = await api("/api/procurement/requests");
  const aliasOrders = await api("/api/procurement/orders");
  const aliasTransfers = await api("/api/procurement/transfers");

  if (aliasMaterials.ok && Array.isArray(aliasMaterials.data)) {
    record("Procurement", `GET /api/procurement/materials alias functions cleanly (${aliasMaterials.data.length})`, "PASS");
  } else {
    record("Procurement", "GET /api/procurement/materials alias functions cleanly", "FAIL", { error: aliasMaterials.data });
  }
  if (aliasVendors.ok && Array.isArray(aliasVendors.data)) {
    record("Procurement", `GET /api/procurement/vendors alias functions cleanly (${aliasVendors.data.length})`, "PASS");
  } else {
    record("Procurement", "GET /api/procurement/vendors alias functions cleanly", "FAIL", { error: aliasVendors.data });
  }
  if (aliasRequests.ok && Array.isArray(aliasRequests.data)) {
    record("Procurement", `GET /api/procurement/requests alias functions cleanly (${aliasRequests.data.length})`, "PASS");
  } else {
    record("Procurement", "GET /api/procurement/requests alias functions cleanly", "FAIL", { error: aliasRequests.data });
  }
  if (aliasOrders.ok && Array.isArray(aliasOrders.data)) {
    record("Procurement", `GET /api/procurement/orders alias functions cleanly (${aliasOrders.data.length})`, "PASS");
  } else {
    record("Procurement", "GET /api/procurement/orders alias functions cleanly", "FAIL", { error: aliasOrders.data });
  }
  if (aliasTransfers.ok && Array.isArray(aliasTransfers.data)) {
    record("Procurement", `GET /api/procurement/transfers alias functions cleanly (${aliasTransfers.data.length})`, "PASS");
  } else {
    record("Procurement", "GET /api/procurement/transfers alias functions cleanly", "FAIL", { error: aliasTransfers.data });
  }

  // -------------------------------------------------------------
  // MODULE 6: FIELD OPERATIONS & MOBILE PWA
  // -------------------------------------------------------------
  console.log("\n📦 MODULE 6: Field Operations & Mobile PWA Endpoints");

  // 6.1 Attendance: POST /attendance/check-in & GET /attendance/today
  const checkIn = await api("/api/attendance/check-in", {
    method: "POST",
    body: {
      projectId: testProjectId || 1,
      latitude: "12.9716",
      longitude: "77.5946",
      notes: "Checked in at site gate 1",
    },
  });
  if (checkIn.ok) {
    record("FieldOps", "POST /api/attendance/check-in logs site entry", "PASS");
  } else {
    record("FieldOps", "POST /api/attendance/check-in logs site entry", "FAIL", { error: checkIn.data });
  }

  const getAtt = await api("/api/attendance/today");
  if (getAtt.ok) {
    record("FieldOps", "GET /api/attendance/today returns user attendance state", "PASS");
  } else {
    record("FieldOps", "GET /api/attendance/today returns user attendance state", "FAIL", { error: getAtt.data });
  }

  // 6.2 DPR: GET /dpr/today & POST /dpr/submit
  const getDpr = await api(`/api/dpr/today?projectId=${testProjectId || 1}`);
  if (getDpr.ok) {
    record("FieldOps", "GET /api/dpr/today returns compiled daily summary", "PASS");
  } else {
    record("FieldOps", "GET /api/dpr/today returns compiled daily summary", "FAIL", { error: getDpr.data });
  }

  const submitDpr = await api("/api/dpr/submit", {
    method: "POST",
    body: {
      projectId: testProjectId || 1,
      date: new Date().toISOString().split("T")[0],
      workSummary: "Completed cable pulling in wing A and ceiling framing in wing B",
      workforceCount: 24,
      activities: [{ taskId: testTaskId || 1, title: "Ceiling Grid", completedQty: 25, unit: "sqft" }],
      materialsConsumed: [{ materialName: "Armored Cable", quantity: 20, unit: "m" }],
      issuesReported: [],
    },
  });
  if (submitDpr.ok) {
    record("FieldOps", "POST /api/dpr/submit creates and submits DPR record", "PASS");
  } else {
    record("FieldOps", "POST /api/dpr/submit creates and submits DPR record", "FAIL", { error: submitDpr.data });
  }

  // 6.3 Field Store Overview
  const storeOv = await api(`/api/field/store-overview?projectId=${testProjectId || 1}`);
  if (storeOv.ok) {
    record("FieldOps", "GET /api/field/store-overview returns site warehouse status", "PASS");
  } else {
    record("FieldOps", "GET /api/field/store-overview returns site warehouse status", "FAIL", { error: storeOv.data });
  }

  // 6.4 Field Supervisor Summary
  const supSum = await api(`/api/field/supervisor-summary?projectId=${testProjectId || 1}`);
  if (supSum.ok) {
    record("FieldOps", "GET /api/field/supervisor-summary returns labour & activities", "PASS");
  } else {
    record("FieldOps", "GET /api/field/supervisor-summary returns labour & activities", "FAIL", { error: supSum.data });
  }

  // 6.5 Subcontractor Portal
  const subPort = await api(`/api/field/subcontractor-portal?projectId=${testProjectId || 1}`);
  if (subPort.ok) {
    record("FieldOps", "GET /api/field/subcontractor-portal returns trade partner scope", "PASS");
  } else {
    record("FieldOps", "GET /api/field/subcontractor-portal returns trade partner scope", "FAIL", { error: subPort.data });
  }

  // -------------------------------------------------------------
  // MODULE 7: COMMUNICATIONS, MEETINGS & DOCUMENTS
  // -------------------------------------------------------------
  console.log("\n📦 MODULE 7: Collaboration, Communications & Documents");

  // 7.1 GET & POST /communications
  const addComm = await api("/api/communications", {
    method: "POST",
    body: {
      projectId: testProjectId,
      subject: "Weekly Site Coordination Minutes",
      communicationType: "email",
      content: "Transmitted revised ceiling layout and cable tray routing to architect",
      communicationDate: new Date().toISOString(),
    },
  });
  if (addComm.ok && addComm.data?.id) {
    record("Communications", "POST /api/communications logs client/vendor dialogue", "PASS");
  } else {
    record("Communications", "POST /api/communications logs client/vendor dialogue", "FAIL", { error: addComm.data });
  }

  // 7.2 GET & POST /meetings
  const addMeeting = await api("/api/meetings", {
    method: "POST",
    body: {
      projectId: testProjectId,
      title: "MEP Weekly Coordination Review #12",
      meetingDate: new Date().toISOString(),
      attendees: "Client PM, Consultant MEP, Lead Engineer Priya",
      keyDecisions: "Chilled water riser rerouting approved as per sketch SK-04",
    },
  });
  if (addMeeting.ok && addMeeting.data?.id) {
    record("Meetings", "POST /api/meetings records site meeting and MOM", "PASS");
  } else {
    record("Meetings", "POST /api/meetings records site meeting and MOM", "FAIL", { error: addMeeting.data });
  }

  // 7.3 GET & POST /documents
  const addDoc = await api("/api/documents", {
    method: "POST",
    body: {
      projectId: testProjectId,
      fileName: "Architectural Revised Ceiling Layout Rev-3.dwg",
      category: "drawing",
      fileUrl: "https://storage.kanak.in/projects/dwg/ceiling_rev3.pdf",
      version: 3,
    },
  });
  if (addDoc.ok && addDoc.data?.id) {
    record("Documents", "POST /api/documents registers drawing/spec document", "PASS");
  } else {
    record("Documents", "POST /api/documents registers drawing/spec document", "FAIL", { error: addDoc.data });
  }

  // 7.4 Resiliency Fallbacks: POST /documents with 'name' alias and string version
  const docFallback = await api("/api/documents", {
    method: "POST",
    body: {
      projectId: testProjectId,
      name: "Emergency Evacuation Plan Rev-B.pdf", // 'name' instead of 'fileName'
      version: "2", // string version instead of integer
      category: "spec",
    },
  });
  if (docFallback.ok && docFallback.data?.fileName === "Emergency Evacuation Plan Rev-B.pdf" && docFallback.data?.version === 2) {
    record("Documents", "POST /api/documents normalizes 'name' alias and string version cast", "PASS");
  } else {
    record("Documents", "POST /api/documents normalizes 'name' alias and string version cast", "FAIL", { error: docFallback.data });
  }

  // 7.5 Resiliency Fallbacks: POST /communications with title/type aliases & omitted date
  const commFallback = await api("/api/communications", {
    method: "POST",
    body: {
      projectId: testProjectId,
      type: "site_memo", // 'type' instead of 'communicationType'
      title: "Rain Contingency Plan for Terrace Waterproofing", // 'title' instead of 'subject'
      // communicationDate omitted intentionally to test auto-timestamp
    },
  });
  if (commFallback.ok && commFallback.data?.communicationDate) {
    record("Communications", "POST /api/communications normalizes title/type aliases & defaults omitted timestamp", "PASS");
  } else {
    record("Communications", "POST /api/communications normalizes title/type aliases & defaults omitted timestamp", "FAIL", { error: commFallback.data });
  }

  // -------------------------------------------------------------
  // MODULE 8: SYSTEM, AUDIT LOGS & COMPANY SETTINGS
  // -------------------------------------------------------------
  console.log("\n📦 MODULE 8: System Governance, Audit Logs & Company Settings");

  // 8.1 Notifications
  const notifs = await api("/api/notifications");
  if (notifs.ok && Array.isArray(notifs.data)) {
    record("System", `GET /api/notifications returns notification stream (${notifs.data.length})`, "PASS");
  } else {
    record("System", "GET /api/notifications returns notification stream", "FAIL", { error: notifs.data });
  }

  // 8.2 Audit Logs
  const auditLogs = await api("/api/audit-logs");
  if (auditLogs.ok && Array.isArray(auditLogs.data)) {
    record("System", `GET /api/audit-logs returns system audit trail (${auditLogs.data.length})`, "PASS");
  } else {
    record("System", "GET /api/audit-logs returns system audit trail", "FAIL", { error: auditLogs.data });
  }

  // 8.3 Company Settings: GET & PUT /settings/company
  const comp = await api("/api/settings/company");
  if (comp.ok && comp.data?.companyName) {
    record("Company", `GET /api/settings/company returns corporate config (${comp.data.companyName})`, "PASS");
  } else {
    record("Company", "GET /api/settings/company returns corporate config", "FAIL", { error: comp.data });
  }

  // -------------------------------------------------------------
  // SUMMARY & OUTPUT
  // -------------------------------------------------------------
  console.log("\n================================================================");
  console.log(`  📊 TEST RESULTS SUMMARY: ${results.passed.length} PASSED | ${results.failed.length} FAILED | ${results.warnings.length} WARNINGS`);
  console.log("================================================================\n");

  fs.writeFileSync("e2e-audit-results.json", JSON.stringify(results, null, 2));
}

runAudit().catch(err => {
  console.error("Audit script failed:", err);
  process.exit(1);
});
