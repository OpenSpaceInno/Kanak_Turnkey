import { useState } from "react";
import { useListProjects } from "@workspace/api-client-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Building2, Check, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";

interface MobileProjectSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activeProjectId?: number;
  onSelectProject: (projectId: number, projectName: string) => void;
}

export function MobileProjectSheet({
  open,
  onOpenChange,
  activeProjectId,
  onSelectProject,
}: MobileProjectSheetProps) {
  const { data: projects, isLoading } = useListProjects();
  const [search, setSearch] = useState("");

  const filtered = (projects || []).filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.clientName && p.clientName.toLowerCase().includes(search.toLowerCase())) ||
      (p.location && p.location.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl max-h-[85vh] p-4 flex flex-col">
        <SheetHeader className="text-left pb-2">
          <SheetTitle className="text-lg font-bold flex items-center gap-2">
            <Building2 className="w-5 h-5 text-primary" />
            Select Site / Project
          </SheetTitle>
          <SheetDescription className="text-xs text-muted-foreground">
            Sets the active project context for geofence check-ins, DPR, and site tasks.
          </SheetDescription>
        </SheetHeader>

        {/* Search */}
        <div className="relative my-2">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search sites or client..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-10 bg-muted/50 text-sm rounded-xl"
          />
        </div>

        {/* Project List */}
        <div className="flex-1 overflow-y-auto space-y-2 py-1 pr-1">
          {isLoading ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              Loading projects...
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              No matching projects found.
            </div>
          ) : (
            filtered.map((project) => {
              const isSelected = activeProjectId === project.id;
              return (
                <button
                  key={project.id}
                  onClick={() => {
                    onSelectProject(project.id, project.name);
                    onOpenChange(false);
                  }}
                  className={cn(
                    "w-full text-left p-3.5 rounded-xl border transition-all flex items-center justify-between gap-3",
                    isSelected
                      ? "bg-primary/10 border-primary shadow-sm"
                      : "bg-card border-border hover:bg-muted/40 active:scale-[0.99]"
                  )}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm truncate text-foreground">
                        {project.name}
                      </span>
                      {project.status && (
                        <Badge
                          variant="outline"
                          className="capitalize text-[10px] px-1.5 py-0 shrink-0 font-normal"
                        >
                          {project.status}
                        </Badge>
                      )}
                    </div>
                    {project.location && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1 truncate">
                        <MapPin className="w-3 h-3 shrink-0" />
                        {project.location}
                      </p>
                    )}
                    {project.clientName && (
                      <p className="text-[11px] text-muted-foreground/80 mt-0.5 truncate">
                        Client: {project.clientName}
                      </p>
                    )}
                  </div>

                  {isSelected && (
                    <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center shrink-0">
                      <Check className="w-3.5 h-3.5 text-primary-foreground stroke-[3]" />
                    </div>
                  )}
                </button>
              );
            })
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
