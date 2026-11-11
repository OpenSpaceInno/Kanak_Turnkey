import { useState, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  useListProjects,
  useCreatePunchListItem,
} from "@workspace/api-client-react";
import { AlertCircle, Camera, Check, Upload, Trash2 } from "lucide-react";

interface QuickPunchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultProjectId?: number;
}

const CATEGORIES = [
  "civil",
  "finishing",
  "electrical",
  "plumbing",
  "carpentry",
  "safety",
];

const PRIORITIES = [
  { id: "low", label: "Low", color: "bg-slate-100 text-slate-700" },
  { id: "medium", label: "Medium", color: "bg-blue-100 text-blue-700" },
  { id: "high", label: "High", color: "bg-amber-100 text-amber-700" },
  { id: "critical", label: "Critical", color: "bg-rose-100 text-rose-700" },
];

const COMMON_DEFECT_CHIPS = [
  { text: "Honeycomb in Concrete", cat: "civil", pri: "critical" },
  { text: "Tile Hollow Sound / Cracks", cat: "finishing", pri: "high" },
  { text: "Water Seepage in Wall", cat: "civil", pri: "critical" },
  { text: "Exposed Electrical Wiring", cat: "safety", pri: "critical" },
  { text: "Plaster Surface Uneven", cat: "finishing", pri: "medium" },
  { text: "Plumbing Joint Leakage", cat: "plumbing", pri: "high" },
  { text: "Missing Safety Guardrail", cat: "safety", pri: "critical" },
];

export function QuickPunchDialog({
  open,
  onOpenChange,
  defaultProjectId,
}: QuickPunchDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: projects } = useListProjects();
  const createPunch = useCreatePunchListItem();

  const [projectId, setProjectId] = useState<number>(defaultProjectId || 1);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("finishing");
  const [priority, setPriority] = useState("high");
  const [photos, setPhotos] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setPhotos((prev) => [...prev, event.target!.result as string]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast({ title: "Issue Title Required", variant: "destructive" });
      return;
    }

    try {
      const photoPayload = photos.length > 0 ? `\n\n[PHOTOS_ATTACHED: ${photos.length}]` : "";
      await createPunch.mutateAsync({
        data: {
          projectId,
          title: title.trim(),
          description: description.trim() + photoPayload || "Captured via Mobile Field Ops",
          category: category as any,
          priority: priority as any,
        },
      });

      queryClient.invalidateQueries();
      toast({
        title: "Punch Issue Logged",
        description: `Defect recorded under ${category.toUpperCase()} priority: ${priority}.`,
      });

      onOpenChange(false);
      setTitle("");
      setDescription("");
      setPhotos([]);
    } catch (err: any) {
      toast({
        title: "Failed to record issue",
        description: err.message,
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0 overflow-hidden sm:rounded-2xl">
        <div className="bg-rose-950 text-white p-4">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-rose-500/20 text-rose-400 border border-rose-500/30">
              <AlertCircle className="w-4 h-4" />
            </span>
            <div>
              <DialogTitle className="text-base font-bold text-white">
                Log Site Defect / Snag
              </DialogTitle>
              <DialogDescription className="text-xs text-rose-200">
                Instantly flag punch items for rectification
              </DialogDescription>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-3.5">
          {/* Photo-First Camera Snapshot */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold text-foreground">📸 Photo Evidence</Label>
              <span className="text-[10px] text-muted-foreground">{photos.length} photo(s) captured</span>
            </div>

            <input
              type="file"
              accept="image/*"
              multiple
              ref={fileInputRef}
              onChange={handleCapture}
              className="hidden"
            />
            <input
              type="file"
              accept="image/*"
              capture="environment"
              ref={cameraInputRef}
              onChange={handleCapture}
              className="hidden"
            />

            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                className="h-12 flex items-center justify-center gap-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl shadow-xs border-none"
              >
                <Camera className="w-4 h-4" />
                <span className="text-xs">Take Site Photo</span>
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                className="h-12 flex items-center justify-center gap-2 border-dashed rounded-xl hover:border-rose-500"
              >
                <Upload className="w-4 h-4 text-muted-foreground" />
                <span className="text-xs font-semibold">Gallery Upload</span>
              </Button>
            </div>

            {photos.length > 0 && (
              <div className="flex gap-2 overflow-x-auto py-1">
                {photos.map((p, idx) => (
                  <div key={idx} className="relative w-14 h-14 rounded-lg overflow-hidden shrink-0 border">
                    <img src={p} alt="Defect" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setPhotos((prev) => prev.filter((_, i) => i !== idx))}
                      className="absolute top-0.5 right-0.5 bg-black/70 text-white rounded-full p-0.5"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 1-Tap Defect Preset Chips */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-foreground">⚠️ 1-Tap Defect Presets (Zero Typing)</Label>
            <div className="flex flex-wrap gap-1">
              {COMMON_DEFECT_CHIPS.map((chip) => (
                <button
                  key={chip.text}
                  type="button"
                  onClick={() => {
                    setTitle(chip.text);
                    setCategory(chip.cat);
                    setPriority(chip.pri);
                  }}
                  className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg border transition-all ${
                    title === chip.text
                      ? "bg-rose-50 border-rose-500 text-rose-700 font-bold dark:bg-rose-950/40 dark:text-rose-300"
                      : "bg-card border-border hover:bg-muted text-foreground"
                  }`}
                >
                  {chip.text}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Defect Headline *</Label>
            <Input
              placeholder="e.g. Honeycomb in Level 3 column or tap preset above"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="h-9 text-xs"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Project Site</Label>
              <select
                value={projectId}
                onChange={(e) => setProjectId(Number(e.target.value))}
                className="w-full h-9 px-2.5 rounded-lg border text-xs font-medium bg-background"
              >
                {(projects || []).map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Category</Label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full h-9 px-2.5 rounded-lg border text-xs font-medium bg-background capitalize"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Priority Chips */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Severity Rating</Label>
            <div className="grid grid-cols-4 gap-1.5">
              {PRIORITIES.map((p) => (
                <button
                  type="button"
                  key={p.id}
                  onClick={() => setPriority(p.id)}
                  className={`py-1.5 text-xs font-semibold rounded-lg border text-center transition-all ${
                    priority === p.id
                      ? "border-rose-500 bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 font-bold ring-1 ring-rose-500/30"
                      : "bg-card border-border text-muted-foreground"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Location / Instructions (Optional)</Label>
            <Textarea
              rows={2}
              placeholder="e.g. Tower B staircase landing, instruct civil subcontractor to chip and pressure grout..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="text-xs"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2 border-t">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={createPunch.isPending}
              className="bg-rose-600 hover:bg-rose-700 text-white font-bold"
            >
              {createPunch.isPending ? "Saving..." : "Log Defect"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
