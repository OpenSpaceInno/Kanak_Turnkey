import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Building2,
  MapPin,
  Calendar,
  ArrowRight,
  FileText,
  AlertCircle,
  HardHat,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface MobileProjectCardProps {
  project: {
    id: number;
    name: string;
    type?: string | null;
    location?: string | null;
    clientName?: string | null;
    status?: string | null;
    progress?: number | null;
    startDate?: string | null;
    endDate?: string | null;
  };
  onQuickAction?: (action: string, projectId: number) => void;
}

export function MobileProjectCard({ project, onQuickAction }: MobileProjectCardProps) {
  const progressVal = project.progress ?? 0;

  return (
    <Card className="rounded-2xl border-border/80 shadow-xs overflow-hidden bg-card transition-all active:scale-[0.99]">
      <CardContent className="p-4">
        {/* Header: Title + Status + Progress */}
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1 min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className="capitalize text-[10px] px-1.5 py-0 font-normal shrink-0"
              >
                {project.status || "Planning"}
              </Badge>
              {project.type && (
                <span className="text-[11px] text-muted-foreground truncate font-medium">
                  {project.type}
                </span>
              )}
            </div>
            <Link href={`/projects/${project.id}`}>
              <h3 className="font-bold text-base text-foreground truncate hover:text-primary transition-colors flex items-center gap-1.5 mt-0.5">
                {project.name}
                <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
              </h3>
            </Link>
            {project.clientName && (
              <p className="text-xs text-muted-foreground truncate">
                Client: {project.clientName}
              </p>
            )}
          </div>

          {/* Progress Circular Badge */}
          <div className="flex flex-col items-center justify-center shrink-0">
            <div className="relative w-12 h-12 flex items-center justify-center rounded-full bg-primary/10 border-2 border-primary/30">
              <span className="text-xs font-bold text-primary">
                {progressVal}%
              </span>
            </div>
            <span className="text-[9px] text-muted-foreground mt-0.5 font-medium">
              Progress
            </span>
          </div>
        </div>

        {/* Location & Dates */}
        <div className="mt-3 pt-3 border-t border-border/60 flex items-center justify-between text-xs text-muted-foreground">
          {project.location ? (
            <span className="flex items-center gap-1 truncate max-w-[200px]">
              <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
              {project.location}
            </span>
          ) : (
            <span>No location set</span>
          )}

          {project.endDate && (
            <span className="flex items-center gap-1 shrink-0 font-mono text-[11px]">
              <Calendar className="w-3 h-3 text-muted-foreground shrink-0" />
              Due: {project.endDate}
            </span>
          )}
        </div>

        {/* Quick Action Touch Buttons */}
        <div className="mt-3 pt-2.5 flex items-center gap-2 overflow-x-auto no-scrollbar">
          <Link href={`/projects/${project.id}`} className="flex-1">
            <Button
              variant="outline"
              size="sm"
              className="w-full rounded-xl text-xs h-8.5 font-medium"
            >
              Dossier
            </Button>
          </Link>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => onQuickAction?.("dpr", project.id)}
            className="rounded-xl text-xs h-8.5 px-3 shrink-0 flex items-center gap-1.5"
          >
            <HardHat className="w-3.5 h-3.5 text-primary" />
            DPR
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => onQuickAction?.("punch", project.id)}
            className="rounded-xl text-xs h-8.5 px-3 shrink-0 flex items-center gap-1.5"
          >
            <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
            Snags
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
