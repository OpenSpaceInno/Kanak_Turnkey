import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  useListProjects,
  useGetCurrentUser,
} from "@workspace/api-client-react";
import {
  Warehouse,
  Package,
  Truck,
  CheckCircle2,
  AlertTriangle,
  Camera,
  MapPin,
  Calendar,
  Plus,
  Minus,
  Sparkles,
  Zap,
  ArrowDownLeft,
  ArrowUpRight,
  ShieldAlert,
  FolderGit2,
  RefreshCw,
  Layers,
  FileCheck2,
  Search,
  Check,
} from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

import { QuickMaterialRequestDialog } from "@/components/field/QuickMaterialRequestDialog";
import { PocketDrawingsModal } from "@/components/field/PocketDrawingsModal";

export function StorekeeperFieldHub() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: user } = useGetCurrentUser();
  const { data: projects, isLoading: loadingProjects } = useListProjects();

  const [selectedProjectId, setSelectedProjectId] = useState<number>(1);
  const [activeTab, setActiveTab] = useState<"overview" | "receive" | "issue" | "stock">("overview");
  const [showDrawings, setShowDrawings] = useState(false);
  const [showMaterialReq, setShowMaterialReq] = useState(false);
  const [searchFilter, setSearchFilter] = useState("");

  // GRN Receipt Modal / Form State
  const [selectedPo, setSelectedPo] = useState<any | null>(null);
  const [receiveMaterialName, setReceiveMaterialName] = useState("OPC 53 Cement");
  const [receiveQty, setReceiveQty] = useState<number>(100);
  const [receiveUnit, setReceiveUnit] = useState<string>("bags");
  const [challanNumber, setChallanNumber] = useState<string>(
    `DC-${Date.now().toString().slice(-6)}`
  );
  const [receiveNotes, setReceiveNotes] = useState<string>("Good condition, seal verified.");

  // Issue Form State
  const [selectedMaterialId, setSelectedMaterialId] = useState<number | null>(null);
  const [issueQty, setIssueQty] = useState<number>(20);
  const [issuedTo, setIssuedTo] = useState<string>("Civil Foreman - Gang A");
  const [issueRemarks, setIssueRemarks] = useState<string>("For 1st floor slab casting");

  // Active Project
  const activeProject = useMemo(() => {
    if (!projects || projects.length === 0) return null;
    return projects.find((p) => p.id === selectedProjectId) || projects[0];
  }, [projects, selectedProjectId]);

  // Fetch Store Overview Data
  const {
    data: storeData,
    isLoading: loadingStore,
    refetch: refetchStore,
  } = useQuery({
    queryKey: ["store-overview", selectedProjectId],
    queryFn: async () => {
      const res = await fetch(`/api/field/store-overview?projectId=${selectedProjectId}`);
      if (!res.ok) throw new Error("Failed to load store inventory");
      return res.json();
    },
  });

  // GRN Receive Mutation
  const receiveMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/field/store-receive", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: selectedProjectId,
          poId: selectedPo?.id,
          materialName: receiveMaterialName,
          quantity: receiveQty,
          unit: receiveUnit,
          challanNumber,
          notes: receiveNotes,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to receive goods");
      }
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "⚡ GRN Received & Stock Updated!",
        description: `Logged challan #${data.grnNumber}: +${data.quantityReceived} into site store.`,
      });
      setSelectedPo(null);
      setActiveTab("overview");
      refetchStore();
    },
    onError: (err: any) => {
      toast({
        variant: "destructive",
        title: "Receipt Failed",
        description: err.message,
      });
    },
  });

  // Issue Mutation
  const issueMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/field/store-issue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: selectedProjectId,
          materialId: selectedMaterialId,
          quantity: issueQty,
          issuedTo,
          remarks: issueRemarks,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to issue material");
      }
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "⚡ Material Issued Successfully!",
        description: `Issued ${data.issuedQuantity} to ${issuedTo}. Remaining: ${data.remainingStock}.`,
      });
      setSelectedMaterialId(null);
      setActiveTab("overview");
      refetchStore();
    },
    onError: (err: any) => {
      toast({
        variant: "destructive",
        title: "Issue Failed",
        description: err.message,
      });
    },
  });

  const materials = storeData?.materials || [];
  const pendingArrivals = storeData?.pendingArrivals || [];
  const recentMovements = storeData?.recentMovements || [];
  const summary = storeData?.summary || {
    totalItems: 0,
    lowStockCount: 0,
    pendingGrnCount: 0,
    todayIssuesCount: 0,
  };

  const filteredMaterials = useMemo(() => {
    if (!searchFilter.trim()) return materials;
    const q = searchFilter.toLowerCase();
    return materials.filter(
      (m: any) =>
        m.name.toLowerCase().includes(q) ||
        (m.locationName && m.locationName.toLowerCase().includes(q))
    );
  }, [materials, searchFilter]);

  const selectedMaterial = useMemo(() => {
    if (!selectedMaterialId) return materials[0] || null;
    return materials.find((m: any) => m.id === selectedMaterialId) || materials[0];
  }, [materials, selectedMaterialId]);

  return (
    <div className="space-y-4 pb-24 max-w-4xl mx-auto px-3 sm:px-6 pt-2">
      {/* ───────────────────────────────────────────────────────────────────────── */}
      {/* TOP STORE CONTEXT BANNER                                                  */}
      {/* ───────────────────────────────────────────────────────────────────────── */}
      <div className="bg-slate-900 text-white rounded-2xl p-4 shadow-lg border border-slate-800">
        <div className="flex items-center justify-between gap-2 flex-wrap mb-3">
          <div className="flex items-center gap-2">
            <span className="p-2 bg-indigo-500/20 text-indigo-400 rounded-xl border border-indigo-500/30">
              <Warehouse className="h-5 w-5" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-bold leading-tight">
                  Storekeeper Field Hub
                </h1>
                <Badge className="bg-indigo-500 text-white font-semibold text-xs px-2 py-0.5">
                  Store & Yard
                </Badge>
              </div>
              <p className="text-xs text-slate-400">
                {format(new Date(), "EEEE, dd MMM yyyy")} • GRN & Material Issue
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDrawings(true)}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700 text-xs h-8 gap-1.5"
            >
              <FolderGit2 className="h-3.5 w-3.5 text-blue-400" />
              Drawings
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetchStore()}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700 text-xs h-8 px-2"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {/* Project Selector Chip Carousel */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          <span className="text-xs text-slate-400 font-medium whitespace-nowrap flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5 text-indigo-400" /> Store Site:
          </span>
          {loadingProjects ? (
            <span className="text-xs text-slate-400">Loading sites...</span>
          ) : (
            projects?.map((p) => {
              const isSelected = p.id === (activeProject?.id || selectedProjectId);
              return (
                <button
                  key={p.id}
                  onClick={() => setSelectedProjectId(p.id)}
                  className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                    isSelected
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700"
                  }`}
                >
                  {p.name}
                </button>
              );
            })
          )}
        </div>

        {/* 4 Essential Store KPI Tiles */}
        <div className="grid grid-cols-4 gap-2 mt-3 pt-3 border-t border-slate-800 text-center">
          <div className="bg-slate-800/60 p-2 rounded-xl">
            <span className="text-base font-black text-white">{summary.totalItems}</span>
            <p className="text-[10px] text-slate-400 font-medium">Stock Items</p>
          </div>
          <div className="bg-slate-800/60 p-2 rounded-xl">
            <span className={`text-base font-black ${summary.lowStockCount > 0 ? "text-rose-400" : "text-emerald-400"}`}>
              {summary.lowStockCount}
            </span>
            <p className="text-[10px] text-slate-400 font-medium">Low Stock</p>
          </div>
          <div className="bg-slate-800/60 p-2 rounded-xl">
            <span className="text-base font-black text-amber-400">{summary.pendingGrnCount}</span>
            <p className="text-[10px] text-slate-400 font-medium">Pending GRN</p>
          </div>
          <div className="bg-slate-800/60 p-2 rounded-xl">
            <span className="text-base font-black text-blue-400">{summary.todayIssuesCount}</span>
            <p className="text-[10px] text-slate-400 font-medium">Today Issued</p>
          </div>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────────────────── */}
      {/* ACTION TABS: [Overview] [⚡ Receive GRN] [📤 Issue Material] [📦 Stock]   */}
      {/* ───────────────────────────────────────────────────────────────────────── */}
      <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200 gap-1">
        <button
          onClick={() => setActiveTab("overview")}
          className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
            activeTab === "overview"
              ? "bg-white text-slate-900 shadow-sm"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          Overview
        </button>
        <button
          onClick={() => setActiveTab("receive")}
          className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
            activeTab === "receive"
              ? "bg-emerald-600 text-white shadow-sm"
              : "text-emerald-700 hover:bg-emerald-50"
          }`}
        >
          <ArrowDownLeft className="h-3.5 w-3.5" />
          Receive GRN
        </button>
        <button
          onClick={() => setActiveTab("issue")}
          className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
            activeTab === "issue"
              ? "bg-blue-600 text-white shadow-sm"
              : "text-blue-700 hover:bg-blue-50"
          }`}
        >
          <ArrowUpRight className="h-3.5 w-3.5" />
          Issue Store
        </button>
        <button
          onClick={() => setActiveTab("stock")}
          className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
            activeTab === "stock"
              ? "bg-white text-slate-900 shadow-sm"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          Stock Matrix
        </button>
      </div>

      {/* ───────────────────────────────────────────────────────────────────────── */}
      {/* TAB 1: OVERVIEW & PENDING ARRIVALS                                         */}
      {/* ───────────────────────────────────────────────────────────────────────── */}
      {activeTab === "overview" && (
        <div className="space-y-4">
          {/* Quick Action Buttons */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setActiveTab("receive")}
              className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl text-left hover:bg-emerald-100 transition-all flex items-center gap-3 shadow-sm"
            >
              <span className="p-2.5 bg-emerald-600 text-white rounded-xl shadow-sm">
                <Truck className="h-5 w-5" />
              </span>
              <div>
                <h4 className="text-xs sm:text-sm font-bold text-emerald-950">Receive GRN / Truck</h4>
                <p className="text-[11px] text-emerald-700">Challan camera snap</p>
              </div>
            </button>

            <button
              onClick={() => setActiveTab("issue")}
              className="p-3.5 bg-blue-50 border border-blue-200 rounded-2xl text-left hover:bg-blue-100 transition-all flex items-center gap-3 shadow-sm"
            >
              <span className="p-2.5 bg-blue-600 text-white rounded-xl shadow-sm">
                <Package className="h-5 w-5" />
              </span>
              <div>
                <h4 className="text-xs sm:text-sm font-bold text-blue-950">Issue to Foreman</h4>
                <p className="text-[11px] text-blue-700">Site consumable dispatch</p>
              </div>
            </button>
          </div>

          {/* Pending Inbound PO Deliveries */}
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="pb-2 pt-4 px-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 rounded-lg bg-amber-100 text-amber-700">
                    <Truck className="h-4 w-4" />
                  </span>
                  <div>
                    <CardTitle className="text-sm font-bold text-slate-900">
                      Expected PO Arrivals & Shipments
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Purchase orders in transit awaiting site store receipt
                    </CardDescription>
                  </div>
                </div>
                <Badge variant="outline" className="text-xs">
                  {pendingArrivals.length} In Transit
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              {loadingStore ? (
                <p className="text-xs text-slate-400 py-4 text-center">Loading PO shipments...</p>
              ) : pendingArrivals.length === 0 ? (
                <div className="text-center py-6 text-slate-400">
                  <Package className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                  <p className="text-xs font-medium">No pending PO shipments in transit.</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {pendingArrivals.map((po: any) => (
                    <div
                      key={po.id}
                      className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900">{po.poNumber}</span>
                          <Badge className="bg-amber-100 text-amber-800 text-[10px] px-1.5 py-0">
                            {po.status}
                          </Badge>
                        </div>
                        <p className="text-slate-600 truncate mt-0.5 font-medium">
                          {po.vendorName} • {po.description}
                        </p>
                        <p className="text-[11px] text-slate-400">
                          Total: ₹{Number(po.totalAmount).toLocaleString()} • Exp: {po.deliveryDate || "Today"}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => {
                          setSelectedPo(po);
                          setReceiveMaterialName(po.description?.split(",")[0] || "PO Consumables");
                          setActiveTab("receive");
                        }}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-8 text-xs shrink-0"
                      >
                        Receive GRN
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Store Movements Ledger */}
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="pb-2 pt-4 px-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 rounded-lg bg-indigo-100 text-indigo-700">
                    <FileCheck2 className="h-4 w-4" />
                  </span>
                  <CardTitle className="text-sm font-bold text-slate-900">
                    Store Movements Ledger
                  </CardTitle>
                </div>
                <Badge variant="outline" className="text-xs">
                  {recentMovements.length} Records
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              {recentMovements.length === 0 ? (
                <p className="text-xs text-slate-400 py-4 text-center">No recent stock movements.</p>
              ) : (
                <div className="space-y-2">
                  {recentMovements.map((m: any, idx: number) => {
                    const isReceipt = m.type === "receipt";
                    return (
                      <div
                        key={m.id || idx}
                        className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-2 text-xs"
                      >
                        <div className="flex items-center gap-2.5">
                          <span
                            className={`p-1.5 rounded-lg ${
                              isReceipt
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-blue-100 text-blue-700"
                            }`}
                          >
                            {isReceipt ? (
                              <ArrowDownLeft className="h-4 w-4" />
                            ) : (
                              <ArrowUpRight className="h-4 w-4" />
                            )}
                          </span>
                          <div>
                            <p className="font-bold text-slate-900">
                              {isReceipt ? "Received" : "Issued"} {m.quantity} {m.unit} of {m.materialName}
                            </p>
                            <p className="text-[11px] text-slate-500">
                              Ref: {m.reference} • By: {m.user}
                            </p>
                          </div>
                        </div>
                        <span className="text-[11px] text-slate-400 whitespace-nowrap">
                          {String(m.date).slice(0, 10)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────────────────── */}
      {/* TAB 2: RECEIVE GRN (Goods Receipt Note Workflow)                          */}
      {/* ───────────────────────────────────────────────────────────────────────── */}
      {activeTab === "receive" && (
        <Card className="border-emerald-200 shadow-sm bg-gradient-to-b from-emerald-50/20 to-white">
          <CardHeader className="pb-3 pt-4 px-4 border-b border-emerald-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="p-2 bg-emerald-600 text-white rounded-xl shadow-sm">
                  <ArrowDownLeft className="h-5 w-5" />
                </span>
                <div>
                  <CardTitle className="text-base font-bold text-slate-900">
                    Goods Receipt Note (GRN)
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Receive consignment into site store and update inventory
                  </CardDescription>
                </div>
              </div>
              {selectedPo && (
                <Badge className="bg-amber-100 text-amber-800 text-xs">
                  PO: {selectedPo.poNumber}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="px-4 py-4 space-y-3.5">
            {/* Material Name */}
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Material Description:
              </label>
              <input
                type="text"
                value={receiveMaterialName}
                onChange={(e) => setReceiveMaterialName(e.target.value)}
                placeholder="e.g. Ultratech OPC 53 Cement or TMT 12mm Rebar"
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* Quantity and Unit */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Received Quantity:
                </label>
                <input
                  type="number"
                  value={receiveQty}
                  onChange={(e) => setReceiveQty(Number(e.target.value))}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Unit:
                </label>
                <select
                  value={receiveUnit}
                  onChange={(e) => setReceiveUnit(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="bags">bags</option>
                  <option value="kg">kg</option>
                  <option value="MT">MT (Tons)</option>
                  <option value="cum">cum (Cubic m)</option>
                  <option value="sqft">sqft</option>
                  <option value="nos">nos (Pieces)</option>
                  <option value="bundles">bundles</option>
                </select>
              </div>
            </div>

            {/* Delivery Challan Number */}
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Vendor Delivery Challan (DC) / Invoice No:
              </label>
              <input
                type="text"
                value={challanNumber}
                onChange={(e) => setChallanNumber(e.target.value)}
                placeholder="e.g. DC-98412 or INV-2026-88"
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* Camera Snap for Delivery Challan */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Camera className="h-5 w-5 text-emerald-600" />
                <div>
                  <p className="text-xs font-bold text-slate-800">Challan / Bill Photo</p>
                  <p className="text-[11px] text-slate-500">Attach stamped physical copy</p>
                </div>
              </div>
              <label className="cursor-pointer bg-white border border-slate-300 hover:bg-slate-100 text-slate-800 px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm">
                📷 Snap Challan
                <input type="file" accept="image/*" capture="environment" className="hidden" />
              </label>
            </div>

            {/* Verification Remarks */}
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Inspection & Condition Remarks:
              </label>
              <input
                type="text"
                value={receiveNotes}
                onChange={(e) => setReceiveNotes(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* Submit Button */}
            <Button
              size="lg"
              onClick={() => receiveMutation.mutate()}
              disabled={receiveMutation.isPending || receiveQty <= 0}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-12 rounded-xl text-sm gap-2 shadow-md"
            >
              {receiveMutation.isPending ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="h-5 w-5" />
              )}
              ⚡ Confirm GRN Receipt (+{receiveQty} {receiveUnit})
            </Button>
          </CardContent>
        </Card>
      )}

      {/* ───────────────────────────────────────────────────────────────────────── */}
      {/* TAB 3: ISSUE MATERIAL (Dispatch to Foreman/Trade)                         */}
      {/* ───────────────────────────────────────────────────────────────────────── */}
      {activeTab === "issue" && (
        <Card className="border-blue-200 shadow-sm bg-gradient-to-b from-blue-50/20 to-white">
          <CardHeader className="pb-3 pt-4 px-4 border-b border-blue-100">
            <div className="flex items-center gap-2">
              <span className="p-2 bg-blue-600 text-white rounded-xl shadow-sm">
                <ArrowUpRight className="h-5 w-5" />
              </span>
              <div>
                <CardTitle className="text-base font-bold text-slate-900">
                  Store Material Issue
                </CardTitle>
                <CardDescription className="text-xs">
                  Issue consumables from store to site foreman or work package
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="px-4 py-4 space-y-3.5">
            {/* Select Material from Stock */}
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Select Stock Material:
              </label>
              <select
                value={selectedMaterial?.id || ""}
                onChange={(e) => setSelectedMaterialId(Number(e.target.value))}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {materials.map((m: any) => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.quantityOnHand} {m.unit} available)
                  </option>
                ))}
              </select>
            </div>

            {/* Current Stock Banner */}
            {selectedMaterial && (
              <div className="bg-slate-100 p-2.5 rounded-xl flex items-center justify-between text-xs">
                <span className="text-slate-600">
                  Available in Store:{" "}
                  <strong className="text-slate-900 font-bold">
                    {selectedMaterial.quantityOnHand} {selectedMaterial.unit}
                  </strong>
                </span>
                <span className="text-slate-500">
                  Consumed to date: {selectedMaterial.quantityConsumed} {selectedMaterial.unit}
                </span>
              </div>
            )}

            {/* Quantity with Steppers */}
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Issue Quantity ({selectedMaterial?.unit || "units"}):
              </label>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIssueQty(Math.max(1, issueQty - 5))}
                  className="h-10 w-10 p-0 rounded-lg"
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <input
                  type="number"
                  value={issueQty}
                  onChange={(e) => setIssueQty(Number(e.target.value))}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-center text-base font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIssueQty(issueQty + 5)}
                  className="h-10 w-10 p-0 rounded-lg"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Issued To Recipient */}
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Issued To (Foreman / Gang):
              </label>
              <input
                type="text"
                value={issuedTo}
                onChange={(e) => setIssuedTo(e.target.value)}
                placeholder="e.g. Gang Leader Ramesh / Shuttering Foreman"
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Work Package / Purpose Remarks */}
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Work Location / Purpose:
              </label>
              <input
                type="text"
                value={issueRemarks}
                onChange={(e) => setIssueRemarks(e.target.value)}
                placeholder="e.g. 2nd floor slab beam concreting"
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Submit Button */}
            <Button
              size="lg"
              onClick={() => issueMutation.mutate()}
              disabled={issueMutation.isPending || issueQty <= 0}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold h-12 rounded-xl text-sm gap-2 shadow-md"
            >
              {issueMutation.isPending ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="h-5 w-5" />
              )}
              ⚡ Confirm Material Issue (-{issueQty} {selectedMaterial?.unit})
            </Button>
          </CardContent>
        </Card>
      )}

      {/* ───────────────────────────────────────────────────────────────────────── */}
      {/* TAB 4: REAL-TIME STOCK BALANCE MATRIX & REORDER ALERTS                    */}
      {/* ───────────────────────────────────────────────────────────────────────── */}
      {activeTab === "stock" && (
        <div className="space-y-3">
          {/* Search Box */}
          <div className="relative">
            <Search className="h-4 w-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search site stock items..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="space-y-2">
            {filteredMaterials.map((m: any) => {
              const isLow = m.stockStatus !== "ok";
              const isCritical = m.stockStatus === "critical";
              return (
                <div
                  key={m.id}
                  className={`p-3 rounded-xl border transition-all ${
                    isCritical
                      ? "bg-rose-50/60 border-rose-300"
                      : isLow
                      ? "bg-amber-50/60 border-amber-300"
                      : "bg-white border-slate-200"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h4 className="font-bold text-sm text-slate-900">{m.name}</h4>
                        {isCritical && (
                          <Badge className="bg-rose-600 text-white text-[10px] px-1.5 py-0 font-bold">
                            Critical
                          </Badge>
                        )}
                        {!isCritical && isLow && (
                          <Badge className="bg-amber-500 text-slate-950 text-[10px] px-1.5 py-0 font-bold">
                            Low Stock
                          </Badge>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Location: {m.locationName || "Site Store"} • Reorder: {m.reorderLevel} {m.unit}
                      </p>
                    </div>

                    <div className="text-right">
                      <span className="text-lg font-black text-slate-900">
                        {m.quantityOnHand}
                      </span>{" "}
                      <span className="text-xs font-semibold text-slate-500">{m.unit}</span>
                      <p className="text-[10px] text-slate-400">On Hand</p>
                    </div>
                  </div>

                  {/* Actions for this item */}
                  <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="text-[11px] text-slate-500">
                      Consumed: <strong>{m.quantityConsumed} {m.unit}</strong>
                    </span>
                    <div className="flex items-center gap-1.5">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedMaterialId(m.id);
                          setActiveTab("issue");
                        }}
                        className="h-7 text-xs px-2.5 bg-white border-slate-300 text-slate-800"
                      >
                        Issue
                      </Button>
                      {isLow && (
                        <Button
                          size="sm"
                          onClick={() => setShowMaterialReq(true)}
                          className="h-7 text-xs px-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold"
                        >
                          ⚡ Reorder
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────────────────── */}
      {/* MODALS: Drawings & Material Reorder                                       */}
      {/* ───────────────────────────────────────────────────────────────────────── */}
      <PocketDrawingsModal
        open={showDrawings}
        onOpenChange={setShowDrawings}
        projectId={selectedProjectId}
      />

      <QuickMaterialRequestDialog
        open={showMaterialReq}
        onOpenChange={setShowMaterialReq}
        defaultProjectId={selectedProjectId}
      />
    </div>
  );
}
