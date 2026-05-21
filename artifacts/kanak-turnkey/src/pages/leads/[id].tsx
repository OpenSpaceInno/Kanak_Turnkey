import { useParams, Link, useLocation } from "wouter";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetLead,
  getGetLeadQueryKey,
  useUpdateLead,
  useConvertLead,
  useCreateLeadActivity,
  useCreateSiteVisit,
  useUpdateSiteVisit,
  useCreateDrawing,
  useUpdateDrawing,
  useCreateBoq,
  useUpdateBoq,
  useGetBoq,
  useAddBoqItem,
  useDeleteBoqItem,
  useCreateNegotiation,
  useUpdateNegotiation,
  getListLeadsQueryKey,
  getListProjectsQueryKey,
  getGetDashboardSummaryQueryKey,
  getGetLeadsSummaryQueryKey,
} from "@workspace/api-client-react";
import type {
  Lead,
  LeadDetail,
  LeadActivity,
  SiteVisit,
  Drawing,
  Boq,
  Negotiation,
  LeadInput,
  SiteVisitInput,
  DrawingUpdate,
  BoqDetail,
  NegotiationUpdate,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import {
  ChevronLeft,
  Edit,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Trophy,
  ArrowRight,
  Plus,
  CheckCircle2,
  Circle,
  FileText,
  Trash2,
  ChevronDown,
  ChevronUp,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

const INR = (v: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(v);

const STAGES = [
  { key: "lead_creation", label: "Lead Creation" },
  { key: "site_visit", label: "Site Visit" },
  { key: "drawings", label: "Drawings" },
  { key: "boq", label: "BOQ" },
  { key: "negotiation", label: "Negotiation" },
  { key: "finalization", label: "Finalization" },
] as const;

type Stage = (typeof STAGES)[number]["key"];

// ─── Stage Stepper ────────────────────────────────────────────────────────────

function StageStepper({
  currentStage,
  lead,
  isWon,
  isLost,
}: {
  currentStage: Stage;
  lead: Lead;
  isWon: boolean;
  isLost: boolean;
}) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const update = useUpdateLead({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getGetLeadQueryKey(lead.id) });
        qc.invalidateQueries({ queryKey: getListLeadsQueryKey() });
        toast({ title: "Stage updated" });
      },
    },
  });
  const currentIdx = STAGES.findIndex((s) => s.key === currentStage);
  return (
    <div className="w-full overflow-x-auto">
      <div className="flex items-center min-w-max">
        {STAGES.map((s, i) => {
          const done = i < currentIdx;
          const active = i === currentIdx;
          const canClick = !isWon && !isLost;
          return (
            <div key={s.key} className="flex items-center">
              <button
                disabled={!canClick || update.isPending}
                onClick={() =>
                  canClick &&
                  update.mutate({
                    id: lead.id,
                    data: { customerName: lead.customerName, stage: s.key } as LeadInput,
                  })
                }
                className={cn(
                  "flex flex-col items-center gap-1 px-3 transition-opacity",
                  canClick ? "cursor-pointer hover:opacity-80" : "cursor-default",
                  !canClick && "opacity-60",
                )}
              >
                {done ? (
                  <CheckCircle2 className="w-6 h-6 text-primary" />
                ) : active ? (
                  <div className="w-6 h-6 rounded-full border-2 border-primary bg-primary flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-white" />
                  </div>
                ) : (
                  <Circle className="w-6 h-6 text-muted-foreground/40" />
                )}
                <span
                  className={cn(
                    "text-xs font-medium whitespace-nowrap",
                    active ? "text-primary" : done ? "text-foreground" : "text-muted-foreground/50",
                  )}
                >
                  {s.label}
                </span>
              </button>
              {i < STAGES.length - 1 && (
                <div
                  className={cn(
                    "h-0.5 w-8 mx-1 rounded",
                    i < currentIdx ? "bg-primary" : "bg-muted-foreground/20",
                  )}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Edit Lead Dialog ─────────────────────────────────────────────────────────

function EditLeadDialog({
  lead,
  open,
  onOpenChange,
}: {
  lead: Lead;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [form, setForm] = useState({
    customerName: lead.customerName,
    company: lead.company ?? "",
    contactEmail: lead.contactEmail ?? "",
    contactPhone: lead.contactPhone ?? "",
    projectType: lead.projectType ?? "",
    location: lead.location ?? "",
    budgetEstimate: lead.budgetEstimate != null ? String(lead.budgetEstimate) : "",
    leadSource: lead.leadSource ?? "",
    status: lead.status as string,
    stage: lead.stage as string,
    priority: lead.priority as string,
    expectedClosureDate: lead.expectedClosureDate ?? "",
    notes: lead.notes ?? "",
  });

  const update = useUpdateLead({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getGetLeadQueryKey(lead.id) });
        qc.invalidateQueries({ queryKey: getListLeadsQueryKey() });
        qc.invalidateQueries({ queryKey: getGetLeadsSummaryQueryKey() });
        onOpenChange(false);
        toast({ title: "Lead updated" });
      },
      onError: () => toast({ title: "Failed to update lead", variant: "destructive" }),
    },
  });

  const f = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((p) => ({ ...p, [k]: e.target.value }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Lead</DialogTitle>
          <DialogDescription>Update the lead information and pipeline stage.</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-2">
          <div className="space-y-1.5">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">Customer Name *</Label>
            <Input value={form.customerName} onChange={f("customerName")} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">Company</Label>
            <Input value={form.company} onChange={f("company")} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">Email</Label>
            <Input type="email" value={form.contactEmail} onChange={f("contactEmail")} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">Phone</Label>
            <Input value={form.contactPhone} onChange={f("contactPhone")} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">Project Type</Label>
            <Input value={form.projectType} onChange={f("projectType")} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">Location</Label>
            <Input value={form.location} onChange={f("location")} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">Budget Estimate (INR)</Label>
            <Input type="number" value={form.budgetEstimate} onChange={f("budgetEstimate")} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">Lead Source</Label>
            <Input value={form.leadSource} onChange={f("leadSource")} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">Status</Label>
            <Select value={form.status} onValueChange={(v) => setForm((p) => ({ ...p, status: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {["new", "contacted", "qualified", "lost", "won"].map((s) => (
                  <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">Stage</Label>
            <Select value={form.stage} onValueChange={(v) => setForm((p) => ({ ...p, stage: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {STAGES.map((s) => (
                  <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">Priority</Label>
            <Select value={form.priority} onValueChange={(v) => setForm((p) => ({ ...p, priority: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {["urgent", "high", "medium", "low"].map((p) => (
                  <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">Expected Closure</Label>
            <Input type="date" value={form.expectedClosureDate} onChange={f("expectedClosureDate")} />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">Notes</Label>
            <Textarea value={form.notes} onChange={f("notes")} rows={3} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            disabled={!form.customerName.trim() || update.isPending}
            onClick={() =>
              update.mutate({
                id: lead.id,
                data: {
                  customerName: form.customerName,
                  company: form.company || undefined,
                  contactEmail: form.contactEmail || undefined,
                  contactPhone: form.contactPhone || undefined,
                  projectType: form.projectType || undefined,
                  location: form.location || undefined,
                  budgetEstimate: form.budgetEstimate ? Number(form.budgetEstimate) : undefined,
                  leadSource: form.leadSource || undefined,
                  status: form.status as LeadInput["status"],
                  stage: form.stage as LeadInput["stage"],
                  priority: form.priority as LeadInput["priority"],
                  expectedClosureDate: form.expectedClosureDate || undefined,
                  notes: form.notes || undefined,
                },
              })
            }
          >
            {update.isPending ? "Saving…" : "Save changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Activities Tab ───────────────────────────────────────────────────────────

type ActivityRow = LeadActivity & { createdByName?: string | null };

function ActivitiesTab({ leadId, activities }: { leadId: number; activities: ActivityRow[] }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ activityType: "note", title: "", description: "" });

  const create = useCreateLeadActivity({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getGetLeadQueryKey(leadId) });
        setOpen(false);
        setForm({ activityType: "note", title: "", description: "" });
        toast({ title: "Activity logged" });
      },
      onError: () => toast({ title: "Failed to log activity", variant: "destructive" }),
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setOpen(true)} className="gap-2">
          <Plus className="w-4 h-4" /> Add Activity
        </Button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Log Activity</DialogTitle>
            <DialogDescription>Record a call, meeting, email or note for this lead.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select value={form.activityType} onValueChange={(v) => setForm((p) => ({ ...p, activityType: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["call", "meeting", "email", "note", "other"].map((t) => (
                    <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Title *</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                placeholder="e.g. Discovery call with client"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                rows={3}
                placeholder="Notes from the activity..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button
              disabled={!form.title.trim() || create.isPending}
              onClick={() =>
                create.mutate({
                  leadId,
                  data: { activityType: form.activityType, title: form.title, description: form.description || undefined },
                })
              }
            >
              {create.isPending ? "Saving…" : "Log activity"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {activities.length > 0 ? (
        <div className="space-y-3">
          {activities.map((a) => (
            <div key={a.id} className="flex gap-3">
              <div className="mt-1 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Calendar className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1 p-3 rounded-lg border bg-card">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm">{a.title}</span>
                    <Badge variant="secondary" className="text-xs capitalize">{a.activityType}</Badge>
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {format(new Date(a.createdAt), "MMM d, h:mm a")}
                  </span>
                </div>
                {a.description && <p className="text-sm text-muted-foreground">{a.description}</p>}
                {"createdByName" in a && a.createdByName && (
                  <p className="text-xs text-muted-foreground/60 mt-1">by {a.createdByName as string}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 border rounded-lg border-dashed text-muted-foreground">
          No activities recorded yet. Log a call, meeting or note to get started.
        </div>
      )}
    </div>
  );
}

// ─── Site Visits Tab ──────────────────────────────────────────────────────────

type SiteVisitRow = SiteVisit & { engineerName?: string | null };

function SiteVisitsTab({ leadId, visits }: { leadId: number; visits: SiteVisitRow[] }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const blank = {
    visitDate: new Date().toISOString().slice(0, 10),
    visitTime: "",
    siteAddress: "",
    measurements: "",
    observations: "",
    status: "pending" as SiteVisitInput["status"],
  };
  const [form, setForm] = useState(blank);

  const create = useCreateSiteVisit({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getGetLeadQueryKey(leadId) });
        setOpen(false);
        setForm(blank);
        toast({ title: "Site visit scheduled" });
      },
    },
  });

  const markDone = useUpdateSiteVisit({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getGetLeadQueryKey(leadId) });
        toast({ title: "Visit marked as completed" });
      },
    },
  });

  const statusColor: Record<string, string> = {
    completed: "bg-emerald-100 text-emerald-700",
    pending: "bg-amber-100 text-amber-700",
    cancelled: "bg-red-100 text-red-700",
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setOpen(true)} className="gap-2">
          <Plus className="w-4 h-4" /> Schedule Visit
        </Button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Schedule Site Visit</DialogTitle>
            <DialogDescription>Plan a visit to the project site.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Visit Date *</Label>
                <Input
                  type="date"
                  value={form.visitDate}
                  onChange={(e) => setForm((p) => ({ ...p, visitDate: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Visit Time</Label>
                <Input
                  type="time"
                  value={form.visitTime}
                  onChange={(e) => setForm((p) => ({ ...p, visitTime: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Site Address</Label>
              <Input
                value={form.siteAddress}
                onChange={(e) => setForm((p) => ({ ...p, siteAddress: e.target.value }))}
                placeholder="Full site address"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select
                value={form.status ?? "pending"}
                onValueChange={(v) => setForm((p) => ({ ...p, status: v as SiteVisitInput["status"] }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Measurements</Label>
              <Textarea
                value={form.measurements}
                onChange={(e) => setForm((p) => ({ ...p, measurements: e.target.value }))}
                rows={2}
                placeholder="Area, dimensions etc."
              />
            </div>
            <div className="space-y-1.5">
              <Label>Observations</Label>
              <Textarea
                value={form.observations}
                onChange={(e) => setForm((p) => ({ ...p, observations: e.target.value }))}
                rows={2}
                placeholder="Site conditions, access notes etc."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button
              disabled={!form.visitDate || create.isPending}
              onClick={() =>
                create.mutate({
                  leadId,
                  data: {
                    visitDate: form.visitDate,
                    visitTime: form.visitTime || undefined,
                    siteAddress: form.siteAddress || undefined,
                    measurements: form.measurements || undefined,
                    observations: form.observations || undefined,
                    status: form.status,
                  },
                })
              }
            >
              {create.isPending ? "Saving…" : "Schedule visit"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {visits.length > 0 ? (
        <div className="space-y-3">
          {visits.map((v) => (
            <Card key={v.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      <span className="font-semibold">{format(new Date(v.visitDate), "MMM d, yyyy")}</span>
                      {v.visitTime && <span className="text-muted-foreground text-sm">at {v.visitTime}</span>}
                      <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium capitalize", statusColor[v.status] ?? "bg-muted text-muted-foreground")}>
                        {v.status}
                      </span>
                    </div>
                    {v.siteAddress && (
                      <div className="flex items-start gap-2 text-sm text-muted-foreground">
                        <MapPin className="w-4 h-4 shrink-0 mt-0.5" />{v.siteAddress}
                      </div>
                    )}
                    {v.measurements && <p className="text-sm"><span className="font-medium">Measurements:</span> {v.measurements}</p>}
                    {v.observations && <p className="text-sm"><span className="font-medium">Observations:</span> {v.observations}</p>}
                    {"engineerName" in v && v.engineerName && (
                      <p className="text-xs text-muted-foreground">Engineer: {v.engineerName as string}</p>
                    )}
                  </div>
                  {v.status === "pending" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        markDone.mutate({
                          id: v.id,
                          data: { visitDate: v.visitDate, status: "completed" } as SiteVisitInput,
                        })
                      }
                    >
                      <CheckCircle2 className="w-4 h-4 mr-1" /> Mark Done
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 border rounded-lg border-dashed text-muted-foreground">
          No site visits scheduled yet.
        </div>
      )}
    </div>
  );
}

// ─── Drawings Tab ─────────────────────────────────────────────────────────────

type DrawingRow = Drawing & { uploadedByName?: string | null; uploadedAt?: string | null };

function DrawingsTab({ leadId, drawings }: { leadId: number; drawings: DrawingRow[] }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ fileName: "", fileType: "", version: "1" });

  const create = useCreateDrawing({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getGetLeadQueryKey(leadId) });
        setOpen(false);
        setForm({ fileName: "", fileType: "", version: "1" });
        toast({ title: "Drawing added" });
      },
    },
  });

  const patchDrawing = useUpdateDrawing({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getGetLeadQueryKey(leadId) });
        toast({ title: "Drawing updated" });
      },
    },
  });

  const statusColors: Record<string, string> = {
    draft: "bg-slate-100 text-slate-600",
    submitted: "bg-blue-100 text-blue-700",
    approved: "bg-emerald-100 text-emerald-700",
    rejected: "bg-red-100 text-red-700",
    superseded: "bg-orange-100 text-orange-700",
  };

  const nextStatus: Record<string, DrawingUpdate["status"]> = {
    draft: "submitted",
    submitted: "approved",
    rejected: "draft",
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setOpen(true)} className="gap-2">
          <Plus className="w-4 h-4" /> Upload Drawing
        </Button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Drawing</DialogTitle>
            <DialogDescription>Register a drawing file for this lead.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>File Name *</Label>
              <Input
                value={form.fileName}
                onChange={(e) => setForm((p) => ({ ...p, fileName: e.target.value }))}
                placeholder="Floor_Plan_v1.pdf"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>File Type</Label>
                <Input
                  value={form.fileType}
                  onChange={(e) => setForm((p) => ({ ...p, fileType: e.target.value }))}
                  placeholder="PDF, DWG, etc."
                />
              </div>
              <div className="space-y-1.5">
                <Label>Version</Label>
                <Input
                  type="number"
                  min={1}
                  value={form.version}
                  onChange={(e) => setForm((p) => ({ ...p, version: e.target.value }))}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button
              disabled={!form.fileName.trim() || create.isPending}
              onClick={() =>
                create.mutate({
                  leadId,
                  data: { fileName: form.fileName, fileType: form.fileType || undefined, version: Number(form.version) || 1 },
                })
              }
            >
              {create.isPending ? "Saving…" : "Add drawing"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {drawings.length > 0 ? (
        <div className="space-y-3">
          {drawings.map((d) => (
            <Card key={d.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1">
                    <FileText className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm">{d.fileName}</span>
                        <Badge variant="outline" className="text-xs">v{d.version}</Badge>
                        <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium capitalize", statusColors[d.status] ?? "bg-muted text-muted-foreground")}>
                          {d.status}
                        </span>
                      </div>
                      {d.fileType && (
                        <p className="text-xs text-muted-foreground">
                          {d.fileType}{d.fileSize ? ` · ${(d.fileSize / 1024 / 1024).toFixed(1)} MB` : ""}
                        </p>
                      )}
                      {d.reviewerComments && (
                        <p className="text-sm italic text-muted-foreground">"{d.reviewerComments}"</p>
                      )}
                      {"uploadedByName" in d && d.uploadedByName && (
                        <p className="text-xs text-muted-foreground/60">
                          Uploaded by {d.uploadedByName as string}
                          {"uploadedAt" in d && d.uploadedAt
                            ? ` · ${format(new Date(d.uploadedAt as string), "MMM d, yyyy")}`
                            : ""}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    {nextStatus[d.status] && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => patchDrawing.mutate({ id: d.id, data: { status: nextStatus[d.status] } })}
                      >
                        → {nextStatus[d.status]}
                      </Button>
                    )}
                    {d.status !== "rejected" && d.status !== "approved" && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-destructive hover:text-destructive"
                        onClick={() => patchDrawing.mutate({ id: d.id, data: { status: "rejected" } })}
                      >
                        Reject
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 border rounded-lg border-dashed text-muted-foreground">
          No drawings uploaded yet.
        </div>
      )}
    </div>
  );
}

// ─── BOQ Items Panel ──────────────────────────────────────────────────────────

function BOQItemsPanel({ boqId, onClose }: { boqId: number; onClose: () => void }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: boq, isLoading } = useGetBoq(boqId);
  const [form, setForm] = useState({
    itemName: "",
    category: "",
    quantity: "",
    unit: "sqft",
    unitPrice: "",
    taxPercent: "18",
    marginPercent: "12",
  });

  const addItem = useAddBoqItem({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: ["getBoq", boqId] });
        setForm((p) => ({ ...p, itemName: "", category: "", quantity: "", unitPrice: "" }));
        toast({ title: "Item added" });
      },
    },
  });

  const deleteItem = useDeleteBoqItem({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: ["getBoq", boqId] });
        toast({ title: "Item removed" });
      },
    },
  });

  if (isLoading) return <div className="py-8 text-center text-muted-foreground">Loading BOQ…</div>;
  if (!boq) return null;

  const typed = boq as BoqDetail;
  const items = typed.items ?? [];

  return (
    <div className="border-t p-4 space-y-4 bg-muted/30">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold text-sm">Line Items — BOQ v{typed.version}</h4>
        <Button size="sm" variant="ghost" onClick={onClose}><ChevronUp className="w-4 h-4" /></Button>
      </div>

      {items.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="text-muted-foreground border-b">
              <tr>
                <th className="py-2 pr-3">Item</th>
                <th className="py-2 pr-3">Category</th>
                <th className="py-2 pr-3 text-right">Qty</th>
                <th className="py-2 pr-3">Unit</th>
                <th className="py-2 pr-3 text-right">Unit Price</th>
                <th className="py-2 pr-3 text-right">Tax%</th>
                <th className="py-2 pr-3 text-right">Margin%</th>
                <th className="py-2 text-right">Total</th>
                <th className="py-2" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {items.map((it) => (
                <tr key={it.id} className="hover:bg-muted/50">
                  <td className="py-2 pr-3 font-medium">{it.itemName}</td>
                  <td className="py-2 pr-3 text-muted-foreground">{it.category ?? "—"}</td>
                  <td className="py-2 pr-3 text-right">{it.quantity}</td>
                  <td className="py-2 pr-3">{it.unit ?? "—"}</td>
                  <td className="py-2 pr-3 text-right">{INR(it.unitPrice)}</td>
                  <td className="py-2 pr-3 text-right">{it.taxPercent}%</td>
                  <td className="py-2 pr-3 text-right">{it.marginPercent}%</td>
                  <td className="py-2 text-right font-semibold">{INR(it.totalPrice)}</td>
                  <td className="py-2 pl-2">
                    <button onClick={() => deleteItem.mutate({ id: it.id })} className="text-destructive hover:text-destructive/80">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground text-center py-2">No items yet. Add a line item below.</p>
      )}

      <div className="border-t pt-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">Add Line Item</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <Input
            placeholder="Item name *"
            value={form.itemName}
            onChange={(e) => setForm((p) => ({ ...p, itemName: e.target.value }))}
            className="sm:col-span-2 text-sm"
          />
          <Input
            placeholder="Category"
            value={form.category}
            onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}
            className="text-sm"
          />
          <Input
            placeholder="Unit"
            value={form.unit}
            onChange={(e) => setForm((p) => ({ ...p, unit: e.target.value }))}
            className="text-sm"
          />
          <Input
            placeholder="Quantity"
            type="number"
            value={form.quantity}
            onChange={(e) => setForm((p) => ({ ...p, quantity: e.target.value }))}
            className="text-sm"
          />
          <Input
            placeholder="Unit Price (₹)"
            type="number"
            value={form.unitPrice}
            onChange={(e) => setForm((p) => ({ ...p, unitPrice: e.target.value }))}
            className="text-sm"
          />
          <Input
            placeholder="Tax %"
            type="number"
            value={form.taxPercent}
            onChange={(e) => setForm((p) => ({ ...p, taxPercent: e.target.value }))}
            className="text-sm"
          />
          <Input
            placeholder="Margin %"
            type="number"
            value={form.marginPercent}
            onChange={(e) => setForm((p) => ({ ...p, marginPercent: e.target.value }))}
            className="text-sm"
          />
        </div>
        <Button
          size="sm"
          className="mt-2"
          disabled={!form.itemName.trim() || !form.quantity || !form.unitPrice || addItem.isPending}
          onClick={() =>
            addItem.mutate({
              boqId,
              data: {
                itemName: form.itemName,
                category: form.category || undefined,
                quantity: Number(form.quantity),
                unit: form.unit || undefined,
                unitPrice: Number(form.unitPrice),
                taxPercent: Number(form.taxPercent),
                marginPercent: Number(form.marginPercent),
              },
            })
          }
        >
          {addItem.isPending ? "Adding…" : "Add item"}
        </Button>
      </div>

      <div className="border-t pt-3 grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
        {([
          { label: "Subtotal", val: typed.subtotal },
          { label: "Tax", val: typed.taxTotal },
          { label: "Margin", val: typed.marginTotal },
          { label: "Grand Total", val: typed.grandTotal },
        ] as const).map(({ label, val }) => (
          <div key={label} className="space-y-0.5">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="font-bold">{INR(Number(val ?? 0))}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── BOQ Tab ──────────────────────────────────────────────────────────────────

type BoqRow = Boq;

function BOQTab({ leadId, boqs }: { leadId: number; boqs: BoqRow[] }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [expandedId, setExpandedId] = useState<number | null>(boqs[0]?.id ?? null);

  const createBoqMutation = useCreateBoq({
    mutation: {
      onSuccess: (newBoq) => {
        qc.invalidateQueries({ queryKey: getGetLeadQueryKey(leadId) });
        setExpandedId(newBoq.id);
        toast({ title: `BOQ v${newBoq.version} created` });
      },
    },
  });

  const updateBoqMutation = useUpdateBoq({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getGetLeadQueryKey(leadId) });
        toast({ title: "BOQ status updated" });
      },
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button
          size="sm"
          className="gap-2"
          onClick={() => createBoqMutation.mutate({ leadId, data: {} })}
          disabled={createBoqMutation.isPending}
        >
          <Plus className="w-4 h-4" />
          {createBoqMutation.isPending ? "Creating…" : "New BOQ Version"}
        </Button>
      </div>

      {boqs.length > 0 ? (
        <div className="space-y-3">
          {boqs.map((b) => (
            <div key={b.id} className="border rounded-lg overflow-hidden">
              <div
                className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-muted/50"
                onClick={() => setExpandedId(expandedId === b.id ? null : b.id)}
              >
                <div className="flex items-center gap-3">
                  {expandedId === b.id ? (
                    <ChevronUp className="w-4 h-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                  )}
                  <span className="font-semibold">BOQ v{b.version}</span>
                  <Badge variant={b.status === "approved" ? "default" : "secondary"} className="capitalize">
                    {b.status}
                  </Badge>
                </div>
                <div className="flex items-center gap-3">
                  {b.grandTotal != null && (
                    <span className="font-bold text-primary">{INR(Number(b.grandTotal))}</span>
                  )}
                  <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                    {b.status === "draft" && (
                      <Button size="sm" variant="outline" onClick={() => updateBoqMutation.mutate({ id: b.id, data: { status: "submitted" } })}>
                        Submit
                      </Button>
                    )}
                    {b.status === "submitted" && (
                      <>
                        <Button size="sm" variant="outline" onClick={() => updateBoqMutation.mutate({ id: b.id, data: { status: "approved" } })}>
                          Approve
                        </Button>
                        <Button size="sm" variant="outline" className="text-destructive" onClick={() => updateBoqMutation.mutate({ id: b.id, data: { status: "rejected" } })}>
                          Reject
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </div>
              {expandedId === b.id && <BOQItemsPanel boqId={b.id} onClose={() => setExpandedId(null)} />}
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 border rounded-lg border-dashed text-muted-foreground">
          No BOQs yet. Create the first version to start adding line items.
        </div>
      )}
    </div>
  );
}

// ─── Negotiations Tab ─────────────────────────────────────────────────────────

type NegotiationRow = Negotiation;

function NegotiationsTab({ leadId, negotiations }: { leadId: number; negotiations: NegotiationRow[] }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ revisedAmount: "", discountPercent: "", notes: "" });

  const create = useCreateNegotiation({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getGetLeadQueryKey(leadId) });
        setOpen(false);
        setForm({ revisedAmount: "", discountPercent: "", notes: "" });
        toast({ title: "Negotiation round added" });
      },
    },
  });

  const patchNeg = useUpdateNegotiation({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getGetLeadQueryKey(leadId) });
        toast({ title: "Negotiation updated" });
      },
    },
  });

  const statusColors: Record<string, string> = {
    pending: "bg-amber-100 text-amber-700",
    approved: "bg-emerald-100 text-emerald-700",
    rejected: "bg-red-100 text-red-700",
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setOpen(true)} className="gap-2">
          <Plus className="w-4 h-4" /> New Round
        </Button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Negotiation Round</DialogTitle>
            <DialogDescription>
              Record a revised offer. Discount &gt;10% will require admin approval.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Revised Amount (₹)</Label>
                <Input
                  type="number"
                  value={form.revisedAmount}
                  onChange={(e) => setForm((p) => ({ ...p, revisedAmount: e.target.value }))}
                  placeholder="e.g. 28500000"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Discount %</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.discountPercent}
                  onChange={(e) => setForm((p) => ({ ...p, discountPercent: e.target.value }))}
                  placeholder="e.g. 5.5"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Textarea
                value={form.notes}
                onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                rows={3}
                placeholder="Terms agreed, client feedback..."
              />
            </div>
            {Number(form.discountPercent || 0) > 10 && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 text-sm">
                <AlertCircle className="w-4 h-4 shrink-0" />
                Discount exceeds 10% — this round will require admin approval.
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button
              disabled={create.isPending}
              onClick={() =>
                create.mutate({
                  leadId,
                  data: {
                    revisedAmount: form.revisedAmount ? Number(form.revisedAmount) : undefined,
                    discountPercent: form.discountPercent ? Number(form.discountPercent) : undefined,
                    notes: form.notes || undefined,
                  },
                })
              }
            >
              {create.isPending ? "Saving…" : "Add round"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {negotiations.length > 0 ? (
        <div className="space-y-3">
          {negotiations.map((n) => (
            <Card key={n.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold">Round {n.roundNumber}</span>
                      <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium capitalize", statusColors[n.status] ?? "bg-muted text-muted-foreground")}>
                        {n.status}
                      </span>
                      {n.requiresApproval && (
                        <Badge variant="outline" className="text-xs text-amber-600 border-amber-300">
                          Requires Approval
                        </Badge>
                      )}
                    </div>
                    <div className="flex gap-6 text-sm">
                      {n.revisedAmount != null && (
                        <div>
                          <p className="text-xs text-muted-foreground">Revised Amount</p>
                          <p className="font-semibold text-primary">{INR(Number(n.revisedAmount))}</p>
                        </div>
                      )}
                      {n.discountPercent != null && (
                        <div>
                          <p className="text-xs text-muted-foreground">Discount</p>
                          <p className="font-semibold">{Number(n.discountPercent).toFixed(2)}%</p>
                        </div>
                      )}
                    </div>
                    {n.notes && <p className="text-sm text-muted-foreground">{n.notes}</p>}
                  </div>
                  {n.status === "pending" && (
                    <div className="flex gap-2 shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => patchNeg.mutate({ id: n.id, data: { status: "approved" as NegotiationUpdate["status"] } })}
                      >
                        <CheckCircle2 className="w-4 h-4 mr-1" /> Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-destructive hover:text-destructive"
                        onClick={() => patchNeg.mutate({ id: n.id, data: { status: "rejected" as NegotiationUpdate["status"] } })}
                      >
                        Reject
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 border rounded-lg border-dashed text-muted-foreground">
          No negotiation rounds yet. Add the first round when you receive a counter-offer.
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function LeadDetail() {
  const { id } = useParams();
  const leadId = parseInt(id || "0", 10);
  const [, navigate] = useLocation();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [convertOpen, setConvertOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [projectName, setProjectName] = useState("");
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));

  const { data: lead, isLoading } = useGetLead(leadId, {
    query: { enabled: !!leadId, queryKey: getGetLeadQueryKey(leadId) },
  });

  const convertMutation = useConvertLead({
    mutation: {
      onSuccess: (project) => {
        qc.invalidateQueries({ queryKey: getGetLeadQueryKey(leadId) });
        qc.invalidateQueries({ queryKey: getListLeadsQueryKey() });
        qc.invalidateQueries({ queryKey: getListProjectsQueryKey() });
        qc.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
        qc.invalidateQueries({ queryKey: getGetLeadsSummaryQueryKey() });
        setConvertOpen(false);
        toast({
          title: "Lead converted",
          description: `Project "${(project as unknown as { name: string }).name}" created with a full lifecycle of tasks.`,
        });
        navigate(`/projects/${(project as unknown as { id: number }).id}`);
      },
      onError: (err: unknown) => {
        const e = err as { response?: { data?: { error?: string } } };
        toast({ title: "Could not convert lead", description: e?.response?.data?.error ?? "Unknown error", variant: "destructive" });
      },
    },
  });

  if (isLoading) return <div className="p-6 text-muted-foreground">Loading lead details…</div>;
  if (!lead) return <div className="p-6 text-destructive">Lead not found.</div>;

  const typedLead = lead as LeadDetail & {
    activities?: ActivityRow[];
    siteVisits?: SiteVisitRow[];
    drawings?: DrawingRow[];
  };

  const isWon = typedLead.status === "won";
  const isLost = typedLead.status === "lost";

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/leads"><ChevronLeft className="h-5 w-5" /></Link>
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold tracking-tight truncate">{typedLead.customerName}</h1>
            <Badge variant="outline" className="font-mono shrink-0">{typedLead.leadNumber}</Badge>
            <Badge variant={isWon ? "default" : isLost ? "destructive" : "secondary"} className="capitalize shrink-0">{typedLead.status}</Badge>
            <Badge variant="outline" className="capitalize shrink-0 text-xs">{typedLead.priority} priority</Badge>
          </div>
          {typedLead.company && <p className="text-muted-foreground text-sm mt-0.5">{typedLead.company}</p>}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {isWon && typedLead.wonProjectId ? (
            <Button asChild className="gap-2">
              <Link href={`/projects/${typedLead.wonProjectId}`}>View Project <ArrowRight className="h-4 w-4" /></Link>
            </Button>
          ) : !isLost && !isWon ? (
            <Button
              className="gap-2"
              onClick={() => {
                setProjectName(`${typedLead.customerName}${typedLead.projectType ? ` — ${typedLead.projectType}` : ""}`);
                setConvertOpen(true);
              }}
            >
              <Trophy className="h-4 w-4" /> Mark as Won
            </Button>
          ) : null}
          <Button variant="outline" className="gap-2" onClick={() => setEditOpen(true)}>
            <Edit className="h-4 w-4" /> Edit
          </Button>
        </div>
      </div>

      {/* ── Stage Stepper ── */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <StageStepper
            currentStage={typedLead.stage as Stage}
            lead={typedLead}
            isWon={isWon}
            isLost={isLost}
          />
        </CardContent>
      </Card>

      {/* ── Edit Dialog ── */}
      {editOpen && (
        <EditLeadDialog lead={typedLead} open={editOpen} onOpenChange={setEditOpen} />
      )}

      {/* ── Convert Dialog ── */}
      <Dialog open={convertOpen} onOpenChange={setConvertOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Convert lead to project</DialogTitle>
            <DialogDescription>
              We'll mark this lead as <b>won</b>, create a project, copy the customer as primary stakeholder,
              seed the budget from the latest BOQ, and lay down an 11-step lifecycle of tasks.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Project name</Label>
              <Input value={projectName} onChange={(e) => setProjectName(e.target.value)} placeholder="e.g. Citygate Residences" />
            </div>
            <div className="space-y-2">
              <Label>Project start date</Label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConvertOpen(false)} disabled={convertMutation.isPending}>Cancel</Button>
            <Button
              onClick={() => convertMutation.mutate({ id: leadId, data: { projectName: projectName || null, startDate: startDate || null } })}
              disabled={convertMutation.isPending || !projectName.trim()}
            >
              {convertMutation.isPending ? "Converting…" : "Convert to project"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Body ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left sidebar */}
        <div className="md:col-span-1 space-y-4">
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">Contact Info</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              {typedLead.company && (
                <div><p className="text-xs text-muted-foreground">Company</p><p className="font-medium">{typedLead.company}</p></div>
              )}
              {typedLead.contactEmail && (
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <a href={`mailto:${typedLead.contactEmail}`} className="hover:underline">{typedLead.contactEmail}</a>
                </div>
              )}
              {typedLead.contactPhone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <a href={`tel:${typedLead.contactPhone}`} className="hover:underline">{typedLead.contactPhone}</a>
                </div>
              )}
              {typedLead.location && (
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                  <span>{typedLead.location}</span>
                </div>
              )}
              {!typedLead.contactEmail && !typedLead.contactPhone && !typedLead.location && !typedLead.company && (
                <p className="text-muted-foreground text-xs">No contact info recorded.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">Project Details</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              {[
                { label: "Type", value: typedLead.projectType || "Unspecified" },
                { label: "Budget Estimate", value: typedLead.budgetEstimate ? INR(Number(typedLead.budgetEstimate)) : "—", primary: true },
                { label: "Lead Source", value: typedLead.leadSource || "—" },
                { label: "Created On", value: format(new Date(typedLead.createdAt), "MMM d, yyyy") },
                { label: "Expected Closure", value: typedLead.expectedClosureDate ? format(new Date(typedLead.expectedClosureDate), "MMM d, yyyy") : "—" },
                { label: "Owner", value: typedLead.ownerName ?? "—" },
              ].map(({ label, value, primary }) => (
                <div key={label} className="flex justify-between gap-2">
                  <span className="text-muted-foreground">{label}</span>
                  <span className={cn("font-medium text-right", primary && "text-primary")}>{value}</span>
                </div>
              ))}
              {typedLead.notes && (
                <div className="pt-2 border-t">
                  <p className="text-xs text-muted-foreground mb-1">Notes</p>
                  <p className="text-sm">{typedLead.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <div className="md:col-span-2">
          <Tabs defaultValue="activities">
            <TabsList className="w-full justify-start border-b rounded-none h-auto p-0 bg-transparent gap-1 flex-wrap">
              {[
                { value: "activities", label: `Activities${typedLead.activities?.length ? ` (${typedLead.activities.length})` : ""}` },
                { value: "site_visits", label: `Site Visits${typedLead.siteVisits?.length ? ` (${typedLead.siteVisits.length})` : ""}` },
                { value: "drawings", label: `Drawings${typedLead.drawings?.length ? ` (${typedLead.drawings.length})` : ""}` },
                { value: "boqs", label: `BOQs${typedLead.boqs?.length ? ` (${typedLead.boqs.length})` : ""}` },
                { value: "negotiations", label: `Negotiations${typedLead.negotiations?.length ? ` (${typedLead.negotiations.length})` : ""}` },
              ].map((t) => (
                <TabsTrigger
                  key={t.value}
                  value={t.value}
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent text-sm"
                >
                  {t.label}
                </TabsTrigger>
              ))}
            </TabsList>

            <div className="py-4">
              <TabsContent value="activities" className="m-0">
                <ActivitiesTab leadId={leadId} activities={typedLead.activities ?? []} />
              </TabsContent>
              <TabsContent value="site_visits" className="m-0">
                <SiteVisitsTab leadId={leadId} visits={typedLead.siteVisits ?? []} />
              </TabsContent>
              <TabsContent value="drawings" className="m-0">
                <DrawingsTab leadId={leadId} drawings={typedLead.drawings ?? []} />
              </TabsContent>
              <TabsContent value="boqs" className="m-0">
                <BOQTab leadId={leadId} boqs={typedLead.boqs ?? []} />
              </TabsContent>
              <TabsContent value="negotiations" className="m-0">
                <NegotiationsTab leadId={leadId} negotiations={typedLead.negotiations ?? []} />
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
