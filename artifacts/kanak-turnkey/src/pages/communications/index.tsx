import { useState, useMemo } from "react";
import { useListCommunications, useListProjects } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Mail, MessageSquare, Phone, Users, Search, Filter } from "lucide-react";
import { format } from "date-fns";
import { NewCommunicationDialog } from "@/components/dialogs/communication-dialogs";

export default function Communications() {
  const { data: communications, isLoading } = useListCommunications();
  const { data: projects } = useListProjects();
  const [search, setSearch] = useState("");
  const [projectFilter, setProjectFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");

  const getIcon = (type: string) => {
    switch (type) {
      case "email":
        return <Mail className="h-4 w-4" />;
      case "phone":
        return <Phone className="h-4 w-4" />;
      case "meeting":
        return <Users className="h-4 w-4" />;
      default:
        return <MessageSquare className="h-4 w-4" />;
    }
  };

  const filteredCommunications = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (communications ?? []).filter((comm) => {
      if (
        q &&
        !(
          comm.subject.toLowerCase().includes(q) ||
          (comm.content ?? "").toLowerCase().includes(q) ||
          (comm.participants ?? "").toLowerCase().includes(q) ||
          (comm.projectName ?? "").toLowerCase().includes(q)
        )
      ) {
        return false;
      }
      if (projectFilter !== "all" && String(comm.projectId) !== projectFilter) return false;
      if (typeFilter !== "all" && comm.communicationType !== typeFilter) return false;
      return true;
    });
  }, [communications, search, projectFilter, typeFilter]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Communications</h1>
          <p className="text-muted-foreground">Central log of all project and stakeholder communications.</p>
        </div>
        <NewCommunicationDialog
          trigger={
            <Button className="shrink-0 gap-2">
              <Plus className="h-4 w-4" /> Log Communication
            </Button>
          }
        />
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px] max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search communications, subject, content..."
            className="pl-8"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={projectFilter} onValueChange={setProjectFilter}>
          <SelectTrigger className="w-[190px]">
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
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="All channels" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All channels</SelectItem>
            <SelectItem value="email">Email</SelectItem>
            <SelectItem value="phone">Phone Call</SelectItem>
            <SelectItem value="meeting">Meeting</SelectItem>
            <SelectItem value="site_note">Site Note / Chat</SelectItem>
          </SelectContent>
        </Select>
        <div className="ml-auto text-sm text-muted-foreground">
          {filteredCommunications.length} of {communications?.length ?? 0} communications
        </div>
      </div>

      <div className="space-y-3">
        {filteredCommunications.map((comm) => (
          <Card key={comm.id} className="hover:border-primary/40 transition-colors">
            <CardContent className="p-4 flex gap-4">
              <div className="mt-1 flex items-center justify-center h-8 w-8 rounded-full bg-muted shrink-0 text-muted-foreground">
                {getIcon(comm.communicationType)}
              </div>
              <div className="flex-1 space-y-1 min-w-0">
                <div className="flex justify-between items-start gap-4">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm">{comm.subject}</span>
                    <Badge variant="outline" className="text-[10px] uppercase font-mono">
                      {comm.communicationType}
                    </Badge>
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0 font-mono">
                    {format(new Date(comm.communicationDate), "MMM d, yyyy h:mm a")}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground font-medium">
                  {comm.projectName || "General"}
                  {comm.participants ? ` · ${comm.participants}` : ""}
                </div>
                {comm.content && <p className="text-sm mt-2 leading-relaxed text-foreground/90 whitespace-pre-wrap">{comm.content}</p>}
              </div>
            </CardContent>
          </Card>
        ))}
        {!filteredCommunications.length && !isLoading && (
          <div className="text-center p-8 border rounded-md border-dashed text-muted-foreground">
            No communications found matching the criteria.
          </div>
        )}
      </div>
    </div>
  );
}
