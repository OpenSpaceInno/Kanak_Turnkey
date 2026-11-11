import { useState, useMemo, useEffect } from "react";
import {
  useListMeetings,
  useUpdateMeeting,
  getListMeetingsQueryKey,
  useListProjects,
  type Meeting,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  Users,
  Plus,
  Search,
  FileText,
  CheckCircle2,
  Edit3,
} from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { NewMeetingDialog } from "@/components/dialogs/communication-dialogs";

export default function Meetings() {
  const { data: meetings, isLoading } = useListMeetings();
  const { data: projects } = useListProjects();
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);
  const [search, setSearch] = useState("");
  const [projectFilter, setProjectFilter] = useState("all");

  const filteredMeetings = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (meetings ?? []).filter((m) => {
      if (
        q &&
        !(
          m.title.toLowerCase().includes(q) ||
          (m.location ?? "").toLowerCase().includes(q) ||
          (m.agenda ?? "").toLowerCase().includes(q) ||
          (m.projectName ?? "").toLowerCase().includes(q)
        )
      ) {
        return false;
      }
      if (projectFilter !== "all" && String(m.projectId) !== projectFilter) return false;
      return true;
    });
  }, [meetings, search, projectFilter]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Meetings & MOMs</h1>
          <p className="text-muted-foreground">
            Schedule site coordination meetings and record Minutes of Meeting (MOM).
          </p>
        </div>
        <NewMeetingDialog
          trigger={
            <Button className="shrink-0 gap-2">
              <Plus className="h-4 w-4" /> Schedule Meeting
            </Button>
          }
        />
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px] max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search meetings, agendas, locations..."
            className="pl-8"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={projectFilter} onValueChange={setProjectFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="All projects" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All projects</SelectItem>
            {(projects ?? []).map((p) => (
              <SelectItem key={p.id} value={String(p.id)}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="ml-auto text-sm text-muted-foreground">
          {filteredMeetings.length} of {meetings?.length ?? 0} meetings
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredMeetings.map((meeting) => {
          const start = new Date(meeting.meetingDate);
          const end = new Date(start.getTime() + (meeting.duration ?? 60) * 60_000);
          const hasMOM = !!meeting.minutes?.trim();

          return (
            <Card
              key={meeting.id}
              onClick={() => setSelectedMeeting(meeting)}
              className="cursor-pointer hover:border-primary/50 transition-all shadow-2xs hover:shadow-md flex flex-col justify-between"
            >
              <div>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base font-semibold leading-tight hover:text-primary transition-colors">
                      {meeting.title}
                    </CardTitle>
                    {hasMOM ? (
                      <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-300 gap-1 shrink-0">
                        <CheckCircle2 className="h-3 w-3" /> MOM Recorded
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="text-[10px] shrink-0">
                        Scheduled
                      </Badge>
                    )}
                  </div>
                  <div className="text-xs font-medium text-muted-foreground">
                    {meeting.projectName ?? `Project #${meeting.projectId}`}
                  </div>
                </CardHeader>
                <CardContent className="space-y-2.5 text-xs">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <CalendarIcon className="h-3.5 w-3.5 shrink-0" />
                    <span>{format(start, "EEEE, MMM d, yyyy")}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Clock className="h-3.5 w-3.5 shrink-0" />
                    <span>
                      {format(start, "h:mm a")} – {format(end, "h:mm a")} ({meeting.duration ?? 60}m)
                    </span>
                  </div>
                  {meeting.location && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{meeting.location}</span>
                    </div>
                  )}
                  {meeting.participants && (
                    <div className="flex items-start gap-2 text-muted-foreground">
                      <Users className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                      <span className="line-clamp-2">{meeting.participants}</span>
                    </div>
                  )}
                </CardContent>
              </div>

              <div className="px-6 pb-4 pt-2 border-t mt-3 flex items-center justify-between text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1 text-primary font-medium">
                  <Edit3 className="h-3.5 w-3.5" /> View / Record MOM
                </span>
                <span className="text-muted-foreground/60">Click to open</span>
              </div>
            </Card>
          );
        })}
        {!filteredMeetings.length && !isLoading && (
          <div className="col-span-full text-center py-12 border rounded-lg border-dashed text-muted-foreground">
            No meetings found. Click "Schedule Meeting" to create one.
          </div>
        )}
      </div>

      {selectedMeeting && (
        <MeetingDetailDialog
          meeting={selectedMeeting}
          open={!!selectedMeeting}
          onOpenChange={(open) => !open && setSelectedMeeting(null)}
        />
      )}
    </div>
  );
}

function MeetingDetailDialog({
  meeting,
  open,
  onOpenChange,
}: {
  meeting: Meeting;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const qc = useQueryClient();
  const { toast } = useToast();

  const [form, setForm] = useState({
    title: meeting.title,
    location: meeting.location ?? "",
    duration: meeting.duration ?? 60,
    participants: meeting.participants ?? "",
    agenda: meeting.agenda ?? "",
    minutes: meeting.minutes ?? "",
    meetingDate: meeting.meetingDate ? new Date(meeting.meetingDate).toISOString().slice(0, 16) : "",
  });

  useEffect(() => {
    setForm({
      title: meeting.title,
      location: meeting.location ?? "",
      duration: meeting.duration ?? 60,
      participants: meeting.participants ?? "",
      agenda: meeting.agenda ?? "",
      minutes: meeting.minutes ?? "",
      meetingDate: meeting.meetingDate ? new Date(meeting.meetingDate).toISOString().slice(0, 16) : "",
    });
  }, [meeting]);

  const updateMutation = useUpdateMeeting({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListMeetingsQueryKey() });
        toast({
          title: "Meeting details updated",
          description: "Agenda, participants, and Minutes of Meeting (MOM) saved.",
        });
        onOpenChange(false);
      },
      onError: () => {
        toast({ title: "Failed to update meeting", variant: "destructive" });
      },
    },
  });

  const start = new Date(meeting.meetingDate);
  const end = new Date(start.getTime() + (form.duration ?? 60) * 60_000);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <DialogTitle className="text-xl">{form.title}</DialogTitle>
            <Badge variant="outline" className="text-xs">
              {meeting.projectName ?? `Project #${meeting.projectId}`}
            </Badge>
          </div>
          <DialogDescription>
            {format(start, "EEEE, MMMM d, yyyy")} · {format(start, "h:mm a")} – {format(end, "h:mm a")}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="mom" className="pt-2">
          <TabsList className="grid grid-cols-2 w-full">
            <TabsTrigger value="mom" className="gap-1.5">
              <FileText className="h-4 w-4" /> Minutes of Meeting (MOM)
            </TabsTrigger>
            <TabsTrigger value="details" className="gap-1.5">
              <CalendarIcon className="h-4 w-4" /> Schedule & Agenda
            </TabsTrigger>
          </TabsList>

          {/* Tab 1: Minutes of Meeting (MOM) */}
          <TabsContent value="mom" className="space-y-4 pt-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold">Minutes of Meeting (MOM)</Label>
                <span className="text-xs text-muted-foreground">Document discussions, decisions & directives</span>
              </div>
              <Textarea
                rows={9}
                value={form.minutes}
                onChange={(e) => setForm((p) => ({ ...p, minutes: e.target.value }))}
                placeholder="Record MOM points:
1. Client approved tiling sample for 3rd floor.
2. MEP contractor instructed to expedite ducting before ceiling framing.
3. Site handover deadline confirmed for 15th prox."
                className="font-sans text-sm leading-relaxed resize-y"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold">Attendees / Present Participants</Label>
              <Input
                value={form.participants}
                onChange={(e) => setForm((p) => ({ ...p, participants: e.target.value }))}
                placeholder="e.g. John Doe (PM), Sarah Chen (Architect), Mike Ross (Client Rep)"
              />
            </div>
          </TabsContent>

          {/* Tab 2: Schedule & Agenda */}
          <TabsContent value="details" className="space-y-4 pt-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Meeting Title</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Meeting Date & Time</Label>
                <Input
                  type="datetime-local"
                  value={form.meetingDate}
                  onChange={(e) => setForm((p) => ({ ...p, meetingDate: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Duration (minutes)</Label>
                <Input
                  type="number"
                  value={form.duration}
                  onChange={(e) => setForm((p) => ({ ...p, duration: Number(e.target.value) }))}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Location / Conference Link</Label>
              <Input
                value={form.location}
                onChange={(e) => setForm((p) => ({ ...p, location: e.target.value }))}
                placeholder="e.g. Site Office Meeting Room B / Google Meet"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Planned Agenda</Label>
              <Textarea
                rows={4}
                value={form.agenda}
                onChange={(e) => setForm((p) => ({ ...p, agenda: e.target.value }))}
                placeholder="Topics to be discussed..."
              />
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="mt-4 gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button
            disabled={updateMutation.isPending || !form.title.trim()}
            onClick={() => {
              updateMutation.mutate({
                id: meeting.id,
                data: {
                  projectId: meeting.projectId,
                  title: form.title,
                  location: form.location || null,
                  duration: Number(form.duration) || 60,
                  participants: form.participants || null,
                  agenda: form.agenda || null,
                  minutes: form.minutes || null,
                  meetingDate: form.meetingDate
                    ? new Date(form.meetingDate).toISOString()
                    : new Date(meeting.meetingDate).toISOString(),
                },
              });
            }}
          >
            {updateMutation.isPending ? "Saving MOM…" : "Save MOM & Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
