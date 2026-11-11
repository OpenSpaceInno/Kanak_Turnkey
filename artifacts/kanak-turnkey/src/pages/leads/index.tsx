import { useState } from "react";
import { Link } from "wouter";
import {
  useListLeads,
  useGetLeadsSummary,
  useUpdateLead,
  getListLeadsQueryKey,
  getGetLeadsSummaryQueryKey,
} from "@workspace/api-client-react";
import type { Lead, LeadInput } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Search,
  Filter,
  LayoutGrid,
  List,
  MapPin,
  Calendar,
  Building2,
  ArrowRight,
  Sparkles,
  Trophy,
  CheckCircle2,
  Clock,
  Coins,
  FileText,
  UserCheck,
  Compass,
} from "lucide-react";
import { format } from "date-fns";
import { NewLeadDialog } from "@/components/dialogs/create-dialogs";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const INR = (v: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(v);

const PIPELINE_COLUMNS = [
  {
    key: "lead_creation",
    label: "1. Lead Intake",
    description: "New inquiries & profiling",
    badgeColor: "bg-blue-100 text-blue-700 border-blue-200",
    headerBorder: "border-t-blue-500",
    icon: UserCheck,
  },
  {
    key: "site_visit",
    label: "2. Site Visit & Survey",
    description: "Measurements & field inspection",
    badgeColor: "bg-cyan-100 text-cyan-700 border-cyan-200",
    headerBorder: "border-t-cyan-500",
    icon: Compass,
  },
  {
    key: "drawings",
    label: "3. Design & Drawings",
    description: "Architectural & MEP coordination",
    badgeColor: "bg-purple-100 text-purple-700 border-purple-200",
    headerBorder: "border-t-purple-500",
    icon: FileText,
  },
  {
    key: "boq",
    label: "4. BOQ & Estimation",
    description: "Line-item costing & margin",
    badgeColor: "bg-amber-100 text-amber-700 border-amber-200",
    headerBorder: "border-t-amber-500",
    icon: Coins,
  },
  {
    key: "negotiation",
    label: "5. Negotiation",
    description: "Discounts & commercial terms",
    badgeColor: "bg-indigo-100 text-indigo-700 border-indigo-200",
    headerBorder: "border-t-indigo-500",
    icon: Sparkles,
  },
  {
    key: "finalization",
    label: "6. Won & Converted",
    description: "Contract executed & project seeded",
    badgeColor: "bg-emerald-100 text-emerald-700 border-emerald-200",
    headerBorder: "border-t-emerald-500",
    icon: Trophy,
  },
] as const;

const NEXT_STAGE_MAP: Record<string, string> = {
  lead_creation: "site_visit",
  site_visit: "drawings",
  drawings: "boq",
  boq: "negotiation",
  negotiation: "finalization",
};

export default function Leads() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: leads, isLoading: isLoadingLeads } = useListLeads();
  const { data: summary, isLoading: isLoadingSummary } = useGetLeadsSummary();
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"kanban" | "table">("kanban");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");

  const updateLead = useUpdateLead({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListLeadsQueryKey() });
        qc.invalidateQueries({ queryKey: getGetLeadsSummaryQueryKey() });
        toast({ title: "Stage advanced successfully" });
      },
      onError: () => {
        toast({ title: "Failed to advance stage", variant: "destructive" });
      },
    },
  });

  const handleAdvanceStage = (lead: Lead) => {
    const next = NEXT_STAGE_MAP[lead.stage];
    if (!next) return;
    updateLead.mutate({
      id: lead.id,
      data: {
        customerName: lead.customerName,
        stage: next as LeadInput["stage"],
        status: next === "finalization" ? "won" : lead.status,
      },
    });
  };

  const filteredLeads = (leads || []).filter((lead) => {
    const matchSearch =
      lead.customerName.toLowerCase().includes(search.toLowerCase()) ||
      lead.leadNumber.toLowerCase().includes(search.toLowerCase()) ||
      (lead.company && lead.company.toLowerCase().includes(search.toLowerCase())) ||
      (lead.location && lead.location.toLowerCase().includes(search.toLowerCase()));

    if (!matchSearch) return false;

    if (statusFilter === "active") {
      if (lead.status === "won" || lead.status === "lost") return false;
    } else if (statusFilter !== "all" && lead.status !== statusFilter) {
      return false;
    }

    if (priorityFilter !== "all" && lead.priority !== priorityFilter) {
      return false;
    }

    return true;
  });

  if (isLoadingLeads || isLoadingSummary) {
    return <div className="p-6 text-muted-foreground">Loading leads pipeline...</div>;
  }

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "urgent":
        return <Badge variant="destructive" className="capitalize text-[10px] px-1.5 py-0">Urgent</Badge>;
      case "high":
        return <Badge className="bg-amber-500 hover:bg-amber-600 capitalize text-[10px] px-1.5 py-0">High</Badge>;
      case "medium":
        return <Badge variant="secondary" className="capitalize text-[10px] px-1.5 py-0">Medium</Badge>;
      default:
        return <Badge variant="outline" className="capitalize text-[10px] px-1.5 py-0">{priority}</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "won":
        return <Badge className="bg-emerald-600 hover:bg-emerald-700 capitalize text-[10px] px-1.5 py-0">Won</Badge>;
      case "lost":
        return <Badge variant="destructive" className="capitalize text-[10px] px-1.5 py-0">Lost</Badge>;
      case "qualified":
        return <Badge className="bg-blue-600 hover:bg-blue-700 capitalize text-[10px] px-1.5 py-0">Qualified</Badge>;
      case "contacted":
        return <Badge variant="secondary" className="capitalize text-[10px] px-1.5 py-0">Contacted</Badge>;
      default:
        return <Badge variant="outline" className="capitalize text-[10px] px-1.5 py-0">New</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight">Pre-Construction & Sales</h1>
            <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 font-medium">
              Turnkey Pipeline
            </Badge>
          </div>
          <p className="text-muted-foreground mt-1">
            Manage lead intake, site surveys, architectural drawings, BOQ estimation, and commercial negotiations.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <NewLeadDialog
            trigger={
              <Button className="shrink-0 gap-2 shadow-sm">
                <Plus className="h-4 w-4" /> New Lead
              </Button>
            }
          />
        </div>
      </div>

      {/* ── Metric Cards ── */}
      {summary && (
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          <Card className="shadow-xs">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Total Pipeline Leads
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.totalLeads}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Across all active and closed stages
              </p>
            </CardContent>
          </Card>
          <Card className="shadow-xs border-primary/20 bg-primary/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-semibold text-primary uppercase tracking-wider">
                Active Pipeline Value
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">
                {INR(summary.pipelineValue)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Sum of pre-construction estimates
              </p>
            </CardContent>
          </Card>
          <Card className="shadow-xs">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Qualified Prospects
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-600">{summary.qualifiedLeads}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Surveys & drawings approved
              </p>
            </CardContent>
          </Card>
          <Card className="shadow-xs">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Win Conversion Rate
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-indigo-600">
                {summary.conversionRate.toFixed(1)}%
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Converted into active turnkey projects
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Controls & Filters Bar ── */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-card p-3 rounded-lg border">
        <div className="flex flex-wrap items-center gap-2 flex-1">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search customer, lead #, city..."
              className="pl-8 text-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px] text-xs h-9">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="active">Active Pipeline</SelectItem>
              <SelectItem value="qualified">Qualified</SelectItem>
              <SelectItem value="contacted">Contacted</SelectItem>
              <SelectItem value="new">New</SelectItem>
              <SelectItem value="won">Won</SelectItem>
              <SelectItem value="lost">Lost</SelectItem>
            </SelectContent>
          </Select>

          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="w-[130px] text-xs h-9">
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priorities</SelectItem>
              <SelectItem value="urgent">Urgent</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* View Switcher */}
        <div className="flex items-center gap-1 border rounded-md p-1 bg-muted/30 shrink-0 self-end md:self-auto">
          <Button
            size="sm"
            variant={viewMode === "kanban" ? "secondary" : "ghost"}
            className="h-7 px-2.5 text-xs gap-1.5"
            onClick={() => setViewMode("kanban")}
          >
            <LayoutGrid className="h-3.5 w-3.5" />
            Kanban
          </Button>
          <Button
            size="sm"
            variant={viewMode === "table" ? "secondary" : "ghost"}
            className="h-7 px-2.5 text-xs gap-1.5"
            onClick={() => setViewMode("table")}
          >
            <List className="h-3.5 w-3.5" />
            Table
          </Button>
        </div>
      </div>

      {/* ── Content View ── */}
      {viewMode === "kanban" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 items-start">
          {PIPELINE_COLUMNS.map((col) => {
            const colLeads = filteredLeads.filter((l) => {
              if (col.key === "finalization") {
                return l.stage === "finalization" || l.status === "won";
              }
              if (l.status === "lost") return false;
              return l.stage === col.key;
            });

            const colTotalValue = colLeads.reduce(
              (acc, curr) => acc + (Number(curr.budgetEstimate) || 0),
              0
            );

            const Icon = col.icon;

            return (
              <div
                key={col.key}
                className={cn(
                  "bg-muted/30 rounded-lg border border-t-4 p-3 flex flex-col min-h-[500px]",
                  col.headerBorder
                )}
              >
                {/* Column Header */}
                <div className="pb-3 border-b mb-3">
                  <div className="flex items-center justify-between gap-1">
                    <div className="flex items-center gap-1.5 font-semibold text-xs truncate">
                      <Icon className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
                      <span className="truncate">{col.label}</span>
                    </div>
                    <Badge variant="secondary" className="text-[10px] h-5 px-1.5 shrink-0">
                      {colLeads.length}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between mt-1 text-[11px] text-muted-foreground">
                    <span className="truncate">{col.description}</span>
                    <span className="font-semibold text-foreground shrink-0">
                      {colTotalValue > 0 ? INR(colTotalValue) : "₹0"}
                    </span>
                  </div>
                </div>

                {/* Cards Container */}
                <div className="space-y-2.5 flex-1 overflow-y-auto">
                  {colLeads.length > 0 ? (
                    colLeads.map((lead) => {
                      const canAdvance =
                        lead.status !== "won" &&
                        lead.status !== "lost" &&
                        col.key !== "finalization" &&
                        !!NEXT_STAGE_MAP[lead.stage];

                      return (
                        <Card
                          key={lead.id}
                          className="shadow-2xs hover:shadow-md transition-shadow duration-150 border bg-card"
                        >
                          <CardContent className="p-3 space-y-2.5">
                            {/* Card Top: Number & Badges */}
                            <div className="flex items-center justify-between gap-2">
                              <Link
                                href={`/leads/${lead.id}`}
                                className="font-mono text-xs font-semibold text-primary hover:underline"
                              >
                                {lead.leadNumber}
                              </Link>
                              <div className="flex items-center gap-1 shrink-0">
                                {getPriorityBadge(lead.priority)}
                                {getStatusBadge(lead.status)}
                              </div>
                            </div>

                            {/* Customer & Company */}
                            <div>
                              <Link
                                href={`/leads/${lead.id}`}
                                className="font-medium text-sm text-foreground hover:text-primary transition-colors line-clamp-1"
                              >
                                {lead.customerName}
                              </Link>
                              {lead.company && (
                                <p className="text-xs text-muted-foreground flex items-center gap-1 line-clamp-1 mt-0.5">
                                  <Building2 className="w-3 h-3 shrink-0" />
                                  {lead.company}
                                </p>
                              )}
                            </div>

                            {/* Project Type & Location */}
                            <div className="text-xs text-muted-foreground space-y-1">
                              {lead.projectType && (
                                <p className="line-clamp-1 font-medium text-foreground/80">
                                  {lead.projectType}
                                </p>
                              )}
                              {lead.location && (
                                <p className="flex items-center gap-1 line-clamp-1">
                                  <MapPin className="w-3 h-3 shrink-0 text-muted-foreground/70" />
                                  {lead.location}
                                </p>
                              )}
                            </div>

                            {/* Budget Estimate */}
                            <div className="pt-2 border-t flex items-center justify-between text-xs">
                              <span className="text-muted-foreground">Estimate</span>
                              <span className="font-bold text-primary">
                                {lead.budgetEstimate
                                  ? INR(Number(lead.budgetEstimate))
                                  : "—"}
                              </span>
                            </div>

                            {/* Won Project Link or Quick Action */}
                            {lead.wonProjectId ? (
                              <Button
                                asChild
                                size="sm"
                                variant="outline"
                                className="w-full text-xs h-7 gap-1 text-emerald-700 bg-emerald-50/50 hover:bg-emerald-100 hover:text-emerald-800 border-emerald-200"
                              >
                                <Link href={`/projects/${lead.wonProjectId}`}>
                                  <CheckCircle2 className="w-3 h-3" /> Project Active →
                                </Link>
                              </Button>
                            ) : canAdvance ? (
                              <div className="flex items-center gap-1 pt-1">
                                <Button
                                  asChild
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 px-2 text-xs flex-1 text-muted-foreground hover:text-foreground"
                                >
                                  <Link href={`/leads/${lead.id}`}>Details</Link>
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 px-2 text-xs flex-1 gap-1 text-primary hover:bg-primary hover:text-white"
                                  onClick={() => handleAdvanceStage(lead)}
                                  disabled={updateLead.isPending}
                                >
                                  Advance <ArrowRight className="w-3 h-3" />
                                </Button>
                              </div>
                            ) : (
                              <Button
                                asChild
                                size="sm"
                                variant="outline"
                                className="w-full text-xs h-7"
                              >
                                <Link href={`/leads/${lead.id}`}>Open Lead Details →</Link>
                              </Button>
                            )}
                          </CardContent>
                        </Card>
                      );
                    })
                  ) : (
                    <div className="text-center py-10 border border-dashed rounded-md text-xs text-muted-foreground/60">
                      No leads in this stage
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* ── Table View ── */
        <div className="rounded-md border bg-card overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/50 text-muted-foreground border-b text-xs uppercase tracking-wider font-semibold">
                <tr>
                  <th className="px-4 py-3">Lead No.</th>
                  <th className="px-4 py-3">Customer & Company</th>
                  <th className="px-4 py-3">Project & Location</th>
                  <th className="px-4 py-3">Stage</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Priority</th>
                  <th className="px-4 py-3 text-right">Estimate</th>
                  <th className="px-4 py-3">Owner</th>
                  <th className="px-4 py-3">Project</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y text-xs">
                {filteredLeads.length > 0 ? (
                  filteredLeads.map((lead) => (
                    <tr key={lead.id} className="hover:bg-accent/40 transition-colors">
                      <td className="px-4 py-3">
                        <Link
                          href={`/leads/${lead.id}`}
                          className="font-mono text-primary font-semibold hover:underline"
                        >
                          {lead.leadNumber}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-foreground">{lead.customerName}</div>
                        {lead.company && (
                          <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                            <Building2 className="w-3 h-3" />
                            {lead.company}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium">{lead.projectType || "—"}</div>
                        {lead.location && (
                          <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                            <MapPin className="w-3 h-3" />
                            {lead.location}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className="capitalize text-xs">
                          {lead.stage.replace("_", " ")}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">{getStatusBadge(lead.status)}</td>
                      <td className="px-4 py-3">{getPriorityBadge(lead.priority)}</td>
                      <td className="px-4 py-3 text-right font-semibold text-primary">
                        {lead.budgetEstimate
                          ? INR(Number(lead.budgetEstimate))
                          : "—"}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {lead.ownerName || "—"}
                      </td>
                      <td className="px-4 py-3">
                        {lead.wonProjectId ? (
                          <Link
                            href={`/projects/${lead.wonProjectId}`}
                            className="text-emerald-600 font-semibold hover:underline flex items-center gap-1"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" /> Project #{lead.wonProjectId}
                          </Link>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button asChild size="sm" variant="ghost" className="h-7 px-2 text-xs">
                            <Link href={`/leads/${lead.id}`}>View</Link>
                          </Button>
                          {lead.status !== "won" &&
                            lead.status !== "lost" &&
                            NEXT_STAGE_MAP[lead.stage] && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 px-2 text-xs gap-1"
                                onClick={() => handleAdvanceStage(lead)}
                                disabled={updateLead.isPending}
                              >
                                Advance <ArrowRight className="w-3 h-3" />
                              </Button>
                            )}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={10} className="px-4 py-10 text-center text-muted-foreground">
                      No leads match the selected search or filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
