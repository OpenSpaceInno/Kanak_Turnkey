import { useState, useEffect, useRef } from "react";
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
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import {
  useListProjects,
  useListTasks,
  useGetCurrentUser,
} from "@workspace/api-client-react";
import {
  Camera,
  Upload,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
  ChevronLeft,
  Users,
  HardHat,
  Sun,
  CloudRain,
  Cloud,
  Flame,
  Wrench,
  Trash2,
  Save,
  Send,
  Plus,
  Minus,
  Check,
  Zap,
  Mic,
  MicOff,
} from "lucide-react";
import { format } from "date-fns";

interface StepDprWizardModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultProjectId?: number;
}

const WEATHER_OPTIONS = [
  { id: "Sunny / Clear", label: "Sunny", icon: Sun },
  { id: "Overcast / Cloudy", label: "Cloudy", icon: Cloud },
  { id: "Light Rain", label: "Light Rain", icon: CloudRain },
  { id: "Heavy Rain / Wet", label: "Heavy Rain", icon: CloudRain },
  { id: "Extreme Heat", label: "High Heat", icon: Flame },
];

const COMMON_MACHINERY = [
  "Concrete Mixer",
  "Tile Cutter",
  "Tower Crane",
  "Scaffold Hoist",
  "Diesel Generator",
  "Airless Paint Sprayer",
  "Core Cutting Drill",
  "Compactor Plate",
];

const QUICK_DELAYS = [
  "No Delays • Normal Progress",
  "Material Delivery Delayed",
  "Heavy Rainfall / Site Inundation",
  "Architect Design Clarification Pending",
  "Temporary Site Power Cut",
  "Labour Shortage / Festival Leave",
];

export function StepDprWizardModal({
  open,
  onOpenChange,
  defaultProjectId,
}: StepDprWizardModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: user } = useGetCurrentUser();
  const { data: projects } = useListProjects();
  const [currentStep, setCurrentStep] = useState<number>(1);
  const totalSteps = 4;

  const [projectId, setProjectId] = useState<number>(defaultProjectId || 1);
  const { data: tasks } = useListTasks();
  const projectTasks = (tasks || []).filter((t) => t.projectId === projectId);

  // Form State
  const [dprDate, setDprDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [weather, setWeather] = useState("Sunny / Clear");
  const [skilledLabour, setSkilledLabour] = useState(6);
  const [unSkilledLabour, setUnSkilledLabour] = useState(10);
  const [supervisor, setSupervisor] = useState(user?.name || "Site Engineer");
  const [workExecuted, setWorkExecuted] = useState("");
  const [activeMachinery, setActiveMachinery] = useState<string[]>([
    "Concrete Mixer",
    "Tile Cutter",
  ]);
  const [customMachinery, setCustomMachinery] = useState("");
  const [hindrances, setHindrances] = useState("No Delays • Normal Progress");
  const [photos, setPhotos] = useState<{ url: string; caption: string }[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [draftSavedTime, setDraftSavedTime] = useState<string | null>(null);

  // Rapid Zero-Typing Helpers
  const [yesterdayData, setYesterdayData] = useState<any | null>(null);
  const [isListeningSpeech, setIsListeningSpeech] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Fetch yesterday's DPR data when project changes
  useEffect(() => {
    if (!projectId) return;
    fetch(`/api/dpr/yesterday?projectId=${projectId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.exists) {
          setYesterdayData(data);
        } else {
          setYesterdayData(null);
        }
      })
      .catch(() => setYesterdayData(null));
  }, [projectId]);

  const handleCopyYesterdayLabour = () => {
    if (yesterdayData) {
      setSkilledLabour(yesterdayData.skilledLabour || 8);
      setUnSkilledLabour(yesterdayData.unSkilledLabour || 12);
      if (yesterdayData.weather) setWeather(yesterdayData.weather);
      if (yesterdayData.machinery) {
        const list = yesterdayData.machinery.split(",").map((s: string) => s.trim()).filter(Boolean);
        if (list.length > 0) setActiveMachinery(list);
      }
      toast({
        title: "⚡ Yesterday's Gang Copied",
        description: `Filled ${yesterdayData.totalLabour || 20} workers from previous approved shift.`,
      });
    } else {
      setSkilledLabour(8);
      setUnSkilledLabour(12);
      setWeather("Sunny / Clear");
      setActiveMachinery(["Concrete Mixer", "Scaffold Hoist", "Tile Cutter"]);
      toast({
        title: "Standard Gang Populated",
        description: "Auto-filled standard site shift: 8 Skilled, 12 Helpers.",
      });
    }
  };

  const toggleSpeechRecognition = () => {
    if (typeof window === "undefined") return;
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      toast({
        title: "Speech Recognition Unavailable",
        description: "Your browser does not support Web Speech. Please tap the quick activity tags below.",
        variant: "destructive",
      });
      return;
    }

    if (isListeningSpeech) {
      setIsListeningSpeech(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = "en-IN";

      recognition.onstart = () => {
        setIsListeningSpeech(true);
        toast({
          title: "🎙️ Listening...",
          description: "Speak your site update now (e.g. 'Slab casting completed on 3rd floor').",
        });
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          setWorkExecuted((prev) => (prev ? `${prev}\n• ${transcript}` : `• ${transcript}`));
          toast({
            title: "Voice Added",
            description: `Captured: "${transcript}"`,
          });
        }
        setIsListeningSpeech(false);
      };

      recognition.onerror = () => {
        setIsListeningSpeech(false);
      };

      recognition.onend = () => {
        setIsListeningSpeech(false);
      };

      recognition.start();
    } catch (err: any) {
      setIsListeningSpeech(false);
      toast({ title: "Microphone error", description: err.message, variant: "destructive" });
    }
  };

  // Auto-fill default project if available
  useEffect(() => {
    if (defaultProjectId) {
      setProjectId(defaultProjectId);
    } else if (projects && projects.length > 0 && !projectId) {
      setProjectId(projects[0].id);
    }
  }, [defaultProjectId, projects, projectId]);

  // Restore Draft from LocalStorage on mount/open
  useEffect(() => {
    if (!open || !projectId) return;
    const draftKey = `turnkey_dpr_draft_${projectId}`;
    try {
      const saved = localStorage.getItem(draftKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.dprDate === format(new Date(), "yyyy-MM-dd")) {
          setWeather(parsed.weather || "Sunny / Clear");
          setSkilledLabour(parsed.skilledLabour ?? 6);
          setUnSkilledLabour(parsed.unSkilledLabour ?? 10);
          setWorkExecuted(parsed.workExecuted || "");
          setActiveMachinery(parsed.activeMachinery || []);
          setHindrances(parsed.hindrances || "No Delays • Normal Progress");
          setPhotos(parsed.photos || []);
          setDraftSavedTime(parsed.savedAt || "Earlier today");
        }
      }
    } catch {
      // ignore
    }
  }, [open, projectId]);

  // Autosave to LocalStorage
  const saveDraftLocally = () => {
    if (!projectId) return;
    const draftKey = `turnkey_dpr_draft_${projectId}`;
    const payload = {
      projectId,
      dprDate,
      weather,
      skilledLabour,
      unSkilledLabour,
      workExecuted,
      activeMachinery,
      hindrances,
      photos,
      savedAt: format(new Date(), "h:mm a"),
    };
    try {
      localStorage.setItem(draftKey, JSON.stringify(payload));
      setDraftSavedTime(payload.savedAt);
    } catch {
      // storage full or disabled
    }
  };

  // Trigger autosave when inputs change
  useEffect(() => {
    if (!open) return;
    const timeout = setTimeout(saveDraftLocally, 800);
    return () => clearTimeout(timeout);
  }, [
    open,
    projectId,
    weather,
    skilledLabour,
    unSkilledLabour,
    workExecuted,
    activeMachinery,
    hindrances,
    photos,
  ]);

  const handlePhotoCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setPhotos((prev) => [
            ...prev,
            {
              url: event.target!.result as string,
              caption: file.name.replace(/\.[^/.]+$/, ""),
            },
          ]);
        }
      };
      reader.readAsDataURL(file);
    });

    toast({
      title: "Photo Attached",
      description: `${files.length} site progress photo(s) added.`,
    });
  };

  const toggleMachinery = (item: string) => {
    setActiveMachinery((prev) =>
      prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item]
    );
  };

  const handleFinalSubmit = async (status: "submitted" | "draft") => {
    if (!projectId) {
      toast({ title: "Please select a project", variant: "destructive" });
      return;
    }
    if (status === "submitted" && !workExecuted.trim()) {
      toast({
        title: "Work description required",
        description: "Please specify work executed today before submitting.",
        variant: "destructive",
      });
      setCurrentStep(2);
      return;
    }

    setIsSubmitting(true);
    try {
      const machineryString = [
        ...activeMachinery,
        customMachinery.trim() ? customMachinery.trim() : null,
      ]
        .filter(Boolean)
        .join(", ");

      const payload = {
        projectId,
        date: dprDate,
        weather,
        skilledLabour,
        unSkilledLabour,
        totalLabour: skilledLabour + unSkilledLabour,
        supervisor,
        workExecuted,
        machinery: machineryString || "Standard site hand tooling",
        hindrances,
        photos,
        status,
      };

      const res = await fetch("/api/dpr/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to submit DPR");
      }

      // Clear local draft on successful submission
      try {
        localStorage.removeItem(`turnkey_dpr_draft_${projectId}`);
      } catch {
        // ignore
      }

      queryClient.invalidateQueries();
      toast({
        title: status === "submitted" ? "DPR Submitted to PM" : "DPR Saved as Draft",
        description:
          status === "submitted"
            ? `Report logged for ${skilledLabour + unSkilledLabour} workforce on site.`
            : "Draft saved. You can complete and submit anytime.",
      });

      onOpenChange(false);
      // Reset form
      setCurrentStep(1);
      setWorkExecuted("");
      setPhotos([]);
    } catch (err: any) {
      toast({
        title: "Submission Failed",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedProject = projects?.find((p) => p.id === projectId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl p-0 gap-0 overflow-hidden sm:rounded-2xl max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="bg-slate-900 text-white p-4 sm:p-5">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-primary/20 text-primary border border-primary/30">
                <HardHat className="w-4 h-4" />
              </span>
              <div>
                <DialogTitle className="text-base sm:text-lg font-bold text-white">
                  Site DPR Entry (Daily Progress Report)
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-300">
                  {selectedProject?.name || "Select Project"} • {format(new Date(dprDate), "EEE, d MMM yyyy")}
                </DialogDescription>
              </div>
            </div>

            {draftSavedTime && (
              <Badge variant="outline" className="text-[10px] text-emerald-400 border-emerald-500/30 bg-emerald-950/40 gap-1 hidden sm:flex">
                <Check className="w-3 h-3" /> Auto-saved {draftSavedTime}
              </Badge>
            )}
          </div>

          {/* Stepper Progress Bar */}
          <div className="space-y-1.5 pt-2">
            <div className="flex justify-between text-[11px] font-medium text-slate-300">
              <span>Step {currentStep} of {totalSteps}: {
                currentStep === 1 ? "Site & Workforce" :
                currentStep === 2 ? "Execution & Scope" :
                currentStep === 3 ? "Tools & Delays" :
                "Photos & Review"
              }</span>
              <span className="font-mono">{Math.round((currentStep / totalSteps) * 100)}%</span>
            </div>
            <Progress value={(currentStep / totalSteps) * 100} className="h-1.5 bg-slate-800" />
          </div>
        </div>

        {/* Scrollable Form Body */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-5">
          {/* ───────────────── STEP 1: Site & Workforce ───────────────── */}
          {currentStep === 1 && (
            <div className="space-y-4 animate-in fade-in-50 duration-200">
              {/* Project & Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Assigned Project</Label>
                  <select
                    value={projectId}
                    onChange={(e) => setProjectId(Number(e.target.value))}
                    className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm font-medium focus:ring-2 focus:ring-primary focus:outline-hidden"
                  >
                    {(projects || []).map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">DPR Date</Label>
                  <Input
                    type="date"
                    value={dprDate}
                    onChange={(e) => setDprDate(e.target.value)}
                    className="h-10 text-sm font-medium"
                  />
                </div>
              </div>

              {/* Weather Condition */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Site Weather</Label>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
                  {WEATHER_OPTIONS.map((w) => {
                    const Icon = w.icon;
                    const isSelected = weather === w.id;
                    return (
                      <button
                        type="button"
                        key={w.id}
                        onClick={() => setWeather(w.id)}
                        className={`flex flex-col items-center justify-center p-2 rounded-xl border text-xs font-medium transition-all ${
                          isSelected
                            ? "bg-primary/10 border-primary text-primary font-bold shadow-xs"
                            : "bg-muted/40 border-border text-muted-foreground hover:bg-muted/80"
                        }`}
                      >
                        <Icon className="w-4 h-4 mb-1" />
                        <span className="text-[11px] text-center leading-tight">{w.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 1-Tap Copy Yesterday Gang */}
              <button
                type="button"
                onClick={handleCopyYesterdayLabour}
                className="w-full p-3 bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:opacity-95 text-slate-950 font-bold text-xs rounded-xl shadow-xs flex items-center justify-between transition-transform active:scale-98 cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-slate-950 text-amber-400 flex items-center justify-center">
                    <Zap className="w-4 h-4 fill-current" />
                  </div>
                  <div className="text-left">
                    <span className="block font-extrabold text-slate-950 text-xs">
                      ⚡ 1-Tap Copy Yesterday's Headcount
                    </span>
                    <span className="block text-[10px] text-slate-800 font-medium">
                      {yesterdayData ? `Populate ${yesterdayData.totalLabour || 20} workers & tools from yesterday` : "Auto-fill standard 20-worker site crew"}
                    </span>
                  </div>
                </div>
                <Badge variant="outline" className="bg-slate-950 text-white border-none text-[10px] font-mono px-2 py-0.5">
                  1-Tap Fill
                </Badge>
              </button>

              {/* Workforce Steppers */}
              <div className="rounded-xl border bg-muted/30 p-3.5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-primary" /> Daily Headcount
                  </span>
                  <Badge variant="secondary" className="font-mono text-xs font-bold">
                    Total: {skilledLabour + unSkilledLabour} Personnel
                  </Badge>
                </div>

                {/* Skilled */}
                <div className="flex items-center justify-between bg-card p-2.5 rounded-lg border">
                  <div>
                    <p className="text-sm font-semibold">Skilled Labor</p>
                    <p className="text-[11px] text-muted-foreground">Masons, Carpenters, Electricians</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      size="icon"
                      variant="outline"
                      className="h-8 w-8 rounded-full"
                      onClick={() => setSkilledLabour(Math.max(0, skilledLabour - 1))}
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </Button>
                    <span className="w-10 text-center font-mono font-bold text-base">{skilledLabour}</span>
                    <Button
                      type="button"
                      size="icon"
                      variant="outline"
                      className="h-8 w-8 rounded-full"
                      onClick={() => setSkilledLabour(skilledLabour + 1)}
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>

                {/* Unskilled */}
                <div className="flex items-center justify-between bg-card p-2.5 rounded-lg border">
                  <div>
                    <p className="text-sm font-semibold">Unskilled Helpers</p>
                    <p className="text-[11px] text-muted-foreground">Excavation, Shifting, Cleaning</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      size="icon"
                      variant="outline"
                      className="h-8 w-8 rounded-full"
                      onClick={() => setUnSkilledLabour(Math.max(0, unSkilledLabour - 1))}
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </Button>
                    <span className="w-10 text-center font-mono font-bold text-base">{unSkilledLabour}</span>
                    <Button
                      type="button"
                      size="icon"
                      variant="outline"
                      className="h-8 w-8 rounded-full"
                      onClick={() => setUnSkilledLabour(unSkilledLabour + 1)}
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ───────────────── STEP 2: Execution & Scope ───────────────── */}
          {currentStep === 2 && (
            <div className="space-y-4 animate-in fade-in-50 duration-200">
              {/* Construction Activity Quick Chips (Zero Typing) */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold flex items-center gap-1.5 text-foreground">
                    <span>🏗️ 1-Tap Construction Activities</span>
                    <Badge variant="outline" className="text-[9px] px-1 py-0 bg-amber-50 text-amber-800 border-amber-300">
                      Zero Typing
                    </Badge>
                  </Label>
                  <span className="text-[10px] text-muted-foreground">Tap tags to add</span>
                </div>
                <div className="flex flex-wrap gap-1.5 p-2 bg-muted/40 rounded-xl border">
                  {[
                    "🏗️ Slab Casting",
                    "🔩 Rebar & Steel Tying",
                    "🧱 Brickwork & AAC Blocks",
                    "🪚 Formwork Shuttering",
                    "🔌 Electrical Conduits",
                    "🚿 Plumbing Pipe Lines",
                    "🎨 Internal Plastering",
                    "💧 Waterproofing Membrane",
                    "🪟 Window Frames",
                    "🧹 Site Debris Cleanup",
                    "📦 Rebar Steel Delivery",
                    "🚛 RMC Transit Mix Unloaded",
                  ].map((chip) => (
                    <button
                      type="button"
                      key={chip}
                      onClick={() => {
                        const snippet = `• ${chip}: `;
                        if (!workExecuted.includes(chip)) {
                          setWorkExecuted((prev) => (prev ? `${prev}\n${snippet}` : snippet));
                        }
                      }}
                      className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-card border hover:border-amber-500 text-foreground transition-all active:scale-95 cursor-pointer shadow-2xs"
                    >
                      + {chip}
                    </button>
                  ))}
                </div>
              </div>

              {/* Quick Task Tapping */}
              {projectTasks.length > 0 && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold">Active Milestone Tasks</Label>
                    <span className="text-[10px] text-muted-foreground">Tap to include in report</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-1.5 bg-muted/30 rounded-xl border">
                    {projectTasks.slice(0, 6).map((task) => (
                      <button
                        type="button"
                        key={task.id}
                        onClick={() => {
                          const snippet = `• ${task.title}: `;
                          if (!workExecuted.includes(task.title)) {
                            setWorkExecuted((prev) => (prev ? `${prev}\n${snippet}` : snippet));
                          }
                        }}
                        className="px-2 py-1 rounded-lg text-[11px] bg-card border hover:border-primary/50 text-foreground transition-colors cursor-pointer text-left"
                      >
                        + {task.title}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Work Execution Text + Voice Mic */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold">Execution Summary *</Label>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={toggleSpeechRecognition}
                    className={`h-7 px-2.5 text-[11px] font-bold rounded-lg gap-1.5 border transition-all ${
                      isListeningSpeech
                        ? "bg-rose-500 text-white border-rose-600 animate-pulse shadow-sm"
                        : "bg-card hover:bg-muted text-foreground"
                    }`}
                  >
                    {isListeningSpeech ? (
                      <>
                        <MicOff className="w-3.5 h-3.5 animate-spin" />
                        Listening... (Tap to stop)
                      </>
                    ) : (
                      <>
                        <Mic className="w-3.5 h-3.5 text-rose-500" />
                        Voice Dictation (Mic)
                      </>
                    )}
                  </Button>
                </div>
                <Textarea
                  rows={5}
                  value={workExecuted}
                  onChange={(e) => setWorkExecuted(e.target.value)}
                  placeholder="Tap activity chips above or tap 'Voice Dictation' to speak in Hindi/English..."
                  className="font-sans text-xs sm:text-sm leading-relaxed"
                />
              </div>

              {/* Quick Execution Phrases */}
              <div className="flex flex-wrap gap-1">
                {[
                  "Floor screeding complete",
                  "Conduit pressure testing passed",
                  "Material received at site",
                  "Civil inspection done with Client PM",
                ].map((phrase) => (
                  <button
                    type="button"
                    key={phrase}
                    onClick={() =>
                      setWorkExecuted((prev) => (prev ? `${prev}\n• ${phrase}` : `• ${phrase}`))
                    }
                    className="text-[11px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground hover:text-foreground border"
                  >
                    + {phrase}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ───────────────── STEP 3: Tools & Delays ───────────────── */}
          {currentStep === 3 && (
            <div className="space-y-4 animate-in fade-in-50 duration-200">
              {/* Active Machinery */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold flex items-center gap-1.5">
                  <Wrench className="w-3.5 h-3.5 text-primary" /> Active Equipment & Machinery on Site
                </Label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {COMMON_MACHINERY.map((mach) => {
                    const isSelected = activeMachinery.includes(mach);
                    return (
                      <button
                        type="button"
                        key={mach}
                        onClick={() => toggleMachinery(mach)}
                        className={`px-3 py-2 rounded-xl text-xs font-medium border text-left flex items-center justify-between transition-colors ${
                          isSelected
                            ? "bg-primary/10 border-primary text-primary font-semibold"
                            : "bg-card border-border text-muted-foreground hover:bg-muted/50"
                        }`}
                      >
                        <span className="truncate">{mach}</span>
                        {isSelected && <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />}
                      </button>
                    );
                  })}
                </div>

                <Input
                  placeholder="Other machinery or specialized rigs..."
                  value={customMachinery}
                  onChange={(e) => setCustomMachinery(e.target.value)}
                  className="text-xs h-9"
                />
              </div>

              {/* Hindrances & Delays */}
              <div className="space-y-2 pt-2 border-t">
                <Label className="text-xs font-semibold flex items-center gap-1.5 text-foreground">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-500" /> Site Hindrances or Delays
                </Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {QUICK_DELAYS.map((delay) => {
                    const isSelected = hindrances === delay;
                    return (
                      <button
                        type="button"
                        key={delay}
                        onClick={() => setHindrances(delay)}
                        className={`px-3 py-2 rounded-xl text-xs font-medium border text-left transition-colors ${
                          isSelected
                            ? delay.includes("No Delays")
                              ? "bg-emerald-500/10 border-emerald-500 text-emerald-600 dark:text-emerald-400 font-semibold"
                              : "bg-amber-500/10 border-amber-500 text-amber-700 dark:text-amber-400 font-semibold"
                            : "bg-card border-border text-muted-foreground hover:bg-muted/50"
                        }`}
                      >
                        {delay}
                      </button>
                    );
                  })}
                </div>

                <Input
                  placeholder="Specific delay note or pending client drawing..."
                  value={hindrances}
                  onChange={(e) => setHindrances(e.target.value)}
                  className="text-xs h-9"
                />
              </div>
            </div>
          )}

          {/* ───────────────── STEP 4: Photos & Review ───────────────── */}
          {currentStep === 4 && (
            <div className="space-y-4 animate-in fade-in-50 duration-200">
              {/* Photo Upload / Camera Capture */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold">Site Verification Photos</Label>
                  <span className="text-[10px] text-muted-foreground">Mobile Camera & Gallery</span>
                </div>

                {/* Hidden File Input for Gallery */}
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  ref={fileInputRef}
                  onChange={handlePhotoCapture}
                  className="hidden"
                />

                {/* Hidden File Input for Direct Mobile Camera */}
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  ref={cameraInputRef}
                  onChange={handlePhotoCapture}
                  className="hidden"
                />

                {/* Action Buttons */}
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    onClick={() => cameraInputRef.current?.click()}
                    className="h-16 flex flex-col items-center justify-center gap-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl shadow-xs cursor-pointer border-none"
                  >
                    <Camera className="w-5 h-5 text-slate-950" />
                    <span className="text-xs font-bold">Open Site Camera</span>
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    className="h-16 flex flex-col items-center justify-center gap-1 border-dashed rounded-xl hover:border-primary cursor-pointer"
                  >
                    <Upload className="w-5 h-5 text-muted-foreground" />
                    <span className="text-xs font-semibold">Upload Images</span>
                  </Button>
                </div>

                {/* Thumbnails Gallery */}
                {photos.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-2">
                    {photos.map((photo, idx) => (
                      <div
                        key={idx}
                        className="relative group rounded-xl overflow-hidden border bg-muted/40 aspect-video flex flex-col justify-end"
                      >
                        <img
                          src={photo.url}
                          alt={photo.caption}
                          className="absolute inset-0 w-full h-full object-cover"
                        />
                        <div className="relative z-10 p-1.5 bg-black/60 backdrop-blur-xs flex items-center justify-between text-white">
                          <span className="text-[10px] font-medium truncate pr-2">
                            {photo.caption || `Photo ${idx + 1}`}
                          </span>
                          <button
                            type="button"
                            onClick={() => setPhotos((prev) => prev.filter((_, i) => i !== idx))}
                            className="p-1 rounded-md hover:bg-rose-600/80 text-rose-300"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Review Card */}
              <div className="p-3.5 rounded-xl border bg-muted/30 space-y-2 text-xs">
                <span className="font-bold text-foreground uppercase tracking-wider block">
                  Submission Summary
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-muted-foreground">Workforce:</span>{" "}
                    <span className="font-bold">{skilledLabour + unSkilledLabour} Personnel</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Weather:</span>{" "}
                    <span className="font-bold">{weather}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Equipment:</span>{" "}
                    <span className="font-bold">{activeMachinery.length} Active</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Photos:</span>{" "}
                    <span className="font-bold">{photos.length} Attached</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Navigation Buttons */}
        <div className="p-3.5 sm:p-4 bg-muted/40 border-t flex items-center justify-between gap-2">
          {currentStep > 1 ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setCurrentStep((p) => Math.max(1, p - 1))}
              className="gap-1 rounded-xl"
            >
              <ChevronLeft className="w-4 h-4" /> Back
            </Button>
          ) : (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="rounded-xl"
            >
              Cancel
            </Button>
          )}

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isSubmitting}
              onClick={() => handleFinalSubmit("draft")}
              className="gap-1.5 rounded-xl text-xs font-semibold"
            >
              <Save className="w-3.5 h-3.5" /> Save Draft
            </Button>

            {currentStep < totalSteps ? (
              <Button
                type="button"
                size="sm"
                onClick={() => setCurrentStep((p) => Math.min(totalSteps, p + 1))}
                className="gap-1 rounded-xl px-4"
              >
                Next <ChevronRight className="w-4 h-4" />
              </Button>
            ) : (
              <Button
                type="button"
                size="sm"
                disabled={isSubmitting}
                onClick={() => handleFinalSubmit("submitted")}
                className="gap-1.5 rounded-xl px-5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-sm"
              >
                <Send className="w-3.5 h-3.5" />
                {isSubmitting ? "Submitting..." : "Submit to PM"}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

