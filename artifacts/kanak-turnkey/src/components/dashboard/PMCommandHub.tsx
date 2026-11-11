import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  useListProjects,
  useGetDashboardSummary,
  useGetCurrentUser,
} from "@workspace/api-client-react";
import {
  Briefcase,
  HardHat,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  IndianRupee,
  ShoppingCart,
  Receipt,
  FileCheck,
  Users,
  Eye,
  RotateCcw,
  ChevronRight,
  Sparkles,
  MapPin,
  Calendar,
  Layers,
} from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

const INR = (v: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(v);

export function PMCommandHub() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: user } = useGetCurrentUser();
  const { data: projects, isLoading: loadingProjects } = useListProjects();
  const { data: summary } = useGetDashboardSummary();

  // Query Approvals Summary
  const { data: approvals, isLoading: loadingApprovals, refetch: refetchApprovals } = useQuery({
    queryKey: ["approvals_summary"],
    queryFn: async () => {
      const res = await fetch("/api/approvals/summary");
      return res.json();
    },
  });

  // Query Team Deployment
  const { data: teamAttendance, isLoading: loadingTeam, refetch: refetchTeam } = useQuery({
    queryKey: ["attendance_team"],
    queryFn: async () => {
      const res = await fetch("/api/attendance/team");
      return res.json();
    },
  });

  // Revision Dialog State
  const [revisionDialogOpen, setRevisionDialogOpen] = useState(false);
  const [revisionDprId, setRevisionDprId] = useState<number | null>(null);
  const [revisionNotes, setRevisionNotes] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  // Evidence Modal State (e.g. view full DPR photos)
  const [evidenceDpr, setEvidenceDpr] = useState<any | null>(null);

  // Approval Handlers
  const handleApproveDpr = async (id: number) => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/dpr/${id}/approve`, { method: "POST" });
      if (!res.ok) throw new Error("Approval failed");
      toast({ title: "DPR Approved", description: "Daily progress verified for billing & records." });
      refetchApprovals();
      queryClient.invalidateQueries();
    } catch (err: any) {
      toast({ title: "Action Failed", description: err.message, variant: "destructive" });
    } finally {
      setActionLoading(false);
    }
  };

  const handleRequestRevisionDpr = async () => {
    if (!revisionDprId) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/dpr/${revisionDprId}/request-revision`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: revisionNotes || "Please update site execution and photos." }),
      });
      if (!res.ok) throw new Error("Failed to request revision");
      toast({ title: "Revision Requested", description: "DPR returned to site engineer for updates." });
      setRevisionDialogOpen(false);
      setRevisionNotes("");
      refetchApprovals();
      queryClient.invalidateQueries();
    } catch (err: any) {
      toast({ title: "Action Failed", description: err.message, variant: "destructive" });
    } finally {
      setActionLoading(false);
    }
  };

  const handleApproveMr = async (id: number) => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/material-requests/${id}/approve`, { method: "POST" });
      if (!res.ok) throw new Error("Approval failed");
      toast({ title: "Material Request Approved", description: "Forwarded to procurement for purchase order." });
      refetchApprovals();
      queryClient.invalidateQueries();
    } catch (err: any) {
      toast({ title: "Action Failed", description: err.message, variant: "destructive" });
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectMr = async (id: number) => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/material-requests/${id}/reject`, { method: "POST" });
      if (!res.ok) throw new Error("Rejection failed");
      toast({ title: "Material Request Rejected" });
      refetchApprovals();
      queryClient.invalidateQueries();
    } catch (err: any) {
      toast({ title: "Action Failed", description: err.message, variant: "destructive" });
    } finally {
      setActionLoading(false);
    }
  };

  const handleApproveExpense = async (id: number) => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/expenses/${id}/approve`, { method: "POST" });
      if (!res.ok) throw new Error("Approval failed");
      toast({ title: "Expense Approved", description: "Passed to finance for float reimbursement." });
      refetchApprovals();
      queryClient.invalidateQueries();
    } catch (err: any) {
      toast({ title: "Action Failed", description: err.message, variant: "destructive" });
    } finally {
      setActionLoading(false);
    }
  };

  const activeProjects = (projects || []).filter((p) => p.status !== "archived" && p.status !== "handover");
  const totalApprovalsCount = approvals?.totalCount || 0;

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-10">
      {/* ── 1. Portfolio Command Banner ── */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white rounded-2xl p-5 sm:p-6 border border-slate-800 shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-primary/20 text-primary border border-primary/30">
                <Briefcase className="w-5 h-5" />
              </span>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
                Project Portfolio & Governance
              </h1>
              <Badge variant="outline" className="text-xs bg-indigo-500/20 text-indigo-200 border-indigo-400/30">
                PM Command Center
              </Badge>
            </div>
            <p className="text-xs sm:text-sm text-slate-300">
              Manage multi-site execution, review engineer DPRs, approve material requisitions, and audit field claims.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <Link href="/projects">
              <Button size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl gap-1.5 cursor-pointer shadow-sm">
                <Briefcase className="w-4 h-4" /> All Projects
              </Button>
            </Link>
          </div>
        </div>

        {/* Portfolio Stats Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-4 border-t border-slate-700/60 text-xs">
          <div>
            <span className="text-slate-400 block text-[11px]">Active Sites</span>
            <span className="text-xl sm:text-2xl font-extrabold text-white font-mono">
              {activeProjects.length}
            </span>
          </div>

          <div>
            <span className="text-slate-400 block text-[11px]">Total Portfolio Budget</span>
            <span className="text-lg sm:text-xl font-bold text-white font-mono">
              {INR(summary?.financials?.totalBudget || 0)}
            </span>
          </div>

          <div>
            <span className="text-slate-400 block text-[11px]">Pending Approvals</span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className={`text-xl sm:text-2xl font-extrabold font-mono ${totalApprovalsCount > 0 ? "text-amber-400" : "text-emerald-400"}`}>
                {totalApprovalsCount}
              </span>
              {totalApprovalsCount > 0 && (
                <Badge variant="outline" className="text-[10px] bg-amber-500/20 text-amber-300 border-amber-500/40">
                  Action Required
                </Badge>
              )}
            </div>
          </div>

          <div>
            <span className="text-slate-400 block text-[11px]">Invoiced to Clients</span>
            <span className="text-lg sm:text-xl font-bold text-emerald-400 font-mono">
              {INR(summary?.financials?.totalInvoiced || 0)}
            </span>
          </div>
        </div>
      </div>

      {/* ── 2. Consolidated Approvals Centre ── */}
      <Card className="border shadow-sm">
        <CardHeader className="p-4 sm:p-5 pb-3 border-b">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-primary" />
              <div>
                <CardTitle className="text-base sm:text-lg font-bold">
                  Consolidated Approval Centre
                </CardTitle>
                <CardDescription className="text-xs">
                  Review field evidence, workforce logs, and expense claims before endorsing
                </CardDescription>
              </div>
            </div>

            <Badge variant="secondary" className="font-mono text-xs font-bold px-2 py-0.5 self-start sm:self-auto">
              {totalApprovalsCount} Items Awaiting Review
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="p-4 sm:p-5">
          <Tabs defaultValue="dprs" className="space-y-4">
            <TabsList className="bg-muted/70 p-1 rounded-xl border border-border/80 flex-wrap h-auto gap-1">
              <TabsTrigger value="dprs" className="gap-1.5 text-xs font-bold">
                <HardHat className="w-3.5 h-3.5" /> Site DPRs
                <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0 font-mono">
                  {approvals?.dprs?.length || 0}
                </Badge>
              </TabsTrigger>

              <TabsTrigger value="materials" className="gap-1.5 text-xs font-bold">
                <ShoppingCart className="w-3.5 h-3.5" /> Material Requests
                <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0 font-mono">
                  {approvals?.materialRequests?.length || 0}
                </Badge>
              </TabsTrigger>

              <TabsTrigger value="expenses" className="gap-1.5 text-xs font-bold">
                <IndianRupee className="w-3.5 h-3.5" /> Site Float Claims
                <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0 font-mono">
                  {approvals?.expenses?.length || 0}
                </Badge>
              </TabsTrigger>

              <TabsTrigger value="rabills" className="gap-1.5 text-xs font-bold">
                <Receipt className="w-3.5 h-3.5" /> Client RA Bills
                <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0 font-mono">
                  {approvals?.raBills?.length || 0}
                </Badge>
              </TabsTrigger>
            </TabsList>

            {/* TAB 1: Site DPR Approvals */}
            <TabsContent value="dprs" className="space-y-3 pt-1">
              {approvals?.dprs && approvals.dprs.length > 0 ? (
                approvals.dprs.map((dpr: any) => (
                  <div
                    key={dpr.id}
                    className="p-4 rounded-xl border bg-card hover:border-primary/40 transition-colors space-y-3 shadow-2xs"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-2.5">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-sm font-bold text-foreground">{dpr.title}</h4>
                          <Badge variant="outline" className="text-[10px] uppercase font-bold text-blue-700 bg-blue-50 border-blue-200">
                            {dpr.status}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Submitted by <span className="font-semibold text-foreground">{dpr.submittedBy}</span> • Project: <span className="font-semibold text-foreground">{dpr.projectName}</span>
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setEvidenceDpr(dpr)}
                          className="h-8 text-xs gap-1 rounded-lg"
                        >
                          <Eye className="w-3.5 h-3.5" /> View Evidence
                        </Button>

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setRevisionDprId(dpr.id);
                            setRevisionDialogOpen(true);
                          }}
                          className="h-8 text-xs gap-1 text-amber-700 border-amber-300 hover:bg-amber-50 rounded-lg"
                        >
                          <RotateCcw className="w-3.5 h-3.5" /> Request Revision
                        </Button>

                        <Button
                          size="sm"
                          disabled={actionLoading}
                          onClick={() => handleApproveDpr(dpr.id)}
                          className="h-8 text-xs gap-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" /> Approve DPR
                        </Button>
                      </div>
                    </div>

                    {/* DPR Snapshot Metrics */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs bg-muted/30 p-2.5 rounded-lg">
                      <div>
                        <span className="text-muted-foreground block text-[10px]">Headcount</span>
                        <span className="font-bold text-foreground font-mono">
                          {dpr.meta?.totalLabour || 0} Personnel
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-[10px]">Weather</span>
                        <span className="font-bold text-foreground">
                          {dpr.meta?.weather || "Clear"}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-[10px]">Active Equipment</span>
                        <span className="font-bold text-foreground truncate block">
                          {dpr.meta?.machinery || "Standard tools"}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-[10px]">Site Proof Photos</span>
                        <span className="font-bold text-primary font-mono">
                          {dpr.meta?.photos?.length || 0} Images
                        </span>
                      </div>
                    </div>

                    {/* Execution Summary Snippet */}
                    {dpr.meta?.workExecuted && (
                      <div className="text-xs bg-card p-2 rounded border text-muted-foreground line-clamp-2">
                        <strong className="text-foreground">Work Log:</strong> {dpr.meta.workExecuted}
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground space-y-2 border rounded-xl bg-muted/10">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
                  <p className="text-sm font-semibold">All Site DPRs are Reviewed!</p>
                  <p className="text-xs">No pending progress reports requiring endorsement.</p>
                </div>
              )}
            </TabsContent>

            {/* TAB 2: Material Requests */}
            <TabsContent value="materials" className="space-y-3 pt-1">
              {approvals?.materialRequests && approvals.materialRequests.length > 0 ? (
                approvals.materialRequests.map((mr: any) => (
                  <div
                    key={mr.id}
                    className="p-3.5 sm:p-4 rounded-xl border bg-card flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-foreground">{mr.title}</h4>
                        <Badge variant="outline" className="text-[10px] uppercase font-bold text-amber-700 bg-amber-50 border-amber-200">
                          {mr.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Site: <span className="font-semibold text-foreground">{mr.projectName}</span> • Needed By: <span className="font-mono font-bold text-foreground">{mr.requiredDate ? format(new Date(mr.requiredDate), "dd MMM yyyy") : "ASAP"}</span>
                      </p>
                      {mr.notes && <p className="text-xs text-muted-foreground italic">"{mr.notes}"</p>}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={actionLoading}
                        onClick={() => handleRejectMr(mr.id)}
                        className="h-8 text-xs text-rose-600 hover:bg-rose-50 border-rose-200"
                      >
                        <XCircle className="w-3.5 h-3.5" /> Reject
                      </Button>

                      <Button
                        size="sm"
                        disabled={actionLoading}
                        onClick={() => handleApproveMr(mr.id)}
                        className="h-8 text-xs bg-blue-600 hover:bg-blue-700 text-white font-bold"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" /> Approve Indent
                      </Button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground space-y-1 border rounded-xl bg-muted/10">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
                  <p className="text-sm font-semibold">No Pending Material Requests</p>
                </div>
              )}
            </TabsContent>

            {/* TAB 3: Site Expenses */}
            <TabsContent value="expenses" className="space-y-3 pt-1">
              {approvals?.expenses && approvals.expenses.length > 0 ? (
                approvals.expenses.map((exp: any) => (
                  <div
                    key={exp.id}
                    className="p-3.5 sm:p-4 rounded-xl border bg-card flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-foreground">{exp.title}</h4>
                        <span className="text-base font-extrabold font-mono text-primary">
                          {INR(exp.amount)}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Site: <span className="font-semibold text-foreground">{exp.projectName}</span> • Logged: {format(new Date(exp.date), "dd MMM yyyy")}
                      </p>
                      {exp.notes && <p className="text-xs text-muted-foreground">"{exp.notes}"</p>}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        size="sm"
                        disabled={actionLoading}
                        onClick={() => handleApproveExpense(exp.id)}
                        className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" /> Approve Voucher
                      </Button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground space-y-1 border rounded-xl bg-muted/10">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
                  <p className="text-sm font-semibold">No Pending Expense Claims</p>
                </div>
              )}
            </TabsContent>

            {/* TAB 4: Client RA Bills */}
            <TabsContent value="rabills" className="space-y-3 pt-1">
              {approvals?.raBills && approvals.raBills.length > 0 ? (
                approvals.raBills.map((ra: any) => (
                  <div
                    key={ra.id}
                    className="p-3.5 sm:p-4 rounded-xl border bg-card flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-foreground">{ra.title}</h4>
                        <Badge variant="outline" className="text-[10px] uppercase font-bold text-primary">
                          {ra.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Project: <span className="font-semibold text-foreground">{ra.projectName}</span> • Bill Value: <span className="font-mono font-bold text-foreground">{INR(ra.amount)}</span>
                      </p>
                    </div>

                    <Link href={`/projects/${ra.projectId}?tab=rabills`}>
                      <Button size="sm" variant="outline" className="h-8 text-xs gap-1">
                        Review in Project Hub <ChevronRight className="w-3.5 h-3.5" />
                      </Button>
                    </Link>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground space-y-1 border rounded-xl bg-muted/10">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
                  <p className="text-sm font-semibold">No Pending RA Measurement Bills</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* ── 3. Engineer Deployment & Attendance Visibility ── */}
      <Card className="border shadow-sm">
        <CardHeader className="p-4 sm:p-5 pb-3 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              <div>
                <CardTitle className="text-base sm:text-lg font-bold">
                  Site Force Deployment & Muster
                </CardTitle>
                <CardDescription className="text-xs">
                  Real-time visibility of engineers on site, attendance timestamps, and today's DPR submissions
                </CardDescription>
              </div>
            </div>

            <Button
              size="sm"
              variant="outline"
              onClick={() => refetchTeam()}
              className="h-8 text-xs gap-1"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Refresh
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-4 sm:p-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {teamAttendance && teamAttendance.length > 0 ? (
              teamAttendance.map((member: any) => (
                <div
                  key={member.userId}
                  className="p-3.5 rounded-xl border bg-card hover:bg-muted/30 transition-colors space-y-2 shadow-2xs"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-primary/20 text-primary font-bold flex items-center justify-center text-xs shrink-0">
                        {member.name.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs font-bold text-foreground truncate">{member.name}</h4>
                        <p className="text-[10px] text-muted-foreground capitalize">
                          {member.activeRole?.replace("_", " ") || "Site Engineer"}
                        </p>
                      </div>
                    </div>

                    <Badge
                      variant="outline"
                      className={`text-[10px] capitalize font-bold shrink-0 ${
                        member.checkedIn
                          ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                          : "bg-slate-100 text-slate-600 border-slate-300"
                      }`}
                    >
                      {member.checkedIn ? "On Duty" : "Off Duty"}
                    </Badge>
                  </div>

                  <div className="space-y-1 text-[11px] pt-1 border-t text-muted-foreground">
                    <div className="flex justify-between">
                      <span>Assigned Site:</span>
                      <span className="font-semibold text-foreground truncate max-w-[130px]">
                        {member.projectName}
                      </span>
                    </div>

                    <div className="flex justify-between">
                      <span>Today's Arrival:</span>
                      <span className="font-mono font-semibold text-foreground">
                        {member.checkInTime ? format(new Date(member.checkInTime), "h:mm a") : "—"}
                      </span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span>DPR Logged:</span>
                      <Badge
                        variant="secondary"
                        className={`text-[9px] px-1.5 py-0 uppercase font-bold ${
                          member.dprLoggedToday
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {member.dprLoggedToday ? "Submitted" : "Pending"}
                      </Badge>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-muted-foreground py-4 text-center col-span-3">
                No site engineers active in muster today.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ── 4. Project Portfolio Cards & Drilldown ── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">
            Active Project Sites Portfolio
          </h2>
          <Link href="/projects">
            <Button variant="ghost" size="sm" className="text-xs text-primary gap-1 cursor-pointer">
              View All Sites <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {activeProjects.map((p) => (
            <Card key={p.id} className="border shadow-sm hover:border-primary/40 transition-colors flex flex-col justify-between">
              <CardHeader className="p-4 pb-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <CardTitle className="text-sm font-bold text-foreground truncate">
                      {p.name}
                    </CardTitle>
                    <CardDescription className="text-xs truncate">
                      {p.clientName} • {p.location || "Site"}
                    </CardDescription>
                  </div>

                  <Badge variant="outline" className="text-[10px] capitalize font-bold shrink-0">
                    {p.status.replace("_", " ")}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="p-4 pt-2 space-y-3 flex-1 flex flex-col justify-end">
                {/* Progress Bar */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-muted-foreground text-[11px]">Milestone Completion</span>
                    <span className="font-bold text-foreground">{p.progress}%</span>
                  </div>
                  <Progress value={p.progress} className="h-1.5" />
                </div>

                {/* Metrics */}
                <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t">
                  <div>
                    <span className="text-muted-foreground block text-[10px]">Project Budget</span>
                    <span className="font-bold font-mono text-foreground">
                      {p.budget ? INR(Number(p.budget)) : "N/A"}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[10px]">Site Float</span>
                    <span className="font-bold font-mono text-emerald-600">
                      {INR(Number((p as any).pettyCashFloat || 50000))}
                    </span>
                  </div>
                </div>

                {/* Action Link */}
                <Link href={`/projects/${p.id}`}>
                  <Button size="sm" variant="outline" className="w-full gap-1.5 text-xs h-9 rounded-xl cursor-pointer">
                    Open Project Command Hub <ChevronRight className="w-3.5 h-3.5" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* ── Revision Request Dialog ── */}
      <Dialog open={revisionDialogOpen} onOpenChange={setRevisionDialogOpen}>
        <DialogContent className="max-w-md sm:rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">Request DPR Revision</DialogTitle>
            <DialogDescription className="text-xs">
              Provide constructive feedback for the site engineer to correct or resubmit
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 py-2">
            <Textarea
              rows={4}
              placeholder="e.g. Please attach photo evidence for tiling progress and specify number of tile masons on site..."
              value={revisionNotes}
              onChange={(e) => setRevisionNotes(e.target.value)}
              className="text-xs"
            />
          </div>

          <DialogFooter className="flex gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setRevisionDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={actionLoading}
              onClick={handleRequestRevisionDpr}
              className="bg-amber-600 hover:bg-amber-700 text-white font-bold"
            >
              {actionLoading ? "Submitting..." : "Send Revision Note"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Evidence Inspection Modal ── */}
      {evidenceDpr && (
        <Dialog open={!!evidenceDpr} onOpenChange={() => setEvidenceDpr(null)}>
          <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto sm:rounded-2xl">
            <DialogHeader>
              <DialogTitle className="text-base font-bold">
                {evidenceDpr.title}
              </DialogTitle>
              <DialogDescription className="text-xs">
                Submitted by {evidenceDpr.submittedBy} • {evidenceDpr.projectName}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2 text-xs">
              <div className="p-3 rounded-xl bg-muted/40 border space-y-1.5">
                <span className="font-bold uppercase text-[10px] text-muted-foreground block">
                  Workforce & Site Metrics
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-muted-foreground">Total Workforce:</span>{" "}
                    <strong className="font-mono">{evidenceDpr.meta?.totalLabour || 0} Workers</strong>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Weather:</span>{" "}
                    <strong>{evidenceDpr.meta?.weather || "Clear"}</strong>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Supervisor:</span>{" "}
                    <strong>{evidenceDpr.meta?.supervisor || "Site Engineer"}</strong>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Equipment:</span>{" "}
                    <strong>{evidenceDpr.meta?.machinery || "Standard"}</strong>
                  </div>
                </div>
              </div>

              {evidenceDpr.meta?.workExecuted && (
                <div className="space-y-1">
                  <span className="font-bold text-foreground">Detailed Execution Log</span>
                  <div className="p-3 rounded-xl border bg-card whitespace-pre-line leading-relaxed text-slate-700 dark:text-slate-200">
                    {evidenceDpr.meta.workExecuted}
                  </div>
                </div>
              )}

              {/* Photos Gallery */}
              {evidenceDpr.meta?.photos && evidenceDpr.meta.photos.length > 0 && (
                <div className="space-y-1.5">
                  <span className="font-bold text-foreground">
                    Site Verification Photos ({evidenceDpr.meta.photos.length})
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    {evidenceDpr.meta.photos.map((p: any, idx: number) => (
                      <div key={idx} className="rounded-xl overflow-hidden border aspect-video bg-black/10">
                        <img src={p.url} alt={p.caption} className="w-full h-full object-cover" />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <DialogFooter className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setEvidenceDpr(null)}
              >
                Close
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  handleApproveDpr(evidenceDpr.id);
                  setEvidenceDpr(null);
                }}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
              >
                Endorse & Approve DPR
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
