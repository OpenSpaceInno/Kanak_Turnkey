import { useState, useEffect, ReactNode } from "react";
import { useListProjects } from "@workspace/api-client-react";
import { MobileHeader } from "./MobileHeader";
import { MobileBottomDock } from "./MobileBottomDock";
import { MobileRoleDrawer } from "./MobileRoleDrawer";
import { MobileProjectSheet } from "./MobileProjectSheet";
import { FieldQuickActionSheet } from "@/components/field/FieldQuickActionSheet";
import { OfflineBanner } from "@/components/common/OfflineBanner";
import { PwaInstallPrompt } from "@/components/common/PwaInstallPrompt";

interface MobileAppLayoutProps {
  children: ReactNode;
}

export function MobileAppLayout({ children }: MobileAppLayoutProps) {
  const { data: projects } = useListProjects();

  const [activeProjectId, setActiveProjectId] = useState<number | undefined>(() => {
    const saved = localStorage.getItem("kanak_active_project_id");
    return saved ? Number(saved) : undefined;
  });

  const [activeProjectName, setActiveProjectName] = useState<string>(() => {
    return localStorage.getItem("kanak_active_project_name") || "All Sites";
  });

  const [actionSheetOpen, setActionSheetOpen] = useState(false);
  const [projectSheetOpen, setProjectSheetOpen] = useState(false);
  const [roleDrawerOpen, setRoleDrawerOpen] = useState(false);

  // Auto-pick the first project if none is selected yet
  useEffect(() => {
    if (!activeProjectId && projects && projects.length > 0) {
      const first = projects[0];
      setActiveProjectId(first.id);
      setActiveProjectName(first.name);
      localStorage.setItem("kanak_active_project_id", String(first.id));
      localStorage.setItem("kanak_active_project_name", first.name);
    }
  }, [projects, activeProjectId]);

  const handleSelectProject = (id: number, name: string) => {
    setActiveProjectId(id);
    setActiveProjectName(name);
    localStorage.setItem("kanak_active_project_id", String(id));
    localStorage.setItem("kanak_active_project_name", name);
  };

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground antialiased selection:bg-primary/20">
      <OfflineBanner />

      {/* Top Mobile Bar */}
      <MobileHeader
        activeProjectName={activeProjectName}
        onOpenProjectSheet={() => setProjectSheetOpen(true)}
        onOpenRoleDrawer={() => setRoleDrawerOpen(true)}
      />

      {/* Main Touch-Friendly Content Area */}
      <main className="flex-1 w-full max-w-lg mx-auto px-3.5 py-3 pb-24 overflow-x-hidden">
        {children}
      </main>

      {/* Fixed 5-Slot Bottom Navigation Dock */}
      <MobileBottomDock
        onOpenActionSheet={() => setActionSheetOpen(true)}
        onOpenMenuDrawer={() => setRoleDrawerOpen(true)}
      />

      {/* Slide-Up Sheets */}
      <FieldQuickActionSheet
        open={actionSheetOpen}
        onOpenChange={setActionSheetOpen}
        defaultProjectId={activeProjectId}
      />

      <MobileProjectSheet
        open={projectSheetOpen}
        onOpenChange={setProjectSheetOpen}
        activeProjectId={activeProjectId}
        onSelectProject={handleSelectProject}
      />

      <MobileRoleDrawer
        open={roleDrawerOpen}
        onOpenChange={setRoleDrawerOpen}
      />

      {/* PWA Floating Install Prompt */}
      <PwaInstallPrompt />
    </div>
  );
}

