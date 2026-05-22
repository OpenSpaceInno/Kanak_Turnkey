import {
  useGetDashboardSummary,
  useGetRecentActivity,
  useGetCurrentUser,
} from "@workspace/api-client-react";
import type { DashboardSummary, ActivityItem } from "@workspace/api-client-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  Briefcase,
  Building2,
  CheckSquare,
  Users,
  DollarSign,
  TrendingUp,
  ShoppingCart,
  AlertTriangle,
  Award,
  Target,
} from "lucide-react";
import { format } from "date-fns";

const COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

const inr = (v: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(v);

const lakh = (v: number) => `₹${(v / 100000).toFixed(1)}L`;

type Summary = DashboardSummary;
type Activity = ActivityItem[];

function KpiCard({
  title,
  value,
  icon: Icon,
  sub,
  highlight,
}: {
  title: string;
  value: string | number;
  icon: React.ElementType;
  sub?: string;
  highlight?: "warning" | "danger" | "success";
}) {
  const subColor =
    highlight === "danger"
      ? "text-destructive"
      : highlight === "success"
        ? "text-emerald-600"
        : highlight === "warning"
          ? "text-amber-600"
          : "text-muted-foreground";
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {sub && <p className={`text-xs mt-1 ${subColor}`}>{sub}</p>}
      </CardContent>
    </Card>
  );
}

function ActivityFeed({ activity }: { activity: Activity }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activity.slice(0, 5).map((item) => (
            <div key={item.id} className="flex gap-3 text-sm">
              <div className="mt-0.5 w-2 h-2 rounded-full bg-primary shrink-0" />
              <div className="space-y-1">
                <p className="font-medium leading-none">{item.title}</p>
                <p className="text-muted-foreground">{item.description}</p>
                <p className="text-xs text-muted-foreground/70">
                  {format(new Date(item.createdAt), "MMM d, h:mm a")}
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function AdminDashboard({
  summary,
  activity,
}: {
  summary: Summary;
  activity: Activity;
}) {
  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KpiCard title="Active Projects" value={summary.totals.projects} icon={Briefcase} />
        <KpiCard title="Active Leads" value={summary.totals.leads} icon={Users} />
        <KpiCard title="Pending Tasks" value={summary.totals.tasks} icon={CheckSquare} />
        <KpiCard title="Active Vendors" value={summary.totals.vendors} icon={Building2} />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Lead Pipeline</CardTitle>
            <CardDescription>Value of leads by stage</CardDescription>
          </CardHeader>
          <CardContent className="pl-2">
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={summary.leadFunnel} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal vertical={false} stroke="hsl(var(--border))" />
                  <XAxis type="number" tickFormatter={lakh} />
                  <YAxis dataKey="stage" type="category" width={100} tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(v: number) => inr(v)} contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))" }} />
                  <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Project Status</CardTitle>
            <CardDescription>Distribution of active projects</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={summary.projectsByStatus} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={2} dataKey="count" nameKey="status" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                    {summary.projectsByStatus.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))" }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader><CardTitle>Financial Overview</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Budget</p>
                <p className="text-2xl font-bold">{inr(summary.financials.totalBudget)}</p>
              </div>
              <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Invoiced</p>
                  <p className="text-lg font-semibold text-primary">{inr(summary.financials.totalInvoiced)}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Paid</p>
                  <p className="text-lg font-semibold text-emerald-600">{inr(summary.financials.totalPaid)}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Procurement Alerts</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-lg bg-accent/50 border">
                <span className="font-medium text-sm">Active POs</span>
                <span className="font-bold">{summary.procurement.activePos}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-accent/50 border">
                <span className="font-medium text-sm">Pending Material Reqs</span>
                <span className="font-bold">{summary.procurement.pendingRequests}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive">
                <span className="font-medium text-sm">Low Stock Alerts</span>
                <span className="font-bold">{summary.procurement.lowStockMaterials}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <ActivityFeed activity={activity} />
      </div>
    </>
  );
}

function SalesDashboard({
  summary,
  activity,
}: {
  summary: Summary;
  activity: Activity;
}) {
  const totalPipelineValue = summary.leadFunnel.reduce((s, f) => s + f.value, 0);
  const qualified = summary.leadsByStatus.find((s) => s.status === "qualified");
  const won = summary.leadsByStatus.find((s) => s.status === "won");
  const lost = summary.leadsByStatus.find((s) => s.status === "lost");
  const winRate =
    (won?.count ?? 0) + (lost?.count ?? 0) > 0
      ? Math.round(((won?.count ?? 0) / ((won?.count ?? 0) + (lost?.count ?? 0))) * 100)
      : 0;

  const statusColors: Record<string, string> = {
    new: "hsl(var(--chart-1))",
    contacted: "hsl(var(--chart-2))",
    qualified: "hsl(var(--chart-3))",
    won: "hsl(var(--chart-4))",
    lost: "hsl(var(--chart-5))",
  };

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KpiCard title="Total Leads" value={summary.totals.leads} icon={Users} />
        <KpiCard title="Pipeline Value" value={lakh(totalPipelineValue)} icon={TrendingUp} sub="Total estimated budget" />
        <KpiCard title="Qualified Leads" value={qualified?.count ?? 0} icon={Target} sub={`${inr(qualified?.value ?? 0)} pipeline`} highlight="success" />
        <KpiCard title="Win Rate" value={`${winRate}%`} icon={Award} sub={`${won?.count ?? 0} won · ${lost?.count ?? 0} lost`} highlight={winRate >= 50 ? "success" : "warning"} />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Lead Pipeline by Stage</CardTitle>
            <CardDescription>Budget value at each pipeline stage</CardDescription>
          </CardHeader>
          <CardContent className="pl-2">
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={summary.leadFunnel} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal vertical={false} stroke="hsl(var(--border))" />
                  <XAxis type="number" tickFormatter={lakh} />
                  <YAxis dataKey="stage" type="category" width={110} tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(v: number) => inr(v)} contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))" }} />
                  <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Leads by Status</CardTitle>
            <CardDescription>Current lead status breakdown</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={summary.leadsByStatus} cx="50%" cy="50%" innerRadius={55} outerRadius={95} paddingAngle={2} dataKey="count" nameKey="status" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                    {summary.leadsByStatus.map((entry) => (
                      <Cell key={entry.status} fill={statusColors[entry.status] ?? "hsl(var(--chart-1))"} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number) => [`${v} leads`]} contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))" }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="col-span-2">
          <CardHeader>
            <CardTitle>Lead Volume by Stage</CardTitle>
            <CardDescription>Number of leads at each stage</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[180px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={summary.leadFunnel} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="stage" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))" }} />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <ActivityFeed activity={activity} />
      </div>
    </>
  );
}

function EngineerDashboard({
  summary,
  activity,
}: {
  summary: Summary;
  activity: Activity;
}) {
  const inProgress = summary.tasksByStatus.find((s) => s.status === "in_progress");
  const completed = summary.tasksByStatus.find((s) => s.status === "completed");
  const pending = summary.tasksByStatus.find((s) => s.status === "todo");

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KpiCard title="Active Projects" value={summary.totals.projects} icon={Briefcase} />
        <KpiCard title="Tasks In Progress" value={inProgress?.count ?? 0} icon={TrendingUp} highlight="warning" />
        <KpiCard title="Tasks Pending" value={pending?.count ?? 0} icon={CheckSquare} />
        <KpiCard title="Tasks Completed" value={completed?.count ?? 0} icon={Award} highlight="success" />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Project Status</CardTitle>
            <CardDescription>Distribution of active projects</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={summary.projectsByStatus} cx="50%" cy="50%" innerRadius={55} outerRadius={95} paddingAngle={2} dataKey="count" nameKey="status" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                    {summary.projectsByStatus.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))" }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Task Status Breakdown</CardTitle>
            <CardDescription>Tasks across all assigned projects</CardDescription>
          </CardHeader>
          <CardContent className="pl-2">
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={summary.tasksByStatus} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="status" tick={{ fontSize: 12 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                  <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))" }} />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <ActivityFeed activity={activity} />
      </div>
    </>
  );
}

function AccountantDashboard({
  summary,
  activity,
}: {
  summary: Summary;
  activity: Activity;
}) {
  const utilizationPct =
    summary.financials.totalBudget > 0
      ? Math.round((summary.financials.totalExpenses / summary.financials.totalBudget) * 100)
      : 0;

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KpiCard title="Total Budget" value={lakh(summary.financials.totalBudget)} icon={DollarSign} />
        <KpiCard title="Total Expenses" value={lakh(summary.financials.totalExpenses)} icon={TrendingUp} sub={`${utilizationPct}% of budget utilised`} highlight={utilizationPct > 90 ? "danger" : "warning"} />
        <KpiCard title="Total Invoiced" value={lakh(summary.financials.totalInvoiced)} icon={CheckSquare} sub="Client invoices raised" />
        <KpiCard title="Overdue Invoices" value={summary.financials.overdueInvoices} icon={AlertTriangle} sub="Requires follow-up" highlight={summary.financials.overdueInvoices > 0 ? "danger" : undefined} />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="col-span-2">
          <CardHeader>
            <CardTitle>Financial Summary</CardTitle>
            <CardDescription>Budget vs expenses vs collections</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6 pt-2">
              {[
                { label: "Total Budget", value: summary.financials.totalBudget, color: "bg-chart-1" },
                { label: "Total Expenses", value: summary.financials.totalExpenses, color: "bg-chart-2" },
                { label: "Total Invoiced", value: summary.financials.totalInvoiced, color: "bg-chart-3" },
                { label: "Total Paid", value: summary.financials.totalPaid, color: "bg-chart-4" },
              ].map(({ label, value, color }) => (
                <div key={label} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">{label}</span>
                    <span className="font-semibold">{inr(value)}</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className={`h-full rounded-full ${color}`}
                      style={{ width: `${Math.min(100, (value / summary.financials.totalBudget) * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <ActivityFeed activity={activity} />
      </div>
    </>
  );
}

function ProcurementDashboard({
  summary,
  activity,
}: {
  summary: Summary;
  activity: Activity;
}) {
  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KpiCard title="Active Vendors" value={summary.totals.vendors} icon={Building2} />
        <KpiCard title="Active POs" value={summary.procurement.activePos} icon={ShoppingCart} sub="Issued / acknowledged / in transit" />
        <KpiCard title="Pending Material Reqs" value={summary.procurement.pendingRequests} icon={CheckSquare} highlight={summary.procurement.pendingRequests > 0 ? "warning" : undefined} />
        <KpiCard title="Low Stock Alerts" value={summary.procurement.lowStockMaterials} icon={AlertTriangle} highlight={summary.procurement.lowStockMaterials > 0 ? "danger" : undefined} />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="col-span-2">
          <CardHeader>
            <CardTitle>Procurement Status</CardTitle>
            <CardDescription>Current state of procurement activities</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 pt-2">
              {[
                {
                  label: "Active Purchase Orders",
                  value: summary.procurement.activePos,
                  desc: "Issued, acknowledged or in transit",
                  variant: "neutral",
                },
                {
                  label: "Pending Material Requests",
                  value: summary.procurement.pendingRequests,
                  desc: "Awaiting RFQ or approval",
                  variant: "warning",
                },
                {
                  label: "Low Stock Materials",
                  value: summary.procurement.lowStockMaterials,
                  desc: "Below minimum stock threshold",
                  variant: "danger",
                },
              ].map(({ label, value, desc, variant }) => (
                <div
                  key={label}
                  className={`flex items-center justify-between p-4 rounded-lg border ${
                    variant === "danger"
                      ? "bg-destructive/10 border-destructive/20 text-destructive"
                      : variant === "warning"
                        ? "bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-800"
                        : "bg-accent/50"
                  }`}
                >
                  <div>
                    <p className="font-semibold text-sm">{label}</p>
                    <p className={`text-xs mt-0.5 ${variant === "danger" ? "text-destructive/80" : "text-muted-foreground"}`}>{desc}</p>
                  </div>
                  <span className="text-3xl font-bold">{value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <ActivityFeed activity={activity} />
      </div>
    </>
  );
}

function ViewerDashboard({
  summary,
  activity,
}: {
  summary: Summary;
  activity: Activity;
}) {
  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KpiCard title="Active Projects" value={summary.totals.projects} icon={Briefcase} />
        <KpiCard title="Active Leads" value={summary.totals.leads} icon={Users} />
        <KpiCard title="Pending Tasks" value={summary.totals.tasks} icon={CheckSquare} />
        <KpiCard title="Active Vendors" value={summary.totals.vendors} icon={Building2} />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <ActivityFeed activity={activity} />
      </div>
    </>
  );
}

export default function Dashboard() {
  const { data: user } = useGetCurrentUser();
  const { data: summary, isLoading: isLoadingSummary } = useGetDashboardSummary();
  const { data: activity, isLoading: isLoadingActivity } = useGetRecentActivity();

  const role = user?.activeRole ?? "viewer";

  const titleMap: Record<string, { title: string; subtitle: string }> = {
    admin: { title: "Dashboard", subtitle: "Full operations command center." },
    project_manager: { title: "Project Dashboard", subtitle: "Project and lead pipeline overview." },
    sales_manager: { title: "Sales Dashboard", subtitle: "Lead pipeline, funnel health, and conversion metrics." },
    engineer: { title: "Engineering Dashboard", subtitle: "Project progress and task workload." },
    accountant: { title: "Finance Dashboard", subtitle: "Budget utilisation, invoicing, and collections." },
    procurement_officer: { title: "Procurement Dashboard", subtitle: "Purchase orders, material requests, and stock alerts." },
    viewer: { title: "Overview", subtitle: "Read-only snapshot of operations." },
  };

  const { title, subtitle } = titleMap[role] ?? titleMap.viewer!;

  if (isLoadingSummary || isLoadingActivity) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
          <p className="text-muted-foreground">Loading dashboard…</p>
        </div>
      </div>
    );
  }

  if (!summary || !activity) return null;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
        <p className="text-muted-foreground">{subtitle}</p>
      </div>

      {(role === "admin" || role === "project_manager") && (
        <AdminDashboard summary={summary} activity={activity} />
      )}
      {role === "sales_manager" && (
        <SalesDashboard summary={summary} activity={activity} />
      )}
      {role === "engineer" && (
        <EngineerDashboard summary={summary} activity={activity} />
      )}
      {role === "accountant" && (
        <AccountantDashboard summary={summary} activity={activity} />
      )}
      {role === "procurement_officer" && (
        <ProcurementDashboard summary={summary} activity={activity} />
      )}
      {role === "viewer" && (
        <ViewerDashboard summary={summary} activity={activity} />
      )}
    </div>
  );
}
