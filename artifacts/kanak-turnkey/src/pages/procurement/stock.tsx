import { useState, useMemo } from "react";
import {
  useListMaterials,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Plus,
  Warehouse,
  Building2,
  AlertTriangle,
  ArrowRightLeft,
  CheckCircle2,
  Layers,
  Search,
  Filter,
  Package,
  Boxes,
  Truck,
  TrendingDown,
  History,
  ShoppingCart,
} from "lucide-react";
import {
  NewMaterialDialog,
  NewMaterialRequestDialog,
} from "@/components/dialogs/procurement-dialogs";
import {
  NewStockTransferDialog,
  LogConsumptionDialog,
} from "@/components/dialogs/procurement-flow-dialogs";
import {
  useGetStockMatrix,
  useListStockTransfers,
  useDispatchStockTransfer,
  useReceiveStockTransfer,
} from "@/hooks/use-procurement-flow";
import { useToast } from "@/hooks/use-toast";
import { ProcurementSubNav } from "@/components/procurement/ProcurementSubNav";

function formatINR(val: number | string | null | undefined): string {
  const n = Number(val || 0);
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);
}

export default function ProcurementStockPage() {
  const { toast } = useToast();
  const { data: materials, isLoading: loadingMaterials } = useListMaterials();

  // Stock Matrix & Transfer Hooks
  const { data: stockMatrix, isLoading: loadingMatrix } = useGetStockMatrix();
  const { data: transfers, isLoading: loadingTransfers } = useListStockTransfers();
  const dispatchTransfer = useDispatchStockTransfer();
  const receiveTransfer = useReceiveStockTransfer();

  // Modal States
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [selectedMaterialForTransfer, setSelectedMaterialForTransfer] = useState<string | undefined>();
  const [selectedMaterialForConsumption, setSelectedMaterialForConsumption] = useState<any | null>(null);

  // Filters
  const [stockSearch, setStockSearch] = useState("");
  const [stockFilterDeficitOnly, setStockFilterDeficitOnly] = useState(false);
  const [activeTab, setActiveTab] = useState<"matrix" | "transfers" | "inventory">(() => {
    if (typeof window !== "undefined") {
      const param = new URLSearchParams(window.location.search).get("tab");
      if (param && ["matrix", "transfers", "inventory"].includes(param)) {
        return param as any;
      }
    }
    return "matrix";
  });

  const handleTabChange = (tab: "matrix" | "transfers" | "inventory") => {
    setActiveTab(tab);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("tab", tab);
      window.history.replaceState({}, "", url.toString());
    }
  };

  // Filtered Stock Matrix items
  const filteredStock = useMemo(() => {
    if (!stockMatrix?.materials) return [];
    return stockMatrix.materials.filter((m) => {
      const matchName = m.materialName.toLowerCase().includes(stockSearch.toLowerCase());
      if (stockFilterDeficitOnly) {
        return matchName && m.toProcureQuantity > 0;
      }
      return matchName;
    });
  }, [stockMatrix, stockSearch, stockFilterDeficitOnly]);

  // Filtered physical materials catalog
  const filteredMaterials = useMemo(() => {
    if (!materials) return [];
    return materials.filter((m: any) =>
      (m.name || "").toLowerCase().includes(stockSearch.toLowerCase()) ||
      (m.projectName || "").toLowerCase().includes(stockSearch.toLowerCase())
    );
  }, [materials, stockSearch]);

  const lowStockCount = useMemo(() => {
    if (!materials) return 0;
    return materials.filter((m: any) => m.quantityOnHand <= m.minimumStock).length;
  }, [materials]);

  return (
    <div className="space-y-6">
      {/* ── Top Header ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="outline" className="text-xs bg-emerald-50/60 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200">
              Procurement Module • Track 2
            </Badge>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Stock & Inventory Management</h1>
          <p className="text-muted-foreground text-sm">
            Central In-House Warehouse godown vs Project Site stocks, inter-site material transfers, and consumption tracking.
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
          <NewMaterialDialog
            trigger={
              <Button size="sm" className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm">
                <Plus className="w-4 h-4" /> Add Material / SKU
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
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">Central Warehouse</CardTitle>
            <Warehouse className="w-4 h-4 text-blue-500" />
          </CardHeader>
          <CardContent className="px-4 pb-3.5 space-y-1">
            <div className="text-xl font-bold font-mono">
              {formatINR(stockMatrix?.summary.totalInHouseValuation)}
            </div>
            <p className="text-[11px] text-muted-foreground">In-house godown inventory valuation</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-emerald-500 shadow-sm bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-1.5 pt-3.5 px-4">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">Project Sites Stock</CardTitle>
            <Building2 className="w-4 h-4 text-emerald-500" />
          </CardHeader>
          <CardContent className="px-4 pb-3.5 space-y-1">
            <div className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
              {formatINR(stockMatrix?.summary.totalSiteStockValuation)}
            </div>
            <p className="text-[11px] text-muted-foreground">Physically deployed across all sites</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-amber-500 shadow-sm bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-1.5 pt-3.5 px-4">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">Items with Deficit</CardTitle>
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </CardHeader>
          <CardContent className="px-4 pb-3.5 space-y-1">
            <div className="text-xl font-bold font-mono text-amber-600">
              {stockMatrix?.summary.itemsNeedingProcurement || 0} Items
            </div>
            <p className="text-[11px] text-muted-foreground">Net shortage needing new PO</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-sky-500 shadow-sm bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-1.5 pt-3.5 px-4">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">Transfers In-Transit</CardTitle>
            <ArrowRightLeft className="w-4 h-4 text-sky-500" />
          </CardHeader>
          <CardContent className="px-4 pb-3.5 space-y-1">
            <div className="text-xl font-bold font-mono text-sky-600 dark:text-sky-400">
              {transfers?.filter((t) => t.status === "dispatched" || t.status === "pending").length || 0} Transfers
            </div>
            <p className="text-[11px] text-muted-foreground">Active moves between warehouse & sites</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-rose-500 shadow-sm bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-1.5 pt-3.5 px-4">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">Low Stock Alerts</CardTitle>
            <TrendingDown className="w-4 h-4 text-rose-500" />
          </CardHeader>
          <CardContent className="px-4 pb-3.5 space-y-1">
            <div className="text-xl font-bold font-mono text-rose-600">
              {lowStockCount} Items
            </div>
            <p className="text-[11px] text-muted-foreground">At or below reorder buffer</p>
          </CardContent>
        </Card>
      </div>

      {/* ── Main Tabbed Interface ── */}
      <Tabs value={activeTab} onValueChange={(val) => handleTabChange(val as any)} className="space-y-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pb-1 border-b">
          <TabsList className="bg-muted/70 p-1 rounded-xl border border-border/80 flex-wrap h-auto gap-1">
            <TabsTrigger value="matrix" className="gap-1.5 font-medium">
              <Layers className="w-4 h-4" /> Multi-Location Stock Matrix
            </TabsTrigger>
            <TabsTrigger value="transfers" className="gap-1.5 font-medium">
              <ArrowRightLeft className="w-4 h-4" /> Inter-Site Transfers
              <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0 font-mono font-semibold">{transfers?.length || 0}</Badge>
            </TabsTrigger>
            <TabsTrigger value="inventory" className="gap-1.5 font-medium">
              <Boxes className="w-4 h-4" /> Physical Inventory & Consumption
              <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0 font-mono font-semibold">{materials?.length || 0}</Badge>
            </TabsTrigger>
          </TabsList>

          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
            <Input
              placeholder="Search materials or sites..."
              className="pl-8 h-8 text-xs bg-background"
              value={stockSearch}
              onChange={(e) => setStockSearch(e.target.value)}
            />
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════════
            TAB 1: UNIFIED STOCK MATRIX & MATERIAL TO PROCURE
        ══════════════════════════════════════════════════════════════════ */}
        <TabsContent value="matrix" className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <h2 className="text-lg font-semibold">Multi-Location Stock & Deficit Matrix</h2>
              <p className="text-xs text-muted-foreground">
                Compare In-House Central Warehouse stock with Project Site stocks to identify exact transfer or procurement needs.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant={stockFilterDeficitOnly ? "default" : "outline"}
                size="sm"
                onClick={() => setStockFilterDeficitOnly(!stockFilterDeficitOnly)}
                className="gap-1.5 text-xs h-8"
              >
                <Filter className="w-3.5 h-3.5" />
                {stockFilterDeficitOnly ? "Show All" : "Deficit Only"}
              </Button>
            </div>
          </div>

          <div className="rounded-md border bg-card overflow-x-auto text-sm">
            <table className="w-full text-left">
              <thead className="bg-muted/60 text-muted-foreground border-b text-xs uppercase font-medium">
                <tr>
                  <th className="px-4 py-3">Material Item</th>
                  <th className="px-4 py-3 text-right">In-House Stock (Warehouse)</th>
                  <th className="px-4 py-3 text-right">Project Sites Stock</th>
                  <th className="px-4 py-3 text-right">Total On Hand</th>
                  <th className="px-4 py-3 text-right">Reorder Level</th>
                  <th className="px-4 py-3 text-center">Net Deficit</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredStock.map((item) => {
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
                          <div className="text-[11px] text-muted-foreground">
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
                          <Badge className="bg-amber-500 hover:bg-amber-600 text-white font-mono font-bold text-[11px]">
                            Deficit: {item.toProcureQuantity} {item.unit}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-emerald-600 border-emerald-300 text-[11px]">
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
                              className="h-7 text-xs gap-1 border-blue-200 text-blue-700 hover:bg-blue-50 dark:border-blue-800 dark:text-blue-300"
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
                                className="h-7 text-xs gap-1"
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
                {filteredStock.length === 0 && !loadingMatrix && (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground border-dashed border-t">
                      No materials found matching criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </TabsContent>

        {/* ══════════════════════════════════════════════════════════════════
            TAB 2: STOCK TRANSFERS (WAREHOUSE <-> SITES)
        ══════════════════════════════════════════════════════════════════ */}
        <TabsContent value="transfers" className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-lg font-semibold">Internal Stock Transfers Register</h2>
              <p className="text-xs text-muted-foreground">
                Move materials between Central In-House Warehouse and Project Sites without external purchasing.
              </p>
            </div>
            <Button
              size="sm"
              className="gap-1.5 bg-blue-600 hover:bg-blue-700 text-white"
              onClick={() => {
                setSelectedMaterialForTransfer(undefined);
                setTransferDialogOpen(true);
              }}
            >
              <Plus className="w-4 h-4" /> New Transfer
            </Button>
          </div>

          <div className="rounded-md border bg-card overflow-x-auto text-sm">
            <table className="w-full text-left">
              <thead className="bg-muted/50 text-muted-foreground border-b text-xs uppercase font-medium">
                <tr>
                  <th className="px-4 py-3">Transfer #</th>
                  <th className="px-4 py-3">Material</th>
                  <th className="px-4 py-3">From</th>
                  <th className="px-4 py-3">Destination Project</th>
                  <th className="px-4 py-3 text-right">Quantity</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {transfers?.map((t) => (
                  <tr key={t.id} className="hover:bg-accent/40 transition-colors">
                    <td className="px-4 py-3 font-mono font-medium text-sky-600">{t.transferNumber}</td>
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
                          className="h-7 text-xs gap-1 bg-emerald-600 hover:bg-emerald-700 text-white"
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
                    <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground border-dashed border-t">
                      No stock transfers recorded yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </TabsContent>

        {/* ══════════════════════════════════════════════════════════════════
            TAB 3: PHYSICAL INVENTORY & CONSUMPTION
        ══════════════════════════════════════════════════════════════════ */}
        <TabsContent value="inventory" className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-lg font-semibold">Physical Materials Inventory Stock</h2>
              <p className="text-xs text-muted-foreground">Track physical stock on hand, committed project inventory, and site consumption.</p>
            </div>
            <NewMaterialDialog
              trigger={
                <Button size="sm" className="gap-1.5"><Plus className="w-4 h-4" /> Add Material Item</Button>
              }
            />
          </div>
          <div className="rounded-md border bg-card overflow-x-auto text-sm">
            <table className="w-full text-left">
              <thead className="bg-muted/50 text-muted-foreground border-b text-xs uppercase font-medium">
                <tr>
                  <th className="px-4 py-3">Material</th>
                  <th className="px-4 py-3">Location</th>
                  <th className="px-4 py-3 text-right">On Hand</th>
                  <th className="px-4 py-3 text-right">Committed</th>
                  <th className="px-4 py-3 text-right">Consumed</th>
                  <th className="px-4 py-3 text-right">Min. Buffer</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredMaterials.map((m: any) => {
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
                        <div className="flex items-center justify-end gap-1.5">
                          {low && (
                            <NewMaterialRequestDialog
                              defaultTitle={m.name}
                              trigger={
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  className="h-7 text-xs gap-1 bg-rose-600 hover:bg-rose-700 text-white shadow-xs"
                                >
                                  <ShoppingCart className="w-3 h-3" /> Reorder
                                </Button>
                              }
                            />
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 text-xs text-muted-foreground hover:text-foreground"
                            onClick={() => setSelectedMaterialForConsumption(m)}
                          >
                            Log Usage
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filteredMaterials.length === 0 && !loadingMaterials && (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground border-dashed border-t">
                      No materials cataloged.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
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

      <LogConsumptionDialog
        material={selectedMaterialForConsumption}
        open={!!selectedMaterialForConsumption}
        onOpenChange={(op) => !op && setSelectedMaterialForConsumption(null)}
      />
    </div>
  );
}

