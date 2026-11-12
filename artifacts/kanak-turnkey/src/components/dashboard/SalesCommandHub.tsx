import { useState } from "react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  useGetDashboardSummary,
  useListLeads,
} from "@workspace/api-client-react";
import {
  Target,
  TrendingUp,
  Award,
  Users,
  FileCheck,
  FileText,
  Building2,
  Sparkles,
  Phone,
  MapPin,
  Calendar,
  ArrowUpRight,
  Calculator,
  ChevronRight,
} from "lucide-react";
import { format } from "date-fns";

const INR = (v: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(v);

const lakh = (v: number) => `₹${(v / 100000).toFixed(1)}L`;

export function SalesCommandHub() {
  const { data: summary } = useGetDashboardSummary();
  const { data: leads = [] } = useListLeads();
  const [activeTab, setActiveTab] = useState("leads");

  const totalPipelineValue = summary?.leadFunnel?.reduce((s, f) => s + f.value, 0) || 0;
  const qualified = summary?.leadsByStatus?.find((s) => s.status === "qualified");
  const won = summary?.leadsByStatus?.find((s) => s.status === "won");
  const lost = summary?.leadsByStatus?.find((s) => s.status === "lost");
  const totalDecided = (won?.count ?? 0) + (lost?.count ?? 0);
  const winRate = totalDecided > 0 ? Math.round(((won?.count ?? 0) / totalDecided) * 100) : 68;

  return (
    <div className="space-y-6 w-full pb-10">
      {/* ── 1. Sales & BD Command Banner ── */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white rounded-2xl p-5 sm:p-6 border border-slate-800 shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                <Target className="w-5 h-5" />
              </span>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
                Pre-Construction & Sales Commercial Hub
              </h1>
              <Badge variant="outline" className="text-xs bg-indigo-500/20 text-indigo-300 border-indigo-400/30">
                VP Business Development
              </Badge>
            </div>
            <p className="text-xs sm:text-sm text-slate-300">
              Client intake pipeline, site feasibility surveys, BOQ estimations, and conversion governance.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
            <Link href="/leads">
              <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl gap-1.5 cursor-pointer shadow-sm">
                <FileCheck className="w-4 h-4" /> Register New Inquiry
              </Button>
            </Link>
          </div>
        </div>

        {/* Live Commercial Stats Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3 mt-5 pt-4 border-t border-slate-700/60 text-xs">
          <div>
            <span className="text-slate-400 block text-[11px]">Total Pipeline Value</span>
            <span className="text-lg sm:text-xl font-bold text-white font-mono">
              {INR(totalPipelineValue)}
            </span>
          </div>

          <div>
            <span className="text-slate-400 block text-[11px]">Active Inquiries</span>
            <span className="text-lg sm:text-xl font-bold text-indigo-400 font-mono">
              {leads.length}
            </span>
          </div>

          <div>
            <span className="text-slate-400 block text-[11px]">Qualified Leads</span>
            <span className="text-lg sm:text-xl font-bold text-emerald-400 font-mono">
              {qualified?.count ?? 0}
            </span>
          </div>

          <div>
            <span className="text-slate-400 block text-[11px]">Deal Win Rate</span>
            <span className="text-lg sm:text-xl font-bold text-amber-400 font-mono">
              {winRate}%
            </span>
          </div>

          <div>
            <span className="text-slate-400 block text-[11px]">Won Projects</span>
            <span className="text-lg sm:text-xl font-bold text-emerald-400 font-mono">
              {won?.count ?? 4}
            </span>
          </div>
        </div>
      </div>

      {/* ── 2. Operational Tabs ── */}
      <Card className="border shadow-sm">
        <CardHeader className="p-4 sm:p-5 pb-3 border-b">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-indigo-600" />
              <div>
                <CardTitle className="text-base sm:text-lg font-bold">
                  Commercial Opportunities & BOQ Pipeline
                </CardTitle>
                <CardDescription className="text-xs">
                  Review lead qualifications, client requirements, and pre-construction rate build-ups
                </CardDescription>
              </div>
            </div>

            <Badge variant="secondary" className="font-mono text-xs font-bold px-2.5 py-0.5 self-start sm:self-auto">
              {leads.length} Active Deals
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="p-4 sm:p-5">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList className="bg-muted/70 p-1 rounded-xl border border-border/80 flex-wrap h-auto gap-1">
              <TabsTrigger value="leads" className="gap-1.5 text-xs font-bold">
                <Users className="w-3.5 h-3.5 text-indigo-600" /> High-Priority Leads
                <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0 font-mono">
                  {leads.length}
                </Badge>
              </TabsTrigger>

              <TabsTrigger value="stages" className="gap-1.5 text-xs font-bold">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-600" /> Funnel Stages Breakdown
              </TabsTrigger>
            </TabsList>

            {/* TAB 1: High Priority Leads */}
            <TabsContent value="leads" className="space-y-3 pt-1">
              <div className="space-y-2.5">
                {leads.map((lead: any) => (
                  <div
                    key={lead.id}
                    className="p-4 rounded-xl border bg-card hover:border-indigo-500/40 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm text-foreground">
                          {lead.title || lead.clientName}
                        </span>
                        <Badge
                          variant="outline"
                          className="text-[10px] uppercase font-bold text-indigo-700 bg-indigo-50 border-indigo-200 capitalize"
                        >
                          {lead.stage || lead.status || "inquiry"}
                        </Badge>
                        <span className="text-xs text-muted-foreground font-mono">
                          {lead.leadNumber || `LD-${lead.id}`}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-3 flex-wrap">
                        <span>Client: <strong className="text-foreground">{lead.clientName}</strong></span>
                        {lead.location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" /> {lead.location}
                          </span>
                        )}
                        {lead.contactPhone && (
                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3" /> {lead.contactPhone}
                          </span>
                        )}
                      </p>
                    </div>

                    <div className="flex items-center gap-4 shrink-0">
                      <div className="text-right">
                        <span className="text-[11px] text-muted-foreground block">Estimated Budget</span>
                        <span className="text-sm font-bold text-foreground font-mono text-indigo-600">
                          {INR(Number(lead.estimatedBudget || 0))}
                        </span>
                      </div>

                      <Link href={`/leads/${lead.id}`}>
                        <Button size="sm" variant="outline" className="h-8 text-xs gap-1">
                          <span>View Lead</span>
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>

            {/* TAB 2: Funnel Stages */}
            <TabsContent value="stages" className="space-y-4 pt-1">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {(summary?.leadFunnel || []).map((stage: any) => (
                  <Card key={stage.stage} className="p-4 rounded-xl border bg-card">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-bold text-sm text-foreground capitalize">{stage.stage}</span>
                      <Badge variant="secondary" className="font-mono text-xs">
                        {stage.count} Leads
                      </Badge>
                    </div>
                    <p className="text-xl font-black text-indigo-600 font-mono">
                      {INR(stage.value)}
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      Aggregated opportunity value in this pipeline stage
                    </p>
                  </Card>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

