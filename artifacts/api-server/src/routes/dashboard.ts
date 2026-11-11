import { Router, type IRouter } from "express";
import { sql } from "drizzle-orm";
import {
  db,
  projectsTable,
  leadsTable,
  tasksTable,
  vendorsTable,
  budgetItemsTable,
  expensesTable,
  invoicesTable,
  purchaseOrdersTable,
  materialRequestsTable,
  materialsTable,
  leadActivitiesTable,
  notificationsTable,
} from "@workspace/db";
import { num } from "../lib/transforms";

const router: IRouter = Router();

const STAGES = [
  "lead_creation",
  "site_visit",
  "drawings",
  "boq",
  "negotiation",
  "finalization",
];

router.get("/dashboard/summary", async (_req, res): Promise<void> => {
  const [projectsCount] = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(projectsTable);
  const [leadsCount] = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(leadsTable);
  const [tasksCount] = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(tasksTable);
  const [vendorsCount] = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(vendorsTable);

  const projectsByStatus = await db
    .select({
      status: projectsTable.status,
      count: sql<number>`count(*)::int`,
    })
    .from(projectsTable)
    .groupBy(projectsTable.status);

  const tasksByStatus = await db
    .select({
      status: tasksTable.status,
      count: sql<number>`count(*)::int`,
    })
    .from(tasksTable)
    .groupBy(tasksTable.status);

  const [budget] = await db
    .select({ total: sql<string>`coalesce(sum(budgeted),0)::text` })
    .from(budgetItemsTable);
  const [expense] = await db
    .select({ total: sql<string>`coalesce(sum(amount),0)::text` })
    .from(expensesTable);
  const [invoiced] = await db
    .select({ total: sql<string>`coalesce(sum(amount),0)::text` })
    .from(invoicesTable);
  const [paid] = await db
    .select({
      total: sql<string>`coalesce(sum(amount) filter (where status = 'paid'),0)::text`,
    })
    .from(invoicesTable);
  const [overdue] = await db
    .select({
      c: sql<number>`count(*) filter (where status = 'overdue')::int`,
    })
    .from(invoicesTable);

  const [activePos] = await db
    .select({
      c: sql<number>`count(*) filter (where status in ('issued','acknowledged','in_transit'))::int`,
    })
    .from(purchaseOrdersTable);
  const [pendingReqs] = await db
    .select({
      c: sql<number>`count(*) filter (where status = 'pending')::int`,
    })
    .from(materialRequestsTable);
  const [lowStock] = await db
    .select({
      c: sql<number>`count(*) filter (where quantity_on_hand < minimum_stock)::int`,
    })
    .from(materialsTable);

  const leadFunnelRaw = await db
    .select({
      stage: leadsTable.stage,
      count: sql<number>`count(*)::int`,
      value: sql<string>`coalesce(sum(budget_estimate),0)::text`,
    })
    .from(leadsTable)
    .groupBy(leadsTable.stage);
  const stageMap = new Map<string, { count: number; value: number }>(
    leadFunnelRaw.map((r) => [
      r.stage,
      { count: r.count, value: num(r.value) ?? 0 },
    ]),
  );
  const leadFunnel = STAGES.map((s) => ({
    stage: s,
    count: stageMap.get(s)?.count ?? 0,
    value: stageMap.get(s)?.value ?? 0,
  }));

  const leadsByStatusRaw = await db
    .select({
      status: leadsTable.status,
      count: sql<number>`count(*)::int`,
      value: sql<string>`coalesce(sum(budget_estimate),0)::text`,
    })
    .from(leadsTable)
    .groupBy(leadsTable.status);
  const leadsByStatus = leadsByStatusRaw.map((r) => ({
    status: r.status,
    count: r.count,
    value: num(r.value) ?? 0,
  }));

  res.json({
    totals: {
      projects: projectsCount?.c ?? 0,
      leads: leadsCount?.c ?? 0,
      tasks: tasksCount?.c ?? 0,
      vendors: vendorsCount?.c ?? 0,
    },
    projectsByStatus,
    tasksByStatus,
    financials: {
      totalBudget: num(budget?.total) ?? 0,
      totalExpenses: num(expense?.total) ?? 0,
      totalInvoiced: num(invoiced?.total) ?? 0,
      totalPaid: num(paid?.total) ?? 0,
      overdueInvoices: overdue?.c ?? 0,
    },
    procurement: {
      activePos: activePos?.c ?? 0,
      pendingRequests: pendingReqs?.c ?? 0,
      lowStockMaterials: lowStock?.c ?? 0,
    },
    leadFunnel,
    leadsByStatus,
  });
});

router.get("/dashboard/activity", async (_req, res): Promise<void> => {
  const acts = await db
    .select()
    .from(leadActivitiesTable)
    .orderBy(sql`created_at desc`)
    .limit(10);
  const notifs = await db
    .select()
    .from(notificationsTable)
    .orderBy(sql`created_at desc`)
    .limit(10);
  const items = [
    ...acts.map((a) => ({
      id: a.id,
      type: `lead_${a.activityType}`,
      title: a.title,
      description: a.description ?? "",
      createdAt: a.createdAt.toISOString(),
    })),
    ...notifs.map((n) => ({
      id: n.id + 100000,
      type: n.notificationType,
      title: n.title,
      description: n.message ?? "",
      createdAt: n.createdAt.toISOString(),
    })),
  ]
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
    .slice(0, 15);
  res.json(items);
});

export default router;
