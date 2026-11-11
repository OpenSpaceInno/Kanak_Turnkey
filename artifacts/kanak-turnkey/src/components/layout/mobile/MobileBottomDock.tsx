import { Link, useLocation } from "wouter";
import {
  LayoutDashboard,
  Briefcase,
  Plus,
  CheckSquare,
  Menu,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface MobileBottomDockProps {
  onOpenActionSheet: () => void;
  onOpenMenuDrawer: () => void;
}

export function MobileBottomDock({
  onOpenActionSheet,
  onOpenMenuDrawer,
}: MobileBottomDockProps) {
  const [location] = useLocation();

  const isHome = location === "/" || location === "/m";
  const isProjects = location.startsWith("/projects");
  const isTasks = location.startsWith("/tasks") || location.startsWith("/approvals");

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 h-16 bg-background/95 backdrop-blur-lg border-t border-border px-2 flex items-center justify-around shadow-lg safe-area-pb">
      {/* 1. Home / Field Hub */}
      <Link
        href="/"
        className={cn(
          "flex flex-col items-center justify-center gap-1 w-14 py-1 rounded-xl transition-colors active:scale-95",
          isHome
            ? "text-primary font-bold"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        <LayoutDashboard className={cn("w-5 h-5", isHome && "stroke-[2.5]")} />
        <span className="text-[10px] tracking-tight">Home</span>
      </Link>

      {/* 2. Projects */}
      <Link
        href="/projects"
        className={cn(
          "flex flex-col items-center justify-center gap-1 w-14 py-1 rounded-xl transition-colors active:scale-95",
          isProjects
            ? "text-primary font-bold"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        <Briefcase className={cn("w-5 h-5", isProjects && "stroke-[2.5]")} />
        <span className="text-[10px] tracking-tight">Projects</span>
      </Link>

      {/* 3. Center Action Floating Action Button (FAB) */}
      <div className="relative -top-3 flex items-center justify-center">
        <button
          onClick={onOpenActionSheet}
          aria-label="Field Quick Actions"
          className="w-13 h-13 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg shadow-primary/30 border-2 border-background active:scale-90 transition-transform"
        >
          <Plus className="w-6 h-6 stroke-[3]" />
        </button>
      </div>

      {/* 4. Tasks & Approvals */}
      <Link
        href="/tasks"
        className={cn(
          "flex flex-col items-center justify-center gap-1 w-14 py-1 rounded-xl transition-colors active:scale-95",
          isTasks
            ? "text-primary font-bold"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        <CheckSquare className={cn("w-5 h-5", isTasks && "stroke-[2.5]")} />
        <span className="text-[10px] tracking-tight">Tasks</span>
      </Link>

      {/* 5. Menu / More Drawer */}
      <button
        onClick={onOpenMenuDrawer}
        aria-label="Open App Menu and Roles"
        className="flex flex-col items-center justify-center gap-1 w-14 py-1 rounded-xl text-muted-foreground hover:text-foreground active:scale-95 transition-colors"
      >
        <Menu className="w-5 h-5" />
        <span className="text-[10px] tracking-tight">Menu</span>
      </button>
    </nav>
  );
}

