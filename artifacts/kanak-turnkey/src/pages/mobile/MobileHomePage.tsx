import { useState } from "react";
import { Link } from "wouter";
import {
  useGetCurrentUser,
  useGetDashboardSummary,
  useListProjects,
  useListTasks,
} from "@workspace/api-client-react";
import { MobileAttendanceWidget } from "@/components/mobile/MobileAttendanceWidget";
import { StepDprWizardModal } from "@/components/field/StepDprWizardModal";
import { QuickPunchDialog } from "@/components/field/QuickPunchDialog";
import { PocketDrawingsModal } from "@/components/field/PocketDrawingsModal";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  HardHat,
  Camera,
  FileText,
  Clock,
  Sparkles,
  ArrowRight,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  Package,
  Layers,
  Building2,
  Users,
} from "lucide-react";
import { ROLE_CONFIG } from "@/lib/role-navigation";
import { cn } from "@/lib/utils";

export default function MobileHomePage() {
  const { data: user } = useGetCurrentUser();
  const { data: summary } = useGetDashboardSummary();
  const { data: projects } = useListProjects();
  const { data: tasks } = useListTasks();

  const role = user?.activeRole || "viewer";
  const roleMeta = ROLE_CONFIG[role] || { label: "Viewer", shortLabel: "Viewer", icon: HardHat };

  const [activeProjectId, setActiveProjectId] = useState<number | undefined>(() => {
    const saved = localStorage.getItem("kanak_active_project_id");
    return saved ? Number(saved) : (projects && projects[0]?.id) || 1;
  });

  const activeProject = (projects || []).find((p) => p.id === activeProjectId) || projects?.[0];

  // Modals state
  const [dprOpen, setDprOpen] = useState(false);
  const [punchOpen, setPunchOpen] = useState(false);
  const [drawingsOpen, setDrawingsOpen] = useState(false);

  // Filter tasks for active site
  const siteTasks = (tasks || []).filter(
    (t) => !activeProject || t.projectId === activeProject.id
  ).slice(0, 4);

  return (
    <div className="space-y-4 pb-6">
      {/* 1. Welcome Card & Active Persona Greeting */}
      <div className="flex items-center justify-between gap-3 pt-1">
        <div>
          <p className="text-xs text-muted-foreground font-medium">
            Welcome back,
          </p>
          <h2 className="text-xl font-black tracking-tight text-foreground flex items-center gap-1.5">
            {user?.name?.split(" ")[0] || "User"}
            <span className="text-xs font-semibold text-primary px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20">
              {roleMeta.shortLabel}
            </span>
          </h2>
        </div>

        {/* Live System Time */}
        <div className="text-right">
          <Badge variant="outline" className="text-[10px] font-mono text-muted-foreground px-2 py-0.5">
            {new Date().toLocaleDateString("en-IN", { month: "short", day: "numeric" })}
          </Badge>
        </div>
      </div>

      {/* 2. Geofenced Site Attendance Widget */}
      <MobileAttendanceWidget
        projectId={activeProject?.id}
        projectName={activeProject?.name || "All Sites"}
      />

      {/* 3. Quick Action Launchers (Large Touch Buttons) */}
      <div className="grid grid-cols-3 gap-2.5">
        <button
          onClick={() => setDprOpen(true)}
          className="p-3 rounded-2xl bg-primary text-primary-foreground flex flex-col items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-transform"
        >
          <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
            <HardHat className="w-5 h-5 text-white" />
          </div>
          <span className="text-xs font-bold leading-tight">Daily DPR</span>
          <span className="text-[9px] text-white/80">Log Progress</span>
        </button>

        <button
          onClick={() => setPunchOpen(true)}
          className="p-3 rounded-2xl bg-card border border-border flex flex-col items-center justify-center gap-1.5 shadow-xs active:scale-95 transition-transform"
        >
          <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center">
            <Camera className="w-5 h-5 text-amber-500" />
          </div>
          <span className="text-xs font-bold leading-tight text-foreground">Photo Snag</span>
          <span className="text-[9px] text-muted-foreground">Defect List</span>
        </button>

        <button
          onClick={() => setDrawingsOpen(true)}
          className="p-3 rounded-2xl bg-card border border-border flex flex-col items-center justify-center gap-1.5 shadow-xs active:scale-95 transition-transform"
        >
          <div className="w-9 h-9 rounded-xl bg-blue-500/10 flex items-center justify-center">
            <Layers className="w-5 h-5 text-blue-500" />
          </div>
          <span className="text-xs font-bold leading-tight text-foreground">Drawings</span>
          <span className="text-[9px] text-muted-foreground">Pocket CAD</span>
        </button>
      </div>

      {/* 4. Active Project Snapshot Card */}
      {activeProject && (
        <Card className="rounded-2xl border-border/80 shadow-xs bg-card">
          <CardContent className="p-3.5 sm:p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-primary" />
                Active Site Focus
              </span>
              <Link href={`/projects/${activeProject.id}`}>
                <span className="text-xs font-bold text-primary hover:underline flex items-center gap-0.5">
                  View Dossier <ChevronRight className="w-3.5 h-3.5" />
                </span>
              </Link>
            </div>

            <h3 className="font-bold text-base text-foreground truncate">
              {activeProject.name}
            </h3>
            <p className="text-xs text-muted-foreground truncate mt-0.5">
              {activeProject.location || "Location not set"} • Client: {activeProject.clientName || "Direct"}
            </p>

            <div className="mt-3 pt-3 border-t border-border/60 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                  {activeProject.progress ?? 0}%
                </div>
                <span className="text-muted-foreground">Work Completed</span>
              </div>
              <Badge variant="outline" className="capitalize text-[10px]">
                {activeProject.status || "In Progress"}
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 5. Role-Tailored Mobile Quick Summary */}
      {(role as string) === "supervisor" && (
        <Card className="rounded-2xl border-border/80 shadow-xs bg-amber-500/5 border-amber-500/20">
          <CardContent className="p-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-amber-600" />
                <span className="text-xs font-bold text-foreground">Gang Headcount Today</span>
              </div>
              <Badge className="bg-amber-600 text-white text-xs">38 Labour</Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1.5">
              Masons: 12 • Carpenters: 8 • Helpers: 14 • Bar Benders: 4
            </p>
          </CardContent>
        </Card>
      )}

      {(role as string) === "storekeeper" && (
        <Card className="rounded-2xl border-border/80 shadow-xs bg-purple-500/5 border-purple-500/20">
          <CardContent className="p-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-purple-600" />
                <span className="text-xs font-bold text-foreground">Store & Inventory</span>
              </div>
              <Badge className="bg-purple-600 text-white text-xs">2 Pending GRN</Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1.5">
              Cement 43 Grade: 450 bags on hand • RMC deliveries expected today.
            </p>
          </CardContent>
        </Card>
      )}

      {/* 6. Today's Site Tasks */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <h3 className="font-bold text-sm text-foreground flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-primary" />
            Today's Activities ({siteTasks.length})
          </h3>
          <Link href="/tasks">
            <span className="text-xs font-semibold text-primary hover:underline">
              See All
            </span>
          </Link>
        </div>

        {siteTasks.length === 0 ? (
          <div className="p-6 text-center text-xs text-muted-foreground bg-card rounded-2xl border border-border">
            No pending tasks for this site today.
          </div>
        ) : (
          <div className="space-y-2">
            {siteTasks.map((task) => (
              <div
                key={task.id}
                className="p-3 rounded-xl bg-card border border-border flex items-center justify-between gap-3 shadow-xs"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-xs text-foreground truncate">
                    {task.title}
                  </p>
                  <p className="text-[11px] text-muted-foreground flex items-center gap-2 mt-0.5">
                    <span className="capitalize">{task.status || "todo"}</span>
                    {task.priority && (
                      <span className="capitalize font-mono">• {task.priority}</span>
                    )}
                  </p>
                </div>

                <Badge
                  variant={task.status === "completed" ? "default" : "outline"}
                  className="text-[10px] shrink-0"
                >
                  {task.progress ?? 0}%
                </Badge>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modals & Dialogs */}
      <StepDprWizardModal
        open={dprOpen}
        onOpenChange={setDprOpen}
        defaultProjectId={activeProject?.id || 1}
      />

      <QuickPunchDialog
        open={punchOpen}
        onOpenChange={setPunchOpen}
        defaultProjectId={activeProject?.id || 1}
      />

      <PocketDrawingsModal
        open={drawingsOpen}
        onOpenChange={setDrawingsOpen}
        projectId={activeProject?.id || 1}
      />
    </div>
  );
}
