import { useState, useMemo } from "react";
import { format } from "date-fns";
import {
  ShieldCheck,
  Receipt,
  DollarSign,
  TrendingDown,
  AlertCircle,
  CheckCircle2,
  Clock,
  Plus,
  ArrowDownRight,
  ChevronRight,
  Filter,
  Search,
  Package,
  Layers,
  List,
  Calendar,
  AlertTriangle,
  FileCheck2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  useGetFinanceOverview,
  useListVendorInvoicesCustom,
  type VendorInvoice,
} from "@/hooks/use-finance-flow";
import { VendorInvoiceMatchDialog } from "@/components/dialogs/finance-flow-dialogs";
import { NewVendorInvoiceDialog } from "@/components/dialogs/finance-dialogs";
import { FinanceSubNav } from "@/components/finance/FinanceSubNav";

function formatINR(val: number | string | null | undefined): string {
  const n = Number(val || 0);
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);
}

export default function VendorAPPage() {
  const { data: overview, isLoading: loadingOverview } = useGetFinanceOverview();
  const { data: vendorInvoices, isLoading: loadingVendorInvoices } = useListVendorInvoicesCustom();

  // Dialog state
  const [selectedVendorInvoice, setSelectedVendorInvoice] = useState<VendorInvoice | null>(null);
  const [openVendorMatch, setOpenVendorMatch] = useState(false);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"pipeline" | "invoices">(() => {
    if (typeof window !== "undefined") {
      const param = new URLSearchParams(window.location.search).get("tab");
      if (param && ["pipeline", "invoices"].includes(param)) {
        return param as any;
      }
    }
    return "pipeline";
  });

  const handleTabChange = (tab: "pipeline" | "invoices") => {
    setActiveTab(tab);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("tab", tab);
      window.history.replaceState({}, "", url.toString());
    }
  };
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Filtered Vendor Invoices
  const filteredInvoices = useMemo(() => {
    if (!vendorInvoices) return [];
    return vendorInvoices.filter((vi) => {
      const q = searchQuery.toLowerCase();
      const matchText =
        (vi.invoiceNumber || "").toLowerCase().includes(q) ||
        (vi.vendorName || "").toLowerCase().includes(q) ||
        (vi.poNumber || "").toLowerCase().includes(q);

      const matchStatus = statusFilter === "all" || vi.status === statusFilter;
      return matchText && matchStatus;
    });
  }, [vendorInvoices, searchQuery, statusFilter]);

  // Counts
  const receivedCount = vendorInvoices?.filter((vi) => vi.status === "received").length || 0;
  const discrepancyCount = vendorInvoices?.filter((vi) => vi.status === "discrepancy").length || 0;
  const approvedCount = vendorInvoices?.filter((vi) => vi.status === "matched" || vi.status === "approved_for_payment").length || 0;
  const scheduledCount = vendorInvoices?.filter((vi) => vi.status === "scheduled").length || 0;
  const paidCount = vendorInvoices?.filter((vi) => vi.status === "paid").length || 0;

  return (
    <div className="space-y-6">
      {/* 1. Header & Navigation Sub-Menu */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="outline" className="text-xs bg-emerald-50/60 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200">
              Finance Module • Track 2
            </Badge>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Vendor Invoicing (AP)</h1>
          <p className="text-muted-foreground text-sm">
            Automated 3-way matching (PO vs GRN vs Vendor Bill), variance & discrepancy resolution, and scheduled payment disbursements.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <NewVendorInvoiceDialog
            trigger={
              <Button size="sm" className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm">
                <Plus className="w-4 h-4" /> Log Vendor Bill
              </Button>
            }
          />
        </div>
      </div>

      {/* Subnav links: Overview | Client AR | Vendor AP */}
      <FinanceSubNav />

      {/* 2. Executive AP Metrics Deck */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        {/* KPI 1: Total Invoiced */}
        <Card className="border-l-4 border-l-slate-500 bg-card">
          <CardHeader className="pb-1.5 pt-3.5 px-4">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase flex items-center justify-between">
              Total Invoiced
              <Receipt className="w-4 h-4 text-slate-500" />
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3.5 space-y-1">
            <div className="text-xl font-bold font-mono text-foreground">
              {formatINR(overview?.outflow.totalVendorInvoiced)}
            </div>
            <p className="text-[11px] text-muted-foreground">
              Across all vendor contracts & POs
            </p>
          </CardContent>
        </Card>

        {/* KPI 2: Total Paid */}
        <Card className="border-l-4 border-l-emerald-500 bg-card">
          <CardHeader className="pb-1.5 pt-3.5 px-4">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase flex items-center justify-between">
              Total Disbursed (Paid)
              <ArrowDownRight className="w-4 h-4 text-emerald-500" />
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3.5 space-y-1">
            <div className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
              {formatINR(overview?.outflow.totalVendorPaid)}
            </div>
            <p className="text-[11px] text-muted-foreground">
              {paidCount} bills successfully settled
            </p>
          </CardContent>
        </Card>

        {/* KPI 3: Pending Obligations */}
        <Card className="border-l-4 border-l-amber-500 bg-card">
          <CardHeader className="pb-1.5 pt-3.5 px-4">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase flex items-center justify-between">
              Pending AP Obligations
              <Clock className="w-4 h-4 text-amber-500" />
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3.5 space-y-1">
            <div className="text-xl font-bold font-mono text-amber-600 dark:text-amber-400">
              {formatINR((overview?.outflow.totalVendorInvoiced || 0) - (overview?.outflow.totalVendorPaid || 0))}
            </div>
            <p className="text-[11px] text-muted-foreground">
              Invoiced minus disbursed
            </p>
          </CardContent>
        </Card>

        {/* KPI 4: Pending 3-Way Match */}
        <Card className="border-l-4 border-l-sky-500 bg-card">
          <CardHeader className="pb-1.5 pt-3.5 px-4">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase flex items-center justify-between">
              Awaiting 3-Way Match
              <FileCheck2 className="w-4 h-4 text-sky-500" />
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3.5 space-y-1">
            <div className="text-xl font-bold font-mono text-sky-600 dark:text-sky-400">
              {receivedCount} Bills
            </div>
            <p className="text-[11px] text-muted-foreground">
              Ready for PO & GRN verification
            </p>
          </CardContent>
        </Card>

        {/* KPI 5: Active Discrepancies */}
        <Card className="border-l-4 border-l-rose-500 bg-card">
          <CardHeader className="pb-1.5 pt-3.5 px-4">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase flex items-center justify-between">
              Active Discrepancies
              <AlertTriangle className="w-4 h-4 text-rose-500" />
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3.5 space-y-1">
            <div className="text-xl font-bold font-mono text-rose-600 dark:text-rose-400">
              {discrepancyCount} Bills
            </div>
            <p className="text-[11px] text-muted-foreground">
              Requires amendment or debit note
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 3. AP Working Views */}
      <Tabs value={activeTab} onValueChange={(val) => handleTabChange(val as any)} className="space-y-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pb-1 border-b">
          <TabsList className="bg-muted/70 p-1 rounded-xl border border-border/80 flex-wrap h-auto gap-1">
            <TabsTrigger value="pipeline" className="gap-1.5">
              <Layers className="w-4 h-4" /> 3-Way Match Pipeline (Kanban)
            </TabsTrigger>
            <TabsTrigger value="invoices" className="gap-1.5">
              <ShieldCheck className="w-4 h-4" /> Vendor Invoices Register
              <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0">
                {vendorInvoices?.length || 0}
              </Badge>
            </TabsTrigger>
          </TabsList>

          <div className="flex items-center gap-2">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search invoice #, vendor, PO..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-8 text-xs bg-background"
              />
            </div>
          </div>
        </div>

        {/* ------------------------------------------------------------------ */}
        {/* Tab 1: 3-Way Match Kanban Pipeline                                */}
        {/* ------------------------------------------------------------------ */}
        <TabsContent value="pipeline" className="space-y-4">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Progressive 5-stage AP workflow with automated tolerance checks. Click any bill card to run 3-way match or disburse payout.</span>
            <NewVendorInvoiceDialog
              trigger={
                <Button size="sm" variant="outline" className="h-7 text-xs gap-1">
                  <Plus className="w-3.5 h-3.5" /> Log Vendor Bill
                </Button>
              }
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-3.5">
            {/* Stage 1: Received */}
            <div className="rounded-lg border bg-muted/20 p-3 space-y-2.5">
              <div className="flex items-center justify-between font-semibold text-xs border-b pb-1.5">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-400" /> 1. Bill Received
                </span>
                <Badge variant="secondary" className="text-[10px] font-mono">
                  {filteredInvoices.filter((vi) => vi.status === "received").length}
                </Badge>
              </div>
              <div className="space-y-2">
                {filteredInvoices
                  .filter((vi) => vi.status === "received")
                  .map((vi) => (
                    <div
                      key={vi.id}
                      onClick={() => {
                        setSelectedVendorInvoice(vi);
                        setOpenVendorMatch(true);
                      }}
                      className="p-3 rounded-md border bg-card hover:border-indigo-400 hover:shadow-md cursor-pointer transition-all space-y-2"
                    >
                      <div className="flex justify-between items-start">
                        <span className="font-mono font-semibold text-xs text-indigo-600">{vi.invoiceNumber}</span>
                        <span className="font-mono text-xs font-bold">{formatINR(vi.amount)}</span>
                      </div>
                      <p className="text-xs font-medium text-foreground truncate">{vi.vendorName}</p>
                      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                        <span>PO: {vi.poNumber || "Direct PO"}</span>
                        <Badge variant="outline" className="text-[9px]">Awaiting Match</Badge>
                      </div>
                    </div>
                  ))}
                {filteredInvoices.filter((vi) => vi.status === "received").length === 0 && (
                  <p className="text-[11px] text-muted-foreground text-center py-4 border border-dashed rounded">
                    No bills awaiting match
                  </p>
                )}
              </div>
            </div>

            {/* Stage 2: Discrepancy Flagged */}
            <div className="rounded-lg border bg-muted/20 p-3 space-y-2.5">
              <div className="flex items-center justify-between font-semibold text-xs border-b pb-1.5">
                <span className="flex items-center gap-1.5 text-rose-600">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500" /> 2. Discrepancy
                </span>
                <Badge variant="destructive" className="text-[10px] font-mono">
                  {filteredInvoices.filter((vi) => vi.status === "discrepancy").length}
                </Badge>
              </div>
              <div className="space-y-2">
                {filteredInvoices
                  .filter((vi) => vi.status === "discrepancy")
                  .map((vi) => (
                    <div
                      key={vi.id}
                      onClick={() => {
                        setSelectedVendorInvoice(vi);
                        setOpenVendorMatch(true);
                      }}
                      className="p-3 rounded-md border bg-card hover:border-rose-400 hover:shadow-md cursor-pointer transition-all space-y-2 border-l-4 border-l-rose-500"
                    >
                      <div className="flex justify-between items-start">
                        <span className="font-mono font-semibold text-xs text-rose-600">{vi.invoiceNumber}</span>
                        <span className="font-mono text-xs font-bold">{formatINR(vi.amount)}</span>
                      </div>
                      <p className="text-xs font-medium text-foreground truncate">{vi.vendorName}</p>
                      <p className="text-[11px] text-rose-600 truncate bg-rose-50 dark:bg-rose-950/40 px-1.5 py-0.5 rounded">
                        {vi.discrepancyNotes || "Rate/Qty variance flagged"}
                      </p>
                      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                        <span>PO: {vi.poNumber || "-"}</span>
                        <span className="text-[10px] text-rose-600 font-medium">Resolve Variance</span>
                      </div>
                    </div>
                  ))}
                {filteredInvoices.filter((vi) => vi.status === "discrepancy").length === 0 && (
                  <p className="text-[11px] text-muted-foreground text-center py-4 border border-dashed rounded">
                    No open discrepancies
                  </p>
                )}
              </div>
            </div>

            {/* Stage 3: Matched & Approved */}
            <div className="rounded-lg border bg-muted/20 p-3 space-y-2.5">
              <div className="flex items-center justify-between font-semibold text-xs border-b pb-1.5">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" /> 3. Approved for Pay
                </span>
                <Badge variant="secondary" className="text-[10px] font-mono">
                  {filteredInvoices.filter((vi) => vi.status === "matched" || vi.status === "approved_for_payment").length}
                </Badge>
              </div>
              <div className="space-y-2">
                {filteredInvoices
                  .filter((vi) => vi.status === "matched" || vi.status === "approved_for_payment")
                  .map((vi) => (
                    <div
                      key={vi.id}
                      onClick={() => {
                        setSelectedVendorInvoice(vi);
                        setOpenVendorMatch(true);
                      }}
                      className="p-3 rounded-md border bg-card hover:border-indigo-400 hover:shadow-md cursor-pointer transition-all space-y-2 border-l-4 border-l-indigo-500"
                    >
                      <div className="flex justify-between items-start">
                        <span className="font-mono font-semibold text-xs text-indigo-600">{vi.invoiceNumber}</span>
                        <span className="font-mono text-xs font-bold">{formatINR(vi.amount)}</span>
                      </div>
                      <p className="text-xs font-medium text-foreground truncate">{vi.vendorName}</p>
                      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                        <span>PO: {vi.poNumber}</span>
                        <Badge
                          variant={vi.status === "approved_for_payment" ? "default" : "outline"}
                          className={`text-[9px] ${vi.status === "approved_for_payment"
                              ? "bg-indigo-600 text-white"
                              : "text-indigo-600"
                            }`}
                        >
                          {vi.status === "approved_for_payment" ? "Approved for Pay" : "3-Way Matched"}
                        </Badge>
                      </div>
                    </div>
                  ))}
                {filteredInvoices.filter((vi) => vi.status === "matched" || vi.status === "approved_for_payment").length === 0 && (
                  <p className="text-[11px] text-muted-foreground text-center py-4 border border-dashed rounded">
                    None pending schedule
                  </p>
                )}
              </div>
            </div>

            {/* Stage 4: Scheduled Batch */}
            <div className="rounded-lg border bg-muted/20 p-3 space-y-2.5">
              <div className="flex items-center justify-between font-semibold text-xs border-b pb-1.5">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> 4. Scheduled Batch
                </span>
                <Badge variant="secondary" className="text-[10px] font-mono">
                  {filteredInvoices.filter((vi) => vi.status === "scheduled").length}
                </Badge>
              </div>
              <div className="space-y-2">
                {filteredInvoices
                  .filter((vi) => vi.status === "scheduled")
                  .map((vi) => (
                    <div
                      key={vi.id}
                      onClick={() => {
                        setSelectedVendorInvoice(vi);
                        setOpenVendorMatch(true);
                      }}
                      className="p-3 rounded-md border bg-card hover:border-amber-400 hover:shadow-md cursor-pointer transition-all space-y-2 border-l-4 border-l-amber-500"
                    >
                      <div className="flex justify-between items-start">
                        <span className="font-mono font-semibold text-xs text-amber-600">{vi.invoiceNumber}</span>
                        <span className="font-mono text-xs font-bold">{formatINR(vi.amount)}</span>
                      </div>
                      <p className="text-xs font-medium text-foreground truncate">{vi.vendorName}</p>
                      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                        <span>Due: {vi.scheduledPaymentDate || "This Week"}</span>
                        <Badge variant="secondary" className="text-[9px] bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                          Batch Scheduled
                        </Badge>
                      </div>
                    </div>
                  ))}
                {filteredInvoices.filter((vi) => vi.status === "scheduled").length === 0 && (
                  <p className="text-[11px] text-muted-foreground text-center py-4 border border-dashed rounded">
                    No scheduled payouts
                  </p>
                )}
              </div>
            </div>

            {/* Stage 5: Disbursed & Settled */}
            <div className="rounded-lg border bg-muted/20 p-3 space-y-2.5">
              <div className="flex items-center justify-between font-semibold text-xs border-b pb-1.5">
                <span className="flex items-center gap-1.5 text-emerald-600">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> 5. Disbursed
                </span>
                <Badge variant="secondary" className="text-[10px] font-mono">
                  {filteredInvoices.filter((vi) => vi.status === "paid").length}
                </Badge>
              </div>
              <div className="space-y-2">
                {filteredInvoices
                  .filter((vi) => vi.status === "paid")
                  .map((vi) => (
                    <div
                      key={vi.id}
                      onClick={() => {
                        setSelectedVendorInvoice(vi);
                        setOpenVendorMatch(true);
                      }}
                      className="p-3 rounded-md border bg-card hover:border-emerald-400 hover:shadow-md cursor-pointer transition-all space-y-2 border-l-4 border-l-emerald-500"
                    >
                      <div className="flex justify-between items-start">
                        <span className="font-mono font-semibold text-xs text-emerald-600">{vi.invoiceNumber}</span>
                        <span className="font-mono text-xs font-bold text-emerald-600">{formatINR(vi.paidAmount || vi.amount)}</span>
                      </div>
                      <p className="text-xs font-medium text-foreground truncate">{vi.vendorName}</p>
                      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                        <span>PO: {vi.poNumber || "-"}</span>
                        <Badge variant="default" className="text-[9px] bg-emerald-600">
                          Disbursed
                        </Badge>
                      </div>
                    </div>
                  ))}
                {filteredInvoices.filter((vi) => vi.status === "paid").length === 0 && (
                  <p className="text-[11px] text-muted-foreground text-center py-4 border border-dashed rounded">
                    No disbursed bills
                  </p>
                )}
              </div>
            </div>
          </div>
        </TabsContent>

        {/* ------------------------------------------------------------------ */}
        {/* Tab 2: Vendor Invoices Register                                    */}
        {/* ------------------------------------------------------------------ */}
        <TabsContent value="invoices" className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <h2 className="text-lg font-semibold">Vendor Invoices & 3-Way Match Register</h2>
              <p className="text-xs text-muted-foreground">
                Automated tolerance check compares PO total vs delivered GRN vs vendor bill.
              </p>
            </div>

            {/* Quick Status Pill Filter */}
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              {["all", "received", "discrepancy", "approved_for_payment", "scheduled", "paid"].map((st) => (
                <Button
                  key={st}
                  size="sm"
                  variant={statusFilter === st ? "default" : "outline"}
                  className="h-7 text-xs capitalize"
                  onClick={() => setStatusFilter(st)}
                >
                  {st.replace(/_/g, " ")}
                </Button>
              ))}
            </div>
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
                  <th className="px-4 py-3">Variance</th>
                  <th className="px-4 py-3">GRN Status</th>
                  <th className="px-4 py-3">Match Status</th>
                  <th className="px-4 py-3 text-right">3-Way Action</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredInvoices.map((vi) => {
                  const poAmt = vi.poTotalAmount || 0;
                  const invAmt = vi.amount || 0;
                  const variance = invAmt - poAmt;

                  return (
                    <tr key={vi.id} className="hover:bg-accent/50 transition-colors">
                      <td className="px-4 py-3 font-mono font-medium text-slate-800 dark:text-slate-200">
                        {vi.invoiceNumber}
                      </td>
                      <td className="px-4 py-3 font-medium">{vi.vendorName}</td>
                      <td className="px-4 py-3 font-mono text-muted-foreground">{vi.poNumber || "-"}</td>
                      <td className="px-4 py-3 font-mono font-bold">{formatINR(vi.amount)}</td>
                      <td className="px-4 py-3 font-mono text-muted-foreground">
                        {vi.poTotalAmount ? formatINR(vi.poTotalAmount) : "-"}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs">
                        {poAmt > 0 && variance !== 0 ? (
                          <span className={variance > 0 ? "text-rose-600 font-semibold" : "text-emerald-600 font-semibold"}>
                            {variance > 0 ? `+${formatINR(variance)}` : formatINR(variance)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">₹0</span>
                        )}
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
                          className="h-8 text-xs text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 dark:hover:bg-indigo-950"
                          onClick={() => {
                            setSelectedVendorInvoice(vi);
                            setOpenVendorMatch(true);
                          }}
                        >
                          Match / Disburse <ChevronRight className="w-3.5 h-3.5 ml-1" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
                {filteredInvoices.length === 0 && !loadingVendorInvoices && (
                  <tr>
                    <td colSpan={9} className="px-4 py-8 text-center text-muted-foreground border-dashed border-t">
                      No matching vendor invoices found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <VendorInvoiceMatchDialog
        invoice={selectedVendorInvoice}
        open={openVendorMatch}
        onOpenChange={setOpenVendorMatch}
      />
    </div>
  );
}

