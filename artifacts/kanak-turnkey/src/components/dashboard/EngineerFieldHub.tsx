import { useState, useMemo } from "react";
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
import {
  useListProjects,
  useListTasks,
  useUpdateTask,
  useListPunchListItems,
  useUpdatePunchListItem,
  useGetCurrentUser,
} from "@workspace/api-client-react";
import {
  HardHat,
  Clock,
  CheckCircle2,
  AlertCircle,
  IndianRupee,
  ShoppingCart,
  Camera,
  MapPin,
  Calendar,
  Sun,
  Flame,
  Check,
  ChevronRight,
  Plus,
  Play,
  RotateCw,
  SlidersHorizontal,
  ExternalLink,
  Compass,
  Zap,
} from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

import { StepDprWizardModal } from "@/components/field/StepDprWizardModal";
import { QuickAttendanceDialog } from "@/components/field/QuickAttendanceDialog";
import { QuickPunchDialog } from "@/components/field/QuickPunchDialog";
import { QuickExpenseDialog } from "@/components/field/QuickExpenseDialog";
import { QuickMaterialRequestDialog } from "@/components/field/QuickMaterialRequestDialog";
import { PocketDrawingsModal } from "@/components/field/PocketDrawingsModal";

export function EngineerFieldHub() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: user } = useGetCurrentUser();
  const { data: projects, isLoading: loadingProjects } = useListProjects();
  const { data: tasks, isLoading: loadingTasks } = useListTasks();
  const { data: punchItems } = useListPunchListItems();
  const updateTask = useUpdateTask();
  const updatePunch = useUpdatePunchListItem();

  // Active Project Selection (Defaults to first active project)
  const [selectedProjectId, setSelectedProjectId] = useState<number>(() => {
    return 1;
  });

  const activeProject = useMemo(() => {
    if (!projects || projects.length === 0) return null;
    return (
      projects.find((p) => p.id === selectedProjectId) ||
      projects.find((p) => p.status === "execution") ||
      projects[0]
    );
  }, [projects, selectedProjectId]);

  // Query today's attendance
  const { data: attendance, refetch: refetchAttendance } = useQuery({
    queryKey: ["attendance_today"],
    queryFn: async () => {
      const res = await fetch("/api/attendance/today");
      return res.json();
    },
  });

  // Query today's DPR for active project
  const { data: todayDpr, refetch: refetchDpr } = useQuery({
    queryKey: ["dpr_today", activeProject?.id],
    queryFn: async () => {
      if (!activeProject?.id) return { exists: false, status: "not_started" };
      const res = await fetch(`/api/dpr/today?projectId=${activeProject.id}`);
      return res.json();
    },
    enabled: !!activeProject?.id,
  });

  // Modal Triggers
  const [dprModalOpen, setDprModalOpen] = useState(false);
  const [attendanceModalOpen, setAttendanceModalOpen] = useState(false);
  const [punchModalOpen, setPunchModalOpen] = useState(false);
  const [expenseModalOpen, setExpenseModalOpen] = useState(false);
  const [mrModalOpen, setMrModalOpen] = useState(false);
  const [drawingsModalOpen, setDrawingsModalOpen] = useState(false);
  const [isTogglingAttendance, setIsTogglingAttendance] = useState(false);

  // 1-Tap Zero-Form Attendance Toggle
  const handleQuickAttendanceToggle = async () => {
    setIsTogglingAttendance(true);
    try {
      let gps = null;
      if (typeof navigator !== "undefined" && navigator.geolocation) {
        try {
          const pos: any = await new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 3000 });
          });
          if (pos?.coords) {
            gps = `${pos.coords.latitude.toFixed(5)}, ${pos.coords.longitude.toFixed(5)}`;
          }
        } catch {
          // ignore geolocation failure
        }
      }

      const res = await fetch("/api/attendance/quick-toggle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: activeProject?.id,
          gpsCoordinates: gps,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update attendance");

      await refetchAttendance();
      queryClient.invalidateQueries({ queryKey: ["attendance_today"] });
      toast({
        title: data.checkedIn ? "🟢 Shift Clocked In" : "🏁 Shift Completed",
        description: data.message,
      });
    } catch (err: any) {
      toast({
        title: "Attendance Error",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setIsTogglingAttendance(false);
    }
  };

  // Filter tasks for active project
  const projectTasks = useMemo(() => {
    if (!tasks || !activeProject) return [];
    return tasks.filter((t) => t.projectId === activeProject.id);
  }, [tasks, activeProject]);

  const activeTasks = projectTasks.filter(
    (t) => t.status === "in_progress" || t.status === "todo"
  );
  const completedTasks = projectTasks.filter((t) => t.status === "completed");

  // Filter punch defects for active project
  const openPunchItems = useMemo(() => {
    if (!punchItems || !activeProject) return [];
    return punchItems.filter(
      (p) => p.projectId === activeProject.id && p.status !== "resolved"
    );
  }, [punchItems, activeProject]);

  // Quick Task Progress Updater
  const handleProgressIncrement = async (task: any, forceComplete = false) => {
    const nextProgress = forceComplete ? 100 : Math.min(100, (task.progress || 0) + 25);
    const nextStatus = nextProgress >= 100 ? "completed" : "in_progress";

    try {
      await updateTask.mutateAsync({
        id: task.id,
        data: {
          title: task.title,
          projectId: task.projectId,
          progress: nextProgress,
          status: nextStatus as any,
        },
      });
      queryClient.invalidateQueries();
      toast({
        title: "Progress Updated",
        description: `Task updated to ${nextProgress}% (${nextStatus.replace("_", " ")}).`,
      });
    } catch (err: any) {
      toast({ title: "Failed to update progress", variant: "destructive" });
    }
  };

  const handleResolvePunch = async (id: number) => {
    try {
      await updatePunch.mutateAsync({
        id,
        data: {
          status: "resolved" as any,
        },
      });
      queryClient.invalidateQueries();
      toast({ title: "Defect Resolved", description: "Item marked as rectified." });
    } catch {
      toast({ title: "Failed to resolve defect", variant: "destructive" });
    }
  };

  const isCheckedIn = attendance?.checkedIn;
  const dprStatus = todayDpr?.status || "not_started";

  return (
    <div className="space-y-4 sm:space-y-6 w-full pb-10">
      {/* ── 1. Top Header & Site Switcher ── */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 text-white rounded-2xl p-5 sm:p-6 border border-slate-800 shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                <HardHat className="w-5 h-5" />
              </span>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                Site Operations & Field Execution Hub
              </h1>
              <Badge variant="outline" className="text-xs bg-emerald-500/20 text-emerald-300 border-emerald-400/30">
                Lead Site Engineer
              </Badge>
            </div>
            <p className="text-xs sm:text-sm text-slate-300">
              Welcome back, <span className="font-semibold text-white">{user?.name}</span> • Live site DPR logging, geofenced muster, drawings, and task progress
            </p>
          </div>

          {/* Active Site Selector */}
          <div className="flex items-center gap-2 min-w-0 sm:w-72">
            <MapPin className="w-4 h-4 text-emerald-400 shrink-0" />
            <select
              value={activeProject?.id || 1}
              onChange={(e) => setSelectedProjectId(Number(e.target.value))}
              className="w-full h-10 px-3 rounded-xl border border-slate-700 bg-slate-800/90 text-white text-xs sm:text-sm font-semibold truncate focus:ring-2 focus:ring-emerald-500 focus:outline-hidden cursor-pointer"
            >
              {(projects || []).map((p) => (
                <option key={p.id} value={p.id} className="bg-slate-900 text-white">
                  {p.name} ({p.location || "Site"})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Project Snapshot Pill Bar */}
        {activeProject && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4 pt-3 border-t border-slate-700/60 text-xs">
            <div>
              <span className="text-slate-400 block text-[11px]">Client</span>
              <span className="font-bold text-white truncate block">{activeProject.clientName || "Direct"}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Location</span>
              <span className="font-bold text-white truncate block">{activeProject.location || "Metropolitan"}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Lifecycle Phase</span>
              <span className="font-bold capitalize text-emerald-400 block">{activeProject.status.replace("_", " ")}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Site Weather</span>
              <span className="font-bold text-white flex items-center gap-1">
                <Sun className="w-3.5 h-3.5 text-amber-400" /> Sunny 29°C
              </span>
            </div>
          </div>
        )}
      </div>

      {/* ── 2. Mandatory Status Cards: Attendance & DPR ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {/* Card A: Attendance */}
        <Card className={`border shadow-sm transition-colors ${isCheckedIn ? "border-emerald-500/30 bg-emerald-50/20 dark:bg-emerald-950/10" : "border-amber-500/30 bg-amber-50/20 dark:bg-amber-950/10"}`}>
          <CardContent className="p-4 sm:p-5 flex items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className={`p-2.5 rounded-xl shrink-0 ${isCheckedIn ? "bg-emerald-500/10 text-emerald-600" : "bg-amber-500/10 text-amber-600"}`}>
                <Clock className="w-6 h-6" />
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-foreground">
                    Site Attendance
                  </h3>
                  <Badge variant={isCheckedIn ? "default" : "outline"} className={`text-[10px] px-1.5 py-0 ${isCheckedIn ? "bg-emerald-600" : "text-amber-700 border-amber-300"}`}>
                    {isCheckedIn ? "Active Shift" : "Not Checked In"}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {isCheckedIn
                    ? `Clocked in at ${format(new Date(attendance.checkInTime), "h:mm a")} on ${attendance.projectName}`
                    : "Tap to record your morning presence and site GPS"}
                </p>
              </div>
            </div>

            <Button
              size="sm"
              disabled={isTogglingAttendance}
              onClick={handleQuickAttendanceToggle}
              className={`shrink-0 rounded-xl font-bold text-xs h-10 px-4 transition-all shadow-xs ${
                isCheckedIn
                  ? "bg-slate-800 hover:bg-slate-900 text-white"
                  : "bg-emerald-600 hover:bg-emerald-500 text-white active:scale-95 shadow-sm"
              }`}
            >
              {isTogglingAttendance ? (
                <RotateCw className="w-3.5 h-3.5 animate-spin mr-1.5" />
              ) : isCheckedIn ? (
                <Clock className="w-3.5 h-3.5 mr-1.5 text-emerald-400" />
              ) : (
                <Zap className="w-3.5 h-3.5 mr-1.5 text-amber-300 fill-current" />
              )}
              {isCheckedIn ? "Clock Out" : "1-Tap Clock In"}
            </Button>
          </CardContent>
        </Card>

        {/* Card B: Today's DPR */}
        <Card className={`border shadow-sm transition-colors ${
          dprStatus === "approved"
            ? "border-emerald-500/30 bg-emerald-50/20 dark:bg-emerald-950/10"
            : dprStatus === "submitted"
            ? "border-blue-500/30 bg-blue-50/20 dark:bg-blue-950/10"
            : "border-amber-500/30 bg-amber-50/20 dark:bg-amber-950/10"
        }`}>
          <CardContent className="p-4 sm:p-5 flex items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className={`p-2.5 rounded-xl shrink-0 ${
                dprStatus === "approved"
                  ? "bg-emerald-500/10 text-emerald-600"
                  : dprStatus === "submitted"
                  ? "bg-blue-500/10 text-blue-600"
                  : "bg-amber-500/10 text-amber-600"
              }`}>
                <HardHat className="w-6 h-6" />
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-foreground">
                    Today's DPR Status
                  </h3>
                  <Badge variant="outline" className={`text-[10px] px-1.5 py-0 uppercase font-bold ${
                    dprStatus === "approved"
                      ? "text-emerald-700 border-emerald-300 bg-emerald-50"
                      : dprStatus === "submitted"
                      ? "text-blue-700 border-blue-300 bg-blue-50"
                      : "text-amber-700 border-amber-300 bg-amber-50"
                  }`}>
                    {dprStatus.replace("_", " ")}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {dprStatus === "approved"
                    ? "Today's report verified and approved by PM"
                    : dprStatus === "submitted"
                    ? "Submitted to Project Manager • Awaiting approval"
                    : "Daily Progress Report pending for today's shift"}
                </p>
              </div>
            </div>

            <Button
              size="sm"
              onClick={() => setDprModalOpen(true)}
              className={`shrink-0 rounded-xl font-bold text-xs h-9 ${
                dprStatus === "submitted"
                  ? "bg-card border text-foreground hover:bg-muted"
                  : "bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs"
              }`}
            >
              {dprStatus === "submitted" ? "View / Amend" : "Log DPR"}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* ── 3. High-Touch Quick Actions Grid ── */}
      <div>
        <div className="flex items-center justify-between mb-2.5">
          <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">
            Site Quick Actions
          </h2>
          <span className="text-[11px] text-muted-foreground">Minimal typing • Touch optimized</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5">
          {/* Action 1: DPR */}
          <button
            type="button"
            onClick={() => setDprModalOpen(true)}
            className="flex flex-col items-center justify-center p-3 sm:p-4 rounded-2xl border bg-card hover:bg-muted/40 transition-all text-center group shadow-2xs hover:shadow-xs cursor-pointer"
          >
            <div className="w-11 h-11 rounded-xl bg-amber-500/10 text-amber-600 border border-amber-500/20 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
              <HardHat className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-foreground group-hover:text-primary transition-colors">
              Log DPR
            </span>
            <span className="text-[10px] text-muted-foreground mt-0.5">Step Wizard</span>
          </button>

          {/* Action 2: Indent */}
          <button
            type="button"
            onClick={() => setMrModalOpen(true)}
            className="flex flex-col items-center justify-center p-3 sm:p-4 rounded-2xl border bg-card hover:bg-muted/40 transition-all text-center group shadow-2xs hover:shadow-xs cursor-pointer"
          >
            <div className="w-11 h-11 rounded-xl bg-blue-500/10 text-blue-600 border border-blue-500/20 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
              <ShoppingCart className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-foreground group-hover:text-primary transition-colors">
              Material Indent
            </span>
            <span className="text-[10px] text-muted-foreground mt-0.5">Site Requisition</span>
          </button>

          {/* Action 3: Punch / Snag */}
          <button
            type="button"
            onClick={() => setPunchModalOpen(true)}
            className="flex flex-col items-center justify-center p-3 sm:p-4 rounded-2xl border bg-card hover:bg-muted/40 transition-all text-center group shadow-2xs hover:shadow-xs cursor-pointer"
          >
            <div className="w-11 h-11 rounded-xl bg-rose-500/10 text-rose-600 border border-rose-500/20 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
              <AlertCircle className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-foreground group-hover:text-primary transition-colors">
              Report Defect
            </span>
            <span className="text-[10px] text-muted-foreground mt-0.5">Camera Snag</span>
          </button>

          {/* Action 4: Pocket Drawings */}
          <button
            type="button"
            onClick={() => setDrawingsModalOpen(true)}
            className="flex flex-col items-center justify-center p-3 sm:p-4 rounded-2xl border bg-card hover:bg-muted/40 transition-all text-center group shadow-2xs hover:shadow-xs cursor-pointer"
          >
            <div className="w-11 h-11 rounded-xl bg-blue-500/10 text-blue-600 border border-blue-500/20 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
              <Compass className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-foreground group-hover:text-primary transition-colors">
              Blueprints
            </span>
            <span className="text-[10px] text-muted-foreground mt-0.5">Pocket Drawings</span>
          </button>

          {/* Action 5: Petty Cash Expense */}
          <button
            type="button"
            onClick={() => setExpenseModalOpen(true)}
            className="flex flex-col items-center justify-center p-3 sm:p-4 rounded-2xl border bg-card hover:bg-muted/40 transition-all text-center group shadow-2xs hover:shadow-xs cursor-pointer"
          >
            <div className="w-11 h-11 rounded-xl bg-indigo-500/10 text-indigo-600 border border-indigo-500/20 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
              <IndianRupee className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-foreground group-hover:text-primary transition-colors">
              Claim Expense
            </span>
            <span className="text-[10px] text-muted-foreground mt-0.5">Voucher & Bill</span>
          </button>
        </div>
      </div>

      {/* ── 4. Today's Work Plan & Quantity Tracking ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Active Work Items (2 Cols) */}
        <Card className="md:col-span-2 shadow-sm border">
          <CardHeader className="p-4 pb-2 border-b">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <HardHat className="w-4 h-4 text-primary" />
                <CardTitle className="text-sm font-bold">Today's Site Execution Plan</CardTitle>
              </div>
              <Badge variant="secondary" className="text-xs font-mono font-semibold">
                {activeTasks.length} In-Progress
              </Badge>
            </div>
            <CardDescription className="text-xs">
              Direct quantity & progress entry for {activeProject?.name || "current project"}
            </CardDescription>
          </CardHeader>

          <CardContent className="p-4 space-y-3">
            {activeTasks.length > 0 ? (
              activeTasks.slice(0, 5).map((task) => (
                <div
                  key={task.id}
                  className="p-3 rounded-xl border bg-card hover:bg-muted/30 transition-colors space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h4 className="text-xs sm:text-sm font-bold text-foreground truncate">
                        {task.title}
                      </h4>
                      <p className="text-[11px] text-muted-foreground line-clamp-1">
                        {task.description || "General site contract milestone"}
                      </p>
                    </div>

                    <Badge
                      variant="outline"
                      className={`text-[10px] capitalize font-mono shrink-0 ${
                        task.priority === "high"
                          ? "border-amber-400 bg-amber-50 text-amber-700"
                          : "border-border"
                      }`}
                    >
                      {task.priority}
                    </Badge>
                  </div>

                  {/* Progress & Quick Tap Stepper */}
                  <div className="space-y-1.5 pt-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground font-mono text-[11px]">
                        Progress: <span className="font-bold text-foreground">{task.progress || 0}%</span>
                      </span>

                      <div className="flex items-center gap-1.5">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleProgressIncrement(task)}
                          className="h-6 px-2 text-[10px] font-bold rounded-md gap-0.5 cursor-pointer"
                        >
                          <Plus className="w-3 h-3" /> 25% Done
                        </Button>

                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleProgressIncrement(task, true)}
                          className="h-6 px-2 text-[10px] text-emerald-600 hover:bg-emerald-50 rounded-md gap-0.5 cursor-pointer"
                        >
                          <Check className="w-3 h-3" /> Complete
                        </Button>
                      </div>
                    </div>

                    <Progress value={task.progress || 0} className="h-1.5" />
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-6 text-muted-foreground space-y-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
                <p className="text-xs font-semibold">No pending tasks for today!</p>
                <p className="text-[11px]">All assigned work orders are completed or up to date.</p>
              </div>
            )}

            <div className="pt-2 text-right">
              <Link href="/tasks">
                <Button variant="ghost" size="sm" className="text-xs gap-1 text-primary cursor-pointer">
                  View Full Task Schedule <ChevronRight className="w-3.5 h-3.5" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Open Punch / Defect Items (1 Col) */}
        <Card className="shadow-sm border">
          <CardHeader className="p-4 pb-2 border-b">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-500" />
                <CardTitle className="text-sm font-bold">Open Defect Snags</CardTitle>
              </div>
              <Badge variant="destructive" className="text-[10px] px-1.5 py-0 font-mono font-bold">
                {openPunchItems.length}
              </Badge>
            </div>
            <CardDescription className="text-xs">
              Quality items flagged on site
            </CardDescription>
          </CardHeader>

          <CardContent className="p-4 space-y-2.5">
            {openPunchItems.length > 0 ? (
              openPunchItems.slice(0, 4).map((punch) => (
                <div
                  key={punch.id}
                  className="p-2.5 rounded-xl border bg-muted/20 space-y-1.5"
                >
                  <div className="flex items-start justify-between gap-1.5">
                    <p className="text-xs font-bold text-foreground truncate">{punch.title}</p>
                    <Badge variant="outline" className="text-[9px] uppercase px-1 py-0 text-rose-600 border-rose-300">
                      {punch.priority}
                    </Badge>
                  </div>

                  <p className="text-[11px] text-muted-foreground line-clamp-1">
                    {punch.description || "Requires on-site inspection & fix"}
                  </p>

                  <div className="flex justify-end pt-1">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleResolvePunch(punch.id)}
                      className="h-6 px-2 text-[10px] text-emerald-600 hover:bg-emerald-50 rounded-md gap-1"
                    >
                      <Check className="w-3 h-3" /> Mark Fixed
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-6 text-muted-foreground space-y-1">
                <CheckCircle2 className="w-7 h-7 text-emerald-500 mx-auto" />
                <p className="text-xs font-semibold">Zero Quality Defects</p>
                <p className="text-[10px]">No open punch list snags on this site.</p>
              </div>
            )}

            <Button
              size="sm"
              variant="outline"
              onClick={() => setPunchModalOpen(true)}
              className="w-full text-xs gap-1 border-dashed mt-2"
            >
              <Plus className="w-3.5 h-3.5 text-primary" /> Report Defect with Photo
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Connected Modals */}
      <StepDprWizardModal
        open={dprModalOpen}
        onOpenChange={setDprModalOpen}
        defaultProjectId={activeProject?.id}
      />
      <QuickAttendanceDialog
        open={attendanceModalOpen}
        onOpenChange={setAttendanceModalOpen}
        defaultProjectId={activeProject?.id}
      />
      <QuickPunchDialog
        open={punchModalOpen}
        onOpenChange={setPunchModalOpen}
        defaultProjectId={activeProject?.id}
      />
      <QuickExpenseDialog
        open={expenseModalOpen}
        onOpenChange={setExpenseModalOpen}
        defaultProjectId={activeProject?.id}
      />
      <QuickMaterialRequestDialog
        open={mrModalOpen}
        onOpenChange={setMrModalOpen}
        defaultProjectId={activeProject?.id}
      />
      <PocketDrawingsModal
        open={drawingsModalOpen}
        onOpenChange={setDrawingsModalOpen}
        projectId={activeProject?.id || 1}
        projectName={activeProject?.name}
      />
    </div>
  );
}
