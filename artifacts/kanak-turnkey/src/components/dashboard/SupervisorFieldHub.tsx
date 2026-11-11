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
  HardHat,
  Users,
  CheckCircle2,
  AlertCircle,
  Camera,
  MapPin,
  Calendar,
  Plus,
  Minus,
  Sparkles,
  Zap,
  Hammer,
  ShieldAlert,
  FolderGit2,
  RefreshCw,
  Layers,
  FileCheck2,
} from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

import { QuickPunchDialog } from "@/components/field/QuickPunchDialog";
import { QuickMaterialRequestDialog } from "@/components/field/QuickMaterialRequestDialog";
import { PocketDrawingsModal } from "@/components/field/PocketDrawingsModal";

const TRADE_PRESETS = [
  { id: "slab", name: "Slab Concreting", unit: "cum", defaultQty: 25 },
  { id: "brick", name: "Brickwork 9-inch", unit: "sqft", defaultQty: 120 },
  { id: "plaster", name: "Internal Plaster", unit: "sqft", defaultQty: 200 },
  { id: "tiles", name: "Floor Tiling", unit: "sqft", defaultQty: 150 },
  { id: "rebar", name: "Steel Rebar Tying", unit: "MT", defaultQty: 2.5 },
  { id: "conduit", name: "PVC Conduit Fixing", unit: "Rft", defaultQty: 80 },
];

const LOCATION_PRESETS = [
  "Basement 1",
  "Ground Floor",
  "1st Floor",
  "2nd Floor",
  "3rd Floor",
  "Terrace Slab",
  "External Facade",
];

export function SupervisorFieldHub() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: user } = useGetCurrentUser();
  const { data: projects, isLoading: loadingProjects } = useListProjects();

  const [selectedProjectId, setSelectedProjectId] = useState<number>(1);
  const [showDrawings, setShowDrawings] = useState(false);
  const [showPunch, setShowPunch] = useState(false);
  const [showMaterialReq, setShowMaterialReq] = useState(false);

  // Gang Headcount State
  const [masons, setMasons] = useState<number>(4);
  const [carpenters, setCarpenters] = useState<number>(6);
  const [barBenders, setBarBenders] = useState<number>(5);
  const [painters, setPainters] = useState<number>(2);
  const [electricians, setElectricians] = useState<number>(2);
  const [helpers, setHelpers] = useState<number>(12);

  // Work Done State
  const [selectedTrade, setSelectedTrade] = useState<string>("brick");
  const [workQty, setWorkQty] = useState<number>(120);
  const [workUnit, setWorkUnit] = useState<string>("sqft");
  const [workLocation, setWorkLocation] = useState<string>("1st Floor");
  const [workNotes, setWorkNotes] = useState<string>("");

  const totalWorkers = masons + carpenters + barBenders + painters + electricians + helpers;

  // Active Project
  const activeProject = useMemo(() => {
    if (!projects || projects.length === 0) return null;
    return (
      projects.find((p) => p.id === selectedProjectId) || projects[0]
    );
  }, [projects, selectedProjectId]);

  // Fetch Supervisor Summary from field-ops API
  const {
    data: supervisorData,
    isLoading: loadingSupervisor,
    refetch: refetchSupervisor,
  } = useQuery({
    queryKey: ["supervisor-summary", selectedProjectId],
    queryFn: async () => {
      const res = await fetch(
        `/api/field/supervisor-summary?projectId=${selectedProjectId}`
      );
      if (!res.ok) throw new Error("Failed to load supervisor gang data");
      return res.json();
    },
  });

  // Submit Gang Attendance & Work Log Mutation
  const logMusterMutation = useMutation({
    mutationFn: async () => {
      const activePreset = TRADE_PRESETS.find((t) => t.id === selectedTrade);
      const res = await fetch("/api/field/supervisor-log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: selectedProjectId,
          gangHeadcount: {
            masons,
            carpenters,
            barBenders,
            painters,
            electricians,
            helpers,
          },
          workDone: [
            {
              trade: activePreset?.name || selectedTrade,
              quantity: workQty,
              unit: workUnit,
              location: workLocation,
              notes: workNotes,
            },
          ],
          notes: workNotes || `Muster of ${totalWorkers} workers on site.`,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to log muster");
      }
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "⚡ Gang Muster & Work Logged!",
        description: data.message || `Saved attendance for ${totalWorkers} workers.`,
      });
      refetchSupervisor();
    },
    onError: (err: any) => {
      toast({
        variant: "destructive",
        title: "Submission Failed",
        description: err.message,
      });
    },
  });

  const handleSelectTrade = (preset: typeof TRADE_PRESETS[0]) => {
    setSelectedTrade(preset.id);
    setWorkUnit(preset.unit);
    setWorkQty(preset.defaultQty);
  };

  return (
    <div className="space-y-4 pb-24 max-w-4xl mx-auto px-3 sm:px-6 pt-2">
      {/* ───────────────────────────────────────────────────────────────────────── */}
      {/* TOP CONTEXT BAR: Project Selector & Live Muster Status                     */}
      {/* ───────────────────────────────────────────────────────────────────────── */}
      <div className="bg-slate-900 text-white rounded-2xl p-4 shadow-lg border border-slate-800">
        <div className="flex items-center justify-between gap-2 flex-wrap mb-3">
          <div className="flex items-center gap-2">
            <span className="p-2 bg-amber-500/20 text-amber-400 rounded-xl border border-amber-500/30">
              <HardHat className="h-5 w-5" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-bold leading-tight">
                  Foreman Field Hub
                </h1>
                <Badge className="bg-amber-500 text-slate-950 font-semibold text-xs px-2 py-0.5">
                  Supervisor
                </Badge>
              </div>
              <p className="text-xs text-slate-400">
                {format(new Date(), "EEEE, dd MMM yyyy")} • Gang Muster & Site Log
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
              onClick={() => refetchSupervisor()}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700 text-xs h-8 px-2"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {/* Project Selector Chip Carousel */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          <span className="text-xs text-slate-400 font-medium whitespace-nowrap flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5 text-amber-400" /> Site:
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
                      ? "bg-amber-500 text-slate-950 shadow-sm"
                      : "bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700"
                  }`}
                >
                  {p.name}
                </button>
              );
            })
          )}
        </div>

        {/* Dynamic Site Headcount Banner */}
        <div className="mt-3 pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-emerald-400" />
            <span className="text-slate-300">
              Total Workers on Muster:{" "}
              <strong className="text-white text-sm">{totalWorkers}</strong>
            </span>
          </div>
          <Badge
            variant="outline"
            className="border-emerald-500/40 text-emerald-300 bg-emerald-950/40 text-[11px]"
          >
            Live Site Count
          </Badge>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────────────────── */}
      {/* 1-TAP GANG MUSTER COUNTERS (Touch Friendly Steppers)                      */}
      {/* ───────────────────────────────────────────────────────────────────────── */}
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="pb-3 pt-4 px-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-blue-100 text-blue-700">
                <Users className="h-4 w-4" />
              </span>
              <div>
                <CardTitle className="text-base font-bold text-slate-900">
                  Trade Gang Headcount
                </CardTitle>
                <CardDescription className="text-xs">
                  Tap + or - to count today's labour gangs on site
                </CardDescription>
              </div>
            </div>
            <div className="text-right">
              <span className="text-2xl font-black text-blue-600 leading-none">
                {totalWorkers}
              </span>
              <p className="text-[10px] uppercase font-bold text-slate-400">Total Men</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-4 pb-4 space-y-2.5">
          {/* Masons */}
          <div className="flex items-center justify-between bg-slate-50 p-2.5 rounded-xl border border-slate-100">
            <div className="flex items-center gap-2.5">
              <span className="text-xl">🧱</span>
              <div>
                <p className="text-sm font-semibold text-slate-800">Masons (Civil)</p>
                <p className="text-[11px] text-slate-500">Brick, block & plaster</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-9 w-9 p-0 rounded-full bg-white border-slate-300 text-slate-700"
                onClick={() => setMasons(Math.max(0, masons - 1))}
              >
                <Minus className="h-4 w-4" />
              </Button>
              <span className="w-8 text-center font-bold text-base text-slate-900">
                {masons}
              </span>
              <Button
                variant="outline"
                size="sm"
                className="h-9 w-9 p-0 rounded-full bg-blue-50 border-blue-300 text-blue-700 hover:bg-blue-100"
                onClick={() => setMasons(masons + 1)}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Carpenters */}
          <div className="flex items-center justify-between bg-slate-50 p-2.5 rounded-xl border border-slate-100">
            <div className="flex items-center gap-2.5">
              <span className="text-xl">🪚</span>
              <div>
                <p className="text-sm font-semibold text-slate-800">Carpenters / Shuttering</p>
                <p className="text-[11px] text-slate-500">Formwork & staging</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-9 w-9 p-0 rounded-full bg-white border-slate-300 text-slate-700"
                onClick={() => setCarpenters(Math.max(0, carpenters - 1))}
              >
                <Minus className="h-4 w-4" />
              </Button>
              <span className="w-8 text-center font-bold text-base text-slate-900">
                {carpenters}
              </span>
              <Button
                variant="outline"
                size="sm"
                className="h-9 w-9 p-0 rounded-full bg-blue-50 border-blue-300 text-blue-700 hover:bg-blue-100"
                onClick={() => setCarpenters(carpenters + 1)}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Bar Benders */}
          <div className="flex items-center justify-between bg-slate-50 p-2.5 rounded-xl border border-slate-100">
            <div className="flex items-center gap-2.5">
              <span className="text-xl">🔩</span>
              <div>
                <p className="text-sm font-semibold text-slate-800">Bar Benders (Steel)</p>
                <p className="text-[11px] text-slate-500">Rebar cutting & tying</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-9 w-9 p-0 rounded-full bg-white border-slate-300 text-slate-700"
                onClick={() => setBarBenders(Math.max(0, barBenders - 1))}
              >
                <Minus className="h-4 w-4" />
              </Button>
              <span className="w-8 text-center font-bold text-base text-slate-900">
                {barBenders}
              </span>
              <Button
                variant="outline"
                size="sm"
                className="h-9 w-9 p-0 rounded-full bg-blue-50 border-blue-300 text-blue-700 hover:bg-blue-100"
                onClick={() => setBarBenders(barBenders + 1)}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Painters */}
          <div className="flex items-center justify-between bg-slate-50 p-2.5 rounded-xl border border-slate-100">
            <div className="flex items-center gap-2.5">
              <span className="text-xl">🎨</span>
              <div>
                <p className="text-sm font-semibold text-slate-800">Painters & Polishers</p>
                <p className="text-[11px] text-slate-500">Primer, putty & coat</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-9 w-9 p-0 rounded-full bg-white border-slate-300 text-slate-700"
                onClick={() => setPainters(Math.max(0, painters - 1))}
              >
                <Minus className="h-4 w-4" />
              </Button>
              <span className="w-8 text-center font-bold text-base text-slate-900">
                {painters}
              </span>
              <Button
                variant="outline"
                size="sm"
                className="h-9 w-9 p-0 rounded-full bg-blue-50 border-blue-300 text-blue-700 hover:bg-blue-100"
                onClick={() => setPainters(painters + 1)}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Electricians & Plumbers */}
          <div className="flex items-center justify-between bg-slate-50 p-2.5 rounded-xl border border-slate-100">
            <div className="flex items-center gap-2.5">
              <span className="text-xl">⚡</span>
              <div>
                <p className="text-sm font-semibold text-slate-800">Electricians & MEP</p>
                <p className="text-[11px] text-slate-500">Wiring, piping & fixings</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-9 w-9 p-0 rounded-full bg-white border-slate-300 text-slate-700"
                onClick={() => setElectricians(Math.max(0, electricians - 1))}
              >
                <Minus className="h-4 w-4" />
              </Button>
              <span className="w-8 text-center font-bold text-base text-slate-900">
                {electricians}
              </span>
              <Button
                variant="outline"
                size="sm"
                className="h-9 w-9 p-0 rounded-full bg-blue-50 border-blue-300 text-blue-700 hover:bg-blue-100"
                onClick={() => setElectricians(electricians + 1)}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Helpers / Unskilled */}
          <div className="flex items-center justify-between bg-slate-50 p-2.5 rounded-xl border border-slate-100">
            <div className="flex items-center gap-2.5">
              <span className="text-xl">👷</span>
              <div>
                <p className="text-sm font-semibold text-slate-800">Helpers / Unskilled</p>
                <p className="text-[11px] text-slate-500">Material shifting & housekeeping</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-9 w-9 p-0 rounded-full bg-white border-slate-300 text-slate-700"
                onClick={() => setHelpers(Math.max(0, helpers - 1))}
              >
                <Minus className="h-4 w-4" />
              </Button>
              <span className="w-8 text-center font-bold text-base text-slate-900">
                {helpers}
              </span>
              <Button
                variant="outline"
                size="sm"
                className="h-9 w-9 p-0 rounded-full bg-blue-50 border-blue-300 text-blue-700 hover:bg-blue-100"
                onClick={() => setHelpers(helpers + 1)}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ───────────────────────────────────────────────────────────────────────── */}
      {/* TODAY'S WORK DONE CAPTURE (1-Tap Activity Chips & Quantity)               */}
      {/* ───────────────────────────────────────────────────────────────────────── */}
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="pb-3 pt-4 px-4">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-emerald-100 text-emerald-700">
              <Hammer className="h-4 w-4" />
            </span>
            <div>
              <CardTitle className="text-base font-bold text-slate-900">
                Today's Work Execution
              </CardTitle>
              <CardDescription className="text-xs">
                Select activity, tap quantity and save with 1-tap
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-4 pb-4 space-y-3">
          {/* Trade Chips */}
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1.5">
              Select Main Activity:
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {TRADE_PRESETS.map((preset) => {
                const isSelected = selectedTrade === preset.id;
                return (
                  <button
                    key={preset.id}
                    onClick={() => handleSelectTrade(preset)}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      isSelected
                        ? "bg-emerald-50 border-emerald-500 text-emerald-950 font-bold shadow-sm ring-1 ring-emerald-500"
                        : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <p className="text-xs font-semibold leading-tight">{preset.name}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Unit: {preset.unit}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quantity Entry with Increment Buttons */}
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-700">
                Quantity Completed:
              </label>
              <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                {workQty} {workUnit}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={workQty}
                onChange={(e) => setWorkQty(Number(e.target.value))}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <span className="text-xs font-bold text-slate-600 px-2 py-2 bg-slate-200 rounded-lg min-w-16 text-center">
                {workUnit}
              </span>
            </div>
            {/* Increment quick presets */}
            <div className="flex items-center gap-1.5 pt-1">
              <span className="text-[10px] text-slate-400 uppercase font-semibold">Quick:</span>
              {[25, 50, 100, 250].map((step) => (
                <button
                  key={step}
                  type="button"
                  onClick={() => setWorkQty((q) => q + step)}
                  className="px-2 py-1 rounded-md bg-white border border-slate-200 text-[11px] font-semibold text-slate-700 hover:bg-slate-100"
                >
                  +{step}
                </button>
              ))}
            </div>
          </div>

          {/* Location Presets */}
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1.5">
              Work Location on Site:
            </label>
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
              {LOCATION_PRESETS.map((loc) => {
                const isSelected = workLocation === loc;
                return (
                  <button
                    key={loc}
                    type="button"
                    onClick={() => setWorkLocation(loc)}
                    className={`px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                      isSelected
                        ? "bg-slate-900 text-white font-semibold"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {loc}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Optional Notes */}
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Remarks / Issues (Optional):
            </label>
            <input
              type="text"
              placeholder="e.g. Shuttering checked, concreting completed up to grid 4"
              value={workNotes}
              onChange={(e) => setWorkNotes(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* One-Tap Save Button */}
          <Button
            size="lg"
            onClick={() => logMusterMutation.mutate()}
            disabled={logMusterMutation.isPending || totalWorkers === 0}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-12 rounded-xl text-sm gap-2 shadow-md"
          >
            {logMusterMutation.isPending ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="h-5 w-5" />
            )}
            ⚡ Save Gang Attendance & Work Log ({totalWorkers} Men)
          </Button>
        </CardContent>
      </Card>

      {/* ───────────────────────────────────────────────────────────────────────── */}
      {/* QUICK ACTIONS ROW: Defect Snap, Material Request, Pocket Drawings         */}
      {/* ───────────────────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => setShowPunch(true)}
          className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-left hover:bg-rose-100 transition-all flex items-center gap-3 shadow-sm"
        >
          <span className="p-2.5 bg-rose-500 text-white rounded-xl shadow-sm">
            <Camera className="h-5 w-5" />
          </span>
          <div>
            <h4 className="text-xs sm:text-sm font-bold text-rose-950">Snap Defect / Snag</h4>
            <p className="text-[11px] text-rose-700">Photo-first report</p>
          </div>
        </button>

        <button
          onClick={() => setShowMaterialReq(true)}
          className="p-3.5 bg-indigo-50 border border-indigo-200 rounded-2xl text-left hover:bg-indigo-100 transition-all flex items-center gap-3 shadow-sm"
        >
          <span className="p-2.5 bg-indigo-600 text-white rounded-xl shadow-sm">
            <Layers className="h-5 w-5" />
          </span>
          <div>
            <h4 className="text-xs sm:text-sm font-bold text-indigo-950">Material Request</h4>
            <p className="text-[11px] text-indigo-700">Site consumable indent</p>
          </div>
        </button>
      </div>

      {/* ───────────────────────────────────────────────────────────────────────── */}
      {/* TODAY'S SITE MUSTER HISTORY FEED                                          */}
      {/* ───────────────────────────────────────────────────────────────────────── */}
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="pb-3 pt-4 px-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-amber-100 text-amber-700">
                <FileCheck2 className="h-4 w-4" />
              </span>
              <CardTitle className="text-sm font-bold text-slate-900">
                Muster History & Logs
              </CardTitle>
            </div>
            <Badge variant="outline" className="text-xs">
              {supervisorData?.logs?.length || 0} Entries
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          {loadingSupervisor ? (
            <p className="text-xs text-slate-400 py-4 text-center">Loading site muster...</p>
          ) : !supervisorData?.logs || supervisorData.logs.length === 0 ? (
            <div className="text-center py-6 text-slate-400">
              <Users className="h-8 w-8 mx-auto mb-2 text-slate-300" />
              <p className="text-xs font-medium">No muster logged yet today for this project.</p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Set gang numbers above and tap "Save Gang Attendance".
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {supervisorData.logs.map((log: any, idx: number) => {
                const h = log.gangHeadcount || {};
                const sumMen =
                  (h.masons || 0) +
                  (h.carpenters || 0) +
                  (h.barBenders || 0) +
                  (h.painters || 0) +
                  (h.electricians || 0) +
                  (h.helpers || 0);

                return (
                  <div
                    key={log.id || idx}
                    className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5 text-xs"
                  >
                    <div className="flex items-center justify-between font-semibold text-slate-900">
                      <span className="flex items-center gap-1.5">
                        <Users className="h-3.5 w-3.5 text-blue-600" />
                        {sumMen} Crew Members
                      </span>
                      <span className="text-[11px] text-slate-400 font-normal">
                        {log.date} • {log.supervisor || "Foreman"}
                      </span>
                    </div>
                    {/* Headcount breakdown pills */}
                    <div className="flex flex-wrap gap-1 text-[11px]">
                      {h.masons > 0 && (
                        <span className="bg-white border px-1.5 py-0.5 rounded text-slate-700">
                          🧱 {h.masons} Masons
                        </span>
                      )}
                      {h.carpenters > 0 && (
                        <span className="bg-white border px-1.5 py-0.5 rounded text-slate-700">
                          🪚 {h.carpenters} Carpenters
                        </span>
                      )}
                      {h.barBenders > 0 && (
                        <span className="bg-white border px-1.5 py-0.5 rounded text-slate-700">
                          🔩 {h.barBenders} Rebar
                        </span>
                      )}
                      {h.helpers > 0 && (
                        <span className="bg-white border px-1.5 py-0.5 rounded text-slate-700">
                          👷 {h.helpers} Helpers
                        </span>
                      )}
                    </div>
                    {log.workDone?.length > 0 && (
                      <p className="text-slate-600 text-[11px] pt-1 border-t border-slate-100">
                        🔨 Work:{" "}
                        <strong>
                          {log.workDone[0].trade} - {log.workDone[0].quantity}{" "}
                          {log.workDone[0].unit}
                        </strong>{" "}
                        at {log.workDone[0].location}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ───────────────────────────────────────────────────────────────────────── */}
      {/* MODALS: Drawings, Punch, Material Request                                 */}
      {/* ───────────────────────────────────────────────────────────────────────── */}
      <PocketDrawingsModal
        open={showDrawings}
        onOpenChange={setShowDrawings}
        projectId={selectedProjectId}
      />

      <QuickPunchDialog
        open={showPunch}
        onOpenChange={setShowPunch}
        defaultProjectId={selectedProjectId}
      />

      <QuickMaterialRequestDialog
        open={showMaterialReq}
        onOpenChange={setShowMaterialReq}
        defaultProjectId={selectedProjectId}
      />
    </div>
  );
}
