import { useState, useMemo } from "react";
import {
  useListVendors,
  useListPurchaseOrders,
  useListRfqs,
  useListMaterialRequests,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Plus,
  Star,
  Truck,
  CheckCircle2,
  FileCheck,
  Send,
  RefreshCw,
  Layers,
  ShieldCheck,
  Search,
  ShoppingCart,
  Receipt,
  Clock,
  AlertTriangle,
  Building2,
  Calendar,
} from "lucide-react";
import { format } from "date-fns";
import {
  NewVendorDialog,
  NewPurchaseOrderDialog,
  NewRfqDialog,
  NewMaterialRequestDialog,
} from "@/components/dialogs/procurement-dialogs";
import {
  ApproveRejectMrDialog,
  QuoteComparisonDialog,
  AddQuotationDialog,
  PoTrackingDialog,
  PoInspectionDialog,
} from "@/components/dialogs/procurement-flow-dialogs";
import {
  useAcknowledgePo,
  useReceivePo,
  useSendRfq,
} from "@/hooks/use-procurement-flow";
import { useToast } from "@/hooks/use-toast";
import { ProcurementSubNav } from "@/components/procurement/ProcurementSubNav";

const MR_STATUS: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  pending: { label: "Pending Approval", variant: "outline" },
  approved: { label: "Approved (Ready for RFQ)", variant: "default" },
  fulfilled: { label: "Fulfilled / Stocked", variant: "secondary" },
  rejected: { label: "Rejected", variant: "destructive" },
};

const PO_STATUS: Record<string, { label: string; color: string }> = {
  draft: { label: "Draft", color: "bg-slate-500" },
  issued: { label: "Issued to Vendor", color: "bg-blue-600" },
  acknowledged: { label: "Vendor Confirmed", color: "bg-indigo-600" },
  in_transit: { label: "In Transit", color: "bg-amber-600" },
  received: { label: "Arrived at Site", color: "bg-purple-600" },
  delivered: { label: "QC Passed & Stocked", color: "bg-emerald-600" },
  rejected_and_returned: { label: "QC Failed & Returned", color: "bg-rose-600" },
  cancelled: { label: "Cancelled", color: "bg-gray-500" },
};

function formatINR(val: number | string | null | undefined): string {
  const n = Number(val || 0);
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);
}

export default function ProcurementOrdersPage() {
  const { toast } = useToast();
  const { data: vendors, isLoading: loadingVendors } = useListVendors();
  const { data: pos, isLoading: loadingPos } = useListPurchaseOrders();
  const { data: rfqs, isLoading: loadingRfqs } = useListRfqs();
  const { data: mrs, isLoading: loadingMrs } = useListMaterialRequests();

  // Procurement action hooks
  const acknowledgePo = useAcknowledgePo();
  const receivePo = useReceivePo();
  const sendRfq = useSendRfq();

  // Modal States
  const [approveRejectMr, setApproveRejectMr] = useState<any | null>(null);
  const [approveMode, setApproveMode] = useState<"approve" | "reject">("approve");
  const [selectedRfqForComparison, setSelectedRfqForComparison] = useState<any | null>(null);
  const [selectedRfqForAddQuote, setSelectedRfqForAddQuote] = useState<any | null>(null);
  const [selectedPoForTracking, setSelectedPoForTracking] = useState<any | null>(null);
  const [selectedPoForInspection, setSelectedPoForInspection] = useState<any | null>(null);

  // Search & Active Tab
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"pipeline" | "mrs" | "rfqs" | "pos" | "vendors">(() => {
    if (typeof window !== "undefined") {
      const param = new URLSearchParams(window.location.search).get("tab");
      if (param && ["pipeline", "mrs", "rfqs", "pos", "vendors"].includes(param)) {
        return param as any;
      }
    }
    return "pipeline";
  });

  const handleTabChange = (tab: "pipeline" | "mrs" | "rfqs" | "pos" | "vendors") => {
    setActiveTab(tab);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("tab", tab);
      window.history.replaceState({}, "", url.toString());
    }
  };

  const handleAcknowledgePo = async (poId: number) => {
    try {
      await acknowledgePo.mutateAsync(poId);
      toast({ title: "PO Acknowledged", description: "Vendor has confirmed order acceptance." });
    } catch (err: any) {
      toast({ title: "Failed", description: err.message, variant: "destructive" });
    }
  };

  const handleReceivePo = async (poId: number) => {
    try {
      await receivePo.mutateAsync(poId);
      toast({ title: "Material Arrived at Site", description: "Ready for Quality Inspection." });
    } catch (err: any) {
      toast({ title: "Failed", description: err.message, variant: "destructive" });
    }
  };

  // Filtered lists
  const filteredMrs = useMemo(() => {
    if (!mrs) return [];
    const q = searchQuery.toLowerCase();
    return mrs.filter((m: any) =>
      (m.title || "").toLowerCase().includes(q) ||
      (m.projectName || "").toLowerCase().includes(q)
    );
  }, [mrs, searchQuery]);

  const filteredRfqs = useMemo(() => {
    if (!rfqs) return [];
    const q = searchQuery.toLowerCase();
    return rfqs.filter((r: any) =>
      (r.title || "").toLowerCase().includes(q) ||
      (r.projectName || "").toLowerCase().includes(q)
    );
  }, [rfqs, searchQuery]);

  const filteredPos = useMemo(() => {
    if (!pos) return [];
    const q = searchQuery.toLowerCase();
    return pos.filter((p: any) =>
      (p.poNumber || "").toLowerCase().includes(q) ||
      (p.vendorName || "").toLowerCase().includes(q) ||
      (p.projectName || "").toLowerCase().includes(q)
    );
  }, [pos, searchQuery]);

  const totalPoValue = useMemo(() => {
    if (!pos) return 0;
    return pos.reduce((acc: number, p: any) => acc + Number(p.totalAmount || 0), 0);
  }, [pos]);

  return (
    <div className="space-y-6">
      {/* ── Top Header ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="outline" className="text-xs bg-blue-50/60 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200">
              Procurement Module • Track 1
            </Badge>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Purchasing & Purchase Orders</h1>
          <p className="text-muted-foreground text-sm">
            Material indents, RFQ vendor quotes comparison, purchase order dispatches, shipping tracking, and site inspection (GRN).
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <NewMaterialRequestDialog
            trigger={
              <Button size="sm" variant="outline" className="gap-1.5">
                <Plus className="w-4 h-4" /> New Indent / Request
              </Button>
            }
          />
          <NewPurchaseOrderDialog
            trigger={
              <Button size="sm" className="gap-1.5 bg-blue-600 hover:bg-blue-700 text-white shadow-sm">
                <Plus className="w-4 h-4" /> Create PO
              </Button>
            }
          />
        </div>
      </div>

      {/* Sub-Navigation Links */}
      <ProcurementSubNav />

      {/* ── KPI Metric Deck ── */}
      <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-5">
        <Card className="border-l-4 border-l-blue-500 shadow-sm bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-1.5 pt-3.5 px-4">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">Requisitions (MRs)</CardTitle>
            <Clock className="w-4 h-4 text-blue-500" />
          </CardHeader>
          <CardContent className="px-4 pb-3.5 space-y-1">
            <div className="text-xl font-bold font-mono">
              {mrs?.filter((m: any) => m.status === "pending" || m.status === "approved").length || 0} Active
            </div>
            <p className="text-[11px] text-muted-foreground">
              {mrs?.filter((m: any) => m.status === "pending").length || 0} pending manager review
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500 shadow-sm bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-1.5 pt-3.5 px-4">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">Active RFQs</CardTitle>
            <FileCheck className="w-4 h-4 text-purple-500" />
          </CardHeader>
          <CardContent className="px-4 pb-3.5 space-y-1">
            <div className="text-xl font-bold font-mono text-purple-600 dark:text-purple-400">
              {rfqs?.filter((r: any) => r.status !== "po_created").length || 0} RFQs
            </div>
            <p className="text-[11px] text-muted-foreground">
              Inquiries dispatched & awaiting quotes
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-indigo-500 shadow-sm bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-1.5 pt-3.5 px-4">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">Total Committed POs</CardTitle>
            <Receipt className="w-4 h-4 text-indigo-500" />
          </CardHeader>
          <CardContent className="px-4 pb-3.5 space-y-1">
            <div className="text-xl font-bold font-mono text-indigo-600 dark:text-indigo-400">
              {formatINR(totalPoValue)}
            </div>
            <p className="text-[11px] text-muted-foreground">
              Across {pos?.length || 0} Purchase Orders
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-amber-500 shadow-sm bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-1.5 pt-3.5 px-4">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">In-Transit / Site QC</CardTitle>
            <Truck className="w-4 h-4 text-amber-500" />
          </CardHeader>
          <CardContent className="px-4 pb-3.5 space-y-1">
            <div className="text-xl font-bold font-mono text-amber-600">
              {pos?.filter((p: any) => ["in_transit", "received"].includes(p.status)).length || 0} POs
            </div>
            <p className="text-[11px] text-muted-foreground">
              Shipments in transit or at gate
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-emerald-500 shadow-sm bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-1.5 pt-3.5 px-4">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">Approved Vendors</CardTitle>
            <Building2 className="w-4 h-4 text-emerald-500" />
          </CardHeader>
          <CardContent className="px-4 pb-3.5 space-y-1">
            <div className="text-xl font-bold font-mono text-emerald-600">
              {vendors?.length || 0} Vendors
            </div>
            <p className="text-[11px] text-muted-foreground">
              Commercial partners active in network
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ── Main Tabbed Interface ── */}
      <Tabs value={activeTab} onValueChange={(val) => handleTabChange(val as any)} className="space-y-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pb-1 border-b">
          <TabsList className="bg-muted/70 p-1 rounded-xl border border-border/80 flex-wrap h-auto gap-1">
            <TabsTrigger value="pipeline" className="gap-1.5 font-medium">
              <RefreshCw className="w-4 h-4" /> Purchasing Pipeline
            </TabsTrigger>
            <TabsTrigger value="mrs" className="gap-1.5 font-medium">
              <FileCheck className="w-4 h-4" /> Indents / MRs
              <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0 font-mono font-semibold">{mrs?.length || 0}</Badge>
            </TabsTrigger>
            <TabsTrigger value="rfqs" className="gap-1.5 font-medium">
              <Send className="w-4 h-4" /> RFQs & Quotes
              <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0 font-mono font-semibold">{rfqs?.length || 0}</Badge>
            </TabsTrigger>
            <TabsTrigger value="pos" className="gap-1.5 font-medium">
              <ShoppingCart className="w-4 h-4" /> Purchase Orders
              <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0 font-mono font-semibold">{pos?.length || 0}</Badge>
            </TabsTrigger>
            <TabsTrigger value="vendors" className="gap-1.5 font-medium">
              <Building2 className="w-4 h-4" /> Vendors Directory
              <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0 font-mono font-semibold">{vendors?.length || 0}</Badge>
            </TabsTrigger>
          </TabsList>

          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
            <Input
              placeholder="Search orders, indents, vendors..."
              className="pl-8 h-8 text-xs bg-background"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════════
            TAB 1: PURCHASING PIPELINE (KANBAN / STEP BOARD)
        ══════════════════════════════════════════════════════════════════ */}
        <TabsContent value="pipeline" className="space-y-4">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Visual 6-stage lifecycle tracking: Requisition Review &rarr; RFQ Sourcing &rarr; Quote Comparison &rarr; In-Transit &rarr; QC Inspection &rarr; Stocked.</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-6 gap-3 items-start">
            {/* Step 1: Requisitions Pending Approval */}
            <div className="bg-muted/40 rounded-lg p-3 border space-y-2">
              <div className="flex justify-between items-center border-b pb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  1. Indent Review
                </span>
                <Badge variant="secondary" className="text-xs font-mono">
                  {mrs?.filter((m: any) => m.status === "pending").length || 0}
                </Badge>
              </div>
              <div className="space-y-2 min-h-[200px]">
                {mrs?.filter((m: any) => m.status === "pending").map((mr: any) => (
                  <Card key={mr.id} className="p-3 text-xs shadow-sm border-l-2 border-l-amber-500">
                    <div className="font-semibold text-sm">{mr.title}</div>
                    <div className="text-muted-foreground mt-0.5">{mr.projectName}</div>
                    <div className="flex justify-between items-center mt-2 pt-2 border-t font-mono">
                      <span>{mr.quantity} {mr.unit}</span>
                      <Badge variant="outline" className="text-[10px] capitalize">{mr.priority || "medium"}</Badge>
                    </div>
                    <div className="flex gap-1.5 mt-2.5">
                      <Button
                        size="sm"
                        variant="default"
                        className="h-7 text-xs flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                        onClick={() => {
                          setApproveRejectMr(mr);
                          setApproveMode("approve");
                        }}
                      >
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs flex-1 text-rose-600 border-rose-200"
                        onClick={() => {
                          setApproveRejectMr(mr);
                          setApproveMode("reject");
                        }}
                      >
                        Reject
                      </Button>
                    </div>
                  </Card>
                ))}
                {mrs?.filter((m: any) => m.status === "pending").length === 0 && (
                  <p className="text-[11px] text-muted-foreground text-center py-4 border border-dashed rounded">
                    No pending indents
                  </p>
                )}
              </div>
            </div>

            {/* Step 2: Approved MRs & RFQ Sourcing */}
            <div className="bg-muted/40 rounded-lg p-3 border space-y-2">
              <div className="flex justify-between items-center border-b pb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  2. Sourcing / RFQ
                </span>
                <Badge variant="secondary" className="text-xs font-mono">
                  {mrs?.filter((m: any) => m.status === "approved").length || 0}
                </Badge>
              </div>
              <div className="space-y-2 min-h-[200px]">
                {mrs?.filter((m: any) => m.status === "approved").map((mr: any) => (
                  <Card key={mr.id} className="p-3 text-xs shadow-sm border-l-2 border-l-blue-500">
                    <div className="font-semibold">{mr.title}</div>
                    <div className="text-muted-foreground">{mr.projectName}</div>
                    <div className="mt-1 text-[11px] text-emerald-600 font-medium">✓ Approved for RFQ</div>
                    <div className="mt-2.5">
                      <NewRfqDialog
                        defaultMrId={mr.id}
                        defaultProjectId={mr.projectId}
                        defaultTitle={mr.title}
                        trigger={
                          <Button size="sm" className="w-full h-7 text-xs gap-1 bg-blue-600 hover:bg-blue-700 text-white">
                            <Send className="w-3 h-3" /> Create RFQ
                          </Button>
                        }
                      />
                    </div>
                  </Card>
                ))}
                {mrs?.filter((m: any) => m.status === "approved").length === 0 && (
                  <p className="text-[11px] text-muted-foreground text-center py-4 border border-dashed rounded">
                    No RFQs pending
                  </p>
                )}
              </div>
            </div>

            {/* Step 3: Quotation Comparison */}
            <div className="bg-muted/40 rounded-lg p-3 border space-y-2">
              <div className="flex justify-between items-center border-b pb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  3. Compare Quotes
                </span>
                <Badge variant="secondary" className="text-xs font-mono">
                  {rfqs?.filter((r: any) => r.status === "quotes_received" || r.status === "sent").length || 0}
                </Badge>
              </div>
              <div className="space-y-2 min-h-[200px]">
                {rfqs?.filter((r: any) => r.status === "quotes_received" || r.status === "sent").map((rfq: any) => (
                  <Card key={rfq.id} className="p-3 text-xs shadow-sm border-l-2 border-l-purple-500">
                    <div className="font-semibold">{rfq.title}</div>
                    <div className="text-muted-foreground">{rfq.projectName}</div>
                    <Badge variant="outline" className="mt-1 capitalize text-[10px]">{rfq.status.replace("_", " ")}</Badge>
                    <div className="mt-2.5">
                      <Button
                        size="sm"
                        variant="default"
                        className="w-full h-7 text-xs gap-1 bg-purple-600 hover:bg-purple-700 text-white"
                        onClick={async () => {
                          const res = await fetch(`/api/rfqs/${rfq.id}`);
                          const detail = await res.json();
                          setSelectedRfqForComparison(detail);
                        }}
                      >
                        <FileCheck className="w-3 h-3" /> Compare & Award
                      </Button>
                    </div>
                  </Card>
                ))}
                {rfqs?.filter((r: any) => r.status === "quotes_received" || r.status === "sent").length === 0 && (
                  <p className="text-[11px] text-muted-foreground text-center py-4 border border-dashed rounded">
                    No open RFQs
                  </p>
                )}
              </div>
            </div>

            {/* Step 4: PO & In-Transit Tracking */}
            <div className="bg-muted/40 rounded-lg p-3 border space-y-2">
              <div className="flex justify-between items-center border-b pb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  4. Shipped / Transit
                </span>
                <Badge variant="secondary" className="text-xs font-mono">
                  {pos?.filter((p: any) => ["issued", "acknowledged", "in_transit"].includes(p.status)).length || 0}
                </Badge>
              </div>
              <div className="space-y-2 min-h-[200px]">
                {pos?.filter((p: any) => ["issued", "acknowledged", "in_transit"].includes(p.status)).map((po: any) => (
                  <Card key={po.id} className="p-3 text-xs shadow-sm border-l-2 border-l-indigo-500 space-y-1.5">
                    <div className="font-mono font-bold">{po.poNumber}</div>
                    <div className="text-muted-foreground">{po.vendorName}</div>
                    <div className="font-mono font-semibold">{formatINR(po.totalAmount)}</div>
                    <div className="flex justify-between items-center">
                      <Badge variant="outline" className="text-[10px] capitalize">{po.status.replace("_", " ")}</Badge>
                      {po.followUpCount > 0 && (
                        <span className="text-[10px] text-amber-600">Follow-ups: {po.followUpCount}</span>
                      )}
                    </div>
                    <div className="flex gap-1 pt-1">
                      {po.status === "issued" && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full h-7 text-[11px]"
                          onClick={() => handleAcknowledgePo(po.id)}
                        >
                          Vendor Confirm
                        </Button>
                      )}
                      {po.status === "acknowledged" && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full h-7 text-[11px] gap-1"
                          onClick={() => setSelectedPoForTracking(po)}
                        >
                          <Truck className="w-3 h-3" /> Track Dispatch
                        </Button>
                      )}
                      {po.status === "in_transit" && (
                        <Button
                          size="sm"
                          variant="default"
                          className="w-full h-7 text-[11px] bg-indigo-600 hover:bg-indigo-700 text-white"
                          onClick={() => handleReceivePo(po.id)}
                        >
                          Arrived on Site
                        </Button>
                      )}
                    </div>
                  </Card>
                ))}
                {pos?.filter((p: any) => ["issued", "acknowledged", "in_transit"].includes(p.status)).length === 0 && (
                  <p className="text-[11px] text-muted-foreground text-center py-4 border border-dashed rounded">
                    No shipments in transit
                  </p>
                )}
              </div>
            </div>

            {/* Step 5: Site Inspection (QC) */}
            <div className="bg-muted/40 rounded-lg p-3 border space-y-2">
              <div className="flex justify-between items-center border-b pb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  5. Site QC & GRN
                </span>
                <Badge variant="secondary" className="text-xs font-mono">
                  {pos?.filter((p: any) => ["received", "rejected_and_returned"].includes(p.status)).length || 0}
                </Badge>
              </div>
              <div className="space-y-2 min-h-[200px]">
                {pos?.filter((p: any) => p.status === "received").map((po: any) => (
                  <Card key={po.id} className="p-3 text-xs shadow-sm border-l-2 border-l-purple-500 space-y-2">
                    <div className="font-mono font-bold">{po.poNumber}</div>
                    <div className="text-muted-foreground">{po.projectName}</div>
                    <div className="text-[11px] text-purple-600 font-medium">Delivered at gate. Pending QC.</div>
                    <Button
                      size="sm"
                      className="w-full h-7 text-xs gap-1 bg-purple-600 hover:bg-purple-700 text-white"
                      onClick={() => setSelectedPoForInspection(po)}
                    >
                      <ShieldCheck className="w-3.5 h-3.5" /> Inspect Material
                    </Button>
                  </Card>
                ))}
                {pos?.filter((p: any) => p.status === "rejected_and_returned").map((po: any) => (
                  <Card key={po.id} className="p-3 text-xs shadow-sm border-l-2 border-l-rose-500 bg-rose-50/20 dark:bg-rose-950/20 space-y-1.5">
                    <div className="flex justify-between items-start">
                      <div className="font-mono font-bold text-rose-600">{po.poNumber}</div>
                      <Badge variant="destructive" className="text-[10px]">QC Rejected</Badge>
                    </div>
                    <div className="text-muted-foreground text-[11px]">{po.projectName}</div>
                    <NewRfqDialog
                      trigger={
                        <Button
                          size="sm"
                          variant="destructive"
                          className="w-full h-7 text-xs gap-1.5 mt-1"
                        >
                          <RefreshCw className="w-3 h-3" /> Re-Order / RFQ
                        </Button>
                      }
                      defaultProjectId={po.projectId}
                      defaultTitle={`Replacement for ${po.description || po.poNumber}`}
                    />
                  </Card>
                ))}
                {pos?.filter((p: any) => ["received", "rejected_and_returned"].includes(p.status)).length === 0 && (
                  <p className="text-[11px] text-muted-foreground text-center py-4 border border-dashed rounded">
                    No pending inspections
                  </p>
                )}
              </div>
            </div>

            {/* Step 6: Fulfilled, Stocked & Costs Updated */}
            <div className="bg-muted/40 rounded-lg p-3 border space-y-2">
              <div className="flex justify-between items-center border-b pb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  6. Delivered & GRN
                </span>
                <Badge variant="secondary" className="text-xs font-mono">
                  {pos?.filter((p: any) => p.status === "delivered").length || 0}
                </Badge>
              </div>
              <div className="space-y-2 min-h-[200px]">
                {pos?.filter((p: any) => p.status === "delivered").slice(0, 4).map((po: any) => (
                  <Card key={po.id} className="p-3 text-xs shadow-sm border-l-2 border-l-emerald-500 space-y-1">
                    <div className="font-mono font-bold text-emerald-600">{po.poNumber}</div>
                    <div className="text-muted-foreground truncate">{po.vendorName}</div>
                    <div className="text-[11px] font-mono">GRN: {po.grnNumber || "GRN-ISSUED"}</div>
                    <div className="text-[11px] text-emerald-600 flex items-center gap-1 font-medium pt-1">
                      <CheckCircle2 className="w-3 h-3" /> QC Passed & Stocked
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </TabsContent>

        {/* ══════════════════════════════════════════════════════════════════
            TAB 2: MATERIAL REQUESTS (INDENTS)
        ══════════════════════════════════════════════════════════════════ */}
        <TabsContent value="mrs" className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-lg font-semibold">Material Requests (Site Indents)</h2>
              <p className="text-xs text-muted-foreground">Engineering team indents requiring manager authorization before raising vendor RFQs.</p>
            </div>
            <NewMaterialRequestDialog
              trigger={
                <Button size="sm" className="gap-1.5"><Plus className="w-4 h-4" /> New Indent</Button>
              }
            />
          </div>
          <div className="rounded-md border bg-card overflow-x-auto text-sm">
            <table className="w-full text-left">
              <thead className="bg-muted/50 text-muted-foreground border-b text-xs uppercase font-medium">
                <tr>
                  <th className="px-4 py-3">Title</th>
                  <th className="px-4 py-3">Project</th>
                  <th className="px-4 py-3">Priority</th>
                  <th className="px-4 py-3 text-right">Quantity</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredMrs.map((mr: any) => {
                  const meta = MR_STATUS[mr.status] ?? { label: mr.status, variant: "outline" as const };
                  return (
                    <tr key={mr.id} className="hover:bg-accent/40 transition-colors">
                      <td className="px-4 py-3 font-medium">
                        {mr.title}
                        {mr.rejectionReason && (
                          <p className="text-xs text-rose-600 mt-0.5">Reason: {mr.rejectionReason}</p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{mr.projectName}</td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className="capitalize text-xs">{mr.priority || "medium"}</Badge>
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-bold">
                        {mr.quantity} {mr.unit}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={meta.variant}>{meta.label}</Badge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-1.5">
                          {mr.status === "pending" && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs text-emerald-600 border-emerald-300"
                                onClick={() => {
                                  setApproveRejectMr(mr);
                                  setApproveMode("approve");
                                }}
                              >
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs text-rose-600 border-rose-300"
                                onClick={() => {
                                  setApproveRejectMr(mr);
                                  setApproveMode("reject");
                                }}
                              >
                                Reject
                              </Button>
                            </>
                          )}
                          {mr.status === "approved" && (
                            <NewRfqDialog
                              defaultMrId={mr.id}
                              defaultProjectId={mr.projectId}
                              defaultTitle={mr.title}
                              trigger={
                                <Button size="sm" className="h-7 text-xs gap-1 bg-blue-600 hover:bg-blue-700 text-white">
                                  <Send className="w-3 h-3" /> Raise RFQ
                                </Button>
                              }
                            />
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filteredMrs.length === 0 && !loadingMrs && (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground border-dashed border-t">No material requests found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </TabsContent>

        {/* ══════════════════════════════════════════════════════════════════
            TAB 3: RFQS & QUOTATIONS
        ══════════════════════════════════════════════════════════════════ */}
        <TabsContent value="rfqs" className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-lg font-semibold">Requests for Quotation (RFQs)</h2>
              <p className="text-xs text-muted-foreground">Inquiries sent to vendors, bidding price sheets, and L1 quote selection.</p>
            </div>
            <NewRfqDialog
              trigger={
                <Button size="sm" className="gap-1.5"><Plus className="w-4 h-4" /> Create RFQ</Button>
              }
            />
          </div>
          <div className="rounded-md border bg-card overflow-x-auto text-sm">
            <table className="w-full text-left">
              <thead className="bg-muted/50 text-muted-foreground border-b text-xs uppercase font-medium">
                <tr>
                  <th className="px-4 py-3">Title</th>
                  <th className="px-4 py-3">Project</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Created</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredRfqs.map((rfq: any) => (
                  <tr key={rfq.id} className="hover:bg-accent/40 transition-colors">
                    <td className="px-4 py-3 font-medium">{rfq.title}</td>
                    <td className="px-4 py-3">{rfq.projectName}</td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className="capitalize">{rfq.status.replace("_", " ")}</Badge>
                    </td>
                    <td className="px-4 py-3 text-right text-muted-foreground">
                      {format(new Date(rfq.createdAt), "MMM d, yyyy")}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs gap-1 border-purple-300 dark:border-purple-800 hover:bg-purple-50 dark:hover:bg-purple-950/30"
                          onClick={() => setSelectedRfqForAddQuote(rfq)}
                        >
                          <Plus className="w-3.5 h-3.5 text-purple-600" /> + Quote
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs gap-1.5"
                          onClick={async () => {
                            const res = await fetch(`/api/rfqs/${rfq.id}`);
                            const detail = await res.json();
                            setSelectedRfqForComparison(detail);
                          }}
                        >
                          <FileCheck className="w-3.5 h-3.5" /> Review Quotes
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredRfqs.length === 0 && !loadingRfqs && (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground border-dashed border-t">No RFQs found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </TabsContent>

        {/* ══════════════════════════════════════════════════════════════════
            TAB 4: PURCHASE ORDERS REGISTER
        ══════════════════════════════════════════════════════════════════ */}
        <TabsContent value="pos" className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-lg font-semibold">Purchase Orders Register</h2>
              <p className="text-xs text-muted-foreground">Contractually binding POs issued to suppliers with delivery and QC tracking.</p>
            </div>
            <NewPurchaseOrderDialog
              trigger={
                <Button size="sm" className="gap-1.5"><Plus className="w-4 h-4" /> Create PO</Button>
              }
            />
          </div>
          <div className="rounded-md border bg-card overflow-x-auto text-sm">
            <table className="w-full text-left">
              <thead className="bg-muted/50 text-muted-foreground border-b text-xs uppercase font-medium">
                <tr>
                  <th className="px-4 py-3">PO Number</th>
                  <th className="px-4 py-3">Vendor</th>
                  <th className="px-4 py-3">Project</th>
                  <th className="px-4 py-3 text-right">Total Amount</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Inspection Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredPos.map((po: any) => {
                  const meta = PO_STATUS[po.status] || { label: po.status, color: "bg-gray-500" };
                  return (
                    <tr key={po.id} className="hover:bg-accent/40 transition-colors">
                      <td className="px-4 py-3 font-mono font-medium text-blue-600">{po.poNumber}</td>
                      <td className="px-4 py-3 font-medium">{po.vendorName}</td>
                      <td className="px-4 py-3 text-muted-foreground">{po.projectName}</td>
                      <td className="px-4 py-3 text-right font-mono font-bold">
                        {formatINR(po.totalAmount)}
                      </td>
                      <td className="px-4 py-3">
                        <Badge className={`${meta.color} text-white capitalize`}>{meta.label}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          variant={
                            po.inspectionStatus === "passed"
                              ? "default"
                              : po.inspectionStatus === "failed"
                                ? "destructive"
                                : "outline"
                          }
                          className="capitalize"
                        >
                          {po.inspectionStatus || "Pending"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-1.5">
                          {po.status === "issued" && (
                            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => handleAcknowledgePo(po.id)}>
                              Confirm
                            </Button>
                          )}
                          {po.status === "acknowledged" && (
                            <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => setSelectedPoForTracking(po)}>
                              <Truck className="w-3.5 h-3.5" /> Track
                            </Button>
                          )}
                          {po.status === "in_transit" && (
                            <Button size="sm" variant="default" className="h-7 text-xs bg-indigo-600 hover:bg-indigo-700 text-white" onClick={() => handleReceivePo(po.id)}>
                              Receive
                            </Button>
                          )}
                          {po.status === "received" && (
                            <Button
                              size="sm"
                              className="h-7 text-xs gap-1 bg-purple-600 hover:bg-purple-700 text-white"
                              onClick={() => setSelectedPoForInspection(po)}
                            >
                              <ShieldCheck className="w-3.5 h-3.5" /> Inspect
                            </Button>
                          )}
                          {po.status === "rejected_and_returned" && (
                            <NewRfqDialog
                              trigger={
                                <Button size="sm" variant="destructive" className="h-7 text-xs gap-1">
                                  <RefreshCw className="w-3.5 h-3.5" /> Re-Order RFQ
                                </Button>
                              }
                              defaultProjectId={po.projectId}
                              defaultTitle={`Replacement for ${po.description || po.poNumber}`}
                            />
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filteredPos.length === 0 && !loadingPos && (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground border-dashed border-t">No purchase orders found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </TabsContent>

        {/* ══════════════════════════════════════════════════════════════════
            TAB 5: APPROVED VENDORS DIRECTORY
        ══════════════════════════════════════════════════════════════════ */}
        <TabsContent value="vendors" className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-lg font-semibold">Approved Vendors Directory</h2>
              <p className="text-xs text-muted-foreground">Certified trade suppliers, rating scores, categories, and direct contact details.</p>
            </div>
            <NewVendorDialog
              trigger={
                <Button size="sm" className="gap-1.5"><Plus className="w-4 h-4" /> Add Vendor</Button>
              }
            />
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {vendors?.map((vendor) => (
              <Card key={vendor.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base">{vendor.name}</CardTitle>
                    <Badge variant={vendor.status === "active" ? "default" : "secondary"}>{vendor.status}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="text-sm space-y-2">
                  <div className="text-xs text-muted-foreground">{vendor.category || "Uncategorized"}</div>
                  {vendor.contactPerson && <div className="font-medium text-xs">{vendor.contactPerson}</div>}
                  {vendor.email && <div className="text-xs text-muted-foreground">{vendor.email}</div>}
                  {vendor.phone && <div className="text-xs text-muted-foreground">{vendor.phone}</div>}
                  {vendor.rating > 0 && (
                    <div className="flex items-center gap-1 text-amber-500 pt-1">
                      <Star className="w-4 h-4 fill-current" />
                      <span className="font-medium text-xs">{vendor.rating.toFixed(1)}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* ── Dialog Modals ── */}
      <ApproveRejectMrDialog
        mr={approveRejectMr}
        open={!!approveRejectMr}
        onOpenChange={(op) => !op && setApproveRejectMr(null)}
        mode={approveMode}
      />

      <QuoteComparisonDialog
        rfq={selectedRfqForComparison}
        open={!!selectedRfqForComparison}
        onOpenChange={(op) => !op && setSelectedRfqForComparison(null)}
      />

      <AddQuotationDialog
        rfq={selectedRfqForAddQuote}
        open={!!selectedRfqForAddQuote}
        onOpenChange={(op) => !op && setSelectedRfqForAddQuote(null)}
      />

      <PoTrackingDialog
        po={selectedPoForTracking}
        open={!!selectedPoForTracking}
        onOpenChange={(op) => !op && setSelectedPoForTracking(null)}
      />

      <PoInspectionDialog
        po={selectedPoForInspection}
        open={!!selectedPoForInspection}
        onOpenChange={(op) => !op && setSelectedPoForInspection(null)}
      />
    </div>
  );
}

