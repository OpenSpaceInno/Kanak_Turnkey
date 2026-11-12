import { useState } from "react";
import { Link } from "wouter";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  useGetDashboardSummary,
  useListPurchaseOrders,
  useListMaterialRequests,
  useListMaterials,
  useListVendors,
} from "@workspace/api-client-react";
import {
  ShoppingCart,
  Warehouse,
  Package,
  Building2,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  Plus,
  Truck,
  FileCheck,
  Check,
} from "lucide-react";
import { format } from "date-fns";

const INR = (v: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(v);

export function ProcurementCommandHub() {
  const { data: summary } = useGetDashboardSummary();
  const { data: purchaseOrders = [] } = useListPurchaseOrders();
  const { data: materialRequests = [] } = useListMaterialRequests();
  const { data: materials = [] } = useListMaterials();
  const { data: vendors = [] } = useListVendors();

  const [activeTab, setActiveTab] = useState("requests");

  const activePosCount = summary?.procurement?.activePos ?? purchaseOrders.length;
  const pendingRequestsCount = summary?.procurement?.pendingRequests ?? materialRequests.length;
  const lowStockCount = summary?.procurement?.lowStockMaterials ?? 0;

  const pendingRequests = materialRequests.filter((r: any) => r.status === "pending" || r.status === "submitted");

  return (
    <div className="space-y-6 w-full pb-10">
      {/* ── 1. Procurement Command Banner ── */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-teal-950 text-white rounded-2xl p-5 sm:p-6 border border-slate-800 shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-teal-500/20 text-teal-400 border border-teal-500/30">
                <ShoppingCart className="w-5 h-5" />
              </span>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
                Procurement & Supply Chain Command Hub
              </h1>
              <Badge variant="outline" className="text-xs bg-teal-500/20 text-teal-300 border-teal-400/30">
                Head of Procurement
              </Badge>
            </div>
            <p className="text-xs sm:text-sm text-slate-300">
              Site material requisitions, purchase order governance, inventory safety thresholds, and vendor fulfillment.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
            <Link href="/procurement/orders">
              <Button size="sm" className="bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl gap-1.5 cursor-pointer shadow-sm">
                <FileCheck className="w-4 h-4" /> Issue Purchase Order
              </Button>
            </Link>
            <Link href="/procurement/stock">
              <Button size="sm" variant="outline" className="bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700 rounded-xl gap-1.5">
                <Warehouse className="w-4 h-4 text-teal-400" /> Site Inventory
              </Button>
            </Link>
          </div>
        </div>

        {/* Live Supply Chain Stats Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3 mt-5 pt-4 border-t border-slate-700/60 text-xs">
          <div>
            <span className="text-slate-400 block text-[11px]">Active Purchase Orders</span>
            <span className="text-lg sm:text-xl font-bold text-white font-mono">
              {activePosCount}
            </span>
          </div>

          <div>
            <span className="text-slate-400 block text-[11px]">Pending Site Indents</span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className={`text-lg sm:text-xl font-extrabold font-mono ${pendingRequestsCount > 0 ? "text-amber-400" : "text-slate-300"}`}>
                {pendingRequestsCount}
              </span>
              {pendingRequestsCount > 0 && (
                <Badge variant="outline" className="text-[10px] bg-amber-500/20 text-amber-300 border-amber-500/40">
                  Action Required
                </Badge>
              )}
            </div>
          </div>

          <div>
            <span className="text-slate-400 block text-[11px]">Low-Stock Alerts</span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className={`text-lg sm:text-xl font-extrabold font-mono ${lowStockCount > 0 ? "text-rose-400" : "text-emerald-400"}`}>
                {lowStockCount}
              </span>
              {lowStockCount > 0 && (
                <Badge variant="outline" className="text-[10px] bg-rose-500/20 text-rose-300 border-rose-500/40">
                  Critical
                </Badge>
              )}
            </div>
          </div>

          <div>
            <span className="text-slate-400 block text-[11px]">Active Vendors</span>
            <span className="text-lg sm:text-xl font-bold text-teal-400 font-mono">
              {vendors.length}
            </span>
          </div>

          <div>
            <span className="text-slate-400 block text-[11px]">Catalog Items</span>
            <span className="text-lg sm:text-xl font-bold text-slate-200 font-mono">
              {materials.length}
            </span>
          </div>
        </div>
      </div>

      {/* ── 2. Operational Tabs ── */}
      <Card className="border shadow-sm">
        <CardHeader className="p-4 sm:p-5 pb-3 border-b">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Package className="w-5 h-5 text-teal-600" />
              <div>
                <CardTitle className="text-base sm:text-lg font-bold">
                  Material Operations & Order Fulfilment
                </CardTitle>
                <CardDescription className="text-xs">
                  Site requisition indents, vendor delivery tracking, and buffer safety management
                </CardDescription>
              </div>
            </div>

            <Badge variant="secondary" className="font-mono text-xs font-bold px-2.5 py-0.5 self-start sm:self-auto">
              {pendingRequests.length} Indents Pending PO
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="p-4 sm:p-5">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList className="bg-muted/70 p-1 rounded-xl border border-border/80 flex-wrap h-auto gap-1">
              <TabsTrigger value="requests" className="gap-1.5 text-xs font-bold">
                <Package className="w-3.5 h-3.5 text-amber-600" /> Pending Site Indents
                <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0 font-mono">
                  {materialRequests.length}
                </Badge>
              </TabsTrigger>

              <TabsTrigger value="orders" className="gap-1.5 text-xs font-bold">
                <Truck className="w-3.5 h-3.5 text-teal-600" /> Purchase Orders (POs)
                <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0 font-mono">
                  {purchaseOrders.length}
                </Badge>
              </TabsTrigger>

              <TabsTrigger value="stock" className="gap-1.5 text-xs font-bold">
                <Warehouse className="w-3.5 h-3.5 text-purple-600" /> Inventory & Stock Safety
              </TabsTrigger>

              <TabsTrigger value="vendors" className="gap-1.5 text-xs font-bold">
                <Building2 className="w-3.5 h-3.5 text-blue-600" /> Registered Vendors
                <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0 font-mono">
                  {vendors.length}
                </Badge>
              </TabsTrigger>
            </TabsList>

            {/* TAB 1: Site Material Requests (Indents) */}
            <TabsContent value="requests" className="space-y-3 pt-1">
              {materialRequests.length === 0 ? (
                <div className="p-8 text-center text-xs text-muted-foreground border border-dashed rounded-xl">
                  No site material indents currently pending.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {materialRequests.map((req: any) => (
                    <div
                      key={req.id}
                      className="p-4 rounded-xl border bg-card hover:border-teal-500/40 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-sm text-foreground">
                            {req.title || req.materialName || "Material Indent"}
                          </span>
                          <Badge
                            variant="outline"
                            className={`text-[10px] uppercase font-bold capitalize ${
                              req.status === "approved" || req.status === "fulfilled"
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : req.status === "rfq_sent"
                                ? "bg-blue-50 text-blue-700 border-blue-200"
                                : "bg-amber-50 text-amber-700 border-amber-200"
                            }`}
                          >
                            {req.status}
                          </Badge>
                          <span className="text-xs text-muted-foreground font-mono">
                            MR-{String(req.id).padStart(4, "0")}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Project: <span className="font-semibold text-foreground">{req.projectName || `Project #${req.projectId}`}</span> • Requested by: {req.createdByName || "Site Engineer"}
                        </p>
                      </div>

                      <div className="flex items-center gap-4 shrink-0">
                        <div className="text-right">
                          <span className="text-[11px] text-muted-foreground block">Required Quantity</span>
                          <span className="text-sm font-bold text-foreground font-mono text-teal-600">
                            {req.quantity} {req.unit || "Nos"}
                          </span>
                        </div>

                        <Link href="/procurement/orders">
                          <Button size="sm" className="h-8 text-xs gap-1 bg-teal-600 hover:bg-teal-700 text-white">
                            <span>Process PO</span>
                            <ArrowUpRight className="w-3.5 h-3.5" />
                          </Button>
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* TAB 2: Purchase Orders Tracking */}
            <TabsContent value="orders" className="space-y-3 pt-1">
              <div className="space-y-2.5">
                {purchaseOrders.map((po: any) => (
                  <div
                    key={po.id}
                    className="p-4 rounded-xl border bg-card hover:border-teal-500/40 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm text-foreground">{po.poNumber || `PO-${po.id}`}</span>
                        <Badge variant="outline" className="text-[10px] uppercase font-bold text-slate-700 bg-slate-50 border-slate-200">
                          {po.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Supplier: <span className="font-semibold text-foreground">{po.vendorName || "Vendor"}</span> • Project: {po.projectName || `Project #${po.projectId}`}
                      </p>
                    </div>

                    <div className="flex items-center gap-4 shrink-0">
                      <div className="text-right">
                        <span className="text-[11px] text-muted-foreground block">PO Amount</span>
                        <span className="text-sm font-bold text-foreground font-mono">
                          {INR(Number(po.totalAmount || 0))}
                        </span>
                      </div>
                      <Link href="/procurement/orders">
                        <Button size="sm" variant="outline" className="h-8 text-xs gap-1">
                          View Order
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>

            {/* TAB 3: Inventory & Stock */}
            <TabsContent value="stock" className="space-y-3 pt-1">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {materials.slice(0, 9).map((mat: any) => (
                  <Card key={mat.id} className="p-3.5 rounded-xl border bg-card">
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className="font-bold text-xs text-foreground truncate">{mat.name}</span>
                      <Badge variant="outline" className="text-[10px] capitalize">
                        {mat.category || "Civil"}
                      </Badge>
                    </div>
                    <div className="flex items-baseline justify-between text-xs mt-2">
                      <span className="text-muted-foreground">Unit: {mat.unit}</span>
                      <span className="font-bold font-mono text-sm text-teal-600">
                        {mat.quantity || 150} in stock
                      </span>
                    </div>
                  </Card>
                ))}
              </div>
            </TabsContent>

            {/* TAB 4: Registered Vendors */}
            <TabsContent value="vendors" className="space-y-3 pt-1">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {vendors.map((v: any) => (
                  <Card key={v.id} className="p-4 rounded-xl border bg-card">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-sm text-foreground truncate">{v.name}</span>
                      <Badge variant="secondary" className="text-[10px]">
                        ★ {v.rating ?? 4.5}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{v.category || "Materials & Supplies"}</p>
                    <p className="text-[11px] text-muted-foreground/80 mt-2 font-mono">
                      {v.contactPhone || v.contactEmail || "Verified Supplier"}
                    </p>
                  </Card>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

