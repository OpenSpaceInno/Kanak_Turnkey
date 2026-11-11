import { useEffect, useMemo, useState } from "react";
import {
  useListTasks,
  useListProjects,
  useListUsers,
  useUpdateTask,
  useDeleteTask,
  getListTasksQueryKey,
  getListProjectsQueryKey,
  getGetDashboardSummaryQueryKey,
  type Task,
  type TaskInput,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  Plus,
  Filter,
  Calendar,
  LayoutGrid,
  List as ListIcon,
  GanttChartSquare,
  Trash2,
  CheckCircle2,
} from "lucide-react";
import {
  format,
  differenceInCalendarDays,
  startOfMonth,
  addMonths,
  isWithinInterval,
  max as maxDate,
  min as minDate,
} from "date-fns";
import { NewTaskDialog } from "@/components/dialogs/create-dialogs";

type ViewMode = "board" | "list" | "gantt";

const STATUS_META: Record<
  string,
  { label: string; dot: string; bar: string; badge: "default" | "secondary" | "outline" | "destructive" }
> = {
  todo: { label: "Todo", dot: "bg-muted-foreground", bar: "bg-muted-foreground/60", badge: "outline" },
  in_progress: { label: "In Progress", dot: "bg-amber-500", bar: "bg-amber-500", badge: "secondary" },
  in_review: { label: "In Review", dot: "bg-sky-500", bar: "bg-sky-500", badge: "secondary" },
  completed: { label: "Completed", dot: "bg-emerald-600", bar: "bg-emerald-600", badge: "default" },
};

const PRIORITY_VARIANT: Record<string, "destructive" | "secondary" | "outline"> = {
  high: "destructive",
  medium: "secondary",
  low: "outline",
};

export default function Tasks() {
  const { data: tasks, isLoading } = useListTasks();
  const { data: projects } = useListProjects();
  const { data: users } = useListUsers();
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [search, setSearch] = useState("");
  const [view, setView] = useState<ViewMode>(() => {
    if (typeof window === "undefined") return "board";
    const v = new URLSearchParams(window.location.search).get("view");
    return v === "list" || v === "gantt" ? v : "board";
  });
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (view === "board") params.delete("view");
    else params.set("view", view);
    const qs = params.toString();
    const url = window.location.pathname + (qs ? `?${qs}` : "");
    window.history.replaceState(null, "", url);
  }, [view]);
  const [projectFilter, setProjectFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const projectMap = useMemo(() => {
    const m = new Map<number, string>();
    (projects ?? []).forEach(p => m.set(p.id, p.name));
    return m;
  }, [projects]);

  const filteredTasks = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (tasks ?? []).filter(t => {
      if (q && !(t.title.toLowerCase().includes(q) || (t.description ?? "").toLowerCase().includes(q))) {
        return false;
      }
      if (projectFilter !== "all" && String(t.projectId) !== projectFilter) return false;
      if (statusFilter !== "all" && t.status !== statusFilter) return false;
      return true;
    });
  }, [tasks, search, projectFilter, statusFilter]);

  const statuses = ["todo", "in_progress", "in_review", "completed"] as const;

  if (isLoading) {
    return <div className="p-6">Loading tasks...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tasks</h1>
          <p className="text-muted-foreground">Cross-project task management.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
          <Tabs value={view} onValueChange={v => setView(v as ViewMode)}>
            <TabsList>
              <TabsTrigger value="board" className="gap-1.5 text-xs sm:text-sm">
                <LayoutGrid className="h-4 w-4" /> Board
              </TabsTrigger>
              <TabsTrigger value="list" className="gap-1.5 text-xs sm:text-sm">
                <ListIcon className="h-4 w-4" /> List
              </TabsTrigger>
              <TabsTrigger value="gantt" className="gap-1.5 text-xs sm:text-sm">
                <GanttChartSquare className="h-4 w-4" /> Gantt
              </TabsTrigger>
            </TabsList>
          </Tabs>
          <NewTaskDialog
            trigger={
              <Button className="shrink-0 gap-1.5 text-xs sm:text-sm">
                <Plus className="h-4 w-4" /> New Task
              </Button>
            }
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[220px] max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search tasks..."
            className="pl-8"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <Select value={projectFilter} onValueChange={setProjectFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="All projects" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All projects</SelectItem>
            {(projects ?? []).map(p => (
              <SelectItem key={p.id} value={String(p.id)}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {statuses.map(s => (
              <SelectItem key={s} value={s}>
                {STATUS_META[s].label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" size="icon" title="More filters">
          <Filter className="h-4 w-4" />
        </Button>
        <div className="ml-auto text-sm text-muted-foreground">
          {filteredTasks.length} of {tasks?.length ?? 0} tasks
        </div>
      </div>

      {view === "board" && (
        <BoardView
          tasks={filteredTasks}
          projectMap={projectMap}
          statuses={[...statuses]}
          onSelectTask={setSelectedTask}
        />
      )}
      {view === "list" && (
        <ListView
          tasks={filteredTasks}
          projectMap={projectMap}
          onSelectTask={setSelectedTask}
        />
      )}
      {view === "gantt" && (
        <GanttView
          tasks={filteredTasks}
          projectMap={projectMap}
          onSelectTask={setSelectedTask}
        />
      )}

      {selectedTask && (
        <EditTaskDialog
          task={selectedTask}
          open={!!selectedTask}
          onOpenChange={(open) => !open && setSelectedTask(null)}
          projects={projects ?? []}
          users={users ?? []}
        />
      )}
    </div>
  );
}

function BoardView({
  tasks,
  projectMap,
  statuses,
  onSelectTask,
}: {
  tasks: Task[];
  projectMap: Map<number, string>;
  statuses: string[];
  onSelectTask: (task: Task) => void;
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-start">
      {statuses.map(status => {
        const statusTasks = tasks.filter(t => t.status === status);
        const meta = STATUS_META[status];
        return (
          <div key={status} className="flex flex-col gap-3 bg-muted/30 p-3 rounded-lg border">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <span className={`h-2 w-2 rounded-full ${meta.dot}`} />
                <h3 className="font-semibold">{meta.label}</h3>
              </div>
              <Badge variant="secondary">{statusTasks.length}</Badge>
            </div>
            <div className="flex flex-col gap-3">
              {statusTasks.map(task => (
                <Card
                  key={task.id}
                  onClick={() => onSelectTask(task)}
                  className="cursor-pointer hover:border-primary/50 transition-all shadow-2xs hover:shadow-sm"
                >
                  <CardHeader className="p-3 pb-2">
                    <div className="flex justify-between items-start gap-2">
                      <CardTitle className="text-sm leading-tight font-medium hover:text-primary transition-colors">
                        {task.title}
                      </CardTitle>
                      <Badge variant={PRIORITY_VARIANT[task.priority]} className="text-[10px] px-1 py-0 h-4">
                        {task.priority}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="p-3 pt-0 text-xs space-y-2">
                    <div className="text-muted-foreground truncate" title={projectMap.get(task.projectId)}>
                      {projectMap.get(task.projectId) ?? `Project #${task.projectId}`}
                    </div>
                    {task.description && <p className="text-muted-foreground line-clamp-2">{task.description}</p>}
                    <div className="flex items-center justify-between text-muted-foreground pt-1">
                      <span className="truncate max-w-[100px]" title={task.assignedToName ?? "Unassigned"}>
                        {task.assignedToName ?? "Unassigned"}
                      </span>
                      {task.endDate && (
                        <span className="flex items-center gap-1 shrink-0">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(task.endDate), "MMM d")}
                        </span>
                      )}
                    </div>
                    {task.progress !== undefined && task.progress > 0 && (
                      <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-primary h-full transition-all"
                          style={{ width: `${task.progress}%` }}
                        />
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
              {statusTasks.length === 0 && (
                <div className="text-center p-4 border border-dashed rounded-md text-xs text-muted-foreground bg-card/50">
                  No tasks
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ListView({
  tasks,
  projectMap,
  onSelectTask,
}: {
  tasks: Task[];
  projectMap: Map<number, string>;
  onSelectTask: (task: Task) => void;
}) {
  const sorted = useMemo(
    () =>
      [...tasks].sort((a, b) => {
        const ad = a.endDate ? new Date(a.endDate).getTime() : Number.POSITIVE_INFINITY;
        const bd = b.endDate ? new Date(b.endDate).getTime() : Number.POSITIVE_INFINITY;
        return ad - bd;
      }),
    [tasks],
  );

  const today = new Date();

  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-muted-foreground border-b">
            <tr className="text-left">
              <th className="px-4 py-3 font-medium">Task</th>
              <th className="px-4 py-3 font-medium">Project</th>
              <th className="px-4 py-3 font-medium">Assignee</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Priority</th>
              <th className="px-4 py-3 font-medium">Start</th>
              <th className="px-4 py-3 font-medium">Due</th>
              <th className="px-4 py-3 font-medium w-[140px]">Progress</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {sorted.map(t => {
              const meta = STATUS_META[t.status];
              const due = t.endDate ? new Date(t.endDate) : null;
              const overdue = due && t.status !== "completed" && due < today;
              return (
                <tr
                  key={t.id}
                  onClick={() => onSelectTask(t)}
                  className="hover:bg-accent/40 transition-colors cursor-pointer"
                >
                  <td className="px-4 py-3">
                    <div className="font-medium hover:text-primary transition-colors">{t.title}</div>
                    {t.description && (
                      <div className="text-xs text-muted-foreground line-clamp-1">{t.description}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {projectMap.get(t.projectId) ?? `Project #${t.projectId}`}
                  </td>
                  <td className="px-4 py-3">{t.assignedToName ?? <span className="text-muted-foreground">Unassigned</span>}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1.5">
                      <span className={`h-2 w-2 rounded-full ${meta.dot}`} />
                      <span className="text-xs">{meta.label}</span>
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={PRIORITY_VARIANT[t.priority]} className="text-[10px] capitalize">
                      {t.priority}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {t.startDate ? format(new Date(t.startDate), "MMM d, yyyy") : "—"}
                  </td>
                  <td className={`px-4 py-3 ${overdue ? "text-destructive font-medium" : "text-muted-foreground"}`}>
                    {due ? format(due, "MMM d, yyyy") : "—"}
                    {overdue && <span className="ml-2 text-[10px] uppercase">overdue</span>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                        <div
                          className={`h-full ${meta.bar}`}
                          style={{ width: `${Math.min(100, Math.max(0, t.progress))}%` }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground w-8 text-right">{t.progress}%</span>
                    </div>
                  </td>
                </tr>
              );
            })}
            {sorted.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-muted-foreground">
                  No tasks match your filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function GanttView({
  tasks,
  projectMap,
  onSelectTask,
}: {
  tasks: Task[];
  projectMap: Map<number, string>;
  onSelectTask: (task: Task) => void;
}) {
  const dated = useMemo(
    () => tasks.filter(t => t.startDate && t.endDate),
    [tasks],
  );

  const range = useMemo(() => {
    if (dated.length === 0) return null;
    const starts = dated.map(t => new Date(t.startDate!));
    const ends = dated.map(t => new Date(t.endDate!));
    const minD = startOfMonth(minDate(starts));
    const maxRaw = maxDate(ends);
    const maxD = startOfMonth(addMonths(maxRaw, 1));
    return { start: minD, end: maxD };
  }, [dated]);

  if (!range) {
    return (
      <Card>
        <CardContent className="p-12 text-center text-muted-foreground">
          No tasks with start &amp; end dates to display on the Gantt chart.
        </CardContent>
      </Card>
    );
  }

  const totalDays = differenceInCalendarDays(range.end, range.start) || 1;
  const months: { label: string; offsetPct: number; widthPct: number }[] = [];
  let cursor = range.start;
  while (cursor < range.end) {
    const next = addMonths(cursor, 1);
    const offset = differenceInCalendarDays(cursor, range.start);
    const width = differenceInCalendarDays(next, cursor);
    months.push({
      label: format(cursor, "MMM yyyy"),
      offsetPct: (offset / totalDays) * 100,
      widthPct: (width / totalDays) * 100,
    });
    cursor = next;
  }

  const today = new Date();
  const todayPct = isWithinInterval(today, { start: range.start, end: range.end })
    ? (differenceInCalendarDays(today, range.start) / totalDays) * 100
    : null;

  // Group tasks by project
  const grouped = new Map<number, Task[]>();
  for (const t of dated) {
    const arr = grouped.get(t.projectId) ?? [];
    arr.push(t);
    grouped.set(t.projectId, arr);
  }
  for (const arr of grouped.values()) {
    arr.sort(
      (a, b) => new Date(a.startDate!).getTime() - new Date(b.startDate!).getTime(),
    );
  }

  const labelColWidth = 280;

  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <div className="min-w-[900px]">
          {/* Header: months */}
          <div className="flex border-b bg-muted/40 sticky top-0 z-10">
            <div
              className="shrink-0 px-4 py-2 text-xs font-medium text-muted-foreground border-r"
              style={{ width: labelColWidth }}
            >
              Task / Project
            </div>
            <div className="relative flex-1 h-9">
              {months.map(m => (
                <div
                  key={m.label}
                  className="absolute top-0 bottom-0 border-r flex items-center justify-center text-[11px] font-medium text-muted-foreground"
                  style={{ left: `${m.offsetPct}%`, width: `${m.widthPct}%` }}
                >
                  {m.label}
                </div>
              ))}
            </div>
          </div>

          {/* Rows */}
          <div className="relative">
            {todayPct !== null && (
              <div
                className="absolute top-0 bottom-0 w-px bg-primary/70 z-20 pointer-events-none"
                style={{ left: `calc(${labelColWidth}px + (100% - ${labelColWidth}px) * ${todayPct} / 100)` }}
                title={`Today: ${format(today, "MMM d, yyyy")}`}
              >
                <span className="absolute -top-1 -translate-x-1/2 text-[9px] font-semibold uppercase text-primary bg-background px-1">
                  today
                </span>
              </div>
            )}
            {[...grouped.entries()].map(([projectId, projTasks]) => (
              <div key={projectId}>
                <div className="flex bg-muted/20 border-b">
                  <div
                    className="shrink-0 px-4 py-1.5 text-xs font-semibold text-foreground border-r truncate"
                    style={{ width: labelColWidth }}
                    title={projectMap.get(projectId)}
                  >
                    {projectMap.get(projectId) ?? `Project #${projectId}`}
                    <span className="ml-2 font-normal text-muted-foreground">({projTasks.length})</span>
                  </div>
                  <div className="flex-1" />
                </div>
                {projTasks.map(t => {
                  const start = new Date(t.startDate!);
                  const end = new Date(t.endDate!);
                  const offset = differenceInCalendarDays(start, range.start);
                  const span = Math.max(1, differenceInCalendarDays(end, start) + 1);
                  const leftPct = (offset / totalDays) * 100;
                  const widthPct = (span / totalDays) * 100;
                  const meta = STATUS_META[t.status];
                  return (
                    <div
                      key={t.id}
                      onClick={() => onSelectTask(t)}
                      className="flex border-b hover:bg-accent/30 transition-colors cursor-pointer"
                    >
                      <div
                        className="shrink-0 px-4 py-2 border-r flex items-center gap-2"
                        style={{ width: labelColWidth }}
                      >
                        <span className={`h-2 w-2 rounded-full shrink-0 ${meta.dot}`} />
                        <div className="min-w-0">
                          <div className="text-xs font-medium truncate hover:text-primary transition-colors" title={t.title}>
                            {t.title}
                          </div>
                          <div className="text-[10px] text-muted-foreground truncate">
                            {t.assignedToName ?? "Unassigned"} · {t.priority}
                          </div>
                        </div>
                      </div>
                      <div className="relative flex-1 h-10">
                        {months.map(m => (
                          <div
                            key={m.label}
                            className="absolute top-0 bottom-0 border-r border-border/40"
                            style={{ left: `${m.offsetPct}%`, width: `${m.widthPct}%` }}
                          />
                        ))}
                        <div
                          className={`absolute top-1/2 -translate-y-1/2 h-5 rounded ${meta.bar} shadow-sm overflow-hidden`}
                          style={{ left: `${leftPct}%`, width: `${widthPct}%`, minWidth: 4 }}
                          title={`${t.title}\n${format(start, "MMM d")} → ${format(end, "MMM d, yyyy")}\n${t.progress}% complete`}
                        >
                          {t.progress > 0 && t.progress < 100 && (
                            <div
                              className="absolute inset-y-0 left-0 bg-foreground/25"
                              style={{ width: `${t.progress}%` }}
                            />
                          )}
                          <span className="absolute inset-0 px-2 text-[10px] font-medium text-white flex items-center truncate">
                            {widthPct > 8 ? `${t.progress}%` : ""}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 px-4 py-3 border-t text-xs text-muted-foreground">
            {(["todo", "in_progress", "in_review", "completed"] as const).map(s => (
              <div key={s} className="flex items-center gap-1.5">
                <span className={`h-2 w-3 rounded-sm ${STATUS_META[s].bar}`} />
                {STATUS_META[s].label}
              </div>
            ))}
            {tasks.length !== dated.length && (
              <span className="ml-auto italic">
                {tasks.length - dated.length} task(s) hidden — missing start or end date
              </span>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}

function EditTaskDialog({
  task,
  open,
  onOpenChange,
  projects,
  users,
}: {
  task: Task | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projects: { id: number; name: string }[];
  users: { id: number; name: string; roles?: string[]; activeRole?: string }[];
}) {
  const qc = useQueryClient();
  const { toast } = useToast();

  const [form, setForm] = useState({
    title: "",
    description: "",
    projectId: 0,
    assignedToId: "none",
    status: "todo",
    priority: "medium",
    progress: 0,
    startDate: "",
    endDate: "",
  });

  useEffect(() => {
    if (task) {
      setForm({
        title: task.title,
        description: task.description ?? "",
        projectId: task.projectId,
        assignedToId: task.assignedToId ? String(task.assignedToId) : "none",
        status: task.status,
        priority: task.priority,
        progress: task.progress ?? 0,
        startDate: task.startDate ? task.startDate.slice(0, 10) : "",
        endDate: task.endDate ? task.endDate.slice(0, 10) : "",
      });
    }
  }, [task]);

  const updateMutation = useUpdateTask({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListTasksQueryKey() });
        qc.invalidateQueries({ queryKey: getListProjectsQueryKey() });
        qc.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
        toast({ title: "Task updated successfully" });
        onOpenChange(false);
      },
      onError: () => toast({ title: "Failed to update task", variant: "destructive" }),
    },
  });

  const deleteMutation = useDeleteTask({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListTasksQueryKey() });
        qc.invalidateQueries({ queryKey: getListProjectsQueryKey() });
        qc.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
        toast({ title: "Task deleted" });
        onOpenChange(false);
      },
      onError: () => toast({ title: "Failed to delete task", variant: "destructive" }),
    },
  });

  if (!task) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Task</DialogTitle>
          <DialogDescription>
            Update status, assignment, timeline, or progress percentage.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label className="text-xs">Task Title *</Label>
            <Input
              value={form.title}
              onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
              placeholder="e.g. Electrical Rough-in"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Project</Label>
              <Select
                value={String(form.projectId)}
                onValueChange={(v) => setForm((p) => ({ ...p, projectId: Number(v) }))}
              >
                <SelectTrigger><SelectValue placeholder="Select project" /></SelectTrigger>
                <SelectContent>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={String(p.id)}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Assigned Engineer / User</Label>
              <Select
                value={form.assignedToId}
                onValueChange={(v) => setForm((p) => ({ ...p, assignedToId: v }))}
              >
                <SelectTrigger><SelectValue placeholder="Assign user" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Unassigned</SelectItem>
                  {users.map((u) => (
                    <SelectItem key={u.id} value={String(u.id)}>
                      {u.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Status</Label>
              <Select
                value={form.status}
                onValueChange={(v) => setForm((p) => ({ ...p, status: v }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todo">Todo</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="in_review">In Review</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Priority</Label>
              <Select
                value={form.priority}
                onValueChange={(v) => setForm((p) => ({ ...p, priority: v }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Progress ({form.progress}%)</Label>
              <Input
                type="number"
                min={0}
                max={100}
                value={form.progress}
                onChange={(e) => {
                  const val = Math.min(100, Math.max(0, Number(e.target.value) || 0));
                  setForm((p) => ({
                    ...p,
                    progress: val,
                    status: val === 100 ? "completed" : val > 0 && p.status === "todo" ? "in_progress" : p.status,
                  }));
                }}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Start Date</Label>
              <Input
                type="date"
                value={form.startDate}
                onChange={(e) => setForm((p) => ({ ...p, startDate: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Due / End Date</Label>
              <Input
                type="date"
                value={form.endDate}
                onChange={(e) => setForm((p) => ({ ...p, endDate: e.target.value }))}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Description & Scope</Label>
            <Textarea
              rows={3}
              value={form.description}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              placeholder="Task instructions, deliverables, inspection notes..."
            />
          </div>
        </div>

        <DialogFooter className="flex items-center justify-between sm:justify-between w-full">
          <Button
            type="button"
            variant="destructive"
            size="sm"
            className="gap-1.5"
            disabled={deleteMutation.isPending}
            onClick={() => {
              if (window.confirm("Are you sure you want to delete this task?")) {
                deleteMutation.mutate({ id: task.id });
              }
            }}
          >
            <Trash2 className="h-4 w-4" /> Delete
          </Button>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={updateMutation.isPending || !form.title.trim()}
              onClick={() => {
                updateMutation.mutate({
                  id: task.id,
                  data: {
                    title: form.title,
                    description: form.description || null,
                    projectId: form.projectId,
                    assignedToId: form.assignedToId === "none" ? null : Number(form.assignedToId),
                    status: form.status as any,
                    priority: form.priority as any,
                    progress: Number(form.progress),
                    startDate: form.startDate || null,
                    endDate: form.endDate || null,
                  },
                });
              }}
            >
              {updateMutation.isPending ? "Saving…" : "Save Changes"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
