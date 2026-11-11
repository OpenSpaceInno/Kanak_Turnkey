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
import { Progress } from "@/components/ui/progress";
import {
  useListProjects,
  useGetCurrentUser,
} from "@workspace/api-client-react";
import {
  HardHat,
  FileCheck2,
  FileSpreadsheet,
  IndianRupee,
  Clock,
  CheckCircle2,
  AlertCircle,
  Camera,
  MapPin,
  Calendar,
  Plus,
  Minus,
  Sparkles,
  Zap,
  FolderGit2,
  RefreshCw,
  Layers,
  ArrowRight,
  ShieldAlert,
  Ruler,
  Check,
} from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

import { PocketDrawingsModal } from "@/components/field/PocketDrawingsModal";

export function SubcontractorPortalHub() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: user } = useGetCurrentUser();
  const { data: projects, isLoading: loadingProjects } = useListProjects();

  const [selectedProjectId, setSelectedProjectId] = useState<number>(1);
  const [activeTab, setActiveTab] = useState<"packages" | "claim" | "history" | "bills">("packages");
  const [showDrawings, setShowDrawings] = useState(false);

  // Measurement Claim Form State
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [claimWorkItem, setClaimWorkItem] = useState("External Plastering - Grid 1 to 4");
  const [claimQty, setClaimQty] = useState<number>(350);
  const [claimUnit, setClaimUnit] = useState<string>("sqft");
  const [claimLocation, setClaimLocation] = useState<string>("Tower A - 3rd Floor External");
  const [claimDimensions, setClaimDimensions] = useState<string>("Length: 35ft x Height: 10ft");
  const [claimNotes, setClaimNotes] = useState<string>("Joint measurement with Site Engineer completed.");

  // Active Project
  const activeProject = useMemo(() => {
    if (!projects || projects.length === 0) return null;
    return projects.find((p) => p.id === selectedProjectId) || projects[0];
  }, [projects, selectedProjectId]);

  // Fetch Subcontractor Portal Data (Isolated scope)
  const {
    data: portalData,
    isLoading: loadingPortal,
    refetch: refetchPortal,
  } = useQuery({
    queryKey: ["subcontractor-portal", selectedProjectId],
    queryFn: async () => {
      const res = await fetch(`/api/field/subcontractor-portal?projectId=${selectedProjectId}`);
      if (!res.ok) throw new Error("Failed to load subcontractor scope");
      return res.json();
    },
  });

  // Measurement Claim Submission Mutation
  const claimMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/field/subcontractor-measurement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: selectedProjectId,
          taskId: selectedTaskId,
          workItem: claimWorkItem,
          quantity: claimQty,
          unit: claimUnit,
          location: claimLocation,
          notes: `${claimDimensions ? `Dimensions: ${claimDimensions}. ` : ""}${claimNotes}`,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to submit measurement claim");
      }
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "⚡ Joint Measurement Submitted!",
        description: `Claim #${data.claimNumber} logged for Site Engineer & PM verification.`,
      });
      setActiveTab("history");
      refetchPortal();
    },
    onError: (err: any) => {
      toast({
        variant: "destructive",
        title: "Submission Failed",
        description: err.message,
      });
    },
  });

  const workPackages = portalData?.workPackages || [];
  const claims = portalData?.claims || [];
  const bills = portalData?.bills || [];
  const stats = portalData?.stats || {
    totalPackages: 0,
    pendingClaimsCount: 0,
    verifiedClaimsCount: 0,
    totalBillsCount: 0,
  };

  return (
    <div className="space-y-4 pb-24 max-w-4xl mx-auto px-3 sm:px-6 pt-2">
      {/* ───────────────────────────────────────────────────────────────────────── */}
      {/* TOP SUBCONTRACTOR CONTEXT BANNER                                          */}
      {/* ───────────────────────────────────────────────────────────────────────── */}
      <div className="bg-slate-900 text-white rounded-2xl p-4 shadow-lg border border-slate-800">
        <div className="flex items-center justify-between gap-2 flex-wrap mb-3">
          <div className="flex items-center gap-2">
            <span className="p-2 bg-purple-500/20 text-purple-400 rounded-xl border border-purple-500/30">
              <Ruler className="h-5 w-5" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-bold leading-tight">
                  Subcontractor Portal
                </h1>
                <Badge className="bg-purple-600 text-white font-semibold text-xs px-2 py-0.5">
                  Trade Partner
                </Badge>
              </div>
              <p className="text-xs text-slate-400">
                {format(new Date(), "EEEE, dd MMM yyyy")} • Measurement Claims & RA Bills
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
              onClick={() => refetchPortal()}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700 text-xs h-8 px-2"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {/* Project Selector Chip Carousel */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          <span className="text-xs text-slate-400 font-medium whitespace-nowrap flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5 text-purple-400" /> Assigned Site:
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
                      ? "bg-purple-600 text-white shadow-sm"
                      : "bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700"
                  }`}
                >
                  {p.name}
                </button>
              );
            })
          )}
        </div>

        {/* 4 Summary Metric Pills */}
        <div className="grid grid-cols-4 gap-2 mt-3 pt-3 border-t border-slate-800 text-center">
          <div className="bg-slate-800/60 p-2 rounded-xl">
            <span className="text-base font-black text-white">{stats.totalPackages}</span>
            <p className="text-[10px] text-slate-400 font-medium">Work Packages</p>
          </div>
          <div className="bg-slate-800/60 p-2 rounded-xl">
            <span className="text-base font-black text-amber-400">{stats.pendingClaimsCount}</span>
            <p className="text-[10px] text-slate-400 font-medium">Under Review</p>
          </div>
          <div className="bg-slate-800/60 p-2 rounded-xl">
            <span className="text-base font-black text-emerald-400">{stats.verifiedClaimsCount}</span>
            <p className="text-[10px] text-slate-400 font-medium">Verified</p>
          </div>
          <div className="bg-slate-800/60 p-2 rounded-xl">
            <span className="text-base font-black text-blue-400">{stats.totalBillsCount}</span>
            <p className="text-[10px] text-slate-400 font-medium">RA Bills</p>
          </div>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────────────────── */}
      {/* NAVIGATION TABS: [Work Packages] [⚡ Submit Measurement] [Claims] [Bills] */}
      {/* ───────────────────────────────────────────────────────────────────────── */}
      <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200 gap-1">
        <button
          onClick={() => setActiveTab("packages")}
          className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
            activeTab === "packages"
              ? "bg-white text-slate-900 shadow-sm"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          Work Packages
        </button>
        <button
          onClick={() => setActiveTab("claim")}
          className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
            activeTab === "claim"
              ? "bg-purple-600 text-white shadow-sm"
              : "text-purple-700 hover:bg-purple-50"
          }`}
        >
          <Ruler className="h-3.5 w-3.5" />
          Claim Measurement
        </button>
        <button
          onClick={() => setActiveTab("history")}
          className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
            activeTab === "history"
              ? "bg-white text-slate-900 shadow-sm"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          Claims Log ({claims.length})
        </button>
        <button
          onClick={() => setActiveTab("bills")}
          className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
            activeTab === "bills"
              ? "bg-white text-slate-900 shadow-sm"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          RA Bills
        </button>
      </div>

      {/* ───────────────────────────────────────────────────────────────────────── */}
      {/* TAB 1: ASSIGNED WORK PACKAGES                                             */}
      {/* ───────────────────────────────────────────────────────────────────────── */}
      {activeTab === "packages" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Contract Work Packages ({workPackages.length})
            </h3>
            <span className="text-[11px] text-purple-700 font-semibold bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200">
              Contractor Scope Only
            </span>
          </div>

          {loadingPortal ? (
            <p className="text-xs text-slate-400 py-4 text-center">Loading work packages...</p>
          ) : workPackages.length === 0 ? (
            <Card className="border-slate-200 p-6 text-center text-slate-400">
              <HardHat className="h-8 w-8 mx-auto mb-2 text-slate-300" />
              <p className="text-xs font-medium">No work packages currently assigned.</p>
            </Card>
          ) : (
            workPackages.map((wp: any) => (
              <Card key={wp.id} className="border-slate-200 shadow-sm">
                <CardContent className="p-3.5 space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 leading-snug">
                        {wp.title}
                      </h4>
                      <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">
                        {wp.description}
                      </p>
                    </div>
                    <Badge
                      className={
                        wp.status === "completed"
                          ? "bg-emerald-100 text-emerald-800"
                          : wp.status === "in_progress"
                          ? "bg-blue-100 text-blue-800"
                          : "bg-slate-100 text-slate-800"
                      }
                    >
                      {wp.status}
                    </Badge>
                  </div>

                  {/* Progress bar */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] text-slate-600">
                      <span>Certified Progress</span>
                      <strong className="text-slate-900">{wp.progress || 0}%</strong>
                    </div>
                    <Progress value={wp.progress || 0} className="h-2" />
                  </div>

                  {/* Action row */}
                  <div className="pt-1.5 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="text-[11px] text-slate-400">
                      Target: {wp.endDate || "Ongoing"}
                    </span>
                    <Button
                      size="sm"
                      onClick={() => {
                        setSelectedTaskId(wp.id);
                        setClaimWorkItem(wp.title);
                        setActiveTab("claim");
                      }}
                      className="h-8 text-xs bg-purple-600 hover:bg-purple-700 text-white font-bold gap-1"
                    >
                      <Ruler className="h-3.5 w-3.5" />
                      Claim Measurement
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────────────────── */}
      {/* TAB 2: MEASUREMENT SHEET CLAIM SUBMISSION                                 */}
      {/* ───────────────────────────────────────────────────────────────────────── */}
      {activeTab === "claim" && (
        <Card className="border-purple-200 shadow-sm bg-gradient-to-b from-purple-50/20 to-white">
          <CardHeader className="pb-3 pt-4 px-4 border-b border-purple-100">
            <div className="flex items-center gap-2">
              <span className="p-2 bg-purple-600 text-white rounded-xl shadow-sm">
                <Ruler className="h-5 w-5" />
              </span>
              <div>
                <CardTitle className="text-base font-bold text-slate-900">
                  Joint Measurement Claim
                </CardTitle>
                <CardDescription className="text-xs">
                  Submit completed work quantities for joint verification with Site Engineer
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="px-4 py-4 space-y-3.5">
            {/* Work Item Name */}
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Work Item / Trade Scope:
              </label>
              <input
                type="text"
                value={claimWorkItem}
                onChange={(e) => setClaimWorkItem(e.target.value)}
                placeholder="e.g. Tile Laying - 600x600 Vitrified or External Plaster"
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            {/* Quantity and Unit */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Claimed Quantity:
                </label>
                <input
                  type="number"
                  value={claimQty}
                  onChange={(e) => setClaimQty(Number(e.target.value))}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Unit of Measure:
                </label>
                <select
                  value={claimUnit}
                  onChange={(e) => setClaimUnit(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="sqft">sqft (Square Feet)</option>
                  <option value="sqm">sqm (Square Metres)</option>
                  <option value="cum">cum (Cubic Metres)</option>
                  <option value="rft">rft (Running Feet)</option>
                  <option value="points">points (MEP/Electrical)</option>
                  <option value="nos">nos (Pieces/Fixtures)</option>
                  <option value="MT">MT (Metric Ton)</option>
                </select>
              </div>
            </div>

            {/* Site Location */}
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Specific Location on Site:
              </label>
              <input
                type="text"
                value={claimLocation}
                onChange={(e) => setClaimLocation(e.target.value)}
                placeholder="e.g. Wing B - 4th Floor Flats 401 to 404"
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            {/* Dimension Breakdown */}
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Dimensions / Measurement Breakdown:
              </label>
              <input
                type="text"
                value={claimDimensions}
                onChange={(e) => setClaimDimensions(e.target.value)}
                placeholder="e.g. L=40ft x W=15ft = 600 sqft"
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            {/* Camera Snap for Physical Measurement Sheet */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Camera className="h-5 w-5 text-purple-600" />
                <div>
                  <p className="text-xs font-bold text-slate-800">Measurement Sheet / Site Photo</p>
                  <p className="text-[11px] text-slate-500">Attach signed paper sheet or work photo</p>
                </div>
              </div>
              <label className="cursor-pointer bg-white border border-slate-300 hover:bg-slate-100 text-slate-800 px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm">
                📷 Snap Sheet
                <input type="file" accept="image/*" capture="environment" className="hidden" />
              </label>
            </div>

            {/* Notes */}
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Joint Inspection Notes:
              </label>
              <input
                type="text"
                value={claimNotes}
                onChange={(e) => setClaimNotes(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            {/* Submit Button */}
            <Button
              size="lg"
              onClick={() => claimMutation.mutate()}
              disabled={claimMutation.isPending || claimQty <= 0}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold h-12 rounded-xl text-sm gap-2 shadow-md"
            >
              {claimMutation.isPending ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="h-5 w-5" />
              )}
              ⚡ Submit Joint Measurement Claim ({claimQty} {claimUnit})
            </Button>
          </CardContent>
        </Card>
      )}

      {/* ───────────────────────────────────────────────────────────────────────── */}
      {/* TAB 3: CLAIMS HISTORY & VERIFICATION STATUS                               */}
      {/* ───────────────────────────────────────────────────────────────────────── */}
      {activeTab === "history" && (
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="pb-2 pt-4 px-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-purple-100 text-purple-700">
                  <FileSpreadsheet className="h-4 w-4" />
                </span>
                <CardTitle className="text-sm font-bold text-slate-900">
                  Measurement Claims History
                </CardTitle>
              </div>
              <Badge variant="outline" className="text-xs">
                {claims.length} Claims
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            {claims.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">
                No measurement claims submitted yet. Use "Claim Measurement" tab.
              </p>
            ) : (
              <div className="space-y-2.5">
                {claims.map((c: any) => {
                  const isApproved = c.status === "approved";
                  const isVerified = c.status === "verified";
                  const isRejected = c.status === "rejected";

                  return (
                    <div
                      key={c.id}
                      className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900">{c.claimNumber}</span>
                        <Badge
                          className={
                            isApproved
                              ? "bg-emerald-100 text-emerald-800"
                              : isVerified
                              ? "bg-blue-100 text-blue-800"
                              : isRejected
                              ? "bg-rose-100 text-rose-800"
                              : "bg-amber-100 text-amber-800"
                          }
                        >
                          {isApproved
                            ? "Approved"
                            : isVerified
                            ? "Verified by Engineer"
                            : isRejected
                            ? "Rejected"
                            : "Under Verification"}
                        </Badge>
                      </div>

                      <p className="font-semibold text-slate-800">{c.workItem}</p>
                      <div className="flex items-center justify-between text-[11px] text-slate-500">
                        <span>
                          Claimed: <strong className="text-slate-900">{c.quantity} {c.unit}</strong>
                        </span>
                        <span>{c.location}</span>
                      </div>
                      {c.notes && (
                        <p className="text-[11px] text-slate-500 bg-white p-1.5 rounded border border-slate-100">
                          {c.notes}
                        </p>
                      )}
                      <p className="text-[10px] text-slate-400 pt-1 border-t border-slate-100">
                        Submitted: {String(c.submittedAt).slice(0, 10)} by {c.submittedBy}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ───────────────────────────────────────────────────────────────────────── */}
      {/* TAB 4: SUBCONTRACTOR RA BILLS & PAYMENTS                                  */}
      {/* ───────────────────────────────────────────────────────────────────────── */}
      {activeTab === "bills" && (
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="pb-2 pt-4 px-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-emerald-100 text-emerald-700">
                  <IndianRupee className="h-4 w-4" />
                </span>
                <CardTitle className="text-sm font-bold text-slate-900">
                  Subcontractor RA Bills
                </CardTitle>
              </div>
              <Badge variant="outline" className="text-xs">
                {bills.length} Bills
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            {bills.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">
                No RA bills generated yet for this site. Once claims are certified, bills appear here.
              </p>
            ) : (
              <div className="space-y-2.5">
                {bills.map((b: any) => (
                  <div
                    key={b.id}
                    className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900">{b.billNumber}</span>
                        <Badge
                          className={
                            b.status === "paid"
                              ? "bg-emerald-100 text-emerald-800"
                              : b.status === "approved"
                              ? "bg-blue-100 text-blue-800"
                              : "bg-amber-100 text-amber-800"
                          }
                        >
                          {b.status}
                        </Badge>
                      </div>
                      <p className="text-slate-600 mt-0.5">{b.milestone}</p>
                      <p className="text-[11px] text-slate-400">
                        Date: {String(b.date).slice(0, 10)}
                      </p>
                    </div>

                    <div className="text-right">
                      <span className="text-base font-black text-slate-900">
                        ₹{Number(b.amount).toLocaleString()}
                      </span>
                      <p className="text-[10px] text-slate-400">Bill Value</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ───────────────────────────────────────────────────────────────────────── */}
      {/* MODAL: Pocket Drawings                                                    */}
      {/* ───────────────────────────────────────────────────────────────────────── */}
      <PocketDrawingsModal
        open={showDrawings}
        onOpenChange={setShowDrawings}
        projectId={selectedProjectId}
      />
    </div>
  );
}

