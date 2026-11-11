import { useState } from "react";
import { Link } from "wouter";
import {
  useListVendors,
  useListPurchaseOrders,
  useListRfqs,
  useListMaterials,
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
  Warehouse,
  Building2,
  AlertTriangle,
  Truck,
  ArrowRightLeft,
  CheckCircle2,
  XCircle,
  FileCheck,
  Send,
  Eye,
  RefreshCw,
  Layers,
  ArrowDownToLine,
  ShieldCheck,
  Search,
  Filter,
  ChevronRight,
  ShoppingCart,
} from "lucide-react";
import { format } from "date-fns";
import { ProcurementSubNav } from "@/components/procurement/ProcurementSubNav";
import {
  NewVendorDialog,
  NewPurchaseOrderDialog,
  NewRfqDialog,
  NewMaterialDialog,
  NewMaterialRequestDialog,
} from "@/components/dialogs/procurement-dialogs";
import {
  NewStockTransferDialog,
  ApproveRejectMrDialog,
  QuoteComparisonDialog,
  AddQuotationDialog,
  PoTrackingDialog,
  PoInspectionDialog,
  LogConsumptionDialog,
} from "@/components/dialogs/procurement-flow-dialogs";
import {
  useGetStockMatrix,
  useListStockTransfers,
  useDispatchStockTransfer,
  useReceiveStockTransfer,
  useAcknowledgePo,
  useReceivePo,
  useSendRfq,
} from "@/hooks/use-procurement-flow";
import { useToast } from "@/hooks/use-toast";

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

export default function Procurement() {
  const { toast } = useToast();
  const { data: vendors, isLoading: loadingVendors } = useListVendors();
  const { data: pos, isLoading: loadingPos } = useListPurchaseOrders();
  const { data: rfqs, isLoading: loadingRfqs } = useListRfqs();
  const { data: materials, isLoading: loadingMaterials } = useListMaterials();
  const { data: mrs, isLoading: loadingMrs } = useListMaterialRequests();

  // Stock Management & Flow Hooks
  const { data: stockMatrix, isLoading: loadingMatrix } = useGetStockMatrix();
  const { data: transfers, isLoading: loadingTransfers } = useListStockTransfers();
  const dispatchTransfer = useDispatchStockTransfer();
  const receiveTransfer = useReceiveStockTransfer();
  const acknowledgePo = useAcknowledgePo();
  const receivePo = useReceivePo();
  const sendRfq = useSendRfq();

  // Modal States
  const [activeTab, setActiveTab] = useState(() => {
    if (typeof window !== "undefined") {
      const param = new URLSearchParams(window.location.search).get("tab");
      if (param && ["stock-matrix", "pipeline", "transfers", "mr", "rfqs", "pos", "materials", "vendors"].includes(param)) {
        return param;
      }
    }
    return "stock-matrix";
  });

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("tab", tab);
      window.history.replaceState({}, "", url.toString());
    }
  };

  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [selectedMaterialForTransfer, setSelectedMaterialForTransfer] = useState<string | undefined>();
  const [approveRejectMr, setApproveRejectMr] = useState<any | null>(null);
  const [approveMode, setApproveMode] = useState<"approve" | "reject">("approve");
  const [selectedRfqForComparison, setSelectedRfqForComparison] = useState<any | null>(null);
  const [selectedRfqForAddQuote, setSelectedRfqForAddQuote] = useState<any | null>(null);
  const [selectedPoForTracking, setSelectedPoForTracking] = useState<any | null>(null);
  const [selectedPoForInspection, setSelectedPoForInspection] = useState<any | null>(null);
  const [selectedMaterialForConsumption, setSelectedMaterialForConsumption] = useState<any | null>(null);

  // Filters
  const [stockSearch, setStockSearch] = useState("");
  const [stockFilterDeficitOnly, setStockFilterDeficitOnly] = useState(false);

  // Filtered Stock Matrix items
  const filteredStock = stockMatrix?.materials.filter((m) => {
    const matchName = m.materialName.toLowerCase().includes(stockSearch.toLowerCase());
    if (stockFilterDeficitOnly) {
      return matchName && m.toProcureQuantity > 0;
    }
    return matchName;
  });

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

  const handleSendRfq = async (rfqId: number) => {
    try {
      await sendRfq.mutateAsync({ id: rfqId });
      toast({ title: "RFQ Dispatched", description: "Inquiry sent to shortlisted vendors." });
    } catch (err: any) {
      toast({ title: "Failed", description: err.message, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      {/* ── Top Header ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Procurement & Stock Management</h1>
          <p className="text-muted-foreground">
            Multi-location stock tracking (In-House Warehouse vs. Project Sites) & end-to-end procurement lifecycle.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => {
              setSelectedMaterialForTransfer(undefined);
              setTransferDialogOpen(true);
            }}
          >
            <ArrowRightLeft className="w-4 h-4 text-sky-500" /> Transfer Stock
          </Button>
          <NewMaterialRequestDialog
            trigger={
              <Button size="sm" className="gap-2">
                <Plus className="w-4 h-4" /> New Material Request
              </Button>
            }
          />
        </div>
      </div>

      {/* Sub-Navigation Links */}
      <ProcurementSubNav />

      {/* ── KPI Metric Deck ── */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-l-4 border-l-blue-500 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">In-House Warehouse</CardTitle>
            <Warehouse className="w-4 h-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono">
              ₹{stockMatrix?.summary.totalInHouseValuation.toLocaleString("en-IN") || "0"}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Central godown inventory valuation</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-emerald-500 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Project Sites Stock</CardTitle>
            <Building2 className="w-4 h-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono">
              ₹{stockMatrix?.summary.totalSiteStockValuation.toLocaleString("en-IN") || "0"}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Materials physically deployed at sites</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-amber-500 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Material to Procure</CardTitle>
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono text-amber-600">
              {stockMatrix?.summary.itemsNeedingProcurement || 0} Items
            </div>
            <p className="text-xs text-muted-foreground mt-1">Net deficit after in-house allocation</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-indigo-500 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">In-Transit / QC Pending</CardTitle>
            <Truck className="w-4 h-4 text-indigo-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono">
              {pos?.filter((p: any) => ["in_transit", "received"].includes(p.status)).length || 0} POs
            </div>
            <p className="text-xs text-muted-foreground mt-1">Shipments on road or awaiting inspection</p>
          </CardContent>
        </Card>
      </div>

      {/* ── Sub-Module Quick Access Portals ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Purchasing & Orders Portal Card */}
        <Card className="border-l-4 border-l-blue-500 bg-gradient-to-br from-blue-50/40 via-card to-card dark:from-blue-950/20 shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border-blue-200">
                Dedicated Submenu • Track 1
              </Badge>
              <ShoppingCart className="w-5 h-5 text-blue-600" />
            </div>
            <CardTitle className="text-base mt-2">Purchasing, RFQs & Purchase Orders</CardTitle>
            <CardDescription className="text-xs">
              Site material requisitions (indents), vendor bidding price comparison, PO dispatch, and quality inspection (GRN).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 pt-1">
            <div className="grid grid-cols-3 gap-2 py-2 px-3 rounded-lg bg-background/80 border text-xs">
              <div>
                <span className="text-muted-foreground block text-[10px]">Indents</span>
                <span className="font-mono font-bold">{mrs?.length || 0} Requests</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[10px]">Active RFQs</span>
                <span className="font-mono font-bold text-purple-600">{rfqs?.length || 0} RFQs</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[10px]">In-Transit</span>
                <span className="font-mono font-bold text-amber-600">
                  {pos?.filter((p: any) => ["in_transit", "received"].includes(p.status)).length || 0} POs
                </span>
              </div>
            </div>
            <Link href="/procurement/orders">
              <Button size="sm" className="w-full gap-2 bg-blue-600 hover:bg-blue-700 text-white cursor-pointer shadow-sm">
                Open Purchasing & Orders Module <ChevronRight className="w-4 h-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Stock & Inventory Portal Card */}
        <Card className="border-l-4 border-l-emerald-500 bg-gradient-to-br from-emerald-50/40 via-card to-card dark:from-emerald-950/20 shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-200">
                Dedicated Submenu • Track 2
              </Badge>
              <Warehouse className="w-5 h-5 text-emerald-600" />
            </div>
            <CardTitle className="text-base mt-2">Stock & Inventory Management</CardTitle>
            <CardDescription className="text-xs">
              Central warehouse godowns vs project sites stock, inter-site material transfers, and consumption logging.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 pt-1">
            <div className="grid grid-cols-3 gap-2 py-2 px-3 rounded-lg bg-background/80 border text-xs">
              <div>
                <span className="text-muted-foreground block text-[10px]">Warehouse</span>
                <span className="font-mono font-bold">₹{stockMatrix?.summary.totalInHouseValuation.toLocaleString("en-IN") || "0"}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[10px]">Sites Stock</span>
                <span className="font-mono font-bold text-emerald-600">₹{stockMatrix?.summary.totalSiteStockValuation.toLocaleString("en-IN") || "0"}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[10px]">Transfers</span>
                <span className="font-mono font-bold text-sky-600">{transfers?.length || 0} Transfers</span>
              </div>
            </div>
            <Link href="/procurement/stock">
              <Button size="sm" className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer shadow-sm">
                Open Stock & Inventory Module <ChevronRight className="w-4 h-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* ── Main Tabbed Interface ── */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4">
        <TabsList className="flex-wrap h-auto bg-muted/70 p-1 rounded-xl border border-border/80 gap-1.5">
          <TabsTrigger value="stock-matrix" className="gap-2 font-medium">
            <Layers className="w-4 h-4" /> Stock & Deficit Matrix
          </TabsTrigger>
          <TabsTrigger value="pipeline" className="gap-2 font-medium">
            <RefreshCw className="w-4 h-4" /> Lifecycle Pipeline
          </TabsTrigger>
          <TabsTrigger value="transfers" className="gap-2 font-medium">
            <ArrowRightLeft className="w-4 h-4" /> Stock Transfers
            <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0 font-mono font-semibold">{transfers?.length || 0}</Badge>
          </TabsTrigger>
          <TabsTrigger value="mr" className="gap-2 font-medium">
            <FileCheck className="w-4 h-4" /> Material Requests
            <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0 font-mono font-semibold">{mrs?.length || 0}</Badge>
          </TabsTrigger>
          <TabsTrigger value="rfqs" className="gap-2 font-medium">
            <Send className="w-4 h-4" /> RFQs & Quotes
            <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0 font-mono font-semibold">{rfqs?.length || 0}</Badge>
          </TabsTrigger>
          <TabsTrigger value="pos" className="gap-2 font-medium">
            <ShoppingCart className="w-4 h-4" /> Purchase Orders
            <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0 font-mono font-semibold">{pos?.length || 0}</Badge>
          </TabsTrigger>
          <TabsTrigger value="materials" className="gap-2 font-medium">
            <Warehouse className="w-4 h-4" /> Site Inventory
          </TabsTrigger>
          <TabsTrigger value="vendors" className="gap-2 font-medium">
            <Building2 className="w-4 h-4" /> Vendors
            <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0 font-mono font-semibold">{vendors?.length || 0}</Badge>
          </TabsTrigger>
        </TabsList>

        {/* ══════════════════════════════════════════════════════════════════
            TAB 1: UNIFIED STOCK MATRIX & MATERIAL TO PROCURE
        ══════════════════════════════════════════════════════════════════ */}
        <TabsContent value="stock-matrix" className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <h2 className="text-xl font-semibold">Multi-Location Stock & Deficit Matrix</h2>
              <p className="text-sm text-muted-foreground">
                Compare In-House Central Warehouse stock with Project Site stocks to identify exact procurement needs.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-2.5 top-2.5 text-muted-foreground" />
                <Input
                  placeholder="Search materials..."
                  className="pl-8 h-9 text-xs w-48 sm:w-64"
                  value={stockSearch}
                  onChange={(e) => setStockSearch(e.target.value)}
                />
              </div>
              <Button
                variant={stockFilterDeficitOnly ? "default" : "outline"}
                size="sm"
                onClick={() => setStockFilterDeficitOnly(!stockFilterDeficitOnly)}
                className="gap-1.5 text-xs"
              >
                <Filter className="w-3.5 h-3.5" />
                {stockFilterDeficitOnly ? "Show All" : "Deficit Only"}
              </Button>
            </div>
          </div>

          <div className="rounded-md border bg-card overflow-hidden">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/60 text-muted-foreground border-b text-xs uppercase">
                <tr>
                  <th className="px-4 py-3 font-semibold">Material Item</th>
                  <th className="px-4 py-3 font-semibold text-right">In-House Stock (Warehouse)</th>
                  <th className="px-4 py-3 font-semibold text-right">Project Sites Stock</th>
                  <th className="px-4 py-3 font-semibold text-right">Total On Hand</th>
                  <th className="px-4 py-3 font-semibold text-right">Reorder Level</th>
                  <th className="px-4 py-3 font-semibold text-center">Material to Procure</th>
                  <th className="px-4 py-3 font-semibold text-right">Quick Action</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredStock?.map((item) => {
                  const hasDeficit = item.toProcureQuantity > 0;
                  const hasInHouse = item.inHouseStock > 0;
                  return (
                    <tr key={item.materialName} className="hover:bg-accent/40 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-semibold text-foreground">{item.materialName}</div>
                        <div className="text-xs text-muted-foreground">Unit: {item.unit}</div>
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-medium text-blue-600 dark:text-blue-400">
                        {item.inHouseStock} {item.unit}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="font-mono font-medium text-emerald-600 dark:text-emerald-400">
                          {item.siteStock} {item.unit}
                        </div>
                        {item.sites.length > 0 && (
                          <div className="text-xs text-muted-foreground">
                            Across {item.sites.length} site(s)
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-bold">
                        {item.totalOnHand} {item.unit}
                      </td>
                      <td className="px-4 py-3 text-right text-muted-foreground font-mono">
                        {item.reorderLevel} {item.unit}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {hasDeficit ? (
                          <Badge className="bg-amber-500 hover:bg-amber-600 text-white font-mono font-bold">
                            Deficit: {item.toProcureQuantity} {item.unit}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-emerald-600 border-emerald-300">
                            Sufficient Stock
                          </Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-1.5">
                          {hasInHouse && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 text-xs gap-1 border-blue-200 text-blue-700 hover:bg-blue-50 dark:border-blue-800 dark:text-blue-300"
                              onClick={() => {
                                setSelectedMaterialForTransfer(item.materialName);
                                setTransferDialogOpen(true);
                              }}
                            >
                              <ArrowRightLeft className="w-3.5 h-3.5" /> Transfer
                            </Button>
                          )}
                          <NewMaterialRequestDialog
                            defaultTitle={item.materialName}
                            trigger={
                              <Button
                                size="sm"
                                variant={hasDeficit ? "default" : "secondary"}
                                className="h-8 text-xs gap-1"
                              >
                                <Plus className="w-3.5 h-3.5" /> Procure
                              </Button>
                            }
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {(!filteredStock || filteredStock.length === 0) && !loadingMatrix && (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                      No materials found matching criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </TabsContent>

        {/* ══════════════════════════════════════════════════════════════════
            TAB 2: INTERACTIVE LIFECYCLE PIPELINE (KANBAN / STEP BOARD)
        ══════════════════════════════════════════════════════════════════ */}
        <TabsContent value="pipeline" className="space-y-4">
          <div>
            <h2 className="text-xl font-semibold">End-to-End Procurement Flow Pipeline</h2>
            <p className="text-sm text-muted-foreground">
              Live progression from Material Need Identification &rarr; Manager Approval &rarr; RFQ &rarr; PO &rarr; Quality Inspection &rarr; Stock Credited.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-6 gap-3 items-start">
            {/* Step 1: Requisitions Pending Approval */}
            <div className="bg-muted/40 rounded-lg p-3 border space-y-2">
              <div className="flex justify-between items-center border-b pb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  1. Requisition Review
                </span>
                <Badge variant="outline" className="text-xs font-mono">
                  {mrs?.filter((m: any) => m.status === "pending").length || 0}
                </Badge>
              </div>
              <div className="space-y-2 min-h-[220px]">
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
                        className="h-7 text-xs flex-1 bg-emerald-600 hover:bg-emerald-700"
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
              </div>
            </div>

            {/* Step 2: Approved MRs & RFQ Sourcing */}
            <div className="bg-muted/40 rounded-lg p-3 border space-y-2">
              <div className="flex justify-between items-center border-b pb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  2. Approved / Sourcing
                </span>
                <Badge variant="outline" className="text-xs font-mono">
                  {mrs?.filter((m: any) => m.status === "approved").length || 0}
                </Badge>
              </div>
              <div className="space-y-2 min-h-[220px]">
                {mrs?.filter((m: any) => m.status === "approved").map((mr: any) => (
                  <Card key={mr.id} className="p-3 text-xs shadow-sm border-l-2 border-l-blue-500">
                    <div className="font-semibold">{mr.title}</div>
                    <div className="text-muted-foreground">{mr.projectName}</div>
                    <div className="mt-1 text-[11px] text-emerald-600 font-medium">✓ Manager Approved</div>
                    <div className="mt-2.5">
                      <NewRfqDialog
                        defaultMrId={mr.id}
                        defaultProjectId={mr.projectId}
                        defaultTitle={mr.title}
                        trigger={
                          <Button size="sm" className="w-full h-7 text-xs gap-1">
                            <Send className="w-3 h-3" /> Create RFQ
                          </Button>
                        }
                      />
                    </div>
                  </Card>
                ))}
              </div>
            </div>

            {/* Step 3: Quotation Comparison */}
            <div className="bg-muted/40 rounded-lg p-3 border space-y-2">
              <div className="flex justify-between items-center border-b pb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  3. Compare Quotes
                </span>
                <Badge variant="outline" className="text-xs font-mono">
                  {rfqs?.filter((r: any) => r.status === "quotes_received" || r.status === "sent").length || 0}
                </Badge>
              </div>
              <div className="space-y-2 min-h-[220px]">
                {rfqs?.filter((r: any) => r.status === "quotes_received" || r.status === "sent").map((rfq: any) => (
                  <Card key={rfq.id} className="p-3 text-xs shadow-sm border-l-2 border-l-purple-500">
                    <div className="font-semibold">{rfq.title}</div>
                    <div className="text-muted-foreground">{rfq.projectName}</div>
                    <Badge variant="outline" className="mt-1 capitalize text-[10px]">{rfq.status.replace("_", " ")}</Badge>
                    <div className="mt-2.5">
                      <Button
                        size="sm"
                        variant="default"
                        className="w-full h-7 text-xs gap-1 bg-purple-600 hover:bg-purple-700"
                        onClick={async () => {
                          // Fetch RFQ detail with quotes
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
              </div>
            </div>

            {/* Step 4: PO & In-Transit Tracking */}
            <div className="bg-muted/40 rounded-lg p-3 border space-y-2">
              <div className="flex justify-between items-center border-b pb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  4. In-Transit / Shipped
                </span>
                <Badge variant="outline" className="text-xs font-mono">
                  {pos?.filter((p: any) => ["issued", "acknowledged", "in_transit"].includes(p.status)).length || 0}
                </Badge>
              </div>
              <div className="space-y-2 min-h-[220px]">
                {pos?.filter((p: any) => ["issued", "acknowledged", "in_transit"].includes(p.status)).map((po: any) => (
                  <Card key={po.id} className="p-3 text-xs shadow-sm border-l-2 border-l-indigo-500 space-y-1.5">
                    <div className="font-mono font-bold">{po.poNumber}</div>
                    <div className="text-muted-foreground">{po.vendorName}</div>
                    <div className="font-mono font-semibold">₹{Number(po.totalAmount).toLocaleString("en-IN")}</div>
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
                          <Truck className="w-3 h-3" /> Dispatch Tracking
                        </Button>
                      )}
                      {po.status === "in_transit" && (
                        <Button
                          size="sm"
                          variant="default"
                          className="w-full h-7 text-[11px] bg-indigo-600 hover:bg-indigo-700"
                          onClick={() => handleReceivePo(po.id)}
                        >
                          Arrived on Site
                        </Button>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            </div>

            {/* Step 5: Site Inspection (QC) */}
            <div className="bg-muted/40 rounded-lg p-3 border space-y-2">
              <div className="flex justify-between items-center border-b pb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  5. Site QC & Inspection
                </span>
                <Badge variant="outline" className="text-xs font-mono">
                  {pos?.filter((p: any) => ["received", "rejected_and_returned"].includes(p.status)).length || 0}
                </Badge>
              </div>
              <div className="space-y-2 min-h-[220px]">
                {pos?.filter((p: any) => p.status === "received").map((po: any) => (
                  <Card key={po.id} className="p-3 text-xs shadow-sm border-l-2 border-l-purple-500 space-y-2">
                    <div className="font-mono font-bold">{po.poNumber}</div>
                    <div className="text-muted-foreground">{po.projectName}</div>
                    <div className="text-[11px] text-purple-600 font-medium">Delivered at gate. Pending QC.</div>
                    <Button
                      size="sm"
                      className="w-full h-7 text-xs gap-1 bg-purple-600 hover:bg-purple-700"
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
                    {po.inspectionNotes && (
                      <p className="text-[10px] text-muted-foreground line-clamp-2 italic">
                        "{po.inspectionNotes}"
                      </p>
                    )}
                    <NewRfqDialog
                      trigger={
                        <Button
                          size="sm"
                          variant="destructive"
                          className="w-full h-7 text-xs gap-1.5 mt-1"
                        >
                          <RefreshCw className="w-3 h-3" /> Re-Order / New RFQ
                        </Button>
                      }
                      defaultProjectId={po.projectId}
                      defaultTitle={`Replacement for ${po.description || po.poNumber}`}
                    />
                  </Card>
                ))}
              </div>
            </div>

            {/* Step 6: Fulfilled, Stocked & Costs Updated */}
            <div className="bg-muted/40 rounded-lg p-3 border space-y-2">
              <div className="flex justify-between items-center border-b pb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  6. Stocked & Costed
                </span>
                <Badge variant="outline" className="text-xs font-mono">
                  {pos?.filter((p: any) => p.status === "delivered").length || 0}
                </Badge>
              </div>
              <div className="space-y-2 min-h-[220px]">
                {pos?.filter((p: any) => p.status === "delivered").slice(0, 3).map((po: any) => (
                  <Card key={po.id} className="p-3 text-xs shadow-sm border-l-2 border-l-emerald-500 space-y-1">
                    <div className="font-mono font-bold text-emerald-600">{po.poNumber}</div>
                    <div className="text-muted-foreground">{po.vendorName}</div>
                    <div className="text-[11px] font-mono">GRN: {po.grnNumber || "GRN-ISSUED"}</div>
                    <div className="text-[11px] text-emerald-600 flex items-center gap-1 font-medium pt-1">
                      <CheckCircle2 className="w-3 h-3" /> Stocked & Budget Booked
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </TabsContent>

        {/* ══════════════════════════════════════════════════════════════════
            TAB 3: STOCK TRANSFERS (WAREHOUSE <-> SITES)
        ══════════════════════════════════════════════════════════════════ */}
        <TabsContent value="transfers" className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-semibold">Internal Stock Transfers</h2>
              <p className="text-sm text-muted-foreground">
                Move materials between Central In-House Warehouse and Project Sites without purchasing.
              </p>
            </div>
            <Button
              size="sm"
              className="gap-2"
              onClick={() => {
                setSelectedMaterialForTransfer(undefined);
                setTransferDialogOpen(true);
              }}
            >
              <Plus className="w-4 h-4" /> New Transfer
            </Button>
          </div>

          <div className="rounded-md border bg-card">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/50 text-muted-foreground border-b text-xs uppercase">
                <tr>
                  <th className="px-4 py-3 font-medium">Transfer #</th>
                  <th className="px-4 py-3 font-medium">Material</th>
                  <th className="px-4 py-3 font-medium">From</th>
                  <th className="px-4 py-3 font-medium">Destination Project</th>
                  <th className="px-4 py-3 font-medium text-right">Quantity</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {transfers?.map((t) => (
                  <tr key={t.id} className="hover:bg-accent/40 transition-colors">
                    <td className="px-4 py-3 font-mono font-medium">{t.transferNumber}</td>
                    <td className="px-4 py-3 font-medium">{t.materialName}</td>
                    <td className="px-4 py-3 text-muted-foreground">{t.fromLocationName}</td>
                    <td className="px-4 py-3 font-semibold text-foreground">{t.toLocationName}</td>
                    <td className="px-4 py-3 text-right font-mono font-bold">
                      {t.quantity} {t.unit}
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        variant={
                          t.status === "received"
                            ? "default"
                            : t.status === "dispatched"
                              ? "secondary"
                              : "outline"
                        }
                        className="capitalize"
                      >
                        {t.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {t.status === "pending" && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs gap-1 text-sky-600 border-sky-300"
                          onClick={async () => {
                            await dispatchTransfer.mutateAsync(t.id);
                            toast({ title: "Dispatched", description: "Stock deducted from warehouse." });
                          }}
                        >
                          Dispatch
                        </Button>
                      )}
                      {t.status === "dispatched" && (
                        <Button
                          size="sm"
                          variant="default"
                          className="h-7 text-xs gap-1 bg-emerald-600 hover:bg-emerald-700"
                          onClick={async () => {
                            await receiveTransfer.mutateAsync(t.id);
                            toast({ title: "Received", description: "Stock credited to site." });
                          }}
                        >
                          Receive on Site
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
                {(!transfers || transfers.length === 0) && !loadingTransfers && (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                      No stock transfers recorded yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </TabsContent>

        {/* ══════════════════════════════════════════════════════════════════
            TAB 4: MATERIAL REQUESTS
        ══════════════════════════════════════════════════════════════════ */}
        <TabsContent value="mr" className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-semibold">Material Requests (Requisitions)</h2>
              <p className="text-sm text-muted-foreground">Identify material needs before raising RFQs.</p>
            </div>
            <NewMaterialRequestDialog
              trigger={
                <Button size="sm" className="gap-2"><Plus className="w-4 h-4" /> New Request</Button>
              }
            />
          </div>
          <div className="rounded-md border bg-card">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/50 text-muted-foreground border-b text-xs uppercase">
                <tr>
                  <th className="px-4 py-3 font-medium">Title</th>
                  <th className="px-4 py-3 font-medium">Project</th>
                  <th className="px-4 py-3 font-medium">Priority</th>
                  <th className="px-4 py-3 font-medium text-right">Quantity</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {mrs?.map((mr: any) => {
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
                                <Button size="sm" className="h-7 text-xs gap-1">
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
                {!mrs?.length && !loadingMrs && (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground border-dashed border-t">No material requests yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </TabsContent>

        {/* ══════════════════════════════════════════════════════════════════
            TAB 5: PURCHASE ORDERS
        ══════════════════════════════════════════════════════════════════ */}
        <TabsContent value="pos" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Purchase Orders</h2>
            <NewPurchaseOrderDialog
              trigger={
                <Button size="sm" className="gap-2"><Plus className="w-4 h-4" /> Create PO</Button>
              }
            />
          </div>
          <div className="rounded-md border bg-card">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/50 text-muted-foreground border-b text-xs uppercase">
                <tr>
                  <th className="px-4 py-3 font-medium">PO Number</th>
                  <th className="px-4 py-3 font-medium">Vendor</th>
                  <th className="px-4 py-3 font-medium">Project</th>
                  <th className="px-4 py-3 font-medium text-right">Total Amount</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Inspection Status</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {pos?.map((po: any) => {
                  const meta = PO_STATUS[po.status] || { label: po.status, color: "bg-gray-500" };
                  return (
                    <tr key={po.id} className="hover:bg-accent/40 transition-colors">
                      <td className="px-4 py-3 font-mono font-medium">{po.poNumber}</td>
                      <td className="px-4 py-3">{po.vendorName}</td>
                      <td className="px-4 py-3 text-muted-foreground">{po.projectName}</td>
                      <td className="px-4 py-3 text-right font-mono font-bold">
                        ₹{Number(po.totalAmount).toLocaleString("en-IN")}
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
                            <Button size="sm" variant="default" className="h-7 text-xs" onClick={() => handleReceivePo(po.id)}>
                              Receive
                            </Button>
                          )}
                          {po.status === "received" && (
                            <Button
                              size="sm"
                              className="h-7 text-xs gap-1 bg-purple-600 hover:bg-purple-700"
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
                {!pos?.length && !loadingPos && (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground border-dashed border-t">No purchase orders found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </TabsContent>

        {/* ══════════════════════════════════════════════════════════════════
            TAB 6: RFQS & QUOTATIONS
        ══════════════════════════════════════════════════════════════════ */}
        <TabsContent value="rfqs" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Requests for Quotation (RFQs)</h2>
            <NewRfqDialog
              trigger={
                <Button size="sm" className="gap-2"><Plus className="w-4 h-4" /> Create RFQ</Button>
              }
            />
          </div>
          <div className="rounded-md border bg-card">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/50 text-muted-foreground border-b text-xs uppercase">
                <tr>
                  <th className="px-4 py-3 font-medium">Title</th>
                  <th className="px-4 py-3 font-medium">Project</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium text-right">Created</th>
                  <th className="px-4 py-3 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {rfqs?.map((rfq: any) => (
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
                {!rfqs?.length && !loadingRfqs && (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground border-dashed border-t">No RFQs yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </TabsContent>

        {/* ══════════════════════════════════════════════════════════════════
            TAB 7: MATERIALS INVENTORY
        ══════════════════════════════════════════════════════════════════ */}
        <TabsContent value="materials" className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-semibold">Materials Inventory Stock</h2>
              <p className="text-sm text-muted-foreground">Track physical quantities, site consumption, and godown storage.</p>
            </div>
            <NewMaterialDialog
              trigger={
                <Button size="sm" className="gap-2"><Plus className="w-4 h-4" /> Add Material Item</Button>
              }
            />
          </div>
          <div className="rounded-md border bg-card">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/50 text-muted-foreground border-b text-xs uppercase">
                <tr>
                  <th className="px-4 py-3 font-medium">Material</th>
                  <th className="px-4 py-3 font-medium">Location</th>
                  <th className="px-4 py-3 font-medium text-right">On Hand</th>
                  <th className="px-4 py-3 font-medium text-right">Committed</th>
                  <th className="px-4 py-3 font-medium text-right">Consumed</th>
                  <th className="px-4 py-3 font-medium text-right">Min. Stock</th>
                  <th className="px-4 py-3 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {materials?.map((m: any) => {
                  const low = m.quantityOnHand <= m.minimumStock;
                  const isWarehouse = m.locationType === "warehouse" || !m.projectId;
                  return (
                    <tr key={m.id} className="hover:bg-accent/40 transition-colors">
                      <td className="px-4 py-3 font-medium">{m.name}</td>
                      <td className="px-4 py-3">
                        <Badge variant={isWarehouse ? "secondary" : "outline"} className="gap-1 text-xs">
                          {isWarehouse ? <Warehouse className="w-3 h-3 text-blue-500" /> : <Building2 className="w-3 h-3 text-emerald-500" />}
                          {m.projectName || "Central In-House Warehouse"}
                        </Badge>
                      </td>
                      <td className={`px-4 py-3 text-right font-mono font-bold ${low ? "text-rose-600" : ""}`}>
                        {m.quantityOnHand} {m.unit}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-muted-foreground">{m.quantityCommitted}</td>
                      <td className="px-4 py-3 text-right font-mono text-muted-foreground">{m.quantityConsumed}</td>
                      <td className="px-4 py-3 text-right font-mono text-muted-foreground">{m.minimumStock}</td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-xs text-muted-foreground hover:text-foreground"
                          onClick={() => setSelectedMaterialForConsumption(m)}
                        >
                          Log Usage
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </TabsContent>

        {/* ══════════════════════════════════════════════════════════════════
            TAB 8: VENDORS
        ══════════════════════════════════════════════════════════════════ */}
        <TabsContent value="vendors" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Approved Vendors Directory</h2>
            <NewVendorDialog
              trigger={
                <Button size="sm" className="gap-2"><Plus className="w-4 h-4" /> Add Vendor</Button>
              }
            />
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {vendors?.map((vendor) => (
              <Card key={vendor.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base">{vendor.name}</CardTitle>
                    <Badge variant={vendor.status === "active" ? "default" : "secondary"}>{vendor.status}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="text-sm space-y-2">
                  <div className="text-muted-foreground">{vendor.category || "Uncategorized"}</div>
                  {vendor.contactPerson && <div>{vendor.contactPerson}</div>}
                  {vendor.email && <div className="text-muted-foreground">{vendor.email}</div>}
                  {vendor.phone && <div className="text-muted-foreground">{vendor.phone}</div>}
                  {vendor.rating > 0 && (
                    <div className="flex items-center gap-1 text-amber-500 pt-1">
                      <Star className="w-4 h-4 fill-current" />
                      <span className="font-medium">{vendor.rating.toFixed(1)}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* ── Dialog Modals ── */}
      <NewStockTransferDialog
        open={transferDialogOpen}
        onOpenChange={setTransferDialogOpen}
        stockMatrix={stockMatrix}
        defaultMaterial={selectedMaterialForTransfer}
      />

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

      <LogConsumptionDialog
        material={selectedMaterialForConsumption}
        open={!!selectedMaterialForConsumption}
        onOpenChange={(op) => !op && setSelectedMaterialForConsumption(null)}
      />
    </div>
  );
}
