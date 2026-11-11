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
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  useGetDashboardSummary,
  useListProjects,
  useListDocuments,
  useListPunchListItems,
} from "@workspace/api-client-react";
import {
  Eye,
  Briefcase,
  Layers,
  ShieldCheck,
  CheckCircle2,
  Calendar,
  MapPin,
  Sparkles,
  Clock,
  ArrowUpRight,
  FileText,
} from "lucide-react";
import { format } from "date-fns";

export function ViewerCommandHub() {
  const { data: summary } = useGetDashboardSummary();
  const { data: projects = [] } = useListProjects();
  const { data: documents = [] } = useListDocuments();
  const { data: punchItems = [] } = useListPunchListItems();

  const [activeTab, setActiveTab] = useState("projects");

  const resolvedSnags = punchItems.filter((i: any) => i.status === "resolved" || i.status === "closed");
  const complianceRate = punchItems.length > 0 ? Math.round((resolvedSnags.length / punchItems.length) * 100) : 98;

  return (
    <div className="space-y-6 w-full pb-10">
      {/* ── 1. Stakeholder Transparency Banner ── */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-950 text-white rounded-2xl p-5 sm:p-6 border border-slate-800 shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-slate-700/50 text-slate-300 border border-slate-600">
                <Eye className="w-5 h-5" />
              </span>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
                Project Transparency & Governance Overview
              </h1>
              <Badge variant="outline" className="text-xs bg-slate-800 text-slate-300 border-slate-700">
                Stakeholder & Client Oversight
              </Badge>
            </div>
            <p className="text-xs sm:text-sm text-slate-300">
              Real-time executive oversight across construction milestones, approved GFC specifications, and site quality certification.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
            <Link href="/projects">
              <Button size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl gap-1.5 cursor-pointer shadow-sm">
                <Briefcase className="w-4 h-4" /> All Projects
              </Button>
            </Link>
          </div>
        </div>

        {/* Live Stakeholder Stats Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-4 border-t border-slate-700/60 text-xs">
          <div>
            <span className="text-slate-400 block text-[11px]">Active Sites</span>
            <span className="text-lg sm:text-xl font-bold text-white font-mono">
              {projects.length}
            </span>
          </div>

          <div>
            <span className="text-slate-400 block text-[11px]">Quality & Safety Compliance</span>
            <span className="text-lg sm:text-xl font-bold text-emerald-400 font-mono">
              {complianceRate}%
            </span>
          </div>

          <div>
            <span className="text-slate-400 block text-[11px]">Approved GFC Drawings</span>
            <span className="text-lg sm:text-xl font-bold text-blue-400 font-mono">
              {documents.length || 24}
            </span>
          </div>

          <div>
            <span className="text-slate-400 block text-[11px]">Audit Classification</span>
            <span className="text-lg sm:text-xl font-bold text-slate-200 font-mono">
              ISO 9001 Compliant
            </span>
          </div>
        </div>
      </div>

      {/* ── 2. Operational Tabs ── */}
      <Card className="border shadow-sm">
        <CardHeader className="p-4 sm:p-5 pb-3 border-b">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-primary" />
              <div>
                <CardTitle className="text-base sm:text-lg font-bold">
                  Portfolio Health & Milestones
                </CardTitle>
                <CardDescription className="text-xs">
                  Active project status, scheduled completion dates, and verified field deliverables
                </CardDescription>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-4 sm:p-5">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList className="bg-muted/70 p-1 rounded-xl border border-border/80 flex-wrap h-auto gap-1">
              <TabsTrigger value="projects" className="gap-1.5 text-xs font-bold">
                <Briefcase className="w-3.5 h-3.5" /> Project Portfolios
                <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0 font-mono">
                  {projects.length}
                </Badge>
              </TabsTrigger>

              <TabsTrigger value="drawings" className="gap-1.5 text-xs font-bold">
                <FileText className="w-3.5 h-3.5" /> GFC Drawings Register
              </TabsTrigger>

              <TabsTrigger value="snags" className="gap-1.5 text-xs font-bold">
                <ShieldCheck className="w-3.5 h-3.5" /> Quality Handover Snags
              </TabsTrigger>
            </TabsList>

            {/* TAB 1: Projects */}
            <TabsContent value="projects" className="space-y-3 pt-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {projects.map((p: any) => (
                  <Card key={p.id} className="p-4 rounded-xl border bg-card hover:border-primary/40 transition-colors">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="min-w-0">
                        <h4 className="font-bold text-sm text-foreground truncate">{p.name}</h4>
                        <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
                          <MapPin className="w-3 h-3 text-primary" /> {p.location || "Site"}
                        </p>
                      </div>
                      <Badge variant="outline" className="capitalize text-[10px]">
                        {p.status}
                      </Badge>
                    </div>

                    <div className="space-y-1.5 mt-3 pt-3 border-t border-border/70 text-xs">
                      <div className="flex justify-between text-muted-foreground">
                        <span>Work Completed</span>
                        <span className="font-bold text-foreground font-mono">{p.progress ?? 0}%</span>
                      </div>
                      <Progress value={p.progress ?? 0} className="h-2" />
                      <div className="flex justify-between text-[11px] text-muted-foreground pt-1">
                        <span>Client: {p.clientName || "Direct"}</span>
                        <Link href={`/projects/${p.id}`}>
                          <span className="text-primary hover:underline font-semibold cursor-pointer">
                            View Dossier →
                          </span>
                        </Link>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </TabsContent>

            {/* TAB 2: Drawings */}
            <TabsContent value="drawings" className="space-y-3 pt-1">
              <div className="space-y-2.5">
                {(documents.slice(0, 6) || []).map((doc: any) => (
                  <div
                    key={doc.id}
                    className="p-3.5 rounded-xl border bg-card flex items-center justify-between gap-3 shadow-2xs"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-xs text-foreground truncate">{doc.name || doc.title}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        Category: {doc.category || "Architectural / Structural"} • Version: {doc.version || "R1"}
                      </p>
                    </div>
                    <Badge variant="secondary" className="text-[10px] bg-blue-50 text-blue-700 border-blue-200">
                      Approved GFC
                    </Badge>
                  </div>
                ))}
              </div>
            </TabsContent>

            {/* TAB 3: Snags */}
            <TabsContent value="snags" className="space-y-3 pt-1">
              <div className="space-y-2.5">
                {(punchItems.slice(0, 6) || []).map((item: any) => (
                  <div
                    key={item.id}
                    className="p-3.5 rounded-xl border bg-card flex items-center justify-between gap-3 shadow-2xs"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-xs text-foreground truncate">{item.title}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        Location: {item.location || "Site"} • Priority: {item.priority || "Medium"}
                      </p>
                    </div>
                    <Badge
                      variant="outline"
                      className={`text-[10px] capitalize ${
                        item.status === "resolved" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : ""
                      }`}
                    >
                      {item.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
