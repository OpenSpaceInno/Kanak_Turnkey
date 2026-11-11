import { useState, useMemo } from "react";
import { format } from "date-fns";
import {
  FileText,
  DollarSign,
  TrendingUp,
  Receipt,
  AlertCircle,
  CheckCircle2,
  Clock,
  Plus,
  ArrowUpRight,
  ChevronRight,
  Filter,
  Search,
  Building2,
  Calendar,
  Layers,
  List,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  useGetFinanceOverview,
  useListRaBills,
  useListClientInvoices,
  type RaBill,
  type ClientInvoice,
} from "@/hooks/use-finance-flow";
import {
  PrepareRaBillDialog,
  ReviewRaBillDialog,
  ClientInvoiceActionDialog,
} from "@/components/dialogs/finance-flow-dialogs";
import { FinanceSubNav } from "@/components/finance/FinanceSubNav";

function formatINR(val: number | string | null | undefined): string {
  const n = Number(val || 0);
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);
}

export default function ClientARPage() {
  const { data: overview, isLoading: loadingOverview } = useGetFinanceOverview();
  const { data: raBills, isLoading: loadingRa } = useListRaBills();
  const { data: clientInvoices, isLoading: loadingInvoices } = useListClientInvoices();

  // Dialog states
  const [openPrepareRa, setOpenPrepareRa] = useState(false);
  const [selectedRaBill, setSelectedRaBill] = useState<RaBill | null>(null);
  const [openReviewRa, setOpenReviewRa] = useState(false);

  const [selectedInvoice, setSelectedInvoice] = useState<ClientInvoice | null>(null);
  const [openInvoiceAction, setOpenInvoiceAction] = useState(false);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"pipeline" | "ra_bills" | "tax_invoices">(() => {
    if (typeof window !== "undefined") {
      const param = new URLSearchParams(window.location.search).get("tab");
      if (param && ["pipeline", "ra_bills", "tax_invoices"].includes(param)) {
        return param as any;
      }
    }
    return "pipeline";
  });

  const handleTabChange = (tab: "pipeline" | "ra_bills" | "tax_invoices") => {
    setActiveTab(tab);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("tab", tab);
      window.history.replaceState({}, "", url.toString());
    }
  };

  // Filtered RA Bills
  const filteredRaBills = useMemo(() => {
    if (!raBills) return [];
    return raBills.filter((bill) => {
      const q = searchQuery.toLowerCase();
      const matchText =
        (bill.billNumber || "").toLowerCase().includes(q) ||
        (bill.projectName || "").toLowerCase().includes(q) ||
        (bill.milestone || "").toLowerCase().includes(q);
      return matchText;
    });
  }, [raBills, searchQuery]);

  // Filtered Client Invoices
  const filteredInvoices = useMemo(() => {
    if (!clientInvoices) return [];
    return clientInvoices.filter((inv) => {
      const q = searchQuery.toLowerCase();
      const matchText =
        (inv.invoiceNumber || "").toLowerCase().includes(q) ||
        (inv.clientName || "").toLowerCase().includes(q) ||
        (inv.projectName || "").toLowerCase().includes(q);
      return matchText;
    });
  }, [clientInvoices, searchQuery]);

  // Pipeline counts
  const draftRaCount = raBills?.filter((r) => r.status === "draft" || r.status === "revision_requested").length || 0;
  const pmReviewRaCount = raBills?.filter((r) => r.status === "submitted" || r.status === "verified").length || 0;
  const invoicedCount = clientInvoices?.filter((inv) => inv.status === "sent" || inv.status === "draft").length || 0;
  const remindersCount = clientInvoices?.filter((inv) => inv.paymentRemindersCount > 0 && inv.status !== "paid" && inv.status !== "closed").length || 0;
  const collectedCount = clientInvoices?.filter((inv) => inv.status === "paid" || inv.status === "reconciled" || inv.status === "closed").length || 0;

  return (
    <div className="space-y-6">
      {/* 1. Header & Navigation Sub-Menu */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="outline" className="text-xs bg-indigo-50/60 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border-indigo-200">
              Finance Module • Track 1
            </Badge>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Client Billing (AR)</h1>
          <p className="text-muted-foreground text-sm">
            Progressive measurement sheets, Running Account (RA) bills, client certifications, and tax invoices.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            className="gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
            onClick={() => setOpenPrepareRa(true)}
          >
            <Plus className="w-4 h-4" /> Prepare RA Bill
          </Button>
        </div>
      </div>

      {/* Subnav links: Overview | Client AR | Vendor AP */}
      <FinanceSubNav />

      {/* 2. Executive AR Metrics Deck */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        {/* KPI 1: Total Billed */}
        <Card className="border-l-4 border-l-indigo-500 bg-card">
          <CardHeader className="pb-1.5 pt-3.5 px-4">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase flex items-center justify-between">
              Total Billed
              <Receipt className="w-4 h-4 text-indigo-500" />
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3.5 space-y-1">
            <div className="text-xl font-bold font-mono text-foreground">
              {formatINR(overview?.inflow.totalBilled)}
            </div>
            <p className="text-[11px] text-muted-foreground">
              Across all project milestones
            </p>
          </CardContent>
        </Card>

        {/* KPI 2: Collections Inflow */}
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
                <span>Rate: {overview?.inflow.collectionRate}%</span>
                <span>{overview?.inflow.collectionRate ?? 0}% achieved</span>
              </div>
              <Progress value={overview?.inflow.collectionRate || 0} className="h-1.5" />
            </div>
          </CardContent>
        </Card>

        {/* KPI 3: Outstanding Receivables */}
        <Card className="border-l-4 border-l-amber-500 bg-card">
          <CardHeader className="pb-1.5 pt-3.5 px-4">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase flex items-center justify-between">
              Outstanding AR
              <Clock className="w-4 h-4 text-amber-500" />
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3.5 space-y-1">
            <div className="text-xl font-bold font-mono text-amber-600 dark:text-amber-400">
              {formatINR(overview?.inflow.outstandingReceivables)}
            </div>
            <p className="text-[11px] text-muted-foreground">
              Awaiting client disbursement
            </p>
          </CardContent>
        </Card>

        {/* KPI 4: Pending Certifications */}
        <Card className="border-l-4 border-l-sky-500 bg-card">
          <CardHeader className="pb-1.5 pt-3.5 px-4">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase flex items-center justify-between">
              PM / QS Verification
              <FileText className="w-4 h-4 text-sky-500" />
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3.5 space-y-1">
            <div className="text-xl font-bold font-mono text-sky-600 dark:text-sky-400">
              {pmReviewRaCount} Bills
            </div>
            <p className="text-[11px] text-muted-foreground">
              {draftRaCount} drafts in measurement
            </p>
          </CardContent>
        </Card>

        {/* KPI 5: Overdue Invoices */}
        <Card className="border-l-4 border-l-rose-500 bg-card">
          <CardHeader className="pb-1.5 pt-3.5 px-4">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase flex items-center justify-between">
              Overdue Receivables
              <AlertCircle className="w-4 h-4 text-rose-500" />
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3.5 space-y-1">
            <div className="text-xl font-bold font-mono text-rose-600 dark:text-rose-400">
              {overview?.inflow.overdueCount || 0} Invoices
            </div>
            <p className="text-[11px] text-muted-foreground">
              {remindersCount} invoices sent reminders
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 3. AR Working Views */}
      <Tabs value={activeTab} onValueChange={(val) => handleTabChange(val as any)} className="space-y-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pb-1 border-b">
          <TabsList className="bg-muted/70 p-1 rounded-xl border border-border/80 flex-wrap h-auto gap-1">
            <TabsTrigger value="pipeline" className="gap-1.5">
              <Layers className="w-4 h-4" /> AR Lifecycle Pipeline (Kanban)
            </TabsTrigger>
            <TabsTrigger value="ra_bills" className="gap-1.5">
              <FileText className="w-4 h-4" /> RA Measurement Bills
              <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0">
                {raBills?.length || 0}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="tax_invoices" className="gap-1.5">
              <Receipt className="w-4 h-4" /> Client Tax Invoices
              <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0">
                {clientInvoices?.length || 0}
              </Badge>
            </TabsTrigger>
          </TabsList>

          <div className="flex items-center gap-2">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search bill #, project, client..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-8 text-xs bg-background"
              />
            </div>
          </div>
        </div>

        {/* ------------------------------------------------------------------ */}
        {/* Tab 1: Interactive AR Lifecycle Kanban Pipeline                    */}
        {/* ------------------------------------------------------------------ */}
        <TabsContent value="pipeline" className="space-y-4">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Progressive lifecycle from measurement sheets to bank reconciliation. Click any card to review or take action.</span>
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs gap-1"
              onClick={() => setOpenPrepareRa(true)}
            >
              <Plus className="w-3.5 h-3.5" /> New RA Bill
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-3.5">
            {/* Stage 1: Draft & Measurement */}
            <div className="rounded-lg border bg-muted/20 p-3 space-y-2.5">
              <div className="flex items-center justify-between font-semibold text-xs border-b pb-1.5">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-400" /> 1. Draft / Measure
                </span>
                <Badge variant="secondary" className="text-[10px] font-mono">
                  {filteredRaBills.filter((r) => r.status === "draft" || r.status === "revision_requested").length}
                </Badge>
              </div>
              <div className="space-y-2">
                {filteredRaBills
                  .filter((r) => r.status === "draft" || r.status === "revision_requested")
                  .map((bill) => (
                    <div
                      key={bill.id}
                      onClick={() => {
                        setSelectedRaBill(bill);
                        setOpenReviewRa(true);
                      }}
                      className="p-3 rounded-md border bg-card hover:border-indigo-400 hover:shadow-md cursor-pointer transition-all space-y-2"
                    >
                      <div className="flex justify-between items-start">
                        <span className="font-mono font-semibold text-xs text-indigo-600">{bill.billNumber}</span>
                        <span className="font-mono text-xs font-bold">{formatINR(bill.netBillableAmount || bill.amount)}</span>
                      </div>
                      <p className="text-xs font-medium text-foreground truncate">{bill.projectName}</p>
                      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                        <span>{bill.milestone || "General"}</span>
                        <span>{bill.workCompletionPercent || 0}% Done</span>
                      </div>
                      {bill.status === "revision_requested" && (
                        <Badge variant="destructive" className="text-[9px] w-full justify-center">
                          Revision Requested
                        </Badge>
                      )}
                    </div>
                  ))}
                {filteredRaBills.filter((r) => r.status === "draft" || r.status === "revision_requested").length === 0 && (
                  <p className="text-[11px] text-muted-foreground text-center py-4 border border-dashed rounded">
                    No active drafts
                  </p>
                )}
              </div>
            </div>

            {/* Stage 2: PM & QS Review */}
            <div className="rounded-lg border bg-muted/20 p-3 space-y-2.5">
              <div className="flex items-center justify-between font-semibold text-xs border-b pb-1.5">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" /> 2. PM Review
                </span>
                <Badge variant="secondary" className="text-[10px] font-mono">
                  {filteredRaBills.filter((r) => r.status === "submitted" || r.status === "verified").length}
                </Badge>
              </div>
              <div className="space-y-2">
                {filteredRaBills
                  .filter((r) => r.status === "submitted" || r.status === "verified")
                  .map((bill) => (
                    <div
                      key={bill.id}
                      onClick={() => {
                        setSelectedRaBill(bill);
                        setOpenReviewRa(true);
                      }}
                      className="p-3 rounded-md border bg-card hover:border-indigo-400 hover:shadow-md cursor-pointer transition-all space-y-2 border-l-4 border-l-indigo-500"
                    >
                      <div className="flex justify-between items-start">
                        <span className="font-mono font-semibold text-xs text-indigo-600">{bill.billNumber}</span>
                        <span className="font-mono text-xs font-bold">{formatINR(bill.netBillableAmount || bill.amount)}</span>
                      </div>
                      <p className="text-xs font-medium text-foreground truncate">{bill.projectName}</p>
                      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                        <span>Work: {bill.workCompletionPercent || 50}%</span>
                        <span className="text-[10px] text-indigo-600 font-medium">Verify Sheet</span>
                      </div>
                      <Badge variant="outline" className="text-[9px] w-full justify-center bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                        Awaiting PM Approval
                      </Badge>
                    </div>
                  ))}
                {filteredRaBills.filter((r) => r.status === "submitted" || r.status === "verified").length === 0 && (
                  <p className="text-[11px] text-muted-foreground text-center py-4 border border-dashed rounded">
                    All caught up
                  </p>
                )}
              </div>
            </div>

            {/* Stage 3: Invoice Sent to Client */}
            <div className="rounded-lg border bg-muted/20 p-3 space-y-2.5">
              <div className="flex items-center justify-between font-semibold text-xs border-b pb-1.5">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-sky-500" /> 3. Invoice Sent
                </span>
                <Badge variant="secondary" className="text-[10px] font-mono">
                  {filteredInvoices.filter((inv) => inv.status === "sent" || inv.status === "draft").length}
                </Badge>
              </div>
              <div className="space-y-2">
                {filteredInvoices
                  .filter((inv) => inv.status === "sent" || inv.status === "draft")
                  .map((inv) => (
                    <div
                      key={inv.id}
                      onClick={() => {
                        setSelectedInvoice(inv);
                        setOpenInvoiceAction(true);
                      }}
                      className="p-3 rounded-md border bg-card hover:border-sky-400 hover:shadow-md cursor-pointer transition-all space-y-2 border-l-4 border-l-sky-500"
                    >
                      <div className="flex justify-between items-start">
                        <span className="font-mono font-semibold text-xs text-sky-600">{inv.invoiceNumber}</span>
                        <span className="font-mono text-xs font-bold">{formatINR(inv.totalWithTax || inv.amount)}</span>
                      </div>
                      <p className="text-xs font-medium text-foreground truncate">{inv.clientName}</p>
                      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                        <span className="truncate max-w-[120px]">{inv.projectName}</span>
                        <span>Due: {format(new Date(inv.dueDate), "MMM d")}</span>
                      </div>
                      <Badge variant="outline" className="text-[9px] w-full justify-center bg-sky-50 text-sky-700 dark:bg-sky-950 dark:text-sky-300">
                        {inv.status === "draft" ? "Draft Tax Invoice" : "Sent to Client"}
                      </Badge>
                    </div>
                  ))}
                {filteredInvoices.filter((inv) => inv.status === "sent" || inv.status === "draft").length === 0 && (
                  <p className="text-[11px] text-muted-foreground text-center py-4 border border-dashed rounded">
                    No active sent invoices
                  </p>
                )}
              </div>
            </div>

            {/* Stage 4: Payment Follow-up & Reminders */}
            <div className="rounded-lg border bg-muted/20 p-3 space-y-2.5">
              <div className="flex items-center justify-between font-semibold text-xs border-b pb-1.5">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> 4. Reminders
                </span>
                <Badge variant="secondary" className="text-[10px] font-mono">
                  {filteredInvoices.filter((inv) => inv.paymentRemindersCount > 0 && inv.status !== "paid" && inv.status !== "closed").length}
                </Badge>
              </div>
              <div className="space-y-2">
                {filteredInvoices
                  .filter((inv) => inv.paymentRemindersCount > 0 && inv.status !== "paid" && inv.status !== "closed")
                  .map((inv) => (
                    <div
                      key={inv.id}
                      onClick={() => {
                        setSelectedInvoice(inv);
                        setOpenInvoiceAction(true);
                      }}
                      className="p-3 rounded-md border bg-card hover:border-amber-400 hover:shadow-md cursor-pointer transition-all space-y-2 border-l-4 border-l-amber-500"
                    >
                      <div className="flex justify-between items-start">
                        <span className="font-mono font-semibold text-xs text-amber-600">{inv.invoiceNumber}</span>
                        <span className="font-mono text-xs font-bold">{formatINR(inv.totalWithTax || inv.amount)}</span>
                      </div>
                      <p className="text-xs font-medium text-foreground truncate">{inv.clientName}</p>
                      <p className="text-[11px] text-muted-foreground truncate">{inv.projectName}</p>
                      <Badge variant="outline" className="text-[9px] w-full justify-center text-amber-700 border-amber-300 bg-amber-50 dark:bg-amber-950">
                        {inv.paymentRemindersCount} notices issued
                      </Badge>
                    </div>
                  ))}
                {filteredInvoices.filter((inv) => inv.paymentRemindersCount > 0 && inv.status !== "paid" && inv.status !== "closed").length === 0 && (
                  <p className="text-[11px] text-muted-foreground text-center py-4 border border-dashed rounded">
                    No overdue reminders
                  </p>
                )}
              </div>
            </div>

            {/* Stage 5: Collected & Reconciled */}
            <div className="rounded-lg border bg-muted/20 p-3 space-y-2.5">
              <div className="flex items-center justify-between font-semibold text-xs border-b pb-1.5">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> 5. Settled
                </span>
                <Badge variant="secondary" className="text-[10px] font-mono">
                  {filteredInvoices.filter((inv) => inv.status === "paid" || inv.status === "reconciled" || inv.status === "closed").length}
                </Badge>
              </div>
              <div className="space-y-2">
                {filteredInvoices
                  .filter((inv) => inv.status === "paid" || inv.status === "reconciled" || inv.status === "closed")
                  .map((inv) => (
                    <div
                      key={inv.id}
                      onClick={() => {
                        setSelectedInvoice(inv);
                        setOpenInvoiceAction(true);
                      }}
                      className="p-3 rounded-md border bg-card hover:border-emerald-400 hover:shadow-md cursor-pointer transition-all space-y-2 border-l-4 border-l-emerald-500"
                    >
                      <div className="flex justify-between items-start">
                        <span className="font-mono font-semibold text-xs text-emerald-600">{inv.invoiceNumber}</span>
                        <span className="font-mono text-xs font-bold text-emerald-600">{formatINR(inv.netReceivedAmount || inv.amount)}</span>
                      </div>
                      <p className="text-xs font-medium text-foreground truncate">{inv.clientName}</p>
                      <p className="text-[11px] text-muted-foreground truncate">{inv.projectName}</p>
                      <Badge variant="default" className="text-[9px] w-full justify-center bg-emerald-600">
                        {inv.status === "reconciled" ? "Bank Reconciled" : "Paid & Closed"}
                      </Badge>
                    </div>
                  ))}
                {filteredInvoices.filter((inv) => inv.status === "paid" || inv.status === "reconciled" || inv.status === "closed").length === 0 && (
                  <p className="text-[11px] text-muted-foreground text-center py-4 border border-dashed rounded">
                    No closed settlements
                  </p>
                )}
              </div>
            </div>
          </div>
        </TabsContent>

        {/* ------------------------------------------------------------------ */}
        {/* Tab 2: RA Bills Detailed Register                                 */}
        {/* ------------------------------------------------------------------ */}
        <TabsContent value="ra_bills" className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <div>
              <h2 className="text-lg font-semibold">Running Account (RA) Measurement Register</h2>
              <p className="text-xs text-muted-foreground">Progressive contractor claims with retention and advance deductions.</p>
            </div>
            <Button size="sm" onClick={() => setOpenPrepareRa(true)} className="gap-1.5">
              <Plus className="w-4 h-4" /> Prepare RA Bill
            </Button>
          </div>

          <div className="rounded-md border bg-card overflow-x-auto text-sm">
            <table className="w-full text-left">
              <thead className="bg-muted/50 text-muted-foreground border-b text-xs font-medium">
                <tr>
                  <th className="px-4 py-3">Bill Number</th>
                  <th className="px-4 py-3">Project</th>
                  <th className="px-4 py-3">Milestone</th>
                  <th className="px-4 py-3">Work %</th>
                  <th className="px-4 py-3">Gross Claim</th>
                  <th className="px-4 py-3">Retention / Adv</th>
                  <th className="px-4 py-3">Net Billable</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredRaBills.map((bill) => (
                  <tr key={bill.id} className="hover:bg-accent/50 transition-colors">
                    <td className="px-4 py-3 font-mono font-medium text-indigo-600">{bill.billNumber}</td>
                    <td className="px-4 py-3 font-medium">{bill.projectName}</td>
                    <td className="px-4 py-3 text-muted-foreground">{bill.milestone || "-"}</td>
                    <td className="px-4 py-3 font-mono">{bill.workCompletionPercent || 50}%</td>
                    <td className="px-4 py-3 font-mono">{formatINR(bill.grossAmount || bill.amount)}</td>
                    <td className="px-4 py-3 font-mono text-xs text-rose-500">
                      - {formatINR((bill.retentionAmount || 0) + (bill.advanceDeduction || 0))}
                    </td>
                    <td className="px-4 py-3 font-mono font-bold text-emerald-600">
                      {formatINR(bill.netBillableAmount || bill.amount)}
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        variant={
                          bill.status === "approved" || bill.status === "invoiced"
                            ? "default"
                            : bill.status === "revision_requested"
                              ? "destructive"
                              : "outline"
                        }
                      >
                        {bill.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 text-xs text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 dark:hover:bg-indigo-950"
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
                {filteredRaBills.length === 0 && !loadingRa && (
                  <tr>
                    <td colSpan={9} className="px-4 py-8 text-center text-muted-foreground border-dashed border-t">
                      No matching RA measurement bills found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </TabsContent>

        {/* ------------------------------------------------------------------ */}
        {/* Tab 3: Client Tax Invoices Register                                */}
        {/* ------------------------------------------------------------------ */}
        <TabsContent value="tax_invoices" className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <div>
              <h2 className="text-lg font-semibold">Client Tax Invoices</h2>
              <p className="text-xs text-muted-foreground">GST compliant invoices issued upon client approval of RA measurement sheets.</p>
            </div>
          </div>

          <div className="rounded-md border bg-card overflow-x-auto text-sm">
            <table className="w-full text-left">
              <thead className="bg-muted/50 text-muted-foreground border-b text-xs font-medium">
                <tr>
                  <th className="px-4 py-3">Invoice #</th>
                  <th className="px-4 py-3">Client</th>
                  <th className="px-4 py-3">Project</th>
                  <th className="px-4 py-3">Due Date</th>
                  <th className="px-4 py-3">Taxable Amt</th>
                  <th className="px-4 py-3">GST (18%)</th>
                  <th className="px-4 py-3">Total Amount</th>
                  <th className="px-4 py-3">Reminders</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredInvoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-accent/50 transition-colors">
                    <td className="px-4 py-3 font-mono font-medium text-sky-600">{inv.invoiceNumber}</td>
                    <td className="px-4 py-3 font-medium">{inv.clientName}</td>
                    <td className="px-4 py-3 text-muted-foreground">{inv.projectName}</td>
                    <td className="px-4 py-3 font-mono">{format(new Date(inv.dueDate), "MMM d, yyyy")}</td>
                    <td className="px-4 py-3 font-mono">{formatINR(inv.amount)}</td>
                    <td className="px-4 py-3 font-mono text-muted-foreground">{formatINR(inv.taxAmount)}</td>
                    <td className="px-4 py-3 font-mono font-bold">{formatINR(inv.totalWithTax || inv.amount)}</td>
                    <td className="px-4 py-3">
                      {inv.paymentRemindersCount > 0 ? (
                        <Badge variant="outline" className="text-amber-600 border-amber-300 font-mono text-[10px]">
                          {inv.paymentRemindersCount} notices
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        variant={
                          inv.status === "paid" || inv.status === "reconciled" || inv.status === "closed"
                            ? "default"
                            : inv.status === "overdue"
                              ? "destructive"
                              : "outline"
                        }
                      >
                        {inv.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 text-xs text-sky-600 hover:text-sky-700 hover:bg-sky-50 dark:hover:bg-sky-950"
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
                {filteredInvoices.length === 0 && !loadingInvoices && (
                  <tr>
                    <td colSpan={10} className="px-4 py-8 text-center text-muted-foreground border-dashed border-t">
                      No matching client tax invoices found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <PrepareRaBillDialog open={openPrepareRa} onOpenChange={setOpenPrepareRa} />
      <ReviewRaBillDialog bill={selectedRaBill} open={openReviewRa} onOpenChange={setOpenReviewRa} />
      <ClientInvoiceActionDialog invoice={selectedInvoice} open={openInvoiceAction} onOpenChange={setOpenInvoiceAction} />
    </div>
  );
}

