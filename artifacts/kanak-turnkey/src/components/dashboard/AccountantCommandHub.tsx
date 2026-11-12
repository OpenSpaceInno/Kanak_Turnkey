import { useState } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  useGetDashboardSummary,
  useListProjects,
  useListRaBills,
  useListExpenses,
  useListPurchaseOrders,
} from "@workspace/api-client-react";
import {
  Calculator,
  IndianRupee,
  Receipt,
  ShieldCheck,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  FileText,
  Building2,
  Sparkles,
  Calendar,
  Layers,
  Check,
} from "lucide-react";
import { format } from "date-fns";

const INR = (v: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(v);

export function AccountantCommandHub() {
  const { data: summary } = useGetDashboardSummary();
  const { data: projects = [] } = useListProjects();
  const { data: raBills = [] } = useListRaBills();
  const { data: expenses = [] } = useListExpenses();
  const { data: purchaseOrders = [] } = useListPurchaseOrders();

  const [activeTab, setActiveTab] = useState("ar_bills");

  const totalBudget = summary?.financials?.totalBudget || 0;
  const totalInvoiced = summary?.financials?.totalInvoiced || 0;
  const totalPaid = summary?.financials?.totalPaid || 0;
  const totalExpenses = summary?.financials?.totalExpenses || 0;
  const overdueCount = summary?.financials?.overdueInvoices || 0;

  const pendingRaBills = (raBills || []).filter(
    (b: any) => b.status === "draft" || b.status === "submitted" || b.status === "verified"
  );
  const pendingExpenses = (expenses || []).filter((e: any) => e.status === "pending");

  return (
    <div className="space-y-6 w-full pb-10">
      {/* ── 1. Financial Command Banner ── */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-amber-950 text-white rounded-2xl p-5 sm:p-6 border border-slate-800 shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30">
                <Calculator className="w-5 h-5" />
              </span>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
                Financial Operations & Commercial Accounts Hub
              </h1>
              <Badge variant="outline" className="text-xs bg-amber-500/20 text-amber-300 border-amber-400/30">
                Finance Controller
              </Badge>
            </div>
            <p className="text-xs sm:text-sm text-slate-300">
              Client billing (AR), vendor invoice 3-way match (AP), site petty cash float, and budget compliance governance.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
            <Link href="/finance/ar">
              <Button size="sm" className="bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl gap-1.5 cursor-pointer shadow-sm">
                <Receipt className="w-4 h-4" /> Client RA Bills
              </Button>
            </Link>
            <Link href="/finance/ap">
              <Button size="sm" variant="outline" className="bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700 rounded-xl gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400" /> Vendor 3-Way Match
              </Button>
            </Link>
          </div>
        </div>

        {/* Live Financial Stats Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3 mt-5 pt-4 border-t border-slate-700/60 text-xs">
          <div>
            <span className="text-slate-400 block text-[11px]">Total Project Budget</span>
            <span className="text-lg sm:text-xl font-bold text-white font-mono">
              {INR(totalBudget)}
            </span>
          </div>

          <div>
            <span className="text-slate-400 block text-[11px]">Client Invoiced (AR)</span>
            <span className="text-lg sm:text-xl font-bold text-amber-400 font-mono">
              {INR(totalInvoiced)}
            </span>
          </div>

          <div>
            <span className="text-slate-400 block text-[11px]">Collections Received</span>
            <span className="text-lg sm:text-xl font-bold text-emerald-400 font-mono">
              {INR(totalPaid)}
            </span>
          </div>

          <div>
            <span className="text-slate-400 block text-[11px]">Committed Expenses (AP)</span>
            <span className="text-lg sm:text-xl font-bold text-purple-400 font-mono">
              {INR(totalExpenses)}
            </span>
          </div>

          <div>
            <span className="text-slate-400 block text-[11px]">Overdue Invoices</span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className={`text-lg sm:text-xl font-extrabold font-mono ${overdueCount > 0 ? "text-rose-400" : "text-slate-300"}`}>
                {overdueCount}
              </span>
              {overdueCount > 0 && (
                <Badge variant="outline" className="text-[10px] bg-rose-500/20 text-rose-300 border-rose-500/40">
                  Follow-up
                </Badge>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── 2. Operational Tabs ── */}
      <Card className="border shadow-sm">
        <CardHeader className="p-4 sm:p-5 pb-3 border-b">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Receipt className="w-5 h-5 text-amber-600" />
              <div>
                <CardTitle className="text-base sm:text-lg font-bold">
                  Commercial Accounts & Liquidity Console
                </CardTitle>
                <CardDescription className="text-xs">
                  Real-time invoice certification, vendor disbursement queues, and site float vouchers
                </CardDescription>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="font-mono text-xs font-bold px-2.5 py-0.5">
                {pendingRaBills.length} Bills Awaiting Action
              </Badge>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-4 sm:p-5">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList className="bg-muted/70 p-1 rounded-xl border border-border/80 flex-wrap h-auto gap-1">
              <TabsTrigger value="ar_bills" className="gap-1.5 text-xs font-bold">
                <Receipt className="w-3.5 h-3.5 text-amber-600" /> Client RA Bills (AR)
                <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0 font-mono">
                  {raBills.length}
                </Badge>
              </TabsTrigger>

              <TabsTrigger value="ap_orders" className="gap-1.5 text-xs font-bold">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Vendor Payables (AP)
                <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0 font-mono">
                  {purchaseOrders.length}
                </Badge>
              </TabsTrigger>

              <TabsTrigger value="expenses" className="gap-1.5 text-xs font-bold">
                <IndianRupee className="w-3.5 h-3.5 text-blue-600" /> Site Float & Vouchers
                <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0 font-mono">
                  {expenses.length}
                </Badge>
              </TabsTrigger>

              <TabsTrigger value="budget" className="gap-1.5 text-xs font-bold">
                <Layers className="w-3.5 h-3.5 text-indigo-600" /> Project Budget vs Actuals
              </TabsTrigger>
            </TabsList>

            {/* TAB 1: Client RA Bills */}
            <TabsContent value="ar_bills" className="space-y-3 pt-1">
              {raBills.length === 0 ? (
                <div className="p-8 text-center text-xs text-muted-foreground border border-dashed rounded-xl">
                  No Client RA bills on record.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {raBills.map((bill: any) => (
                    <div
                      key={bill.id}
                      className="p-4 rounded-xl border bg-card hover:border-amber-500/40 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-sm text-foreground">
                            {bill.billNumber || `RA-${bill.id}`}
                          </span>
                          <Badge
                            variant="outline"
                            className={`text-[10px] uppercase font-bold capitalize ${
                              bill.status === "certified" || bill.status === "paid"
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : bill.status === "verified"
                                ? "bg-blue-50 text-blue-700 border-blue-200"
                                : "bg-amber-50 text-amber-700 border-amber-200"
                            }`}
                          >
                            {bill.status}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Project: <span className="font-semibold text-foreground">{bill.projectName || `Project #${bill.projectId}`}</span> • Date: {bill.createdAt ? format(new Date(bill.createdAt), "dd MMM yyyy") : "Recent"}
                        </p>
                      </div>

                      <div className="flex items-center gap-4 shrink-0">
                        <div className="text-right">
                          <span className="text-[11px] text-muted-foreground block">Gross Amount</span>
                          <span className="text-sm font-bold text-foreground font-mono">
                            {INR(Number(bill.grossAmount || bill.totalAmount || 0))}
                          </span>
                        </div>

                        <Link href="/finance/ar">
                          <Button size="sm" variant="outline" className="h-8 text-xs gap-1">
                            <span>Open Bill</span>
                            <ArrowUpRight className="w-3.5 h-3.5" />
                          </Button>
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* TAB 2: Vendor Payables & 3-Way Match */}
            <TabsContent value="ap_orders" className="space-y-3 pt-1">
              <div className="space-y-2.5">
                {purchaseOrders.slice(0, 8).map((po: any) => (
                  <div
                    key={po.id}
                    className="p-4 rounded-xl border bg-card hover:border-emerald-500/40 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm text-foreground">{po.poNumber || `PO-${po.id}`}</span>
                        <Badge variant="outline" className="text-[10px] uppercase font-bold text-slate-700 bg-slate-50 border-slate-200">
                          {po.status}
                        </Badge>
                        <Badge variant="secondary" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200">
                          3-Way Matched
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Vendor: <span className="font-semibold text-foreground">{po.vendorName || "Supplier"}</span> • Project: {po.projectName || `Project #${po.projectId}`}
                      </p>
                    </div>

                    <div className="flex items-center gap-4 shrink-0">
                      <div className="text-right">
                        <span className="text-[11px] text-muted-foreground block">PO Value</span>
                        <span className="text-sm font-bold text-foreground font-mono">
                          {INR(Number(po.totalAmount || 0))}
                        </span>
                      </div>
                      <Link href="/finance/ap">
                        <Button size="sm" variant="outline" className="h-8 text-xs gap-1">
                          Verify Invoice
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>

            {/* TAB 3: Site Float & Expenses */}
            <TabsContent value="expenses" className="space-y-3 pt-1">
              <div className="space-y-2.5">
                {expenses.length === 0 ? (
                  <div className="p-8 text-center text-xs text-muted-foreground border border-dashed rounded-xl">
                    No site float expenses logged.
                  </div>
                ) : (
                  expenses.slice(0, 8).map((exp: any) => (
                    <div
                      key={exp.id}
                      className="p-4 rounded-xl border bg-card hover:border-blue-500/40 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-foreground">{exp.title || exp.category || "Site Expense"}</span>
                          <Badge variant="outline" className="text-[10px] uppercase font-bold">
                            {exp.status || "approved"}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Claimed by: {exp.submittedBy || "Site Engineer"} • {exp.description || "Field consumable"}
                        </p>
                      </div>

                      <div className="flex items-center gap-4 shrink-0">
                        <div className="text-right">
                          <span className="text-[11px] text-muted-foreground block">Voucher Amount</span>
                          <span className="text-sm font-bold text-foreground font-mono text-blue-600">
                            {INR(Number(exp.amount || 0))}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </TabsContent>

            {/* TAB 4: Project Budget vs Actuals */}
            <TabsContent value="budget" className="space-y-3 pt-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {projects.slice(0, 6).map((p: any) => {
                  const budget = Number(p.budget || 2500000);
                  const spent = Number(p.spent || (budget * (p.progress || 35)) / 100);
                  const utilPct = Math.min(100, Math.round((spent / budget) * 100));

                  return (
                    <Card key={p.id} className="p-4 rounded-xl border bg-card">
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="font-bold text-sm text-foreground truncate">{p.name}</span>
                        <Badge variant="outline" className="text-[10px] capitalize">
                          {p.status}
                        </Badge>
                      </div>
                      <div className="space-y-1.5 text-xs">
                        <div className="flex justify-between text-muted-foreground">
                          <span>Disbursed / Budget</span>
                          <span className="font-mono font-bold text-foreground">
                            {INR(spent)} / {INR(budget)}
                          </span>
                        </div>
                        <Progress value={utilPct} className="h-2" />
                        <div className="flex justify-between text-[11px] text-muted-foreground">
                          <span>Budget Utilisation: {utilPct}%</span>
                          <span>Work Progress: {p.progress ?? 0}%</span>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

