import { Router, type IRouter } from "express";
import { eq, desc, asc } from "drizzle-orm";
import {
  db,
  projectsTable,
  tasksTable,
  budgetItemsTable,
  raBillsTable,
  stakeholdersTable,
  usersTable,
  punchListItemsTable,
} from "@workspace/db";
import { numKeys } from "../lib/transforms";
import { getCurrentUser } from "../lib/session";

const router: IRouter = Router();

const fProj = (r: Record<string, unknown>) => numKeys(r, ["budget"]);
const fBudget = (r: Record<string, unknown>) =>
  numKeys(r, ["budgeted", "actual", "committed"]);
const fRa = (r: Record<string, unknown>) => numKeys(r, ["amount"]);

router.get("/projects", async (_req, res): Promise<void> => {
  const rows = await db
    .select()
    .from(projectsTable)
    .orderBy(desc(projectsTable.createdAt));
  res.json(rows.map(fProj));
});

router.post("/projects", async (req, res): Promise<void> => {
  const b = req.body ?? {};
  if (!b.name) {
    res.status(400).json({ error: "name required" });
    return;
  }
  const me = await getCurrentUser();
  const [p] = await db
    .insert(projectsTable)
    .values({
      name: b.name,
      type: b.type ?? null,
      location: b.location ?? null,
      clientName: b.clientName ?? null,
      startDate: b.startDate ?? null,
      endDate: b.endDate ?? null,
      budget: b.budget != null ? String(b.budget) : null,
      description: b.description ?? null,
      status: b.status ?? "planning",
      progress: b.progress ?? 0,
      teamSize: b.teamSize ?? null,
      createdById: me.id,
    })
    .returning();
  res.status(201).json(fProj(p!));
});

router.get("/projects/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  const [p] = await db.select().from(projectsTable).where(eq(projectsTable.id, id));
  if (!p) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  const tasks = await db
    .select({ t: tasksTable, n: usersTable.name })
    .from(tasksTable)
    .leftJoin(usersTable, eq(usersTable.id, tasksTable.assignedToId))
    .where(eq(tasksTable.projectId, id))
    .orderBy(asc(tasksTable.id));
  const budgetItems = await db
    .select()
    .from(budgetItemsTable)
    .where(eq(budgetItemsTable.projectId, id));
  const stakeholders = await db
    .select()
    .from(stakeholdersTable)
    .where(eq(stakeholdersTable.projectId, id));
  res.json({
    ...fProj(p),
    tasks: tasks.map((r) => ({ ...r.t, assignedToName: r.n })),
    budgetItems: budgetItems.map(fBudget),
    stakeholders,
  });
});

router.get("/projects/:id/stats", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  const [p] = await db.select().from(projectsTable).where(eq(projectsTable.id, id));
  if (!p) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  const tasks = await db.select().from(tasksTable).where(eq(tasksTable.projectId, id));
  const budgetItems = await db.select().from(budgetItemsTable).where(eq(budgetItemsTable.projectId, id));
  const punchItems = await db.select().from(punchListItemsTable).where(eq(punchListItemsTable.projectId, id));

  const totalBudgeted = budgetItems.reduce((sum, b) => sum + Number(b.budgeted || 0), 0);
  const totalActual = budgetItems.reduce((sum, b) => sum + Number(b.actual || 0), 0);
  const totalCommitted = budgetItems.reduce((sum, b) => sum + Number(b.committed || 0), 0);
  const completedTasks = tasks.filter((t) => t.status === "completed").length;
  const openIssues = punchItems.filter((i) => i.status !== "closed" && i.status !== "resolved").length;

  res.json({
    projectId: id,
    projectName: p.name,
    projectBudget: Number(p.budget || 0),
    totalBudgeted,
    totalActual,
    totalCommitted,
    taskCount: tasks.length,
    completedTasks,
    progress: p.progress || 0,
    openIssues,
    health: openIssues > 5 ? "at_risk" : totalActual > (totalBudgeted || Number(p.budget || 0)) ? "warning" : "good",
  });
});

router.patch("/projects/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  const b = req.body ?? {};
  const update: Record<string, unknown> = {};
  for (const k of [
    "name",
    "type",
    "location",
    "clientName",
    "startDate",
    "endDate",
    "description",
    "status",
    "progress",
    "teamSize",
  ]) {
    if (b[k] !== undefined) update[k] = b[k];
  }
  if (b.budget !== undefined)
    update.budget = b.budget == null ? null : String(b.budget);
  const [p] = await db
    .update(projectsTable)
    .set(update)
    .where(eq(projectsTable.id, id))
    .returning();
  if (!p) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(fProj(p));
});

router.delete("/projects/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  await db.delete(projectsTable).where(eq(projectsTable.id, id));
  res.sendStatus(204);
});

router.get("/tasks", async (req, res): Promise<void> => {
  const projectId = req.query.projectId
    ? parseInt(req.query.projectId as string, 10)
    : null;
  const baseQuery = db
    .select({ t: tasksTable, n: usersTable.name, p: projectsTable.name })
    .from(tasksTable)
    .leftJoin(usersTable, eq(usersTable.id, tasksTable.assignedToId))
    .leftJoin(projectsTable, eq(projectsTable.id, tasksTable.projectId));
  const rows = projectId
    ? await baseQuery.where(eq(tasksTable.projectId, projectId)).orderBy(desc(tasksTable.createdAt))
    : await baseQuery.orderBy(desc(tasksTable.createdAt));
  res.json(rows.map((r) => ({ ...r.t, assignedToName: r.n, projectName: r.p })));
});

router.post("/tasks", async (req, res): Promise<void> => {
  const b = req.body ?? {};
  if (!b.projectId || !b.title) {
    res.status(400).json({ error: "projectId and title required" });
    return;
  }
  const me = await getCurrentUser();
  const [t] = await db
    .insert(tasksTable)
    .values({
      projectId: b.projectId,
      title: b.title,
      description: b.description ?? null,
      assignedToId: b.assignedToId ?? null,
      startDate: b.startDate ?? null,
      endDate: b.endDate ?? null,
      priority: b.priority ?? "medium",
      status: b.status ?? "todo",
      progress: b.progress ?? 0,
      parentTaskId: b.parentTaskId ?? null,
      createdById: me.id,
    })
    .returning();
  res.status(201).json(t);
});

router.patch("/tasks/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  const b = req.body ?? {};
  const update: Record<string, unknown> = {};
  for (const k of [
    "projectId",
    "title",
    "description",
    "assignedToId",
    "startDate",
    "endDate",
    "priority",
    "status",
    "progress",
    "parentTaskId",
  ]) {
    if (b[k] !== undefined) update[k] = b[k];
  }
  const [t] = await db
    .update(tasksTable)
    .set(update)
    .where(eq(tasksTable.id, id))
    .returning();
  if (!t) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(t);
});

router.delete("/tasks/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  await db.delete(tasksTable).where(eq(tasksTable.id, id));
  res.sendStatus(204);
});

// Punch List Items
router.get("/punch-list-items", async (req, res): Promise<void> => {
  const projectId = req.query.projectId
    ? parseInt(req.query.projectId as string, 10)
    : null;
  const baseQuery = db
    .select({ p: punchListItemsTable, pn: projectsTable.name, un: usersTable.name })
    .from(punchListItemsTable)
    .leftJoin(projectsTable, eq(projectsTable.id, punchListItemsTable.projectId))
    .leftJoin(usersTable, eq(usersTable.id, punchListItemsTable.assignedToId));
  const rows = projectId
    ? await baseQuery
        .where(eq(punchListItemsTable.projectId, projectId))
        .orderBy(desc(punchListItemsTable.createdAt))
    : await baseQuery.orderBy(desc(punchListItemsTable.createdAt));
  res.json(rows.map((r) => ({ ...r.p, projectName: r.pn, assignedToName: r.un })));
});

router.post("/punch-list-items", async (req, res): Promise<void> => {
  const b = req.body ?? {};
  if (!b.projectId || !b.title) {
    res.status(400).json({ error: "projectId and title required" });
    return;
  }
  const me = await getCurrentUser();
  const [item] = await db
    .insert(punchListItemsTable)
    .values({
      projectId: b.projectId,
      title: b.title,
      description: b.description ?? null,
      category: b.category ?? "general",
      priority: b.priority ?? "medium",
      status: "open",
      assignedToId: b.assignedToId ?? null,
      dueDate: b.dueDate ?? null,
      createdById: me.id,
    })
    .returning();
  const [row] = await db
    .select({ p: punchListItemsTable, pn: projectsTable.name, un: usersTable.name })
    .from(punchListItemsTable)
    .leftJoin(projectsTable, eq(projectsTable.id, punchListItemsTable.projectId))
    .leftJoin(usersTable, eq(usersTable.id, punchListItemsTable.assignedToId))
    .where(eq(punchListItemsTable.id, item!.id));
  res.status(201).json({ ...row!.p, projectName: row!.pn, assignedToName: row!.un });
});

router.patch("/punch-list-items/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  const b = req.body ?? {};
  const update: Record<string, unknown> = {};
  for (const k of ["title", "description", "category", "priority", "status", "assignedToId", "dueDate"]) {
    if (b[k] !== undefined) update[k] = b[k];
  }
  if (b.status === "resolved" || b.status === "closed") {
    const me = await getCurrentUser();
    update.resolvedAt = new Date();
    update.resolvedById = me.id;
  }
  const [item] = await db
    .update(punchListItemsTable)
    .set(update)
    .where(eq(punchListItemsTable.id, id))
    .returning();
  if (!item) { res.status(404).json({ error: "Not found" }); return; }
  const [row] = await db
    .select({ p: punchListItemsTable, pn: projectsTable.name, un: usersTable.name })
    .from(punchListItemsTable)
    .leftJoin(projectsTable, eq(projectsTable.id, punchListItemsTable.projectId))
    .leftJoin(usersTable, eq(usersTable.id, punchListItemsTable.assignedToId))
    .where(eq(punchListItemsTable.id, id));
  res.json({ ...row!.p, projectName: row!.pn, assignedToName: row!.un });
});

router.delete("/punch-list-items/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  await db.delete(punchListItemsTable).where(eq(punchListItemsTable.id, id));
  res.sendStatus(204);
});

router.get("/projects/:projectId/budget", async (req, res): Promise<void> => {
  const pid = parseInt(req.params.projectId as string, 10);
  const rows = await db
    .select()
    .from(budgetItemsTable)
    .where(eq(budgetItemsTable.projectId, pid));
  res.json(rows.map(fBudget));
});

router.post("/projects/:projectId/budget", async (req, res): Promise<void> => {
  const pid = parseInt(req.params.projectId as string, 10);
  const b = req.body ?? {};
  const costCode = (b.costCode || b.code || b.category || `CST-${Date.now().toString().slice(-4)}`).trim();
  const description = (b.description || b.name || b.category || "Project Budget Item").trim();
  const [item] = await db
    .insert(budgetItemsTable)
    .values({
      projectId: pid,
      costCode,
      description,
      budgeted: String(b.budgeted ?? b.allocatedAmount ?? b.amount ?? 0),
      actual: String(b.actual ?? 0),
      committed: String(b.committed ?? 0),
    })
    .returning();
  res.status(201).json(fBudget(item!));
});

router.delete("/budget-items/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  await db.delete(budgetItemsTable).where(eq(budgetItemsTable.id, id));
  res.sendStatus(204);
});

router.patch("/budget-items/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  const b = req.body ?? {};
  const update: Record<string, unknown> = {};
  if (b.costCode !== undefined) update.costCode = b.costCode;
  if (b.description !== undefined) update.description = b.description;
  if (b.budgeted !== undefined) update.budgeted = String(b.budgeted);
  if (b.actual !== undefined) update.actual = String(b.actual);
  if (b.committed !== undefined) update.committed = String(b.committed);
  const [item] = await db
    .update(budgetItemsTable)
    .set(update)
    .where(eq(budgetItemsTable.id, id))
    .returning();
  if (!item) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(fBudget(item));
});

router.get("/stakeholders", async (req, res): Promise<void> => {
  const projectId = req.query.projectId
    ? parseInt(req.query.projectId as string, 10)
    : null;
  const baseQuery = db
    .select({ s: stakeholdersTable, p: projectsTable.name })
    .from(stakeholdersTable)
    .leftJoin(projectsTable, eq(projectsTable.id, stakeholdersTable.projectId));
  const rows = projectId
    ? await baseQuery.where(eq(stakeholdersTable.projectId, projectId))
    : await baseQuery;
  res.json(rows.map((r) => ({ ...r.s, projectName: r.p })));
});

router.delete("/stakeholders/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  await db.delete(stakeholdersTable).where(eq(stakeholdersTable.id, id));
  res.sendStatus(204);
});

router.post("/stakeholders", async (req, res): Promise<void> => {
  const b = req.body ?? {};
  const [s] = await db
    .insert(stakeholdersTable)
    .values({
      projectId: b.projectId,
      name: b.name,
      email: b.email ?? null,
      phone: b.phone ?? null,
      organization: b.organization ?? null,
      role: b.role ?? null,
      accessLevel: b.accessLevel ?? "read",
    })
    .returning();
  res.status(201).json(s);
});

export default router;
