import { useState, useEffect } from "react";
import { useQueryClient, useQuery } from "@tanstack/react-query";
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
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useListProjects } from "@workspace/api-client-react";
import {
  MapPin,
  Clock,
  CheckCircle2,
  LogOut,
  LogIn,
  Navigation,
  ShieldCheck,
} from "lucide-react";
import { format } from "date-fns";

interface QuickAttendanceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultProjectId?: number;
}

export function QuickAttendanceDialog({
  open,
  onOpenChange,
  defaultProjectId,
}: QuickAttendanceDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: projects } = useListProjects();

  const { data: attendance, refetch } = useQuery({
    queryKey: ["attendance_today"],
    queryFn: async () => {
      const res = await fetch("/api/attendance/today");
      return res.json();
    },
    enabled: open,
  });

  const [projectId, setProjectId] = useState<number>(defaultProjectId || 1);
  const [locationName, setLocationName] = useState("");
  const [notes, setNotes] = useState("");
  const [gpsCoordinates, setGpsCoordinates] = useState<string | null>(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (defaultProjectId) setProjectId(defaultProjectId);
  }, [defaultProjectId]);

  const selectedProject = projects?.find((p) => p.id === projectId);

  useEffect(() => {
    if (selectedProject?.location) {
      setLocationName(selectedProject.location);
    }
  }, [selectedProject]);

  const acquireGps = () => {
    if (!navigator.geolocation) {
      toast({ title: "Geolocation not supported by browser", variant: "destructive" });
      return;
    }
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGpsLoading(false);
        const coords = `${pos.coords.latitude.toFixed(6)}, ${pos.coords.longitude.toFixed(6)}`;
        setGpsCoordinates(coords);
        toast({ title: "Site GPS Verified", description: coords });
      },
      () => {
        setGpsLoading(false);
        toast({ title: "Unable to retrieve GPS", description: "Defaulting to project location" });
      },
      { timeout: 8000 }
    );
  };

  const handleCheckIn = async () => {
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/attendance/check-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          locationName: locationName || selectedProject?.location || "Field Site",
          gpsCoordinates,
          notes,
        }),
      });

      if (!res.ok) throw new Error("Check-in failed");

      queryClient.invalidateQueries();
      await refetch();
      toast({
        title: "Checked In Successfully",
        description: `Duty recorded at ${format(new Date(), "h:mm a")} on ${selectedProject?.name || "Site"}.`,
      });
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: "Check-in Error", description: err.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCheckOut = async () => {
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/attendance/check-out", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recordId: attendance?.recordId,
          notes,
        }),
      });

      if (!res.ok) throw new Error("Check-out failed");

      queryClient.invalidateQueries();
      await refetch();
      toast({
        title: "Shift Completed",
        description: "Checked out successfully. Hours recorded.",
      });
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: "Check-out Error", description: err.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const isCheckedIn = attendance?.checkedIn;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0 overflow-hidden sm:rounded-2xl">
        <div className={`p-4 text-white ${isCheckedIn ? "bg-emerald-950" : "bg-slate-900"}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className={`p-1.5 rounded-lg border ${isCheckedIn ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" : "bg-primary/20 text-primary border-primary/30"}`}>
                <Clock className="w-4 h-4" />
              </span>
              <div>
                <DialogTitle className="text-base font-bold text-white">
                  Site Attendance & Muster
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-300">
                  {format(new Date(), "EEEE, MMMM d, yyyy")}
                </DialogDescription>
              </div>
            </div>

            <Badge
              variant="outline"
              className={`text-xs capitalize font-bold ${
                isCheckedIn
                  ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                  : "bg-slate-800 text-slate-400 border-slate-700"
              }`}
            >
              {isCheckedIn ? "Checked In" : "Off Duty"}
            </Badge>
          </div>
        </div>

        <div className="p-4 space-y-4">
          {isCheckedIn ? (
            /* Checked In State */
            <div className="space-y-4 text-center py-2">
              <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 mx-auto flex items-center justify-center">
                <ShieldCheck className="w-8 h-8" />
              </div>

              <div>
                <h3 className="font-bold text-base text-foreground">You are currently Checked In</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Logged in at <span className="font-bold text-foreground">{attendance.checkInTime ? format(new Date(attendance.checkInTime), "h:mm a") : "Morning"}</span> on <span className="font-bold text-foreground">{attendance.projectName}</span>
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Location: {attendance.location}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-muted/40 border text-xs text-left space-y-1">
                <span className="font-semibold text-foreground">End of Shift Notes (Optional)</span>
                <Input
                  placeholder="e.g. Handed over site keys to night security..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="h-8 text-xs bg-background"
                />
              </div>

              <Button
                onClick={handleCheckOut}
                disabled={isSubmitting}
                className="w-full gap-2 bg-rose-600 hover:bg-rose-700 text-white font-bold h-11 rounded-xl shadow-sm cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                {isSubmitting ? "Recording..." : "Clock Out / End Shift"}
              </Button>
            </div>
          ) : (
            /* Check In Form */
            <div className="space-y-3.5">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Assigned Project Site</Label>
                <select
                  value={projectId}
                  onChange={(e) => setProjectId(Number(e.target.value))}
                  className="w-full h-9 px-3 rounded-lg border text-xs font-medium bg-background"
                >
                  {(projects || []).map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Site Station / Zone</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="e.g. Tower 2 4th Floor or Main Gate"
                    value={locationName}
                    onChange={(e) => setLocationName(e.target.value)}
                    className="h-9 text-xs"
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={acquireGps}
                    disabled={gpsLoading}
                    className="shrink-0 gap-1 text-xs h-9 px-2.5"
                  >
                    <Navigation className="w-3.5 h-3.5 text-primary" />
                    {gpsCoordinates ? "GPS Verified" : "GPS"}
                  </Button>
                </div>
                {gpsCoordinates && (
                  <p className="text-[11px] text-emerald-600 font-mono flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> {gpsCoordinates}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Shift Remarks (Optional)</Label>
                <Input
                  placeholder="e.g. Concrete pour shift today"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>

              <Button
                onClick={handleCheckIn}
                disabled={isSubmitting}
                className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-11 rounded-xl shadow-sm cursor-pointer mt-2"
              >
                <LogIn className="w-4 h-4" />
                {isSubmitting ? "Clocking In..." : "Clock In / Start Site Shift"}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

