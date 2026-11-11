import { Link } from "wouter";
import { useGetCurrentUser, useListNotifications } from "@workspace/api-client-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ROLE_CONFIG } from "@/lib/role-navigation";
import {
  Building2,
  ChevronDown,
  Bell,
  HardHat,
} from "lucide-react";

interface MobileHeaderProps {
  activeProjectName?: string;
  onOpenProjectSheet: () => void;
  onOpenRoleDrawer: () => void;
}

export function MobileHeader({
  activeProjectName = "All Sites",
  onOpenProjectSheet,
  onOpenRoleDrawer,
}: MobileHeaderProps) {
  const { data: user } = useGetCurrentUser();
  const { data: notifications } = useListNotifications();

  const role = user?.activeRole || "viewer";
  const roleMeta = ROLE_CONFIG[role] || {
    label: "Viewer",
    shortLabel: "Viewer",
    icon: HardHat,
  };
  const RoleIcon = roleMeta.icon;

  const unreadCount = (notifications || []).filter((n) => !n.isRead).length;

  return (
    <header className="sticky top-0 z-30 h-14 bg-background/95 backdrop-blur-md border-b border-border px-3.5 flex items-center justify-between gap-2 shadow-xs">
      {/* Brand & Project Selector */}
      <div className="flex items-center gap-2 min-w-0">
        <Link href="/" className="flex items-center gap-1.5 shrink-0">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-black text-sm shadow-xs">
            K
          </div>
        </Link>

        {/* Site / Project Selector Pill */}
        <button
          onClick={onOpenProjectSheet}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-muted/60 hover:bg-muted border border-border/80 text-left min-w-0 max-w-[170px] sm:max-w-[240px] transition-colors active:scale-95"
          title="Switch Active Project Context"
        >
          <Building2 className="w-3.5 h-3.5 text-primary shrink-0" />
          <span className="text-xs font-semibold truncate text-foreground">
            {activeProjectName}
          </span>
          <ChevronDown className="w-3 h-3 text-muted-foreground shrink-0" />
        </button>
      </div>

      {/* Right Controls: Role Pill & Notifications */}
      <div className="flex items-center gap-1.5 shrink-0">
        {/* Role Pill */}
        <button
          onClick={onOpenRoleDrawer}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 hover:bg-primary/20 border border-primary/20 text-xs font-medium text-primary transition-colors active:scale-95"
          title="Switch Persona / Role"
        >
          <RoleIcon className="w-3.5 h-3.5" />
          <span className="text-[11px] font-semibold">{roleMeta.shortLabel}</span>
          <ChevronDown className="w-3 h-3 text-primary/70" />
        </button>

        {/* Notification Bell */}
        <Link href="/notifications">
          <Button
            variant="ghost"
            size="icon"
            className="w-8 h-8 rounded-full relative text-muted-foreground hover:text-foreground"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            )}
          </Button>
        </Link>
      </div>
    </header>
  );
}
