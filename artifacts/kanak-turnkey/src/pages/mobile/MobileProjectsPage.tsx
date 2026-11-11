import { useState } from "react";
import { useLocation } from "wouter";
import { useListProjects } from "@workspace/api-client-react";
import { MobileProjectCard } from "@/components/mobile/MobileProjectCard";
import { NewProjectDialog } from "@/components/dialogs/create-dialogs";
import { StepDprWizardModal } from "@/components/field/StepDprWizardModal";
import { QuickPunchDialog } from "@/components/field/QuickPunchDialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, Building2, Filter } from "lucide-react";
import { cn } from "@/lib/utils";

const FILTERS = ["All", "execution", "planning", "completed"];

export default function MobileProjectsPage() {
  const [, navigate] = useLocation();
  const { data: projects, isLoading } = useListProjects();
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("All");

  const [dprModalProjectId, setDprModalProjectId] = useState<number | null>(null);
  const [punchModalProjectId, setPunchModalProjectId] = useState<number | null>(null);

  const filtered = (projects || []).filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.clientName && p.clientName.toLowerCase().includes(search.toLowerCase())) ||
      (p.location && p.location.toLowerCase().includes(search.toLowerCase()));

    if (!matchesSearch) return false;
    if (activeFilter === "All") return true;
    return p.status?.toLowerCase() === activeFilter.toLowerCase();
  });

  const handleQuickAction = (action: string, projectId: number) => {
    if (action === "dpr") {
      setDprModalProjectId(projectId);
    } else if (action === "punch") {
      setPunchModalProjectId(projectId);
    }
  };

  return (
    <div className="space-y-3.5 pb-6">
      {/* Mobile Page Header */}
      <div className="flex items-center justify-between gap-2 pt-1">
        <div>
          <h1 className="text-xl font-black tracking-tight text-foreground">
            Projects & Sites
          </h1>
          <p className="text-xs text-muted-foreground">
            {projects?.length || 0} active contracting projects
          </p>
        </div>

        <NewProjectDialog
          trigger={
            <Button size="sm" className="rounded-xl h-9 px-3 gap-1.5 text-xs font-semibold shadow-xs">
              <Plus className="w-4 h-4" /> New Site
            </Button>
          }
          onCreated={(id) => navigate(`/projects/${id}`)}
        />
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search site, client, or location..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 h-10 bg-muted/40 rounded-xl text-sm border-border"
        />
      </div>

      {/* Filter Chips Carousel */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
        {FILTERS.map((f) => {
          const isSelected = activeFilter === f;
          return (
            <button
              key={f}
              onClick={() => setActiveFilter(f)}
              className={cn(
                "px-3 py-1.5 rounded-full text-xs font-medium capitalize shrink-0 transition-all",
                isSelected
                  ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                  : "bg-muted/60 text-muted-foreground hover:bg-muted"
              )}
            >
              {f}
            </button>
          );
        })}
      </div>

      {/* Project Cards Feed */}
      <div className="space-y-2.5 pt-1">
        {isLoading ? (
          <div className="p-12 text-center text-xs text-muted-foreground">
            Loading site dossiers...
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-xs text-muted-foreground bg-card rounded-2xl border border-border">
            No projects found matching criteria.
          </div>
        ) : (
          filtered.map((project) => (
            <MobileProjectCard
              key={project.id}
              project={project}
              onQuickAction={handleQuickAction}
            />
          ))
        )}
      </div>

      {/* Modals triggered from project cards */}
      {dprModalProjectId && (
        <StepDprWizardModal
          open={Boolean(dprModalProjectId)}
          onOpenChange={(open) => !open && setDprModalProjectId(null)}
          defaultProjectId={dprModalProjectId}
        />
      )}

      {punchModalProjectId && (
        <QuickPunchDialog
          open={Boolean(punchModalProjectId)}
          onOpenChange={(open) => !open && setPunchModalProjectId(null)}
          defaultProjectId={punchModalProjectId}
        />
      )}
    </div>
  );
}
