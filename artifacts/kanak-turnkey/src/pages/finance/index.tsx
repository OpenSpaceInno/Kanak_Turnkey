import { useState } from "react";
import { Link } from "wouter";
import { format } from "date-fns";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FileText,
  DollarSign,
  TrendingUp,
  Receipt,
  AlertCircle,
  CheckCircle2,
  Clock,
  Send,
  Plus,
  RefreshCw,
  Building2,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  CreditCard,
  Package,
  ShieldCheck,
  ChevronRight,
  BellRing,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  useGetFinanceOverview,
  useListRaBills,
  useListClientInvoices,
  useListVendorInvoicesCustom,
  useListSiteExpenses,
  type RaBill,
  type ClientInvoice,
  type VendorInvoice,
  type SiteExpense,
} from "@/hooks/use-finance-flow";
import { useListFinancialInstruments } from "@workspace/api-client-react";
import {
  PrepareRaBillDialog,
  ReviewRaBillDialog,
  ClientInvoiceActionDialog,
  VendorInvoiceMatchDialog,
  QuickFieldExpenseDialog,
  ReplenishSiteFloatDialog,
  ReviewSiteExpenseDialog,
} from "@/components/dialogs/finance-flow-dialogs";
import {
  NewVendorInvoiceDialog,
  NewFinancialInstrumentDialog,
} from "@/components/dialogs/finance-dialogs";
import { FinanceSubNav } from "@/components/finance/FinanceSubNav";

function formatINR(val: number | string | null | undefined): string {
  const n = Number(val || 0);
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);
}

export default function FinancePage() {
  const { data: overview, isLoading: loadingOverview } = useGetFinanceOverview();
  const { data: raBills, isLoading: loadingRa } = useListRaBills();
  const { data: clientInvoices, isLoading: loadingInvoices } = useListClientInvoices();
  const { data: vendorInvoices, isLoading: loadingVendorInvoices } = useListVendorInvoicesCustom();
  const { data: siteExpenses, isLoading: loadingExpenses } = useListSiteExpenses();
  const { data: instruments, isLoading: loadingInstruments } = useListFinancialInstruments();

  // Active Dialog States
  const [openPrepareRa, setOpenPrepareRa] = useState(false);
  const [selectedRaBill, setSelectedRaBill] = useState<RaBill | null>(null);
  const [openReviewRa, setOpenReviewRa] = useState(false);

  const [selectedInvoice, setSelectedInvoice] = useState<ClientInvoice | null>(null);
  const [openInvoiceAction, setOpenInvoiceAction] = useState(false);

  const [selectedVendorInvoice, setSelectedVendorInvoice] = useState<VendorInvoice | null>(null);
  const [openVendorMatch, setOpenVendorMatch] = useState(false);

  const [openQuickExpense, setOpenQuickExpense] = useState(false);
  const [openReplenishFloat, setOpenReplenishFloat] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<SiteExpense | null>(null);
  const [openReviewExpense, setOpenReviewExpense] = useState(false);

  const [selectedInstrument, setSelectedInstrument] = useState<any | null>(null);
  const [openReleaseInstrument, setOpenReleaseInstrument] = useState(false);

  const [activeTab, setActiveTab] = useState(() => {
    if (typeof window !== "undefined") {
      const param = new URLSearchParams(window.location.search).get("tab");
      if (param && ["matrix", "kanban", "ra_bills", "client_invoices", "vendor_invoices", "petty_cash", "instruments"].includes(param)) {
        return param;
      }
    }
    return "matrix";
  });

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("tab", tab);
      window.history.replaceState({}, "", url.toString());
    }
  };

  // Pipeline Filter (Kanban sub-tab)
  const [pipelineTrack, setPipelineTrack] = useState<"client_ar" | "vendor_ap" | "field_cash">("client_ar");

  return (
    <div className="space-y-6">
      {/* 1. Header with Top Actions */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Financial Operations & Cash Flow</h1>
          <p className="text-muted-foreground text-sm">
            End-to-end client billing (AR), 3-way vendor matching (AP), and site petty cash operations.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10"
            onClick={() => setOpenQuickExpense(true)}
          >
            <CreditCard className="w-4 h-4" /> Quick Site Cash Expense
          </Button>

          <Button
            size="sm"
            variant="outline"
            className="gap-1.5"
            onClick={() => setOpenPrepareRa(true)}
          >
            <FileText className="w-4 h-4" /> Prepare RA Bill
          </Button>

          <NewVendorInvoiceDialog
            trigger={
              <Button size="sm" variant="outline" className="gap-1.5">
                <Receipt className="w-4 h-4" /> Log Vendor Bill
              </Button>
            }
          />

          <Button
            size="sm"
            className="gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white"
            onClick={() => setOpenReplenishFloat(true)}
          >
            <DollarSign className="w-4 h-4" /> Top Up Site Float
          </Button>
        </div>
      </div>

      {/* Subnav links: Overview | Client AR | Vendor AP */}
      <FinanceSubNav />

      {/* 2. Top Executive KPI Deck */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        {/* KPI 1: Inflow */}
        <Card className="border-l-4 border-l-emerald-500 bg-card">
          <CardHeader className="pb-1.5 pt-3.5 px-4">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase flex items-center justify-between">
              Client Inflow (Collected)
              <ArrowUpRight className="w-4 h-4 text-emerald-500" />
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3.5 space-y-1.5">
            <div className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
              {formatINR(overview?.inflow.totalCollected)}
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-[11px] text-muted-foreground">
                <span>Billed: {formatINR(overview?.inflow.totalBilled)}</span>
                <span>{overview?.inflow.collectionRate}% collected</span>
              </div>
              <Progress value={overview?.inflow.collectionRate || 0} className="h-1.5" />
            </div>
          </CardContent>
        </Card>

        {/* KPI 2: Outflow */}
        <Card className="border-l-4 border-l-rose-500 bg-card">
          <CardHeader className="pb-1.5 pt-3.5 px-4">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase flex items-center justify-between">
              Total Outflow (Disbursed)
              <ArrowDownRight className="w-4 h-4 text-rose-500" />
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3.5 space-y-1.5">
            <div className="text-xl font-bold font-mono text-rose-600 dark:text-rose-400">
              {formatINR(overview?.outflow.totalOutflow)}
            </div>
            <p className="text-[11px] text-muted-foreground">
              Vendors: {formatINR(overview?.outflow.totalVendorPaid)} • Site Exp: {formatINR(overview?.outflow.totalExpensesSettled)}
            </p>
          </CardContent>
        </Card>

        {/* KPI 3: Net Cash Margin */}
        <Card className="border-l-4 border-l-indigo-500 bg-card">
          <CardHeader className="pb-1.5 pt-3.5 px-4">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase flex items-center justify-between">
              Net Operating Cash
              <TrendingUp className="w-4 h-4 text-indigo-500" />
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3.5 space-y-1">
            <div
              className={`text-xl font-bold font-mono ${
                (overview?.netOperatingCashFlow ?? 0) >= 0
                  ? "text-indigo-600 dark:text-indigo-400"
                  : "text-rose-600"
              }`}
            >
              {formatINR(overview?.netOperatingCashFlow)}
            </div>
            <p className="text-[11px] text-muted-foreground">
              Cash Inflow minus Outflow
            </p>
          </CardContent>
        </Card>

        {/* KPI 4: Site Petty Cash */}
        <Card className="border-l-4 border-l-amber-500 bg-card">
          <CardHeader className="pb-1.5 pt-3.5 px-4">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase flex items-center justify-between">
              Site Cash in Hand
              <CreditCard className="w-4 h-4 text-amber-500" />
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3.5 space-y-1">
            <div className="text-xl font-bold font-mono text-amber-600 dark:text-amber-400">
              {formatINR(overview?.pettyCash.totalCurrentFloat)}
            </div>
            <p className="text-[11px] text-muted-foreground">
              Across {overview?.pettyCash.sites.length || 0} active project sites
            </p>
          </CardContent>
        </Card>

        {/* KPI 5: Pending Actions */}
        <Card className="border-l-4 border-l-sky-500 bg-card">
          <CardHeader className="pb-1.5 pt-3.5 px-4">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase flex items-center justify-between">
              Action Required
              <AlertCircle className="w-4 h-4 text-sky-500" />
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3.5 space-y-1 text-xs">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">RA Approvals:</span>
              <Badge variant="secondary" className="font-mono">{overview?.actionsRequired.pendingRaApprovals || 0}</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Discrepancies:</span>
              <Badge variant="destructive" className="font-mono">{overview?.actionsRequired.activeDiscrepancies || 0}</Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 3. Main Operational Command Tabs */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4">
        <TabsList className="flex flex-wrap h-auto p-1.5 bg-muted/70 border border-border/80 rounded-xl gap-1 shadow-2xs">
          <TabsTrigger value="matrix" className="gap-1.5">
            <TrendingUp className="w-4 h-4" /> Overview & Cash Matrix
          </TabsTrigger>
          <TabsTrigger value="kanban" className="gap-1.5">
            <Layers className="w-4 h-4" /> Interactive Lifecycle Pipeline
          </TabsTrigger>
          <TabsTrigger value="ra_bills" className="gap-1.5">
            <FileText className="w-4 h-4" /> RA Bills (Client)
          </TabsTrigger>
          <TabsTrigger value="client_invoices" className="gap-1.5">
            <Receipt className="w-4 h-4" /> Client Tax Invoices
          </TabsTrigger>
          <TabsTrigger value="vendor_invoices" className="gap-1.5">
            <ShieldCheck className="w-4 h-4" /> Vendor Invoices (3-Way Match)
          </TabsTrigger>
          <TabsTrigger value="petty_cash" className="gap-1.5">
            <CreditCard className="w-4 h-4" /> Site Petty Cash & Expenses
          </TabsTrigger>
          <TabsTrigger value="instruments" className="gap-1.5">
            <Building2 className="w-4 h-4" /> Financial Instruments
          </TabsTrigger>
        </TabsList>

        {/* ------------------------------------------------------------------ */}
        {/* Tab 1: Overview & Cash Matrix */}
        {/* ------------------------------------------------------------------ */}
        <TabsContent value="matrix" className="space-y-4">
          {/* Dedicated Sub-Module Quick Access Portals */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Client AR Portal Card */}
            <Card className="border-l-4 border-l-indigo-500 bg-gradient-to-br from-indigo-50/40 via-card to-card dark:from-indigo-950/20 shadow-sm">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="text-xs bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 border-indigo-200">
                    Dedicated Submenu • Track 1
                  </Badge>
                  <Receipt className="w-5 h-5 text-indigo-600" />
                </div>
                <CardTitle className="text-base mt-2">Client Billing & progressive RA Bills</CardTitle>
                <CardDescription className="text-xs">
                  Progressive measurement sheets, client certifications, GST tax invoicing, and collection reminders.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 pt-1">
                <div className="grid grid-cols-3 gap-2 py-2 px-3 rounded-lg bg-background/80 border text-xs">
                  <div>
                    <span className="text-muted-foreground block text-[10px]">Total Billed</span>
                    <span className="font-mono font-bold">{formatINR(overview?.inflow.totalBilled)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[10px]">Collected</span>
                    <span className="font-mono font-bold text-emerald-600">{formatINR(overview?.inflow.totalCollected)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[10px]">Outstanding</span>
                    <span className="font-mono font-bold text-amber-600">{formatINR(overview?.inflow.outstandingReceivables)}</span>
                  </div>
                </div>
                <Link href="/finance/ar">
                  <Button size="sm" className="w-full gap-2 bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer shadow-sm">
                    Open Client Billing (AR) Module <ChevronRight className="w-4 h-4" />
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Vendor AP Portal Card */}
            <Card className="border-l-4 border-l-emerald-500 bg-gradient-to-br from-emerald-50/40 via-card to-card dark:from-emerald-950/20 shadow-sm">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-200">
                    Dedicated Submenu • Track 2
                  </Badge>
                  <ShieldCheck className="w-5 h-5 text-emerald-600" />
                </div>
                <CardTitle className="text-base mt-2">Vendor Invoicing & 3-Way Matching</CardTitle>
                <CardDescription className="text-xs">
                  Automated matching (PO vs GRN vs Vendor Bill), rate/quantity discrepancy resolution, and scheduled payouts.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 pt-1">
                <div className="grid grid-cols-3 gap-2 py-2 px-3 rounded-lg bg-background/80 border text-xs">
                  <div>
                    <span className="text-muted-foreground block text-[10px]">Invoiced</span>
                    <span className="font-mono font-bold">{formatINR(overview?.outflow.totalVendorInvoiced)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[10px]">Disbursed</span>
                    <span className="font-mono font-bold text-emerald-600">{formatINR(overview?.outflow.totalVendorPaid)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[10px]">Discrepancies</span>
                    <span className="font-mono font-bold text-rose-600">{overview?.actionsRequired.activeDiscrepancies || 0} Bills</span>
                  </div>
                </div>
                <Link href="/finance/ap">
                  <Button size="sm" className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer shadow-sm">
                    Open Vendor Invoicing (AP) Module <ChevronRight className="w-4 h-4" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Site Petty Cash Floats Card */}
            <Card className="lg:col-span-1">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center justify-between">
                  Site Imprest Cash Floats
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs text-indigo-600"
                    onClick={() => setOpenReplenishFloat(true)}
                  >
                    + Replenish
                  </Button>
                </CardTitle>
                <CardDescription className="text-xs">
                  Active cash on site for immediate materials and labor.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {overview?.pettyCash.sites.map((site) => (
                  <div key={site.projectId} className="p-3 rounded-lg border bg-muted/20 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-xs truncate max-w-[180px]">{site.projectName}</span>
                      <span className="font-mono text-xs font-bold text-amber-600">
                        {formatINR(site.currentBalance)}
                      </span>
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px] text-muted-foreground">
                        <span>Spent: {formatINR(site.spent)}</span>
                        <span>Float: {formatINR(site.sanctionedFloat)}</span>
                      </div>
                      <Progress
                        value={Math.min(100, Math.round((site.spent / site.sanctionedFloat) * 100))}
                        className="h-1.5"
                      />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Quick Receivables & Payables Summary */}
            <Card className="lg:col-span-2">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Working Capital & Collections Summary</CardTitle>
                <CardDescription className="text-xs">
                  Snapshot of outstanding receivables vs vendor obligations.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
                  <div className="p-3 rounded-lg border bg-card">
                    <span className="text-[11px] text-muted-foreground font-semibold uppercase">Total Outstanding AR</span>
                    <p className="font-mono font-bold text-base text-amber-600">
                      {formatINR(overview?.inflow.outstandingReceivables)}
                    </p>
                  </div>
                  <div className="p-3 rounded-lg border bg-card">
                    <span className="text-[11px] text-muted-foreground font-semibold uppercase">Pending Vendor AP</span>
                    <p className="font-mono font-bold text-base text-rose-600">
                      {formatINR(
                        (overview?.outflow.totalVendorInvoiced || 0) - (overview?.outflow.totalVendorPaid || 0)
                      )}
                    </p>
                  </div>
                  <div className="p-3 rounded-lg border bg-card">
                    <span className="text-[11px] text-muted-foreground font-semibold uppercase">Overdue Bills</span>
                    <p className="font-mono font-bold text-base text-rose-600">
                      {overview?.inflow.overdueCount || 0} Invoices
                    </p>
                  </div>
                </div>

                <div className="rounded-md border overflow-x-auto text-xs">
                  <table className="w-full text-left">
                    <thead className="bg-muted/50 text-muted-foreground border-b font-medium">
                      <tr>
                        <th className="px-3 py-2">Invoice / Bill #</th>
                        <th className="px-3 py-2">Type</th>
                        <th className="px-3 py-2">Entity</th>
                        <th className="px-3 py-2">Amount</th>
                        <th className="px-3 py-2">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {clientInvoices?.slice(0, 4).map((inv) => (
                        <tr key={inv.id} className="hover:bg-muted/30">
                          <td className="px-3 py-2 font-mono font-medium">{inv.invoiceNumber}</td>
                          <td className="px-3 py-2"><Badge variant="outline" className="text-[10px]">Client Invoice</Badge></td>
                          <td className="px-3 py-2">{inv.clientName}</td>
                          <td className="px-3 py-2 font-mono">{formatINR(inv.totalWithTax || inv.amount)}</td>
                          <td className="px-3 py-2">
                            <Badge variant={inv.status === "paid" ? "default" : "secondary"} className="text-[10px]">
                              {inv.status}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                      {vendorInvoices?.slice(0, 4).map((vi) => (
                        <tr key={vi.id} className="hover:bg-muted/30">
                          <td className="px-3 py-2 font-mono font-medium">{vi.invoiceNumber}</td>
                          <td className="px-3 py-2"><Badge variant="outline" className="text-[10px]">Vendor Bill</Badge></td>
                          <td className="px-3 py-2">{vi.vendorName}</td>
                          <td className="px-3 py-2 font-mono">{formatINR(vi.amount)}</td>
                          <td className="px-3 py-2">
                            <Badge
                              variant={vi.status === "paid" ? "default" : vi.status === "discrepancy" ? "destructive" : "secondary"}
                              className="text-[10px]"
                            >
                              {vi.status}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ------------------------------------------------------------------ */}
        {/* Tab 2: Interactive Lifecycle Pipeline (Visual Kanban) */}
        {/* ------------------------------------------------------------------ */}
        <TabsContent value="kanban" className="space-y-4">
          <div className="flex items-center justify-between pb-2 border-b">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase text-muted-foreground">Select Financial Track:</span>
              <div className="inline-flex rounded-md border p-1 bg-muted/40 text-xs">
                <button
                  type="button"
                  className={`px-3 py-1 rounded-sm font-medium ${
                    pipelineTrack === "client_ar" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
                  }`}
                  onClick={() => setPipelineTrack("client_ar")}
                >
                  Track 1: Client Billing (AR)
                </button>
                <button
                  type="button"
                  className={`px-3 py-1 rounded-sm font-medium ${
                    pipelineTrack === "vendor_ap" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
                  }`}
                  onClick={() => setPipelineTrack("vendor_ap")}
                >
                  Track 2: Vendor Invoicing (AP)
                </button>
                <button
                  type="button"
                  className={`px-3 py-1 rounded-sm font-medium ${
                    pipelineTrack === "field_cash" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
                  }`}
                  onClick={() => setPipelineTrack("field_cash")}
                >
                  Track 3: Site Petty Cash
                </button>
              </div>
            </div>

            <span className="text-xs text-muted-foreground hidden sm:inline">
              Click any card to open action gate
            </span>
          </div>

          {/* Track 1 Kanban: Client Billing (AR) */}
          {pipelineTrack === "client_ar" && (
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
              {/* Stage 1: Draft RA */}
              <div className="rounded-lg border bg-muted/20 p-3 space-y-2.5">
                <div className="flex items-center justify-between font-semibold text-xs border-b pb-1.5">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-slate-400" /> 1. Draft / Measure
                  </span>
                  <Badge variant="secondary" className="text-[10px]">
                    {raBills?.filter((r) => r.status === "draft" || r.status === "revision_requested").length || 0}
                  </Badge>
                </div>
                <div className="space-y-2">
                  {raBills
                    ?.filter((r) => r.status === "draft" || r.status === "revision_requested")
                    .map((bill) => (
                      <div
                        key={bill.id}
                        onClick={() => {
                          setSelectedRaBill(bill);
                          setOpenReviewRa(true);
                        }}
                        className="p-2.5 rounded-md border bg-card hover:border-indigo-400 cursor-pointer transition-all shadow-sm space-y-1.5"
                      >
                        <div className="flex justify-between items-start">
                          <span className="font-mono font-semibold text-xs text-indigo-600">{bill.billNumber}</span>
                          <span className="font-mono text-xs font-bold">{formatINR(bill.netBillableAmount || bill.amount)}</span>
                        </div>
                        <p className="text-[11px] text-muted-foreground truncate">{bill.projectName}</p>
                        <p className="text-[10px] text-muted-foreground">{bill.milestone}</p>
                        {bill.status === "revision_requested" && (
                          <Badge variant="destructive" className="text-[9px]">Revision Requested</Badge>
                        )}
                      </div>
                    ))}
                </div>
              </div>

              {/* Stage 2: PM Review */}
              <div className="rounded-lg border bg-muted/20 p-3 space-y-2.5">
                <div className="flex items-center justify-between font-semibold text-xs border-b pb-1.5">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-indigo-500" /> 2. PM Review
                  </span>
                  <Badge variant="secondary" className="text-[10px]">
                    {raBills?.filter((r) => r.status === "submitted" || r.status === "verified").length || 0}
                  </Badge>
                </div>
                <div className="space-y-2">
                  {raBills
                    ?.filter((r) => r.status === "submitted" || r.status === "verified")
                    .map((bill) => (
                      <div
                        key={bill.id}
                        onClick={() => {
                          setSelectedRaBill(bill);
                          setOpenReviewRa(true);
                        }}
                        className="p-2.5 rounded-md border bg-card hover:border-indigo-400 cursor-pointer transition-all shadow-sm space-y-1.5 border-l-2 border-l-indigo-500"
                      >
                        <div className="flex justify-between items-start">
                          <span className="font-mono font-semibold text-xs text-indigo-600">{bill.billNumber}</span>
                          <span className="font-mono text-xs font-bold">{formatINR(bill.netBillableAmount || bill.amount)}</span>
                        </div>
                        <p className="text-[11px] text-muted-foreground truncate">{bill.projectName}</p>
                        <p className="text-[10px] text-muted-foreground">Work: {bill.workCompletionPercent || 50}%</p>
                        <Badge variant="outline" className="text-[9px] bg-indigo-50 text-indigo-700">Awaiting PM</Badge>
                      </div>
                    ))}
                </div>
              </div>

              {/* Stage 3: Invoice Sent */}
              <div className="rounded-lg border bg-muted/20 p-3 space-y-2.5">
                <div className="flex items-center justify-between font-semibold text-xs border-b pb-1.5">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-sky-500" /> 3. Invoice Sent
                  </span>
                  <Badge variant="secondary" className="text-[10px]">
                    {clientInvoices?.filter((inv) => inv.status === "sent" || inv.status === "draft").length || 0}
                  </Badge>
                </div>
                <div className="space-y-2">
                  {clientInvoices
                    ?.filter((inv) => inv.status === "sent" || inv.status === "draft")
                    .map((inv) => (
                      <div
                        key={inv.id}
                        onClick={() => {
                          setSelectedInvoice(inv);
                          setOpenInvoiceAction(true);
                        }}
                        className="p-2.5 rounded-md border bg-card hover:border-sky-400 cursor-pointer transition-all shadow-sm space-y-1.5"
                      >
                        <div className="flex justify-between items-start">
                          <span className="font-mono font-semibold text-xs text-sky-600">{inv.invoiceNumber}</span>
                          <span className="font-mono text-xs font-bold">{formatINR(inv.totalWithTax || inv.amount)}</span>
                        </div>
                        <p className="text-[11px] text-muted-foreground truncate">{inv.clientName}</p>
                        <p className="text-[10px] text-muted-foreground">Due: {format(new Date(inv.dueDate), "MMM d")}</p>
                      </div>
                    ))}
                </div>
              </div>

              {/* Stage 4: Payment Pending / Reminders */}
              <div className="rounded-lg border bg-muted/20 p-3 space-y-2.5">
                <div className="flex items-center justify-between font-semibold text-xs border-b pb-1.5">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-500" /> 4. Reminders
                  </span>
                  <Badge variant="secondary" className="text-[10px]">
                    {clientInvoices?.filter((inv) => inv.paymentRemindersCount > 0 && inv.status !== "paid" && inv.status !== "closed").length || 0}
                  </Badge>
                </div>
                <div className="space-y-2">
                  {clientInvoices
                    ?.filter((inv) => inv.paymentRemindersCount > 0 && inv.status !== "paid" && inv.status !== "closed")
                    .map((inv) => (
                      <div
                        key={inv.id}
                        onClick={() => {
                          setSelectedInvoice(inv);
                          setOpenInvoiceAction(true);
                        }}
                        className="p-2.5 rounded-md border bg-card hover:border-amber-400 cursor-pointer transition-all shadow-sm space-y-1.5 border-l-2 border-l-amber-500"
                      >
                        <div className="flex justify-between items-start">
                          <span className="font-mono font-semibold text-xs text-amber-600">{inv.invoiceNumber}</span>
                          <span className="font-mono text-xs font-bold">{formatINR(inv.totalWithTax || inv.amount)}</span>
                        </div>
                        <p className="text-[11px] text-muted-foreground truncate">{inv.clientName}</p>
                        <Badge variant="outline" className="text-[9px] text-amber-600 border-amber-300">
                          {inv.paymentRemindersCount} notices sent
                        </Badge>
                      </div>
                    ))}
                </div>
              </div>

              {/* Stage 5: Reconciled & Closed */}
              <div className="rounded-lg border bg-muted/20 p-3 space-y-2.5">
                <div className="flex items-center justify-between font-semibold text-xs border-b pb-1.5">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" /> 5. Closed / Paid
                  </span>
                  <Badge variant="secondary" className="text-[10px]">
                    {clientInvoices?.filter((inv) => inv.status === "paid" || inv.status === "reconciled" || inv.status === "closed").length || 0}
                  </Badge>
                </div>
                <div className="space-y-2">
                  {clientInvoices
                    ?.filter((inv) => inv.status === "paid" || inv.status === "reconciled" || inv.status === "closed")
                    .map((inv) => (
                      <div
                        key={inv.id}
                        onClick={() => {
                          setSelectedInvoice(inv);
                          setOpenInvoiceAction(true);
                        }}
                        className="p-2.5 rounded-md border bg-card hover:border-emerald-400 cursor-pointer transition-all shadow-sm space-y-1.5 border-l-2 border-l-emerald-500"
                      >
                        <div className="flex justify-between items-start">
                          <span className="font-mono font-semibold text-xs text-emerald-600">{inv.invoiceNumber}</span>
                          <span className="font-mono text-xs font-bold">{formatINR(inv.netReceivedAmount || inv.amount)}</span>
                        </div>
                        <p className="text-[11px] text-muted-foreground truncate">{inv.clientName}</p>
                        <Badge variant="default" className="text-[9px] bg-emerald-600">
                          {inv.status}
                        </Badge>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          )}

          {/* Track 2 Kanban: Vendor Invoicing (AP) */}
          {pipelineTrack === "vendor_ap" && (
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
              {/* V1: Received */}
              <div className="rounded-lg border bg-muted/20 p-3 space-y-2.5">
                <div className="flex items-center justify-between font-semibold text-xs border-b pb-1.5">
                  <span>1. Bill Received</span>
                  <Badge variant="secondary" className="text-[10px]">
                    {vendorInvoices?.filter((vi) => vi.status === "received").length || 0}
                  </Badge>
                </div>
                <div className="space-y-2">
                  {vendorInvoices
                    ?.filter((vi) => vi.status === "received")
                    .map((vi) => (
                      <div
                        key={vi.id}
                        onClick={() => {
                          setSelectedVendorInvoice(vi);
                          setOpenVendorMatch(true);
                        }}
                        className="p-2.5 rounded-md border bg-card hover:border-indigo-400 cursor-pointer transition-all shadow-sm space-y-1.5"
                      >
                        <div className="flex justify-between items-start">
                          <span className="font-mono font-semibold text-xs">{vi.invoiceNumber}</span>
                          <span className="font-mono text-xs font-bold">{formatINR(vi.amount)}</span>
                        </div>
                        <p className="text-[11px] text-muted-foreground truncate">{vi.vendorName}</p>
                        <p className="text-[10px] text-muted-foreground">{vi.poNumber || "Direct PO"}</p>
                      </div>
                    ))}
                </div>
              </div>

              {/* V2: Discrepancy */}
              <div className="rounded-lg border bg-muted/20 p-3 space-y-2.5">
                <div className="flex items-center justify-between font-semibold text-xs border-b pb-1.5">
                  <span className="text-rose-600">2. Discrepancy</span>
                  <Badge variant="destructive" className="text-[10px]">
                    {vendorInvoices?.filter((vi) => vi.status === "discrepancy").length || 0}
                  </Badge>
                </div>
                <div className="space-y-2">
                  {vendorInvoices
                    ?.filter((vi) => vi.status === "discrepancy")
                    .map((vi) => (
                      <div
                        key={vi.id}
                        onClick={() => {
                          setSelectedVendorInvoice(vi);
                          setOpenVendorMatch(true);
                        }}
                        className="p-2.5 rounded-md border bg-card hover:border-rose-400 cursor-pointer transition-all shadow-sm space-y-1.5 border-l-2 border-l-rose-500"
                      >
                        <div className="flex justify-between items-start">
                          <span className="font-mono font-semibold text-xs text-rose-600">{vi.invoiceNumber}</span>
                          <span className="font-mono text-xs font-bold">{formatINR(vi.amount)}</span>
                        </div>
                        <p className="text-[11px] text-muted-foreground truncate">{vi.vendorName}</p>
                        <p className="text-[10px] text-rose-600 truncate">{vi.discrepancyNotes || "Rate/Qty mismatch"}</p>
                      </div>
                    ))}
                </div>
              </div>

              {/* V3: Matched / Approved */}
              <div className="rounded-lg border bg-muted/20 p-3 space-y-2.5">
                <div className="flex items-center justify-between font-semibold text-xs border-b pb-1.5">
                  <span>3. Approved for Pay</span>
                  <Badge variant="secondary" className="text-[10px]">
                    {vendorInvoices?.filter((vi) => vi.status === "matched" || vi.status === "approved_for_payment").length || 0}
                  </Badge>
                </div>
                <div className="space-y-2">
                  {vendorInvoices
                    ?.filter((vi) => vi.status === "matched" || vi.status === "approved_for_payment")
                    .map((vi) => (
                      <div
                        key={vi.id}
                        onClick={() => {
                          setSelectedVendorInvoice(vi);
                          setOpenVendorMatch(true);
                        }}
                        className="p-2.5 rounded-md border bg-card hover:border-indigo-400 cursor-pointer transition-all shadow-sm space-y-1.5 border-l-2 border-l-indigo-500"
                      >
                        <div className="flex justify-between items-start">
                          <span className="font-mono font-semibold text-xs">{vi.invoiceNumber}</span>
                          <span className="font-mono text-xs font-bold">{formatINR(vi.amount)}</span>
                        </div>
                        <p className="text-[11px] text-muted-foreground truncate">{vi.vendorName}</p>
                        <Badge
                          variant={vi.status === "approved_for_payment" ? "default" : "outline"}
                          className={`text-[9px] ${vi.status === "approved_for_payment" ? "bg-indigo-600 text-white" : "text-indigo-600"}`}
                        >
                          {vi.status === "approved_for_payment" ? "Approved for Pay" : "3-Way Matched"}
                        </Badge>
                      </div>
                    ))}
                </div>
              </div>

              {/* V4: Scheduled */}
              <div className="rounded-lg border bg-muted/20 p-3 space-y-2.5">
                <div className="flex items-center justify-between font-semibold text-xs border-b pb-1.5">
                  <span>4. Scheduled Batch</span>
                  <Badge variant="secondary" className="text-[10px]">
                    {vendorInvoices?.filter((vi) => vi.status === "scheduled").length || 0}
                  </Badge>
                </div>
                <div className="space-y-2">
                  {vendorInvoices
                    ?.filter((vi) => vi.status === "scheduled")
                    .map((vi) => (
                      <div
                        key={vi.id}
                        onClick={() => {
                          setSelectedVendorInvoice(vi);
                          setOpenVendorMatch(true);
                        }}
                        className="p-2.5 rounded-md border bg-card hover:border-amber-400 cursor-pointer transition-all shadow-sm space-y-1.5 border-l-2 border-l-amber-500"
                      >
                        <div className="flex justify-between items-start">
                          <span className="font-mono font-semibold text-xs text-amber-600">{vi.invoiceNumber}</span>
                          <span className="font-mono text-xs font-bold">{formatINR(vi.amount)}</span>
                        </div>
                        <p className="text-[11px] text-muted-foreground truncate">{vi.vendorName}</p>
                        <p className="text-[10px] text-muted-foreground">Payout: {vi.scheduledPaymentDate || "Soon"}</p>
                      </div>
                    ))}
                </div>
              </div>

              {/* V5: Disbursed */}
              <div className="rounded-lg border bg-muted/20 p-3 space-y-2.5">
                <div className="flex items-center justify-between font-semibold text-xs border-b pb-1.5">
                  <span className="text-emerald-600">5. Disbursed</span>
                  <Badge variant="secondary" className="text-[10px]">
                    {vendorInvoices?.filter((vi) => vi.status === "paid").length || 0}
                  </Badge>
                </div>
                <div className="space-y-2">
                  {vendorInvoices
                    ?.filter((vi) => vi.status === "paid")
                    .map((vi) => (
                      <div
                        key={vi.id}
                        onClick={() => {
                          setSelectedVendorInvoice(vi);
                          setOpenVendorMatch(true);
                        }}
                        className="p-2.5 rounded-md border bg-card hover:border-emerald-400 cursor-pointer transition-all shadow-sm space-y-1.5 border-l-2 border-l-emerald-500"
                      >
                        <div className="flex justify-between items-start">
                          <span className="font-mono font-semibold text-xs text-emerald-600">{vi.invoiceNumber}</span>
                          <span className="font-mono text-xs font-bold">{formatINR(vi.paidAmount || vi.amount)}</span>
                        </div>
                        <p className="text-[11px] text-muted-foreground truncate">{vi.vendorName}</p>
                        <Badge variant="default" className="text-[9px] bg-emerald-600">Paid & Reconciled</Badge>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          )}

          {/* Track 3 Kanban: Site Petty Cash */}
          {pipelineTrack === "field_cash" && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* C1: Submitted */}
              <div className="rounded-lg border bg-muted/20 p-3 space-y-2.5">
                <div className="flex items-center justify-between font-semibold text-xs border-b pb-1.5">
                  <span>1. Voucher Submitted</span>
                  <Badge variant="secondary" className="text-[10px]">
                    {siteExpenses?.filter((e) => e.status === "submitted").length || 0}
                  </Badge>
                </div>
                <div className="space-y-2">
                  {siteExpenses
                    ?.filter((e) => e.status === "submitted")
                    .map((exp) => (
                      <div
                        key={exp.id}
                        onClick={() => {
                          setSelectedExpense(exp);
                          setOpenReviewExpense(true);
                        }}
                        className="p-2.5 rounded-md border bg-card hover:border-amber-400 cursor-pointer transition-all shadow-sm space-y-1.5"
                      >
                        <div className="flex justify-between items-start">
                          <span className="font-semibold text-xs truncate max-w-[150px]">{exp.description}</span>
                          <span className="font-mono text-xs font-bold text-amber-600">{formatINR(exp.amount)}</span>
                        </div>
                        <p className="text-[11px] text-muted-foreground">{exp.projectName} • {exp.category}</p>
                        <div className="flex items-center gap-1.5">
                          <Badge variant="outline" className="text-[9px] capitalize">{exp.paymentMode.replace('_', ' ')}</Badge>
                          {exp.creditedToInventory && (
                            <Badge variant="secondary" className="text-[9px] bg-emerald-50 text-emerald-700">Stock Credited</Badge>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              </div>

              {/* C2: Approved */}
              <div className="rounded-lg border bg-muted/20 p-3 space-y-2.5">
                <div className="flex items-center justify-between font-semibold text-xs border-b pb-1.5">
                  <span>2. PM Approved</span>
                  <Badge variant="secondary" className="text-[10px]">
                    {siteExpenses?.filter((e) => e.status === "approved").length || 0}
                  </Badge>
                </div>
                <div className="space-y-2">
                  {siteExpenses
                    ?.filter((e) => e.status === "approved")
                    .map((exp) => (
                      <div
                        key={exp.id}
                        onClick={() => {
                          setSelectedExpense(exp);
                          setOpenReviewExpense(true);
                        }}
                        className="p-2.5 rounded-md border bg-card hover:border-indigo-400 cursor-pointer transition-all shadow-sm space-y-1.5 border-l-2 border-l-indigo-500"
                      >
                        <div className="flex justify-between items-start">
                          <span className="font-semibold text-xs truncate max-w-[150px]">{exp.description}</span>
                          <span className="font-mono text-xs font-bold">{formatINR(exp.amount)}</span>
                        </div>
                        <p className="text-[11px] text-muted-foreground">{exp.projectName}</p>
                        <Badge variant="outline" className="text-[9px] text-indigo-600">Ready for Float Settlement</Badge>
                      </div>
                    ))}
                </div>
              </div>

              {/* C3: Settled / Reimbursed */}
              <div className="rounded-lg border bg-muted/20 p-3 space-y-2.5">
                <div className="flex items-center justify-between font-semibold text-xs border-b pb-1.5">
                  <span>3. Settled & Reconciled</span>
                  <Badge variant="secondary" className="text-[10px]">
                    {siteExpenses?.filter((e) => e.status === "settled" || e.status === "reimbursed").length || 0}
                  </Badge>
                </div>
                <div className="space-y-2">
                  {siteExpenses
                    ?.filter((e) => e.status === "settled" || e.status === "reimbursed")
                    .map((exp) => (
                      <div
                        key={exp.id}
                        onClick={() => {
                          setSelectedExpense(exp);
                          setOpenReviewExpense(true);
                        }}
                        className="p-2.5 rounded-md border bg-card hover:border-emerald-400 cursor-pointer transition-all shadow-sm space-y-1.5 border-l-2 border-l-emerald-500"
                      >
                        <div className="flex justify-between items-start">
                          <span className="font-semibold text-xs truncate max-w-[150px]">{exp.description}</span>
                          <span className="font-mono text-xs font-bold text-emerald-600">{formatINR(exp.amount)}</span>
                        </div>
                        <p className="text-[11px] text-muted-foreground">{exp.projectName}</p>
                        <Badge variant="default" className="text-[9px] bg-emerald-600">Settled</Badge>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          )}
        </TabsContent>

        {/* ------------------------------------------------------------------ */}
        {/* Tab 3: RA Bills Detailed Register */}
        {/* ------------------------------------------------------------------ */}
        <TabsContent value="ra_bills" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">Running Account (RA) Bills</h2>
            <Button size="sm" onClick={() => setOpenPrepareRa(true)} className="gap-1.5">
              <Plus className="w-4 h-4" /> Prepare New RA Bill
            </Button>
          </div>

          <div className="rounded-md border bg-card overflow-x-auto text-sm">
            <table className="w-full text-left">
              <thead className="bg-muted/50 text-muted-foreground border-b text-xs font-medium">
                <tr>
                  <th className="px-4 py-3">Bill Number</th>
                  <th className="px-4 py-3">Project</th>
                  <th className="px-4 py-3">Milestone</th>
                  <th className="px-4 py-3">Completion %</th>
                  <th className="px-4 py-3">Gross Amount</th>
                  <th className="px-4 py-3">Net Billable</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {raBills?.map((bill) => (
                  <tr key={bill.id} className="hover:bg-accent/50 transition-colors">
                    <td className="px-4 py-3 font-mono font-medium text-indigo-600">{bill.billNumber}</td>
                    <td className="px-4 py-3 font-medium">{bill.projectName}</td>
                    <td className="px-4 py-3 text-muted-foreground">{bill.milestone || "-"}</td>
                    <td className="px-4 py-3 font-mono">{bill.workCompletionPercent || 50}%</td>
                    <td className="px-4 py-3 font-mono">{formatINR(bill.grossAmount || bill.amount)}</td>
                    <td className="px-4 py-3 font-mono font-bold text-emerald-600">
                      {formatINR(bill.netBillableAmount || bill.amount)}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={bill.status === "approved" || bill.status === "invoiced" ? "default" : "outline"}>
                        {bill.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 text-xs text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
                        onClick={() => {
                          setSelectedRaBill(bill);
                          setOpenReviewRa(true);
                        }}
                      >
                        Review Bill <ChevronRight className="w-3.5 h-3.5 ml-1" />
                      </Button>
                    </td>
                  </tr>
                ))}
                {!raBills?.length && !loadingRa && (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground border-dashed border-t">
                      No RA bills registered. Click "Prepare New RA Bill" to begin.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </TabsContent>

        {/* ------------------------------------------------------------------ */}
        {/* Tab 4: Client Tax Invoices */}
        {/* ------------------------------------------------------------------ */}
        <TabsContent value="client_invoices" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">Client Tax Invoices</h2>
            <p className="text-xs text-muted-foreground">Generated from approved RA bills or direct client contracts.</p>
          </div>

          <div className="rounded-md border bg-card overflow-x-auto text-sm">
            <table className="w-full text-left">
              <thead className="bg-muted/50 text-muted-foreground border-b text-xs font-medium">
                <tr>
                  <th className="px-4 py-3">Invoice #</th>
                  <th className="px-4 py-3">Client</th>
                  <th className="px-4 py-3">Project</th>
                  <th className="px-4 py-3">Due Date</th>
                  <th className="px-4 py-3">Total with Tax</th>
                  <th className="px-4 py-3">Reminders</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {clientInvoices?.map((inv) => (
                  <tr key={inv.id} className="hover:bg-accent/50 transition-colors">
                    <td className="px-4 py-3 font-mono font-medium text-sky-600">{inv.invoiceNumber}</td>
                    <td className="px-4 py-3 font-medium">{inv.clientName}</td>
                    <td className="px-4 py-3 text-muted-foreground">{inv.projectName}</td>
                    <td className="px-4 py-3 font-mono">{format(new Date(inv.dueDate), "MMM d, yyyy")}</td>
                    <td className="px-4 py-3 font-mono font-bold">{formatINR(inv.totalWithTax || inv.amount)}</td>
                    <td className="px-4 py-3 font-mono text-amber-600">{inv.paymentRemindersCount} notices</td>
                    <td className="px-4 py-3">
                      <Badge variant={inv.status === "paid" || inv.status === "closed" ? "default" : "outline"}>
                        {inv.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 text-xs text-sky-600 hover:text-sky-700 hover:bg-sky-50"
                        onClick={() => {
                          setSelectedInvoice(inv);
                          setOpenInvoiceAction(true);
                        }}
                      >
                        Actions <ChevronRight className="w-3.5 h-3.5 ml-1" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>

        {/* ------------------------------------------------------------------ */}
        {/* Tab 5: Vendor Invoices (3-Way PO Matching) */}
        {/* ------------------------------------------------------------------ */}
        <TabsContent value="vendor_invoices" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">Vendor Invoices & 3-Way Matching (AP)</h2>
            <NewVendorInvoiceDialog
              trigger={
                <Button size="sm" className="gap-1.5">
                  <Plus className="w-4 h-4" /> Add Vendor Invoice
                </Button>
              }
            />
          </div>

          <div className="rounded-md border bg-card overflow-x-auto text-sm">
            <table className="w-full text-left">
              <thead className="bg-muted/50 text-muted-foreground border-b text-xs font-medium">
                <tr>
                  <th className="px-4 py-3">Invoice #</th>
                  <th className="px-4 py-3">Vendor</th>
                  <th className="px-4 py-3">Linked PO</th>
                  <th className="px-4 py-3">Invoiced Amount</th>
                  <th className="px-4 py-3">PO Amount</th>
                  <th className="px-4 py-3">GRN Status</th>
                  <th className="px-4 py-3">Match Status</th>
                  <th className="px-4 py-3 text-right">3-Way Action</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {vendorInvoices?.map((vi) => (
                  <tr key={vi.id} className="hover:bg-accent/50 transition-colors">
                    <td className="px-4 py-3 font-mono font-medium">{vi.invoiceNumber}</td>
                    <td className="px-4 py-3 font-medium">{vi.vendorName}</td>
                    <td className="px-4 py-3 font-mono text-muted-foreground">{vi.poNumber || "-"}</td>
                    <td className="px-4 py-3 font-mono font-bold">{formatINR(vi.amount)}</td>
                    <td className="px-4 py-3 font-mono text-muted-foreground">
                      {vi.poTotalAmount ? formatINR(vi.poTotalAmount) : "-"}
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        variant={vi.poInspectionStatus === "passed" ? "default" : "secondary"}
                        className="text-[10px]"
                      >
                        {vi.poInspectionStatus === "passed" ? "QC Passed" : vi.poInspectionStatus || "No GRN"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      {vi.status === "paid" && (
                        <Badge variant="default" className="bg-emerald-600 text-[10px]">Paid & Reconciled</Badge>
                      )}
                      {vi.status === "scheduled" && (
                        <Badge variant="secondary" className="bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 text-[10px]">
                          Scheduled
                        </Badge>
                      )}
                      {vi.status === "approved_for_payment" && (
                        <Badge variant="outline" className="text-indigo-600 border-indigo-400/40 bg-indigo-50/50 text-[10px]">
                          Approved for Pay
                        </Badge>
                      )}
                      {vi.status === "matched" && (
                        <Badge variant="outline" className="text-blue-600 border-blue-400/40 bg-blue-50/50 text-[10px]">
                          3-Way Matched
                        </Badge>
                      )}
                      {vi.status === "discrepancy" && (
                        <Badge variant="destructive" className="text-[10px]">Discrepancy</Badge>
                      )}
                      {vi.status === "received" && (
                        <Badge variant="outline" className="text-slate-600 border-slate-300 text-[10px]">Awaiting Match</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 text-xs text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
                        onClick={() => {
                          setSelectedVendorInvoice(vi);
                          setOpenVendorMatch(true);
                        }}
                      >
                        Match / Disburse <ChevronRight className="w-3.5 h-3.5 ml-1" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>

        {/* ------------------------------------------------------------------ */}
        {/* Tab 6: Site Petty Cash & Field Expenses */}
        {/* ------------------------------------------------------------------ */}
        <TabsContent value="petty_cash" className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-lg font-semibold">Site Petty Cash & Field Purchases</h2>
              <p className="text-xs text-muted-foreground">
                Emergency hardware, casual labor, diesel, and spot cash purchases by site engineers.
              </p>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setOpenReplenishFloat(true)}>
                Replenish Float
              </Button>
              <Button size="sm" onClick={() => setOpenQuickExpense(true)} className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white">
                <CreditCard className="w-4 h-4" /> Record Cash Expense
              </Button>
            </div>
          </div>

          <div className="rounded-md border bg-card overflow-x-auto text-sm">
            <table className="w-full text-left">
              <thead className="bg-muted/50 text-muted-foreground border-b text-xs font-medium">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Site / Project</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Description</th>
                  <th className="px-4 py-3">Paid Via</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Inventory Sync</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {siteExpenses?.map((exp) => (
                  <tr key={exp.id} className="hover:bg-accent/50 transition-colors">
                    <td className="px-4 py-3 font-mono">{format(new Date(exp.expenseDate), "MMM d, yyyy")}</td>
                    <td className="px-4 py-3 font-medium">{exp.projectName}</td>
                    <td className="px-4 py-3 capitalize">{exp.category}</td>
                    <td className="px-4 py-3 text-muted-foreground">{exp.description}</td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className="text-[10px] capitalize">
                        {exp.paymentMode.replace('_', ' ')}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 font-mono font-bold">{formatINR(exp.amount)}</td>
                    <td className="px-4 py-3">
                      {exp.creditedToInventory ? (
                        <Badge variant="secondary" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-300">
                          Credited (+{exp.materialQuantity} {exp.materialUnit})
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={exp.status === "settled" ? "default" : exp.status === "approved" ? "outline" : "secondary"}>
                        {exp.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 text-xs text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                        onClick={() => {
                          setSelectedExpense(exp);
                          setOpenReviewExpense(true);
                        }}
                      >
                        Review Voucher <ChevronRight className="w-3.5 h-3.5 ml-1" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>

        {/* ------------------------------------------------------------------ */}
        {/* Tab 7: Financial Instruments (BGs, EMDs, Retentions) */}
        {/* ------------------------------------------------------------------ */}
        <TabsContent value="instruments" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">Bank Guarantees, EMDs & Retention Monies</h2>
            <NewFinancialInstrumentDialog
              trigger={
                <Button size="sm" className="gap-1.5">
                  <Plus className="w-4 h-4" /> Add Instrument
                </Button>
              }
            />
          </div>

          <div className="rounded-md border bg-card overflow-x-auto text-sm">
            <table className="w-full text-left">
              <thead className="bg-muted/50 text-muted-foreground border-b text-xs font-medium">
                <tr>
                  <th className="px-4 py-3">Ref Number</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Project</th>
                  <th className="px-4 py-3">Bank</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Expiry Date</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {instruments?.map((inst) => (
                  <tr key={inst.id} className="hover:bg-accent/50 transition-colors">
                    <td className="px-4 py-3 font-mono">{inst.instrumentNumber}</td>
                    <td className="px-4 py-3 capitalize">{inst.instrumentType.replace('_', ' ')}</td>
                    <td className="px-4 py-3">{inst.projectName}</td>
                    <td className="px-4 py-3">{inst.bankName || "-"}</td>
                    <td className="px-4 py-3 font-mono font-bold">{formatINR(inst.amount)}</td>
                    <td className="px-4 py-3 font-mono">
                      {inst.expiryDate ? format(new Date(inst.expiryDate), "MMM d, yyyy") : "-"}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={inst.status === "active" ? "default" : "secondary"}>
                        {inst.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {inst.status === "active" ? (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs text-emerald-600 border-emerald-300 hover:bg-emerald-50"
                          onClick={() => {
                            setSelectedInstrument(inst);
                            setOpenReleaseInstrument(true);
                          }}
                        >
                          Release / Settle
                        </Button>
                      ) : (
                        <span className="text-xs text-muted-foreground capitalize">
                          {inst.status} {inst.releaseDate ? `(${format(new Date(inst.releaseDate), "MMM d")})` : ""}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>
      </Tabs>

      {/* Action Dialog Modals */}
      <PrepareRaBillDialog open={openPrepareRa} onOpenChange={setOpenPrepareRa} />
      <ReviewRaBillDialog bill={selectedRaBill} open={openReviewRa} onOpenChange={setOpenReviewRa} />
      <ClientInvoiceActionDialog invoice={selectedInvoice} open={openInvoiceAction} onOpenChange={setOpenInvoiceAction} />
      <VendorInvoiceMatchDialog invoice={selectedVendorInvoice} open={openVendorMatch} onOpenChange={setOpenVendorMatch} />
      <QuickFieldExpenseDialog open={openQuickExpense} onOpenChange={setOpenQuickExpense} />
      <ReplenishSiteFloatDialog open={openReplenishFloat} onOpenChange={setOpenReplenishFloat} />
      <ReviewSiteExpenseDialog expense={selectedExpense} open={openReviewExpense} onOpenChange={setOpenReviewExpense} />
      {selectedInstrument && (
        <ReleaseInstrumentDialog
          instrument={selectedInstrument}
          open={openReleaseInstrument}
          onOpenChange={(op) => !op && setSelectedInstrument(null)}
        />
      )}
    </div>
  );
}

function ReleaseInstrumentDialog({
  instrument,
  open,
  onOpenChange,
}: {
  instrument: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [releaseDate, setReleaseDate] = useState(new Date().toISOString().slice(0, 10));
  const [referenceNumber, setReferenceNumber] = useState("");
  const [status, setStatus] = useState("released");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!instrument) return null;

  const handleRelease = async () => {
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/financial-instruments/${instrument.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          releaseDate,
          referenceNumber: referenceNumber || instrument.referenceNumber,
          notes: notes
            ? `${instrument.notes ? instrument.notes + "\n" : ""}Release Note: ${notes}`
            : instrument.notes,
        }),
      });
      if (!res.ok) throw new Error("Failed to release instrument");
      qc.invalidateQueries({ queryKey: ["/api/financial-instruments"] });
      toast({
        title: "Instrument Released / Settled",
        description: `${instrument.instrumentType.replace("_", " ")} #${instrument.instrumentNumber} marked as ${status}.`,
      });
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: "Failed to release", description: err.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Release Financial Instrument</DialogTitle>
          <DialogDescription>
            Settle retention money, return Bank Guarantee (BG), or release EMD deposit upon project handover or defect liability expiry.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="p-3 bg-muted/40 rounded-lg border text-xs space-y-1">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Instrument Ref:</span>
              <span className="font-mono font-bold">{instrument.instrumentNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Type:</span>
              <span className="capitalize">{instrument.instrumentType.replace("_", " ")}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Project:</span>
              <span>{instrument.projectName}</span>
            </div>
            <div className="flex justify-between border-t pt-1 font-semibold">
              <span>Amount:</span>
              <span className="font-mono text-emerald-600">{formatINR(instrument.amount)}</span>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Settlement Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="released">Released / Returned to Contractor</SelectItem>
                <SelectItem value="claimed">Claimed / Liquidated by Client</SelectItem>
                <SelectItem value="expired">Expired / Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Release / Settlement Date</Label>
            <Input
              type="date"
              value={releaseDate}
              onChange={(e: any) => setReleaseDate(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Bank Ref / Discharge Voucher #</Label>
            <Input
              value={referenceNumber}
              onChange={(e: any) => setReferenceNumber(e.target.value)}
              placeholder="e.g. REL-HDFC-2026-9812"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Handover & Settlement Notes</Label>
            <Textarea
              rows={2}
              value={notes}
              onChange={(e: any) => setNotes(e.target.value)}
              placeholder="e.g. 100% snagging items resolved; defect liability period elapsed."
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleRelease}
            disabled={isSubmitting}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {isSubmitting ? "Settling..." : "Confirm Release"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
