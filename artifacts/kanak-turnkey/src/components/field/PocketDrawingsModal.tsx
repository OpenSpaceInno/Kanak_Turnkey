import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  FileText,
  Search,
  ExternalLink,
  Download,
  ZoomIn,
  ZoomOut,
  Maximize2,
  HardHat,
  Compass,
  Layers,
  ChevronRight,
  FolderOpen,
} from "lucide-react";
import { useListDocuments, type Document } from "@workspace/api-client-react";

interface PocketDrawingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: number;
  projectName?: string;
}

const SAMPLE_SITE_DRAWINGS = [
  {
    id: 101,
    title: "Level 3 & 4 Slab Reinforcement & Rebar Schedule",
    discipline: "Structural",
    revision: "Rev R3 (GFC)",
    date: "02 Nov 2026",
    scale: "1:50 @ A1",
    author: "Bureau of Structural Engineering",
    previewUrl: "https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=1200&q=80",
  },
  {
    id: 102,
    title: "Ground Floor Architectural Layout & Partition Details",
    discipline: "Architectural",
    revision: "Rev R2 (GFC)",
    date: "28 Oct 2026",
    scale: "1:100 @ A0",
    author: "Morphogenesis Design Studio",
    previewUrl: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80",
  },
  {
    id: 103,
    title: "MEP Electrical Conduit & Distribution Board Schematic",
    discipline: "Electrical",
    revision: "Rev R1",
    date: "15 Oct 2026",
    scale: "1:75 @ A1",
    author: "Apex MEP Consultants",
    previewUrl: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=1200&q=80",
  },
  {
    id: 104,
    title: "Plumbing Shaft Riser & Drainage Slope Diagram",
    discipline: "Plumbing",
    revision: "Rev R2",
    date: "20 Oct 2026",
    scale: "1:50 @ A2",
    author: "Sanitary Engineering Partners",
    previewUrl: "https://images.unsplash.com/photo-1541888946425-d0fbb186c5f7?auto=format&fit=crop&w=1200&q=80",
  },
];

export const PocketDrawingsModal: React.FC<PocketDrawingsModalProps> = ({
  open,
  onOpenChange,
  projectId,
  projectName = "Site Project",
}) => {
  const { data: documents } = useListDocuments({ projectId });
  const [search, setSearch] = useState("");
  const [selectedDiscipline, setSelectedDiscipline] = useState<string>("all");
  const [activeDrawing, setActiveDrawing] = useState<any | null>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(1);

  // Combine real documents marked as drawing with sample blueprints
  const realDrawings = (documents || [])
    .filter((d: Document) => d.category === "drawing" || (d.fileName && d.fileName.toLowerCase().includes("drawing")))
    .map((d: Document) => ({
      id: d.id,
      title: d.fileName,
      discipline: "Site Blueprint",
      revision: "Current GFC",
      date: d.uploadedAt ? new Date(d.uploadedAt).toLocaleDateString() : "Active",
      scale: "As Stated",
      author: d.uploadedByName || "Site Office",
      previewUrl: d.fileUrl || "https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=1200&q=80",
    }));

  const allDrawings = [...realDrawings, ...SAMPLE_SITE_DRAWINGS];

  const filteredDrawings = allDrawings.filter((d) => {
    const matchesSearch = d.title.toLowerCase().includes(search.toLowerCase()) || d.discipline.toLowerCase().includes(search.toLowerCase());
    const matchesDiscipline = selectedDiscipline === "all" || d.discipline.toLowerCase().includes(selectedDiscipline.toLowerCase());
    return matchesSearch && matchesDiscipline;
  });

  const disciplines = ["all", "Structural", "Architectural", "Electrical", "Plumbing"];

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-xl p-0 gap-0 overflow-hidden sm:rounded-2xl max-h-[92vh] flex flex-col">
          {/* Header */}
          <div className="bg-slate-900 text-white p-4 sm:p-5">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30">
                  <Compass className="w-5 h-5" />
                </div>
                <div>
                  <DialogTitle className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                    Pocket Site Drawings
                  </DialogTitle>
                  <DialogDescription className="text-xs text-slate-300">
                    {projectName} • Approved Good For Construction (GFC) Blueprints
                  </DialogDescription>
                </div>
              </div>
              <Badge variant="outline" className="text-[10px] text-blue-400 border-blue-500/30 bg-blue-950/40">
                Offline Cached
              </Badge>
            </div>

            {/* Quick Search */}
            <div className="relative mt-3">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                placeholder="Search slab, column, rebar, plumbing..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="bg-slate-800/80 border-slate-700 text-white placeholder:text-slate-400 pl-9 h-10 text-xs rounded-xl"
              />
            </div>

            {/* Discipline Filter Chips */}
            <div className="flex items-center gap-1.5 mt-2.5 overflow-x-auto pb-1 scrollbar-none">
              {disciplines.map((disc) => (
                <button
                  key={disc}
                  onClick={() => setSelectedDiscipline(disc)}
                  className={`text-[11px] px-2.5 py-1 rounded-lg font-semibold shrink-0 transition-colors ${
                    selectedDiscipline === disc
                      ? "bg-blue-600 text-white"
                      : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                  }`}
                >
                  {disc === "all" ? "All Blueprints" : disc}
                </button>
              ))}
            </div>
          </div>

          {/* Body: Drawing Cards */}
          <div className="p-4 overflow-y-auto flex-1 space-y-3 bg-slate-50 dark:bg-slate-950/40">
            {filteredDrawings.length > 0 ? (
              filteredDrawings.map((drawing) => (
                <div
                  key={drawing.id}
                  onClick={() => {
                    setActiveDrawing(drawing);
                    setZoomLevel(1);
                  }}
                  className="p-3.5 rounded-xl border bg-card hover:bg-muted/40 transition-all shadow-xs cursor-pointer flex items-center justify-between gap-3 group"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-12 h-12 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-600 flex items-center justify-center shrink-0 mt-0.5 group-hover:scale-105 transition-transform overflow-hidden">
                      <Layers className="w-6 h-6" />
                    </div>
                    <div className="min-w-0 space-y-1">
                      <h4 className="text-xs sm:text-sm font-bold text-foreground leading-snug group-hover:text-blue-600 transition-colors">
                        {drawing.title}
                      </h4>
                      <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                        <span className="font-semibold text-foreground/80">{drawing.discipline}</span>
                        <span>•</span>
                        <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">{drawing.revision}</span>
                        <span>•</span>
                        <span>{drawing.date}</span>
                      </div>
                    </div>
                  </div>

                  <div className="shrink-0 flex items-center gap-1.5 text-muted-foreground group-hover:text-foreground">
                    <Button size="sm" variant="outline" className="h-8 px-2.5 text-xs font-semibold rounded-lg gap-1">
                      <Maximize2 className="w-3.5 h-3.5" />
                      View
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-12 text-muted-foreground space-y-2">
                <FolderOpen className="w-8 h-8 mx-auto text-muted-foreground/60" />
                <p className="text-xs font-medium">No site drawings found matching "{search}".</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Full Drawing Viewer Lightbox */}
      <Dialog open={!!activeDrawing} onOpenChange={(o) => !o && setActiveDrawing(null)}>
        <DialogContent className="max-w-4xl p-0 gap-0 overflow-hidden sm:rounded-2xl max-h-[95vh] flex flex-col bg-slate-950 text-white border-slate-800">
          <div className="bg-slate-900 px-4 py-3 border-b border-slate-800 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <h3 className="text-sm font-bold truncate text-white">
                {activeDrawing?.title}
              </h3>
              <p className="text-xs text-slate-400">
                {activeDrawing?.discipline} • {activeDrawing?.revision} • {activeDrawing?.scale}
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Button
                size="icon"
                variant="outline"
                className="h-8 w-8 rounded-lg bg-slate-800 border-slate-700 text-white hover:bg-slate-700"
                onClick={() => setZoomLevel((z) => Math.max(0.75, z - 0.25))}
              >
                <ZoomOut className="w-4 h-4" />
              </Button>
              <span className="text-xs font-mono font-bold w-12 text-center text-slate-300">
                {Math.round(zoomLevel * 100)}%
              </span>
              <Button
                size="icon"
                variant="outline"
                className="h-8 w-8 rounded-lg bg-slate-800 border-slate-700 text-white hover:bg-slate-700"
                onClick={() => setZoomLevel((z) => Math.min(2.5, z + 0.25))}
              >
                <ZoomIn className="w-4 h-4" />
              </Button>
              <Button
                size="sm"
                variant="secondary"
                className="h-8 px-3 text-xs font-bold rounded-lg gap-1.5"
                onClick={() => window.open(activeDrawing?.previewUrl, "_blank")}
              >
                <Download className="w-3.5 h-3.5" />
                Download
              </Button>
            </div>
          </div>

          {/* Canvas Preview */}
          <div className="flex-1 overflow-auto p-4 flex items-center justify-center min-h-[450px] bg-slate-900/60">
            <img
              src={activeDrawing?.previewUrl}
              alt={activeDrawing?.title}
              style={{ transform: `scale(${zoomLevel})`, transition: "transform 0.15s ease-out" }}
              className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-2xl border border-slate-800"
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
