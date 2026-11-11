import { useState } from "react";
import { useParams, Link } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetProject, getGetProjectQueryKey,
  useListTasks, getListTasksQueryKey,
  useListBudgetItems, getListBudgetItemsQueryKey,
  useListRaBills, getListRaBillsQueryKey,
  useListStakeholders, getListStakeholdersQueryKey,
  useListDocuments, getListDocumentsQueryKey,
  useListPunchListItems, getListPunchListItemsQueryKey,
  useCreatePunchListItem, useUpdatePunchListItem, useDeletePunchListItem,
  useUpdateProject,
  useCreateTask, useUpdateTask, useDeleteTask,
  useCreateBudgetItem, useUpdateBudgetItem, useDeleteBudgetItem,
  useCreateRaBill, useUpdateRaBill, useDeleteRaBill,
  useCreateStakeholder, useDeleteStakeholder,
  useCreateDocument,
  useListTaskTemplates,
  useGetTaskTemplate, getGetTaskTemplateQueryKey,
  useApplyTaskTemplate,
  useListUsers,
  useListCommunications,
  useCreateCommunication,
  getListCommunicationsQueryKey,
} from "@workspace/api-client-react";
import type {
  Project, Task, BudgetItem, RaBill, Stakeholder, PunchListItem,
  TaskInput, BudgetItemInput, StakeholderInput, DocumentInput,
  ProjectStatus,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  ChevronLeft, Plus, FileText, CheckCircle2, Circle, Clock,
  AlertCircle, CheckCheck, ArrowRight, ClipboardList, LayoutTemplate,
  Pencil, Trash2, Users, IndianRupee, TrendingUp, MoreHorizontal,
  HardHat, Sun, CloudRain, Hammer, Wrench,
} from "lucide-react";
import { format } from "date-fns";

const LIFECYCLE = [
  { key: "planning", label: "Planning", desc: "Project scoping & design" },
  { key: "procurement", label: "Procurement", desc: "Material sourcing & POs" },
  { key: "execution", label: "Execution", desc: "On-site works in progress" },
  { key: "qc", label: "QC & Testing", desc: "Quality checks & punch list" },
  { key: "handover", label: "Handover", desc: "Client handover & acceptance" },
  { key: "archived", label: "Archived", desc: "Project closed" },
] as const;

type Stage = typeof LIFECYCLE[number]["key"];

function nextStage(current: string): Stage | null {
  const idx = LIFECYCLE.findIndex(s => s.key === current);
  return idx >= 0 && idx < LIFECYCLE.length - 1 ? LIFECYCLE[idx + 1]!.key : null;
}

function prevStage(current: string): Stage | null {
  const idx = LIFECYCLE.findIndex(s => s.key === current);
  return idx > 0 ? LIFECYCLE[idx - 1]!.key : null;
}

const PL_STATUS: Record<string, { label: string; dot: string; badge: "default" | "secondary" | "outline" | "destructive" }> = {
  open: { label: "Open", dot: "bg-destructive", badge: "destructive" },
  in_progress: { label: "In Progress", dot: "bg-amber-500", badge: "secondary" },
  resolved: { label: "Resolved", dot: "bg-emerald-600", badge: "default" },
  closed: { label: "Closed", dot: "bg-muted-foreground", badge: "outline" },
};
const PL_PRIORITY: Record<string, "destructive" | "secondary" | "outline"> = {
  high: "destructive", medium: "secondary", low: "outline",
};
const PL_CATEGORIES = ["civil", "mechanical", "electrical", "finishing", "safety", "general"] as const;
const DOC_CATEGORIES = ["drawing", "contract", "approval", "report", "photo", "invoice", "other"] as const;
const DOC_STATUSES = ["draft", "active", "archived"] as const;

const INR = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });

const RA_STATUS_META: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  draft: { label: "Draft", variant: "outline" },
  submitted: { label: "Submitted", variant: "secondary" },
  approved: { label: "Approved", variant: "default" },
  rejected: { label: "Rejected", variant: "destructive" },
  invoiced: { label: "Invoiced", variant: "default" },
};

// ─── Edit Project Dialog ───────────────────────────────────────────────────────

function EditProjectDialog({ project, projectId, onSuccess }: { project: Project; projectId: number; onSuccess: () => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: project.name,
    clientName: project.clientName ?? "",
    location: project.location ?? "",
    type: project.type ?? "",
    status: project.status as string,
    budget: project.budget != null ? String(project.budget) : "",
    teamSize: project.teamSize != null ? String(project.teamSize) : "",
    startDate: project.startDate ?? "",
    endDate: project.endDate ?? "",
    progress: String(project.progress ?? 0),
    description: project.description ?? "",
  });
  const update = useUpdateProject();
  const { toast } = useToast();

  const handleSave = async () => {
    if (!form.name.trim()) return;
    await update.mutateAsync({
      id: projectId,
      data: {
        name: form.name,
        clientName: form.clientName || null,
        location: form.location || null,
        type: form.type || null,
        status: form.status as ProjectStatus,
        budget: form.budget ? Number(form.budget) : null,
        teamSize: form.teamSize ? Number(form.teamSize) : null,
        startDate: form.startDate || null,
        endDate: form.endDate || null,
        progress: Number(form.progress),
        description: form.description || null,
      } as Parameters<typeof update.mutateAsync>[0]["data"],
    });
    toast({ title: "Project updated" });
    setOpen(false);
    onSuccess();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Pencil className="h-4 w-4" /> Edit
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Edit Project</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 overflow-y-auto flex-1 pr-1">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-1.5">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">Project Name *</Label>
              <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">Client</Label>
              <Input value={form.clientName} onChange={e => setForm({ ...form, clientName: e.target.value })} placeholder="Client name" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">Location</Label>
              <Input value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} placeholder="City, State" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">Type</Label>
              <Input value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} placeholder="e.g. Interior Fit-out" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">Status</Label>
              <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {LIFECYCLE.map(s => <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">Budget (₹)</Label>
              <Input type="number" value={form.budget} onChange={e => setForm({ ...form, budget: e.target.value })} placeholder="e.g. 5000000" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">Team Size</Label>
              <Input type="number" value={form.teamSize} onChange={e => setForm({ ...form, teamSize: e.target.value })} placeholder="People on site" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">Progress (%)</Label>
              <Input type="number" min={0} max={100} value={form.progress} onChange={e => setForm({ ...form, progress: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">Start Date</Label>
              <Input type="date" value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">End Date</Label>
              <Input type="date" value={form.endDate} onChange={e => setForm({ ...form, endDate: e.target.value })} />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">Description</Label>
              <Textarea rows={3} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Project scope and objectives" />
            </div>
          </div>
        </div>
        <DialogFooter className="pt-2 border-t">
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={!form.name.trim() || update.isPending}>
            {update.isPending ? "Saving…" : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Create Task Dialog ───────────────────────────────────────────────────────

function CreateTaskDialog({ projectId, onSuccess }: { projectId: number; onSuccess: () => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", priority: "medium", status: "todo", assignedToId: "", startDate: "", endDate: "" });
  const create = useCreateTask();
  const { data: users } = useListUsers();
  const { toast } = useToast();

  const handleSave = async () => {
    if (!form.title.trim()) return;
    await create.mutateAsync({
      data: {
        projectId,
        title: form.title,
        description: form.description || null,
        priority: form.priority as TaskInput["priority"],
        status: form.status as TaskInput["status"],
        assignedToId: form.assignedToId ? Number(form.assignedToId) : null,
        startDate: form.startDate || null,
        endDate: form.endDate || null,
      },
    });
    toast({ title: "Task created" });
    setOpen(false);
    setForm({ title: "", description: "", priority: "medium", status: "todo", assignedToId: "", startDate: "", endDate: "" });
    onSuccess();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-2"><Plus className="w-4 h-4" /> Add Task</Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Create Task</DialogTitle></DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">Title *</Label>
            <Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Task title" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">Priority</Label>
              <Select value={form.priority} onValueChange={v => setForm({ ...form, priority: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">Status</Label>
              <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todo">To Do</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="in_review">In Review</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">Assign To</Label>
            <Select value={form.assignedToId} onValueChange={v => setForm({ ...form, assignedToId: v })}>
              <SelectTrigger><SelectValue placeholder="Unassigned" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">Unassigned</SelectItem>
                {users?.map(u => <SelectItem key={u.id} value={String(u.id)}>{u.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">Start Date</Label>
              <Input type="date" value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">Due Date</Label>
              <Input type="date" value={form.endDate} onChange={e => setForm({ ...form, endDate: e.target.value })} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">Description</Label>
            <Textarea rows={2} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Task details" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={!form.title.trim() || create.isPending}>
            {create.isPending ? "Creating…" : "Create Task"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Edit Task Dialog ─────────────────────────────────────────────────────────

function EditTaskDialog({ task, projectId, onSuccess }: { task: Task; projectId: number; onSuccess: () => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    title: task.title,
    description: task.description ?? "",
    priority: task.priority as string,
    status: task.status as string,
    progress: String(task.progress ?? 0),
    assignedToId: task.assignedToId ? String(task.assignedToId) : "",
    startDate: task.startDate ?? "",
    endDate: task.endDate ?? "",
  });
  const update = useUpdateTask();
  const del = useDeleteTask();
  const { data: users } = useListUsers();
  const { toast } = useToast();
  const qc = useQueryClient();

  const handleSave = async () => {
    await update.mutateAsync({
      id: task.id,
      data: {
        projectId,
        title: form.title,
        description: form.description || null,
        priority: form.priority as TaskInput["priority"],
        status: form.status as TaskInput["status"],
        progress: Number(form.progress),
        assignedToId: form.assignedToId ? Number(form.assignedToId) : null,
        startDate: form.startDate || null,
        endDate: form.endDate || null,
      } as TaskInput,
    });
    toast({ title: "Task updated" });
    setOpen(false);
    onSuccess();
  };

  const handleDelete = async () => {
    await del.mutateAsync({ id: task.id });
    await qc.invalidateQueries({ queryKey: getListTasksQueryKey({ projectId }) });
    toast({ title: "Task deleted", variant: "destructive" });
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Card className="p-3 shadow-sm hover:border-primary/50 cursor-pointer transition-colors">
          <div className="font-medium text-sm mb-1">{task.title}</div>
          {task.description && <div className="text-xs text-muted-foreground line-clamp-1 mb-2">{task.description}</div>}
          <div className="flex justify-between items-center text-xs text-muted-foreground mt-1">
            <span>{task.assignedToName || "Unassigned"}</span>
            <Badge variant="outline" className="text-[10px] h-4">{task.priority}</Badge>
          </div>
          {task.endDate && (
            <div className="text-[10px] text-muted-foreground mt-1">Due {format(new Date(task.endDate), "MMM d")}</div>
          )}
        </Card>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Edit Task</DialogTitle></DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">Title *</Label>
            <Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">Priority</Label>
              <Select value={form.priority} onValueChange={v => setForm({ ...form, priority: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">Status</Label>
              <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todo">To Do</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="in_review">In Review</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">Assign To</Label>
              <Select value={form.assignedToId} onValueChange={v => setForm({ ...form, assignedToId: v })}>
                <SelectTrigger><SelectValue placeholder="Unassigned" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Unassigned</SelectItem>
                  {users?.map(u => <SelectItem key={u.id} value={String(u.id)}>{u.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">Progress (%)</Label>
              <Input type="number" min={0} max={100} value={form.progress} onChange={e => setForm({ ...form, progress: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">Start Date</Label>
              <Input type="date" value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">Due Date</Label>
              <Input type="date" value={form.endDate} onChange={e => setForm({ ...form, endDate: e.target.value })} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">Description</Label>
            <Textarea rows={2} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
          </div>
        </div>
        <DialogFooter className="flex-row gap-2 justify-between">
          <Button variant="destructive" size="sm" onClick={handleDelete} disabled={del.isPending}>
            <Trash2 className="h-4 w-4 mr-1" /> Delete
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={!form.title.trim() || update.isPending}>
              {update.isPending ? "Saving…" : "Save"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Add Budget Item Dialog ───────────────────────────────────────────────────

function AddBudgetItemDialog({ projectId, onSuccess }: { projectId: number; onSuccess: () => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ costCode: "", description: "", budgeted: "", committed: "", actual: "" });
  const create = useCreateBudgetItem();
  const { toast } = useToast();

  const handleSave = async () => {
    if (!form.costCode.trim() || !form.description.trim()) return;
    await create.mutateAsync({
      projectId,
      data: {
        costCode: form.costCode,
        description: form.description,
        budgeted: Number(form.budgeted) || 0,
        committed: Number(form.committed) || 0,
        actual: Number(form.actual) || 0,
      },
    });
    toast({ title: "Budget item added" });
    setOpen(false);
    setForm({ costCode: "", description: "", budgeted: "", committed: "", actual: "" });
    onSuccess();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-2"><Plus className="w-4 h-4" /> Add Budget Item</Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Add Budget Item</DialogTitle></DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">Cost Code *</Label>
              <Input value={form.costCode} onChange={e => setForm({ ...form, costCode: e.target.value })} placeholder="e.g. 01-CIVIL" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">Budgeted (₹) *</Label>
              <Input type="number" value={form.budgeted} onChange={e => setForm({ ...form, budgeted: e.target.value })} placeholder="0" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">Description *</Label>
            <Input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Civil works — foundation" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">Committed (₹)</Label>
              <Input type="number" value={form.committed} onChange={e => setForm({ ...form, committed: e.target.value })} placeholder="0" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">Actual Spent (₹)</Label>
              <Input type="number" value={form.actual} onChange={e => setForm({ ...form, actual: e.target.value })} placeholder="0" />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={!form.costCode.trim() || !form.description.trim() || create.isPending}>
            {create.isPending ? "Adding…" : "Add Item"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Edit Budget Item Dialog ──────────────────────────────────────────────────

function EditBudgetItemDialog({ item, projectId, onSuccess }: { item: BudgetItem; projectId: number; onSuccess: () => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    costCode: item.costCode,
    description: item.description,
    budgeted: String(item.budgeted),
    committed: String(item.committed),
    actual: String(item.actual),
  });
  const update = useUpdateBudgetItem();
  const del = useDeleteBudgetItem();
  const { toast } = useToast();
  const qc = useQueryClient();

  const handleSave = async () => {
    await update.mutateAsync({
      id: item.id,
      data: {
        costCode: form.costCode,
        description: form.description,
        budgeted: Number(form.budgeted),
        committed: Number(form.committed),
        actual: Number(form.actual),
      } as BudgetItemInput,
    });
    toast({ title: "Budget item updated" });
    setOpen(false);
    onSuccess();
  };

  const handleDelete = async () => {
    await del.mutateAsync({ id: item.id });
    await qc.invalidateQueries({ queryKey: getListBudgetItemsQueryKey(projectId) });
    toast({ title: "Budget item deleted", variant: "destructive" });
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="ghost" className="h-7 w-7 p-0"><Pencil className="h-3.5 w-3.5" /></Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Edit Budget Item</DialogTitle></DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">Cost Code</Label>
              <Input value={form.costCode} onChange={e => setForm({ ...form, costCode: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">Budgeted (₹)</Label>
              <Input type="number" value={form.budgeted} onChange={e => setForm({ ...form, budgeted: e.target.value })} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">Description</Label>
            <Input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">Committed (₹)</Label>
              <Input type="number" value={form.committed} onChange={e => setForm({ ...form, committed: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">Actual Spent (₹)</Label>
              <Input type="number" value={form.actual} onChange={e => setForm({ ...form, actual: e.target.value })} />
            </div>
          </div>
        </div>
        <DialogFooter className="flex-row gap-2 justify-between">
          <Button variant="destructive" size="sm" onClick={handleDelete} disabled={del.isPending}>
            <Trash2 className="h-4 w-4 mr-1" /> Delete
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={update.isPending}>{update.isPending ? "Saving…" : "Save"}</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Create RA Bill Dialog ────────────────────────────────────────────────────

function CreateRaBillDialog({ projectId, onSuccess }: { projectId: number; onSuccess: () => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ description: "", amount: "", milestone: "" });
  const create = useCreateRaBill();
  const { toast } = useToast();

  const handleSave = async () => {
    if (!form.amount) return;
    await create.mutateAsync({
      data: {
        projectId,
        billNumber: "",
        description: form.description || null,
        amount: Number(form.amount),
        milestone: form.milestone || null,
      },
    });
    toast({ title: "RA Bill created" });
    setOpen(false);
    setForm({ description: "", amount: "", milestone: "" });
    onSuccess();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-2"><Plus className="w-4 h-4" /> Create RA Bill</Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create RA Bill</DialogTitle>
          <DialogDescription>Raise a Running Account (RA) bill for a project milestone. The bill number is auto-generated.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">Amount (₹) *</Label>
            <Input type="number" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} placeholder="e.g. 500000" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">Milestone</Label>
            <Input value={form.milestone} onChange={e => setForm({ ...form, milestone: e.target.value })} placeholder="e.g. Foundation complete — 30%" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">Description</Label>
            <Textarea rows={2} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Work details for this billing cycle" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={!form.amount || create.isPending}>
            {create.isPending ? "Creating…" : "Create Bill"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Add Stakeholder Dialog ───────────────────────────────────────────────────

function AddStakeholderDialog({ projectId, onSuccess }: { projectId: number; onSuccess: () => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "", organization: "", role: "", accessLevel: "read" });
  const create = useCreateStakeholder();
  const { toast } = useToast();

  const handleSave = async () => {
    if (!form.name.trim()) return;
    await create.mutateAsync({
      data: {
        projectId,
        name: form.name,
        email: form.email || null,
        phone: form.phone || null,
        organization: form.organization || null,
        role: form.role || null,
        accessLevel: form.accessLevel as StakeholderInput["accessLevel"],
      },
    });
    toast({ title: "Stakeholder added" });
    setOpen(false);
    setForm({ name: "", email: "", phone: "", organization: "", role: "", accessLevel: "read" });
    onSuccess();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-2"><Plus className="w-4 h-4" /> Add Stakeholder</Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Add Stakeholder</DialogTitle></DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">Name *</Label>
            <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Full name" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">Role</Label>
              <Input value={form.role} onChange={e => setForm({ ...form, role: e.target.value })} placeholder="e.g. Site Engineer" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">Access Level</Label>
              <Select value={form.accessLevel} onValueChange={v => setForm({ ...form, accessLevel: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="read">Read</SelectItem>
                  <SelectItem value="write">Write</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">Organization</Label>
            <Input value={form.organization} onChange={e => setForm({ ...form, organization: e.target.value })} placeholder="Company or firm name" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">Email</Label>
              <Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="email@example.com" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">Phone</Label>
              <Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="+91 98765 43210" />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={!form.name.trim() || create.isPending}>
            {create.isPending ? "Adding…" : "Add Stakeholder"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Add Document Dialog ──────────────────────────────────────────────────────

function AddDocumentDialog({ projectId, onSuccess }: { projectId: number; onSuccess: () => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ fileName: "", category: "drawing", status: "draft", description: "" });
  const create = useCreateDocument();
  const { toast } = useToast();

  const handleSave = async () => {
    if (!form.fileName.trim()) return;
    await create.mutateAsync({
      data: {
        projectId,
        fileName: form.fileName,
        category: form.category as DocumentInput["category"],
        status: form.status as DocumentInput["status"],
        description: form.description || null,
        fileType: null,
        fileSize: null,
        fileUrl: null,
      } as DocumentInput,
    });
    toast({ title: "Document recorded" });
    setOpen(false);
    setForm({ fileName: "", category: "drawing", status: "draft", description: "" });
    onSuccess();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-2"><Plus className="w-4 h-4" /> Add Document</Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Document</DialogTitle>
          <DialogDescription>Record a document reference. File upload can be linked via URL.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">Document Name *</Label>
            <Input value={form.fileName} onChange={e => setForm({ ...form, fileName: e.target.value })} placeholder="e.g. Foundation Plan Rev-3.pdf" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">Category</Label>
              <Select value={form.category} onValueChange={v => setForm({ ...form, category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DOC_CATEGORIES.map(c => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">Status</Label>
              <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DOC_STATUSES.map(s => <SelectItem key={s} value={s} className="capitalize">{s.replace("_", " ")}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">Notes</Label>
            <Textarea rows={2} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Revision notes, approvals, etc." />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={!form.fileName.trim() || create.isPending}>
            {create.isPending ? "Adding…" : "Add Document"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Add Daily Progress Report (DPR) Dialog ──────────────────────────────────

function AddDprDialog({
  projectId,
  onSuccess,
}: {
  projectId: number;
  onSuccess: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [dprDate, setDprDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [weather, setWeather] = useState("Sunny & Clear");
  const [masons, setMasons] = useState("4");
  const [carpenters, setCarpenters] = useState("6");
  const [electricians, setElectricians] = useState("2");
  const [plumbers, setPlumbers] = useState("2");
  const [painters, setPainters] = useState("0");
  const [helpers, setHelpers] = useState("8");
  const [workExecuted, setWorkExecuted] = useState("");
  const [machinery, setMachinery] = useState("");
  const [hindrances, setHindrances] = useState("");
  const [supervisor, setSupervisor] = useState("Site Engineer");

  const create = useCreateCommunication();
  const { toast } = useToast();

  const totalLabour =
    (Number(masons) || 0) +
    (Number(carpenters) || 0) +
    (Number(electricians) || 0) +
    (Number(plumbers) || 0) +
    (Number(painters) || 0) +
    (Number(helpers) || 0);

  const handleSave = async () => {
    if (!workExecuted.trim()) {
      toast({ title: "Work executed description required", variant: "destructive" });
      return;
    }

    const dprPayload = {
      weather,
      workforce: {
        masons: Number(masons) || 0,
        carpenters: Number(carpenters) || 0,
        electricians: Number(electricians) || 0,
        plumbers: Number(plumbers) || 0,
        painters: Number(painters) || 0,
        helpers: Number(helpers) || 0,
        total: totalLabour,
      },
      workExecuted: workExecuted.trim(),
      machinery: machinery.trim() || "Standard manual site tools",
      hindrances: hindrances.trim() || "No site hindrances reported.",
    };

    const formattedContent = `[DPR_META]${JSON.stringify(dprPayload)}[/DPR_META]\n\n**Work Executed Today:**\n${workExecuted.trim()}\n\n**Machinery & Tools Active:**\n${machinery.trim() || "Standard site tooling"}\n\n**Hindrances / Delays:**\n${hindrances.trim() || "None."}`;

    await create.mutateAsync({
      data: {
        projectId,
        communicationType: "other",
        subject: `DPR: ${format(new Date(dprDate), "MMM d, yyyy")} — ${totalLabour} Workers (${weather})`,
        content: formattedContent,
        participants: supervisor || "Site Supervisor",
        communicationDate: new Date(dprDate).toISOString(),
      },
    });

    toast({ title: "Daily Progress Report Logged", description: `DPR saved with ${totalLabour} workforce on site.` });
    setOpen(false);
    setWorkExecuted("");
    setMachinery("");
    setHindrances("");
    onSuccess();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white">
          <HardHat className="w-4 h-4" /> Log Daily Progress (DPR)
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <HardHat className="w-5 h-5 text-amber-500" />
            Site Daily Progress Report (DPR)
          </DialogTitle>
          <DialogDescription>
            Record workforce attendance, work completed today, plant & machinery on site, and any impediments.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">Report Date *</Label>
              <Input type="date" value={dprDate} onChange={(e) => setDprDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">Weather Condition</Label>
              <Select value={weather} onValueChange={setWeather}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Sunny & Clear">Sunny & Clear</SelectItem>
                  <SelectItem value="Partly Cloudy">Partly Cloudy</SelectItem>
                  <SelectItem value="Rain Hindrance / Wet">Rain Hindrance / Wet</SelectItem>
                  <SelectItem value="Extreme Heat">Extreme Heat</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Workforce Breakdown */}
          <div className="p-3 bg-muted/30 rounded-lg border space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Workforce On Site</Label>
              <Badge variant="secondary" className="font-mono text-xs">
                Total: {totalLabour} Workers
              </Badge>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              <div className="space-y-1 text-center">
                <span className="text-[10px] text-muted-foreground">Masons</span>
                <Input type="number" min={0} value={masons} onChange={(e) => setMasons(e.target.value)} className="h-8 text-center text-xs" />
              </div>
              <div className="space-y-1 text-center">
                <span className="text-[10px] text-muted-foreground">Carpenters</span>
                <Input type="number" min={0} value={carpenters} onChange={(e) => setCarpenters(e.target.value)} className="h-8 text-center text-xs" />
              </div>
              <div className="space-y-1 text-center">
                <span className="text-[10px] text-muted-foreground">Electricians</span>
                <Input type="number" min={0} value={electricians} onChange={(e) => setElectricians(e.target.value)} className="h-8 text-center text-xs" />
              </div>
              <div className="space-y-1 text-center">
                <span className="text-[10px] text-muted-foreground">Plumbers</span>
                <Input type="number" min={0} value={plumbers} onChange={(e) => setPlumbers(e.target.value)} className="h-8 text-center text-xs" />
              </div>
              <div className="space-y-1 text-center">
                <span className="text-[10px] text-muted-foreground">Painters</span>
                <Input type="number" min={0} value={painters} onChange={(e) => setPainters(e.target.value)} className="h-8 text-center text-xs" />
              </div>
              <div className="space-y-1 text-center">
                <span className="text-[10px] text-muted-foreground">Helpers</span>
                <Input type="number" min={0} value={helpers} onChange={(e) => setHelpers(e.target.value)} className="h-8 text-center text-xs" />
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">Work Executed Today *</Label>
            <Textarea
              rows={3}
              value={workExecuted}
              onChange={(e) => setWorkExecuted(e.target.value)}
              placeholder="e.g. Completed drywall partitions in Room 301-304 (220 sqft). Installed 18 LED ceiling panels. Finished conduit pressure tests."
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">Machinery & Plants Active</Label>
              <Input
                value={machinery}
                onChange={(e) => setMachinery(e.target.value)}
                placeholder="e.g. Scaffolding x 4, Tile cutter x 2"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">Supervisor / Engineer</Label>
              <Input
                value={supervisor}
                onChange={(e) => setSupervisor(e.target.value)}
                placeholder="e.g. Er. Rajesh Kumar"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">Hindrances / Stoppages / Remarks</Label>
            <Textarea
              rows={2}
              value={hindrances}
              onChange={(e) => setHindrances(e.target.value)}
              placeholder="e.g. Power shutdown from 2-3 PM; Client confirmation awaited on pantry tile finish."
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button
            onClick={handleSave}
            disabled={!workExecuted.trim() || create.isPending}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {create.isPending ? "Submitting…" : "Submit Daily Report"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ProjectDetail() {
  const { id } = useParams();
  const projectId = parseInt(id || "0", 10);
  const qc = useQueryClient();
  const { toast } = useToast();

  const { data: project, isLoading } = useGetProject(projectId, {
    query: { enabled: !!projectId, queryKey: getGetProjectQueryKey(projectId) },
  });

  const enabled = !!projectId;
  const { data: tasks } = useListTasks({ projectId }, { query: { enabled, queryKey: getListTasksQueryKey({ projectId }) } });
  const { data: budgetItems } = useListBudgetItems(projectId, { query: { enabled, queryKey: getListBudgetItemsQueryKey(projectId) } });
  const { data: raBills } = useListRaBills({ projectId }, { query: { enabled, queryKey: getListRaBillsQueryKey({ projectId }) } });
  const { data: stakeholders } = useListStakeholders({ projectId }, { query: { enabled, queryKey: getListStakeholdersQueryKey({ projectId }) } });
  const { data: documents } = useListDocuments({ projectId }, { query: { enabled, queryKey: getListDocumentsQueryKey({ projectId }) } });
  const { data: punchItems } = useListPunchListItems({ projectId }, { query: { enabled, queryKey: getListPunchListItemsQueryKey({ projectId }) } });
  const { data: communications } = useListCommunications({ projectId }, { query: { enabled, queryKey: getListCommunicationsQueryKey({ projectId }) } });

  const updateProject = useUpdateProject();
  const createPunch = useCreatePunchListItem();
  const updatePunch = useUpdatePunchListItem();
  const deletePunch = useDeletePunchListItem();
  const updateRaBill = useUpdateRaBill();
  const delStakeholder = useDeleteStakeholder();
  const delRaBill = useDeleteRaBill();

  const [activeTab, setActiveTab] = useState(() => {
    if (typeof window !== "undefined") {
      const param = new URLSearchParams(window.location.search).get("tab");
      if (param && ["overview", "tasks", "dpr", "punchlist", "budget", "rabills", "stakeholders", "documents"].includes(param)) {
        return param;
      }
    }
    return "overview";
  });

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("tab", tab);
      window.history.replaceState({}, "", url.toString());
    }
  };
  const [advanceOpen, setAdvanceOpen] = useState(false);
  const [revertOpen, setRevertOpen] = useState(false);
  const [revertTarget, setRevertTarget] = useState<Stage | null>(null);
  const [punchOpen, setPunchOpen] = useState(false);
  const [punchForm, setPunchForm] = useState({ title: "", description: "", category: "general", priority: "medium", dueDate: "" });
  const [applyOpen, setApplyOpen] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [applyStartDate, setApplyStartDate] = useState(format(new Date(), "yyyy-MM-dd"));

  const { data: templates } = useListTaskTemplates();
  const { data: previewTemplate } = useGetTaskTemplate(
    selectedTemplateId ? parseInt(selectedTemplateId) : 0,
    { query: { enabled: !!selectedTemplateId, queryKey: getGetTaskTemplateQueryKey(selectedTemplateId ? parseInt(selectedTemplateId) : 0) } }
  );
  const applyTemplate = useApplyTaskTemplate();

  if (isLoading) return <div className="p-6">Loading project details...</div>;
  if (!project) return <div className="p-6 text-destructive">Project not found</div>;

  const typedProject = project as Project;
  const projectTasks = tasks?.filter(t => t.projectId === projectId) || [];
  const projectBudget = budgetItems?.filter(b => b.projectId === projectId) || [];
  const projectRaBills = raBills?.filter(r => r.projectId === projectId) || [];
  const projectStakeholders = stakeholders?.filter(s => s.projectId === projectId) || [];
  const projectDocs = documents?.filter(d => d.projectId === projectId) || [];
  const projectPunch = punchItems?.filter(p => p.projectId === projectId) || [];
  const projectDprs = (communications ?? []).filter(
    (c) => c.projectId === projectId && c.subject.startsWith("DPR")
  );

  const openPunch = projectPunch.filter(p => p.status === "open" || p.status === "in_progress").length;
  const resolvedPunch = projectPunch.filter(p => p.status === "resolved" || p.status === "closed").length;

  const totalBudgeted = projectBudget.reduce((s, b) => s + b.budgeted, 0);
  const totalActual = projectBudget.reduce((s, b) => s + b.actual, 0);
  const totalCommitted = projectBudget.reduce((s, b) => s + b.committed, 0);

  const currentStageIdx = LIFECYCLE.findIndex(s => s.key === typedProject.status);
  const next = nextStage(typedProject.status);
  const prev = prevStage(typedProject.status);

  const invalidateAll = async () => {
    await Promise.all([
      qc.invalidateQueries({ queryKey: getGetProjectQueryKey(projectId) }),
      qc.invalidateQueries({ queryKey: getListTasksQueryKey({ projectId }) }),
      qc.invalidateQueries({ queryKey: getListBudgetItemsQueryKey(projectId) }),
      qc.invalidateQueries({ queryKey: getListRaBillsQueryKey({ projectId }) }),
      qc.invalidateQueries({ queryKey: getListStakeholdersQueryKey({ projectId }) }),
      qc.invalidateQueries({ queryKey: getListDocumentsQueryKey({ projectId }) }),
    ]);
  };

  const handleAdvance = async () => {
    if (!next) return;
    await updateProject.mutateAsync({ id: projectId, data: { name: typedProject.name, status: next } as Parameters<typeof updateProject.mutateAsync>[0]["data"] });
    await qc.invalidateQueries({ queryKey: getGetProjectQueryKey(projectId) });
    setAdvanceOpen(false);
    toast({ title: `Stage advanced to ${LIFECYCLE.find(s => s.key === next)?.label}` });
  };

  const handleRevert = async () => {
    if (!revertTarget) return;
    await updateProject.mutateAsync({ id: projectId, data: { name: typedProject.name, status: revertTarget } as Parameters<typeof updateProject.mutateAsync>[0]["data"] });
    await qc.invalidateQueries({ queryKey: getGetProjectQueryKey(projectId) });
    setRevertOpen(false);
    setRevertTarget(null);
    toast({ title: `Stage reverted to ${LIFECYCLE.find(s => s.key === revertTarget)?.label}` });
  };

  const handleCreatePunch = async () => {
    if (!punchForm.title.trim()) return;
    await createPunch.mutateAsync({
      data: {
        projectId,
        title: punchForm.title,
        description: punchForm.description || null,
        category: punchForm.category as typeof PL_CATEGORIES[number],
        priority: punchForm.priority as "high" | "medium" | "low",
        dueDate: punchForm.dueDate || null,
      },
    });
    await qc.invalidateQueries({ queryKey: getListPunchListItemsQueryKey({ projectId }) });
    setPunchOpen(false);
    setPunchForm({ title: "", description: "", category: "general", priority: "medium", dueDate: "" });
    toast({ title: "Punch list item added" });
  };

  const handlePunchStatus = async (itemId: number, status: string) => {
    await updatePunch.mutateAsync({ id: itemId, data: { status: status as PunchListItem["status"] } });
    await qc.invalidateQueries({ queryKey: getListPunchListItemsQueryKey({ projectId }) });
  };

  const handleDeletePunch = async (itemId: number) => {
    await deletePunch.mutateAsync({ id: itemId });
    await qc.invalidateQueries({ queryKey: getListPunchListItemsQueryKey({ projectId }) });
    toast({ title: "Item removed", variant: "destructive" });
  };

  const handleRaBillStatus = async (billId: number, status: RaBill["status"]) => {
    await updateRaBill.mutateAsync({ id: billId, data: { status } });
    await qc.invalidateQueries({ queryKey: getListRaBillsQueryKey({ projectId }) });
    toast({ title: `Bill marked as ${status}` });
  };

  const handleDeleteRaBill = async (billId: number) => {
    await delRaBill.mutateAsync({ id: billId });
    await qc.invalidateQueries({ queryKey: getListRaBillsQueryKey({ projectId }) });
    toast({ title: "RA Bill deleted", variant: "destructive" });
  };

  const handleDeleteStakeholder = async (shId: number) => {
    await delStakeholder.mutateAsync({ id: shId });
    await qc.invalidateQueries({ queryKey: getListStakeholdersQueryKey({ projectId }) });
    toast({ title: "Stakeholder removed", variant: "destructive" });
  };

  const handleApplyTemplate = async () => {
    if (!selectedTemplateId) return;
    await applyTemplate.mutateAsync({
      id: parseInt(selectedTemplateId),
      data: { projectId, startDate: applyStartDate || null },
    });
    await qc.invalidateQueries({ queryKey: getListTasksQueryKey({ projectId }) });
    setApplyOpen(false);
    setSelectedTemplateId("");
    toast({ title: "Task template applied" });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/projects"><ChevronLeft className="h-5 w-5" /></Link>
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold tracking-tight truncate">{typedProject.name}</h1>
            <Badge variant={typedProject.status === "archived" ? "outline" : typedProject.status === "handover" ? "default" : "secondary"} className="capitalize shrink-0">
              {typedProject.status.replace("_", " ")}
            </Badge>
          </div>
          <p className="text-muted-foreground text-sm">{typedProject.clientName} • {typedProject.location}</p>
        </div>
        <div className="flex gap-2 shrink-0">
          <EditProjectDialog project={typedProject} projectId={projectId} onSuccess={() => qc.invalidateQueries({ queryKey: getGetProjectQueryKey(projectId) })} />

          {/* ── Revert dialog (opened from stepper or back button) ── */}
          <Dialog open={revertOpen} onOpenChange={open => { setRevertOpen(open); if (!open) setRevertTarget(null); }}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Revert Project Stage</DialogTitle>
                <DialogDescription>
                  Move back from <strong>{LIFECYCLE[currentStageIdx]?.label}</strong> to{" "}
                  <strong>{LIFECYCLE.find(s => s.key === revertTarget)?.label}</strong>?
                  <span className="block mt-2 text-muted-foreground text-sm">
                    All data recorded in skipped stages will be preserved.
                  </span>
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline" onClick={() => { setRevertOpen(false); setRevertTarget(null); }}>Cancel</Button>
                <Button variant="destructive" onClick={handleRevert} disabled={updateProject.isPending}>
                  {updateProject.isPending ? "Reverting…" : "Revert Stage"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* ── Back one stage ── */}
          {prev && (
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => { setRevertTarget(prev); setRevertOpen(true); }}>
              <ArrowRight className="h-3.5 w-3.5 rotate-180" />
              {LIFECYCLE.find(s => s.key === prev)?.label}
            </Button>
          )}

          {next && (
            <Dialog open={advanceOpen} onOpenChange={setAdvanceOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <ArrowRight className="h-4 w-4" />
                  → {LIFECYCLE.find(s => s.key === next)?.label}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Advance Project Stage</DialogTitle>
                  <DialogDescription>
                    Move from <strong>{LIFECYCLE[currentStageIdx]?.label}</strong> to{" "}
                    <strong>{LIFECYCLE.find(s => s.key === next)?.label}</strong>?
                    {next === "handover" && openPunch > 0 && (
                      <span className="block mt-2 text-amber-600 text-sm">⚠ {openPunch} punch list item{openPunch !== 1 ? "s" : ""} still open.</span>
                    )}
                    {next === "archived" && (
                      <span className="block mt-2 text-muted-foreground text-sm">This will archive the project. Ensure final financial closure is complete.</span>
                    )}
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setAdvanceOpen(false)}>Cancel</Button>
                  <Button onClick={handleAdvance} disabled={updateProject.isPending}>
                    {updateProject.isPending ? "Updating…" : "Confirm"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Sidebar */}
        <div className="md:col-span-1 space-y-4">
          {/* Progress + KPIs */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Project Stats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-muted-foreground">Progress</span>
                  <span className="text-2xl font-bold text-primary">{typedProject.progress ?? 0}%</span>
                </div>
                <Progress value={typedProject.progress ?? 0} className="h-2" />
              </div>
              <div className="space-y-2 text-sm pt-1">
                {typedProject.type && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Type</span>
                    <span className="font-medium text-right">{typedProject.type}</span>
                  </div>
                )}
                {typedProject.teamSize != null && (
                  <div className="flex justify-between items-center gap-2">
                    <span className="text-muted-foreground flex items-center gap-1"><Users className="h-3.5 w-3.5" /> Team</span>
                    <span className="font-medium">{typedProject.teamSize}</span>
                  </div>
                )}
                {typedProject.budget != null && (
                  <div className="flex justify-between items-center gap-2">
                    <span className="text-muted-foreground flex items-center gap-1"><IndianRupee className="h-3.5 w-3.5" /> Budget</span>
                    <span className="font-medium">{INR.format(typedProject.budget)}</span>
                  </div>
                )}
                {projectBudget.length > 0 && (
                  <div className="flex justify-between items-center gap-2">
                    <span className="text-muted-foreground flex items-center gap-1"><TrendingUp className="h-3.5 w-3.5" /> Spent</span>
                    <span className={`font-medium ${totalActual > totalBudgeted ? "text-destructive" : "text-emerald-600"}`}>{INR.format(totalActual)}</span>
                  </div>
                )}
                {typedProject.startDate && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Start</span>
                    <span className="font-medium">{format(new Date(typedProject.startDate), "MMM d, yyyy")}</span>
                  </div>
                )}
                {typedProject.endDate && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">End</span>
                    <span className="font-medium">{format(new Date(typedProject.endDate), "MMM d, yyyy")}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Lifecycle Stage Stepper */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Project Lifecycle</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <ol className="space-y-0">
                {LIFECYCLE.map((stage, i) => {
                  const done = i < currentStageIdx;
                  const current = i === currentStageIdx;
                  const future = i > currentStageIdx;
                  return (
                    <li key={stage.key} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div
                          title={done ? `Revert to ${stage.label}` : undefined}
                          onClick={done ? () => { setRevertTarget(stage.key as Stage); setRevertOpen(true); } : undefined}
                          className={`h-6 w-6 rounded-full flex items-center justify-center shrink-0 text-[11px] font-bold transition-opacity
                            ${done ? "bg-primary text-primary-foreground cursor-pointer hover:opacity-70" : ""}
                            ${current ? "bg-amber-500 text-white ring-2 ring-amber-500/30" : ""}
                            ${future ? "bg-muted text-muted-foreground" : ""}
                          `}>
                          {done ? <CheckCheck className="h-3.5 w-3.5" /> : i + 1}
                        </div>
                        {i < LIFECYCLE.length - 1 && (
                          <div className={`w-0.5 flex-1 my-1 min-h-[12px] ${done ? "bg-primary" : "bg-border"}`} />
                        )}
                      </div>
                      <div
                        className={`pb-3 min-w-0 ${done ? "cursor-pointer group" : ""}`}
                        onClick={done ? () => { setRevertTarget(stage.key as Stage); setRevertOpen(true); } : undefined}
                      >
                        <div className={`text-xs font-semibold leading-6
                          ${current ? "text-amber-600" : done ? "text-foreground group-hover:text-primary group-hover:underline" : "text-muted-foreground"}
                        `}>
                          {stage.label}
                        </div>
                        {(current || done) && (
                          <div className="text-[10px] text-muted-foreground leading-tight">{stage.desc}</div>
                        )}
                        {done && (
                          <div className="text-[10px] text-primary/60 leading-tight opacity-0 group-hover:opacity-100 transition-opacity">Click to revert here</div>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ol>
            </CardContent>
          </Card>
        </div>

        {/* Main tabs */}
        <div className="md:col-span-3">
          <Tabs value={activeTab} onValueChange={handleTabChange}>
            <TabsList className="w-full justify-start h-auto p-1.5 bg-muted/70 border border-border/80 rounded-xl shadow-2xs gap-1.5 flex-nowrap overflow-x-auto sm:flex-wrap scrollbar-none">
              {[
                { value: "overview", label: "Overview", icon: ClipboardList },
                { value: "tasks", label: `Tasks (${projectTasks.length})`, icon: CheckCircle2 },
                { value: "dpr", label: `Site DPR (${projectDprs.length})`, icon: HardHat },
                { value: "punchlist", label: `Punch List${openPunch > 0 ? ` (${openPunch})` : ""}`, icon: AlertCircle },
                { value: "budget", label: `Budget (${projectBudget.length})`, icon: IndianRupee },
                { value: "rabills", label: `RA Bills (${projectRaBills.length})`, icon: FileText },
                { value: "stakeholders", label: `Stakeholders (${projectStakeholders.length})`, icon: Users },
                { value: "documents", label: `Documents (${projectDocs.length})`, icon: FileText },
              ].map(t => (
                <TabsTrigger
                  key={t.value}
                  value={t.value}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg"
                >
                  <t.icon className="h-3.5 w-3.5" />
                  <span>{t.label}</span>
                </TabsTrigger>
              ))}
            </TabsList>

            <div className="py-6">

              {/* ── Overview ── */}
              <TabsContent value="overview" className="m-0 space-y-6">
                {(() => {
                  type GuideAction = { icon: React.ReactNode; label: string; desc: string; tab?: string; done?: boolean };
                  const guide: Record<string, { title: string; actions: GuideAction[] }> = {
                    planning: {
                      title: "Set up the project foundation",
                      actions: [
                        { icon: <LayoutTemplate className="h-4 w-4" />, label: "Apply a task template", desc: "Generate the full task plan in one click", tab: "tasks", done: projectTasks.length > 0 },
                        { icon: <CheckCircle2 className="h-4 w-4" />, label: "Add budget items", desc: "Set up cost codes and allocated amounts", tab: "budget", done: projectBudget.length > 0 },
                        { icon: <Circle className="h-4 w-4" />, label: "Add stakeholders", desc: "Client, consultants, contractors", tab: "stakeholders", done: projectStakeholders.length > 0 },
                        { icon: <FileText className="h-4 w-4" />, label: "Upload key documents", desc: "Drawings, approvals, contracts", tab: "documents", done: projectDocs.length > 0 },
                      ],
                    },
                    procurement: {
                      title: "Procurement phase — source materials and vendors",
                      actions: [
                        { icon: <Circle className="h-4 w-4" />, label: "Raise material requests", desc: "List all materials needed", done: false },
                        { icon: <Circle className="h-4 w-4" />, label: "Send RFQs to vendors", desc: "Compare quotations before ordering" },
                        { icon: <Circle className="h-4 w-4" />, label: "Create purchase orders", desc: "Issue approved POs to vendors" },
                        { icon: <CheckCircle2 className="h-4 w-4" />, label: "Update task progress", desc: "Mark procurement tasks as done", tab: "tasks", done: projectTasks.filter(t => t.status === "completed").length > 0 },
                      ],
                    },
                    execution: {
                      title: "Execution phase — track site progress",
                      actions: [
                        { icon: <Clock className="h-4 w-4" />, label: "Update task status", desc: "Move tasks to In Progress / Completed", tab: "tasks", done: projectTasks.filter(t => t.status === "in_progress" || t.status === "completed").length > 0 },
                        { icon: <Circle className="h-4 w-4" />, label: "Log budget actuals", desc: "Record site costs against budget", tab: "budget", done: totalActual > 0 },
                        { icon: <Circle className="h-4 w-4" />, label: "Create RA bills", desc: "Raise running account bills at milestones", tab: "rabills", done: projectRaBills.length > 0 },
                        { icon: <FileText className="h-4 w-4" />, label: "Upload progress photos", desc: "Document work done on site", tab: "documents" },
                      ],
                    },
                    qc: {
                      title: "QC phase — inspect, punch, and clear",
                      actions: [
                        { icon: <ClipboardList className="h-4 w-4" />, label: "Add punch list items", desc: "Record every defect during inspection", tab: "punchlist", done: projectPunch.length > 0 },
                        { icon: <CheckCircle2 className="h-4 w-4" />, label: "Resolve open items", desc: `${openPunch} item${openPunch !== 1 ? "s" : ""} still open`, tab: "punchlist", done: openPunch === 0 && projectPunch.length > 0 },
                        { icon: <FileText className="h-4 w-4" />, label: "Upload test reports", desc: "MEP commissioning, structural audits", tab: "documents" },
                        { icon: <Circle className="h-4 w-4" />, label: "Complete all tasks", desc: `${projectTasks.filter(t => t.status !== "completed").length} tasks remaining`, tab: "tasks" },
                      ],
                    },
                    handover: {
                      title: "Handover — finalise, sign off, and close",
                      actions: [
                        { icon: <FileText className="h-4 w-4" />, label: "Upload as-built drawings", desc: "Final design documentation", tab: "documents" },
                        { icon: <Circle className="h-4 w-4" />, label: "Clear all punch list items", desc: `${openPunch} item${openPunch !== 1 ? "s" : ""} still open`, tab: "punchlist", done: openPunch === 0 },
                        { icon: <Circle className="h-4 w-4" />, label: "Issue final RA bill", desc: "Raise balance payment bill", tab: "rabills" },
                        { icon: <Circle className="h-4 w-4" />, label: "Get client sign-off", desc: "Upload acceptance certificate", tab: "documents" },
                      ],
                    },
                    archived: {
                      title: "Project archived — all done",
                      actions: [
                        { icon: <CheckCircle2 className="h-4 w-4" />, label: "Project complete", desc: "All work finished and handed over", done: true },
                      ],
                    },
                  };
                  const stageKey = typedProject.status in guide ? typedProject.status : "planning";
                  const g = guide[stageKey]!;
                  const doneCount = g.actions.filter(a => a.done).length;
                  return (
                    <Card className="border-primary/20 bg-primary/5">
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between gap-2">
                          <CardTitle className="text-base text-primary">{g.title}</CardTitle>
                          <span className="text-xs font-medium text-muted-foreground">{doneCount}/{g.actions.length} done</span>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {g.actions.map((action, i) => (
                            <button
                              key={i}
                              className={`flex items-start gap-3 p-3 rounded-lg border text-left transition-all
                                ${action.done
                                  ? "border-emerald-200 bg-emerald-50 dark:bg-emerald-950/20 dark:border-emerald-900 opacity-70"
                                  : "border-border bg-background hover:border-primary/40 hover:bg-accent/50 cursor-pointer"}`}
                              onClick={() => { if (action.tab) setActiveTab(action.tab); }}
                            >
                              <span className={`mt-0.5 shrink-0 ${action.done ? "text-emerald-600" : "text-primary"}`}>
                                {action.done ? <CheckCircle2 className="h-4 w-4" /> : action.icon}
                              </span>
                              <div className="min-w-0">
                                <div className={`text-sm font-medium ${action.done ? "line-through text-muted-foreground" : ""}`}>{action.label}</div>
                                <div className="text-xs text-muted-foreground mt-0.5">{action.desc}</div>
                              </div>
                            </button>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })()}

                <Card>
                  <CardHeader><CardTitle className="text-base">Project Description</CardTitle></CardHeader>
                  <CardContent>
                    <p className="text-sm leading-relaxed text-muted-foreground">{typedProject.description || "No description provided."}</p>
                  </CardContent>
                </Card>

                {projectBudget.length > 0 && (
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { label: "Budgeted", value: totalBudgeted, colour: "text-foreground" },
                      { label: "Committed", value: totalCommitted, colour: "text-amber-600" },
                      { label: "Spent", value: totalActual, colour: totalActual > totalBudgeted ? "text-destructive" : "text-emerald-600" },
                    ].map(kpi => (
                      <Card key={kpi.label}>
                        <CardContent className="p-4">
                          <div className="text-xs text-muted-foreground mb-1">{kpi.label}</div>
                          <div className={`text-lg font-bold ${kpi.colour}`}>{INR.format(kpi.value)}</div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}

                {projectTasks.length > 0 && (() => {
                  const phases: Record<string, typeof projectTasks> = {};
                  for (const t of projectTasks) {
                    const m = (t.description ?? "").match(/^\[([^\]]+)\]/);
                    const phase = m ? m[1] : "Other";
                    (phases[phase] ??= []).push(t);
                  }
                  const phaseOrder = ["Initiation", "Planning", "Procurement", "Execution", "Closeout", "Other"];
                  const completed = projectTasks.filter(t => t.status === "completed").length;
                  return (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Task Progress</CardTitle>
                        <CardDescription>{completed}/{projectTasks.length} tasks complete</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {phaseOrder.filter(p => phases[p]).map(phase => {
                          const items = phases[phase]!;
                          const done = items.filter(t => t.status === "completed").length;
                          return (
                            <div key={phase}>
                              <div className="flex items-center justify-between mb-2">
                                <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{phase}</h4>
                                <span className="text-xs text-muted-foreground">{done}/{items.length}</span>
                              </div>
                              <Progress value={done / items.length * 100} className="h-1.5" />
                            </div>
                          );
                        })}
                      </CardContent>
                    </Card>
                  );
                })()}
              </TabsContent>

              {/* ── Tasks ── */}
              <TabsContent value="tasks" className="m-0 space-y-4">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="text-sm text-muted-foreground">
                    {projectTasks.filter(t => t.status === "completed").length}/{projectTasks.length} tasks complete
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <Dialog open={applyOpen} onOpenChange={o => { setApplyOpen(o); if (!o) setSelectedTemplateId(""); }}>
                      <DialogTrigger asChild>
                        <Button size="sm" variant="outline" className="gap-2">
                          <LayoutTemplate className="h-4 w-4" /> Apply Template
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
                        <DialogHeader>
                          <DialogTitle>Apply Task Template</DialogTitle>
                          <DialogDescription>Generate a full task plan from a master template. Tasks are sequenced automatically.</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 overflow-y-auto flex-1 pr-1">
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                              <Label className="text-xs uppercase tracking-wide text-muted-foreground">Template *</Label>
                              <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                                <SelectTrigger><SelectValue placeholder="Choose template…" /></SelectTrigger>
                                <SelectContent>
                                  {templates?.map(t => (
                                    <SelectItem key={t.id} value={String(t.id)}>
                                      {t.name} ({t.itemCount} tasks)
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-xs uppercase tracking-wide text-muted-foreground">Start date</Label>
                              <Input type="date" value={applyStartDate} onChange={e => setApplyStartDate(e.target.value)} />
                            </div>
                          </div>
                          {previewTemplate && (
                            <div className="rounded-md border bg-muted/30 overflow-hidden">
                              <div className="px-4 py-2 bg-muted border-b flex items-center justify-between">
                                <span className="text-sm font-medium">{previewTemplate.name}</span>
                                <Badge variant="outline">{previewTemplate.itemCount} tasks</Badge>
                              </div>
                              <div className="p-3 max-h-64 overflow-y-auto space-y-3">
                                {(() => {
                                  const grouped = previewTemplate.items.reduce<Record<string, typeof previewTemplate.items>>((acc, item) => {
                                    const ph = item.phase ?? "General";
                                    (acc[ph] ??= []).push(item);
                                    return acc;
                                  }, {});
                                  return Object.entries(grouped).map(([phase, items]) => (
                                    <div key={phase}>
                                      <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1">{phase}</div>
                                      <div className="space-y-1">
                                        {items!.map(item => (
                                          <div key={item.id} className="flex items-center gap-2 text-xs py-1 px-2 rounded bg-background/60">
                                            <span className="flex-1">{item.title}</span>
                                            {item.estimatedDays && <span className="text-muted-foreground shrink-0">~{item.estimatedDays}d</span>}
                                            <Badge variant={item.priority === "high" ? "destructive" : item.priority === "medium" ? "secondary" : "outline"} className="text-[10px] shrink-0">{item.priority}</Badge>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  ));
                                })()}
                              </div>
                            </div>
                          )}
                        </div>
                        <DialogFooter className="pt-2 border-t">
                          <Button variant="outline" onClick={() => setApplyOpen(false)}>Cancel</Button>
                          <Button onClick={handleApplyTemplate} disabled={!selectedTemplateId || applyTemplate.isPending}>
                            {applyTemplate.isPending ? "Generating…" : `Apply${previewTemplate ? ` (${previewTemplate.itemCount} tasks)` : ""}`}
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                    <CreateTaskDialog projectId={projectId} onSuccess={() => qc.invalidateQueries({ queryKey: getListTasksQueryKey({ projectId }) })} />
                  </div>
                </div>

                {projectTasks.length === 0 ? (
                  <div className="rounded-md border border-dashed p-12 text-center space-y-3 text-muted-foreground">
                    <LayoutTemplate className="h-10 w-10 mx-auto opacity-30" />
                    <p className="font-medium">No tasks yet</p>
                    <p className="text-sm">Apply a template for a complete plan, or add tasks manually.</p>
                    <Button size="sm" variant="outline" className="gap-2 mt-2" onClick={() => setApplyOpen(true)}>
                      <LayoutTemplate className="h-4 w-4" /> Apply Template
                    </Button>
                  </div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-3">
                    {(["todo", "in_progress", "completed"] as const).map(status => {
                      const statusLabel: Record<string, string> = { todo: "To Do", in_progress: "In Progress", completed: "Completed" };
                      const st = projectTasks.filter(t => t.status === status || (status === "in_progress" && t.status === "in_review"));
                      return (
                        <div key={status} className="bg-muted/50 p-4 rounded-lg space-y-3">
                          <h3 className="font-semibold text-sm flex items-center justify-between">
                            {statusLabel[status]} <Badge variant="secondary">{st.length}</Badge>
                          </h3>
                          {st.map(task => (
                            <EditTaskDialog
                              key={task.id}
                              task={task}
                              projectId={projectId}
                              onSuccess={() => qc.invalidateQueries({ queryKey: getListTasksQueryKey({ projectId }) })}
                            />
                          ))}
                          {st.length === 0 && (
                            <div className="text-xs text-center text-muted-foreground py-4 border border-dashed rounded bg-background/50">Empty</div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </TabsContent>

              {/* ── Daily Progress Reports (DPR) ── */}
              <TabsContent value="dpr" className="m-0 space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <h3 className="font-semibold text-base flex items-center gap-2">
                      <HardHat className="h-4 w-4 text-amber-500" />
                      Daily Site Progress Reports (DPR)
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      On-site workforce headcount logs, physical works executed, plant equipment, and impediment records.
                    </p>
                  </div>
                  <AddDprDialog
                    projectId={projectId}
                    onSuccess={() => qc.invalidateQueries({ queryKey: getListCommunicationsQueryKey({ projectId }) })}
                  />
                </div>

                {projectDprs.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <Card>
                      <CardContent className="p-3.5 flex items-center justify-between">
                        <div>
                          <p className="text-xs text-muted-foreground">Latest Headcount</p>
                          <p className="text-xl font-bold font-mono text-emerald-600">
                            {(() => {
                              const match = projectDprs[0]?.subject.match(/(\d+)\s+Workers/);
                              return match ? `${match[1]} Workers` : "Active";
                            })()}
                          </p>
                        </div>
                        <HardHat className="w-8 h-8 text-emerald-500/30" />
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="p-3.5 flex items-center justify-between">
                        <div>
                          <p className="text-xs text-muted-foreground">Total DPRs Logged</p>
                          <p className="text-xl font-bold font-mono text-primary">{projectDprs.length} Days</p>
                        </div>
                        <Clock className="w-8 h-8 text-primary/30" />
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="p-3.5 flex items-center justify-between">
                        <div>
                          <p className="text-xs text-muted-foreground">Audit & Verification</p>
                          <p className="text-xl font-bold font-mono text-blue-600">Verified</p>
                        </div>
                        <CheckCircle2 className="w-8 h-8 text-blue-500/30" />
                      </CardContent>
                    </Card>
                  </div>
                )}

                <div className="space-y-3">
                  {projectDprs.map((dpr) => {
                    const dprMetaMatch = (dpr.content ?? "").match(/\[DPR_META\]([\s\S]*?)\[\/DPR_META\]/);
                    let meta: any = null;
                    if (dprMetaMatch) {
                      try {
                        meta = JSON.parse(dprMetaMatch[1]);
                      } catch { }
                    }

                    const cleanContent = (dpr.content ?? "").replace(/\[DPR_META\][\s\S]*?\[\/DPR_META\]\n*/, "");

                    return (
                      <Card key={dpr.id} className="hover:border-primary/40 transition-colors">
                        <CardHeader className="p-4 pb-2">
                          <div className="flex items-start justify-between gap-2 flex-wrap">
                            <div className="flex items-center gap-2">
                              <span className="p-1.5 rounded-md bg-amber-500/10 text-amber-600">
                                <HardHat className="w-4 h-4" />
                              </span>
                              <div>
                                <CardTitle className="text-sm font-semibold">{dpr.subject}</CardTitle>
                                <p className="text-xs text-muted-foreground">
                                  Logged by {dpr.participants || "Site Engineer"} · {format(new Date(dpr.communicationDate), "EEEE, MMMM d, yyyy")}
                                </p>
                              </div>
                            </div>
                            {meta?.weather && (
                              <Badge variant="outline" className="text-xs gap-1 bg-muted/40">
                                {meta.weather.includes("Rain") ? <CloudRain className="w-3 h-3 text-sky-500" /> : <Sun className="w-3 h-3 text-amber-500" />}
                                {meta.weather}
                              </Badge>
                            )}
                          </div>
                        </CardHeader>
                        <CardContent className="p-4 pt-1 space-y-3 text-xs">
                          {meta?.workforce && (
                            <div className="flex flex-wrap gap-1.5 pt-1">
                              {meta.workforce.masons > 0 && <Badge variant="secondary" className="text-[11px]">🧱 {meta.workforce.masons} Masons</Badge>}
                              {meta.workforce.carpenters > 0 && <Badge variant="secondary" className="text-[11px]">🪚 {meta.workforce.carpenters} Carpenters</Badge>}
                              {meta.workforce.electricians > 0 && <Badge variant="secondary" className="text-[11px]">⚡ {meta.workforce.electricians} Electricians</Badge>}
                              {meta.workforce.plumbers > 0 && <Badge variant="secondary" className="text-[11px]">🔧 {meta.workforce.plumbers} Plumbers</Badge>}
                              {meta.workforce.painters > 0 && <Badge variant="secondary" className="text-[11px]">🎨 {meta.workforce.painters} Painters</Badge>}
                              {meta.workforce.helpers > 0 && <Badge variant="secondary" className="text-[11px]">👷 {meta.workforce.helpers} Helpers</Badge>}
                            </div>
                          )}

                          <div className="p-3 bg-muted/20 rounded-md border text-xs leading-relaxed text-foreground whitespace-pre-wrap font-sans">
                            {cleanContent || dpr.content}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}

                  {projectDprs.length === 0 && (
                    <div className="text-center py-12 border rounded-lg border-dashed text-muted-foreground">
                      <HardHat className="h-8 w-8 mx-auto mb-2 opacity-30" />
                      <p className="font-medium text-sm">No Daily Progress Reports (DPR) logged yet.</p>
                      <p className="text-xs mt-1">Site supervisors can click "Log Daily Progress" to record daily workforce and work executed.</p>
                    </div>
                  )}
                </div>
              </TabsContent>

              {/* ── Punch List ── */}
              <TabsContent value="punchlist" className="m-0 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-semibold flex items-center gap-2">
                      <ClipboardList className="h-4 w-4 text-primary" /> QC Punch List
                    </h2>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {resolvedPunch}/{projectPunch.length} items resolved · {openPunch} open
                    </p>
                  </div>
                  <Dialog open={punchOpen} onOpenChange={setPunchOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm" className="gap-2"><Plus className="h-4 w-4" /> Add Item</Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-lg">
                      <DialogHeader>
                        <DialogTitle>New Punch List Item</DialogTitle>
                        <DialogDescription>Record a defect, outstanding issue, or QC observation to be resolved before handover.</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-2">
                        <div className="space-y-1.5">
                          <Label className="text-xs uppercase tracking-wide text-muted-foreground">Title *</Label>
                          <Input value={punchForm.title} onChange={e => setPunchForm({ ...punchForm, title: e.target.value })} placeholder="Crack in column C4 plaster" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <Label className="text-xs uppercase tracking-wide text-muted-foreground">Category</Label>
                            <Select value={punchForm.category} onValueChange={v => setPunchForm({ ...punchForm, category: v })}>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {PL_CATEGORIES.map(c => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs uppercase tracking-wide text-muted-foreground">Priority</Label>
                            <Select value={punchForm.priority} onValueChange={v => setPunchForm({ ...punchForm, priority: v })}>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="high">High</SelectItem>
                                <SelectItem value="medium">Medium</SelectItem>
                                <SelectItem value="low">Low</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs uppercase tracking-wide text-muted-foreground">Due date</Label>
                          <Input type="date" value={punchForm.dueDate} onChange={e => setPunchForm({ ...punchForm, dueDate: e.target.value })} />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs uppercase tracking-wide text-muted-foreground">Description</Label>
                          <Textarea value={punchForm.description} onChange={e => setPunchForm({ ...punchForm, description: e.target.value })} rows={2} placeholder="Location, severity, photos reference" />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setPunchOpen(false)}>Cancel</Button>
                        <Button onClick={handleCreatePunch} disabled={!punchForm.title.trim() || createPunch.isPending}>
                          {createPunch.isPending ? "Adding..." : "Add item"}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>

                {projectPunch.length > 0 && (
                  <div className="flex gap-3 flex-wrap">
                    {(["open", "in_progress", "resolved", "closed"] as const).map(s => {
                      const count = projectPunch.filter(p => p.status === s).length;
                      if (!count) return null;
                      const meta = PL_STATUS[s]!;
                      return (
                        <div key={s} className="flex items-center gap-1.5 text-sm">
                          <span className={`h-2.5 w-2.5 rounded-full ${meta.dot}`} />
                          <span className="font-medium">{count}</span>
                          <span className="text-muted-foreground">{meta.label}</span>
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className="rounded-md border bg-card overflow-hidden">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-muted/50 text-muted-foreground border-b">
                      <tr>
                        <th className="px-4 py-3 font-medium">Item</th>
                        <th className="px-4 py-3 font-medium">Category</th>
                        <th className="px-4 py-3 font-medium">Priority</th>
                        <th className="px-4 py-3 font-medium">Status</th>
                        <th className="px-4 py-3 font-medium">Due</th>
                        <th className="px-4 py-3 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {projectPunch.map(item => {
                        const sm = PL_STATUS[item.status]!;
                        const isResolved = item.status === "resolved" || item.status === "closed";
                        return (
                          <tr key={item.id} className="hover:bg-accent/40 transition-colors">
                            <td className="px-4 py-3">
                              <div className="font-medium">{item.title}</div>
                              {item.description && <div className="text-xs text-muted-foreground line-clamp-1">{item.description}</div>}
                              {item.resolvedAt && (
                                <div className="text-[10px] text-emerald-600 mt-0.5">Resolved {format(new Date(item.resolvedAt), "MMM d, yyyy")}</div>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <Badge variant="outline" className="text-[10px] capitalize">{item.category}</Badge>
                            </td>
                            <td className="px-4 py-3">
                              <Badge variant={PL_PRIORITY[item.priority]} className="text-[10px] capitalize">{item.priority}</Badge>
                            </td>
                            <td className="px-4 py-3">
                              <span className="inline-flex items-center gap-1.5">
                                <span className={`h-2 w-2 rounded-full ${sm.dot}`} />
                                <span className="text-xs">{sm.label}</span>
                              </span>
                            </td>
                            <td className="px-4 py-3 text-muted-foreground">
                              {item.dueDate ? format(new Date(item.dueDate), "MMM d") : "—"}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex gap-1">
                                {!isResolved ? (
                                  <>
                                    {item.status === "open" && (
                                      <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => handlePunchStatus(item.id, "in_progress")}>
                                        Start
                                      </Button>
                                    )}
                                    <Button size="sm" className="h-7 text-xs gap-1" onClick={() => handlePunchStatus(item.id, "resolved")}>
                                      <CheckCircle2 className="h-3 w-3" /> Resolve
                                    </Button>
                                  </>
                                ) : (
                                  <Button size="sm" variant="ghost" className="h-7 text-xs text-muted-foreground" onClick={() => handlePunchStatus(item.id, "open")}>
                                    Reopen
                                  </Button>
                                )}
                                <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive" onClick={() => handleDeletePunch(item.id)}>
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                      {projectPunch.length === 0 && (
                        <tr>
                          <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                            <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-30" />
                            No punch list items yet. Add items during QC inspection.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </TabsContent>

              {/* ── Budget ── */}
              <TabsContent value="budget" className="m-0 space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  {projectBudget.length > 0 && (
                    <div className="flex gap-4 text-sm">
                      <span className="text-muted-foreground">Budgeted: <strong>{INR.format(totalBudgeted)}</strong></span>
                      <span className="text-muted-foreground">Committed: <strong className="text-amber-600">{INR.format(totalCommitted)}</strong></span>
                      <span className="text-muted-foreground">Spent: <strong className={totalActual > totalBudgeted ? "text-destructive" : "text-emerald-600"}>{INR.format(totalActual)}</strong></span>
                    </div>
                  )}
                  <AddBudgetItemDialog projectId={projectId} onSuccess={() => qc.invalidateQueries({ queryKey: getListBudgetItemsQueryKey(projectId) })} />
                </div>
                <div className="rounded-md border bg-card overflow-hidden">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-muted/50 text-muted-foreground border-b">
                      <tr>
                        <th className="px-4 py-3 font-medium">Cost Code</th>
                        <th className="px-4 py-3 font-medium">Description</th>
                        <th className="px-4 py-3 font-medium text-right">Budgeted</th>
                        <th className="px-4 py-3 font-medium text-right">Committed</th>
                        <th className="px-4 py-3 font-medium text-right">Actual</th>
                        <th className="px-4 py-3 font-medium text-right">Variance</th>
                        <th className="px-2 py-3"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {projectBudget.map(item => {
                        const variance = item.budgeted - item.actual;
                        return (
                          <tr key={item.id} className="hover:bg-accent/50 transition-colors">
                            <td className="px-4 py-3 font-mono text-xs">{item.costCode}</td>
                            <td className="px-4 py-3">{item.description}</td>
                            <td className="px-4 py-3 text-right">{INR.format(item.budgeted)}</td>
                            <td className="px-4 py-3 text-right text-amber-600">{INR.format(item.committed)}</td>
                            <td className="px-4 py-3 text-right">{INR.format(item.actual)}</td>
                            <td className={`px-4 py-3 text-right font-medium ${variance < 0 ? "text-destructive" : "text-emerald-600"}`}>
                              {variance < 0 ? "-" : "+"}{INR.format(Math.abs(variance))}
                            </td>
                            <td className="px-2 py-3">
                              <EditBudgetItemDialog
                                item={item}
                                projectId={projectId}
                                onSuccess={() => qc.invalidateQueries({ queryKey: getListBudgetItemsQueryKey(projectId) })}
                              />
                            </td>
                          </tr>
                        );
                      })}
                      {projectBudget.length === 0 && (
                        <tr>
                          <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                            No budget items yet. Add cost codes to start tracking.
                          </td>
                        </tr>
                      )}
                    </tbody>
                    {projectBudget.length > 0 && (
                      <tfoot className="border-t bg-muted/30">
                        <tr>
                          <td colSpan={2} className="px-4 py-3 font-semibold text-sm">Total</td>
                          <td className="px-4 py-3 text-right font-semibold">{INR.format(totalBudgeted)}</td>
                          <td className="px-4 py-3 text-right font-semibold text-amber-600">{INR.format(totalCommitted)}</td>
                          <td className="px-4 py-3 text-right font-semibold">{INR.format(totalActual)}</td>
                          <td className={`px-4 py-3 text-right font-semibold ${totalBudgeted - totalActual < 0 ? "text-destructive" : "text-emerald-600"}`}>
                            {totalBudgeted - totalActual < 0 ? "-" : "+"}{INR.format(Math.abs(totalBudgeted - totalActual))}
                          </td>
                          <td />
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              </TabsContent>

              {/* ── RA Bills ── */}
              <TabsContent value="rabills" className="m-0 space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  {projectRaBills.length > 0 && (
                    <div className="text-sm text-muted-foreground">
                      Total billed: <strong className="text-foreground">{INR.format(projectRaBills.reduce((s, b) => s + b.amount, 0))}</strong>
                      {" · "}
                      {projectRaBills.filter(b => b.status === "approved").length} approved
                    </div>
                  )}
                  <CreateRaBillDialog projectId={projectId} onSuccess={() => qc.invalidateQueries({ queryKey: getListRaBillsQueryKey({ projectId }) })} />
                </div>
                <div className="space-y-3">
                  {projectRaBills.map(bill => {
                    const meta = RA_STATUS_META[bill.status] ?? RA_STATUS_META.draft!;
                    return (
                      <Card key={bill.id} className="overflow-hidden">
                        <CardContent className="p-0">
                          <div className="flex items-start justify-between p-4 gap-4">
                            <div className="space-y-1 flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-bold text-base">{bill.billNumber}</span>
                                <Badge variant={meta.variant} className="text-xs">{meta.label}</Badge>
                                {bill.milestone && (
                                  <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">{bill.milestone}</span>
                                )}
                              </div>
                              {bill.description && <p className="text-sm text-muted-foreground">{bill.description}</p>}
                              <div className="text-xs text-muted-foreground">{format(new Date(bill.createdAt), "MMM d, yyyy")}</div>
                            </div>
                            <div className="text-right shrink-0">
                              <div className="font-bold text-xl text-primary">{INR.format(bill.amount)}</div>
                            </div>
                          </div>
                          <div className="border-t px-4 py-2 bg-muted/30 flex items-center gap-2 flex-wrap">
                            {bill.status === "draft" && (
                              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => handleRaBillStatus(bill.id, "submitted")}>
                                Submit for Approval
                              </Button>
                            )}
                            {bill.status === "submitted" && (
                              <>
                                <Button size="sm" className="h-7 text-xs gap-1" onClick={() => handleRaBillStatus(bill.id, "approved")}>
                                  <CheckCircle2 className="h-3 w-3" /> Approve
                                </Button>
                                <Button size="sm" variant="destructive" className="h-7 text-xs" onClick={() => handleRaBillStatus(bill.id, "rejected")}>
                                  Reject
                                </Button>
                              </>
                            )}
                            {bill.status === "approved" && (
                              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => handleRaBillStatus(bill.id, "invoiced")}>
                                <MoreHorizontal className="h-3.5 w-3.5 mr-1" /> Mark as Invoiced
                              </Button>
                            )}
                            {bill.status === "rejected" && (
                              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => handleRaBillStatus(bill.id, "draft")}>
                                Reset to Draft
                              </Button>
                            )}
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0 ml-auto text-muted-foreground hover:text-destructive" onClick={() => handleDeleteRaBill(bill.id)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                  {projectRaBills.length === 0 && (
                    <div className="text-center py-12 border rounded-lg border-dashed text-muted-foreground">
                      <IndianRupee className="h-8 w-8 mx-auto mb-2 opacity-30" />
                      <p>No RA Bills yet. Create your first bill for a project milestone.</p>
                    </div>
                  )}
                </div>
              </TabsContent>

              {/* ── Stakeholders ── */}
              <TabsContent value="stakeholders" className="m-0 space-y-4">
                <div className="flex justify-end">
                  <AddStakeholderDialog projectId={projectId} onSuccess={() => qc.invalidateQueries({ queryKey: getListStakeholdersQueryKey({ projectId }) })} />
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  {projectStakeholders.map(sh => (
                    <Card key={sh.id}>
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <div className="font-bold">{sh.name}</div>
                            <div className="text-sm text-muted-foreground">
                              {sh.role}{sh.organization && ` · ${sh.organization}`}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="capitalize">{sh.accessLevel}</Badge>
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive" onClick={() => handleDeleteStakeholder(sh.id)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                        <div className="text-sm space-y-1 mt-2">
                          {sh.email && <div><a href={`mailto:${sh.email}`} className="text-primary hover:underline">{sh.email}</a></div>}
                          {sh.phone && <div><a href={`tel:${sh.phone}`} className="text-muted-foreground hover:underline">{sh.phone}</a></div>}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  {projectStakeholders.length === 0 && (
                    <div className="col-span-2 text-center py-12 border rounded-lg border-dashed text-muted-foreground">
                      <Users className="h-8 w-8 mx-auto mb-2 opacity-30" />
                      <p>No stakeholders added. Add the client, consultants, and contractors.</p>
                    </div>
                  )}
                </div>
              </TabsContent>

              {/* ── Documents ── */}
              <TabsContent value="documents" className="m-0 space-y-4">
                <div className="flex justify-end">
                  <AddDocumentDialog projectId={projectId} onSuccess={() => qc.invalidateQueries({ queryKey: getListDocumentsQueryKey({ projectId }) })} />
                </div>
                <div className="rounded-md border bg-card overflow-hidden">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-muted/50 text-muted-foreground border-b">
                      <tr>
                        <th className="px-4 py-3 font-medium">Document</th>
                        <th className="px-4 py-3 font-medium">Category</th>
                        <th className="px-4 py-3 font-medium">Status</th>
                        <th className="px-4 py-3 font-medium text-right">Uploaded</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {projectDocs.map(doc => (
                        <tr key={doc.id} className="hover:bg-accent/50 transition-colors">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <FileText className="h-4 w-4 text-primary shrink-0" />
                              <div>
                                <div className="font-medium text-primary hover:underline cursor-pointer">{doc.fileName}</div>
                                {doc.fileType && <div className="text-xs text-muted-foreground line-clamp-1">{doc.fileType}</div>}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3"><Badge variant="outline" className="capitalize">{doc.category}</Badge></td>
                          <td className="px-4 py-3">
                            <Badge variant={doc.status === "active" ? "default" : doc.status === "archived" ? "outline" : "secondary"} className="capitalize">
                              {doc.status}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-right text-muted-foreground">
                            {format(new Date(doc.uploadedAt), "MMM d, yyyy")}
                          </td>
                        </tr>
                      ))}
                      {projectDocs.length === 0 && (
                        <tr>
                          <td colSpan={4} className="px-4 py-12 text-center text-muted-foreground">
                            <FileText className="h-8 w-8 mx-auto mb-2 opacity-30" />
                            <p>No documents yet. Add drawings, approvals, and contracts.</p>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </TabsContent>

            </div>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
