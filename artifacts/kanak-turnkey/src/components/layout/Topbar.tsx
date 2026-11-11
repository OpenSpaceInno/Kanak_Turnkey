import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useGetCurrentUser, useSwitchRole, getGetCurrentUserQueryKey } from "@workspace/api-client-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import {
  Bell,
  ChevronDown,
  ChevronRight,
  LogOut,
  Settings,
  User as UserIcon,
  Shield,
  Briefcase,
  HardHat,
  Calculator,
  ShoppingCart,
  Eye,
  Check,
  UserCheck,
  ArrowRightLeft,
  LayoutDashboard,
  Building,
  Receipt,
  Layers,
  Sparkles,
} from "lucide-react";
import type { ManagedUser } from "@/pages/settings/UserManagementTab";
import { ROLE_CONFIG, isRouteAllowedForRole } from "@/lib/role-navigation";

function getBreadcrumbs(path: string) {
  if (path === "/") {
    return [{ label: "Dashboard", href: "/" }];
  }
  if (path.startsWith("/leads")) {
    return [
      { label: "Pre-Construction", href: "/leads" },
      { label: path.includes("/leads/") ? "Lead Details & BOQ" : "Sales Leads & Pipeline", href: path },
    ];
  }
  if (path.startsWith("/projects")) {
    return [
      { label: "Operations", href: "/projects" },
      { label: path.includes("/projects/") ? "Project Command Hub" : "Active Projects", href: path },
    ];
  }
  if (path.startsWith("/tasks")) {
    return [
      { label: "Execution", href: "/tasks" },
      { label: "Tasks & Gantt Schedule", href: "/tasks" },
    ];
  }
  if (path.startsWith("/finance")) {
    let sub = "Financial Overview";
    if (path.includes("/ar")) sub = "Client Billing (AR)";
    if (path.includes("/ap")) sub = "Vendor Invoicing (AP)";
    return [
      { label: "Finance & Accounts", href: "/finance" },
      { label: sub, href: path },
    ];
  }
  if (path.startsWith("/procurement")) {
    let sub = "Procurement Pipeline";
    if (path.includes("/orders")) sub = "Purchasing & Orders";
    if (path.includes("/stock")) sub = "Stock & Inventory";
    return [
      { label: "Supply Chain", href: "/procurement" },
      { label: sub, href: path },
    ];
  }
  if (path.startsWith("/settings")) {
    return [
      { label: "System", href: "/settings" },
      { label: "Settings & Administration", href: "/settings" },
    ];
  }
  if (path.startsWith("/communications")) {
    return [
      { label: "Collaboration", href: "/communications" },
      { label: "Communications Log", href: "/communications" },
    ];
  }
  if (path.startsWith("/meetings")) {
    return [
      { label: "Collaboration", href: "/meetings" },
      { label: "Site Meetings & Minutes", href: "/meetings" },
    ];
  }
  if (path.startsWith("/documents")) {
    return [
      { label: "Repository", href: "/documents" },
      { label: "Document Management", href: "/documents" },
    ];
  }
  if (path.startsWith("/notifications")) {
    return [
      { label: "System", href: "/notifications" },
      { label: "Notification Center", href: "/notifications" },
    ];
  }
  if (path.startsWith("/audit-logs")) {
    return [
      { label: "Governance", href: "/audit-logs" },
      { label: "Audit Trail", href: "/audit-logs" },
    ];
  }
  return [{ label: "Workspace", href: path }];
}

export function Topbar() {
  const { data: user } = useGetCurrentUser();
  const switchRole = useSwitchRole();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [location, setLocation] = useLocation();

  const [isSwitchUserModalOpen, setIsSwitchUserModalOpen] = useState(false);

  // Notifications count
  const { data: notifications = [] } = useQuery<any[]>({
    queryKey: ["/api/notifications"],
    queryFn: async () => {
      try {
        const res = await fetch("/api/notifications");
        if (!res.ok) return [];
        return res.json();
      } catch {
        return [];
      }
    },
    refetchInterval: 30000,
  });

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  // Users list for quick persona switching
  const { data: allUsers = [] } = useQuery<ManagedUser[]>({
    queryKey: ["/api/users"],
    queryFn: async () => {
      try {
        const res = await fetch("/api/users");
        if (!res.ok) return [];
        return res.json();
      } catch {
        return [];
      }
    },
  });

  const handleRoleSwitch = (newRole: string) => {
    switchRole.mutate(
      { data: { role: newRole as any } },
      {
        onSuccess: (updated: any) => {
          if (updated) {
            queryClient.setQueryData(getGetCurrentUserQueryKey(), updated);
          }
          queryClient.invalidateQueries({ queryKey: getGetCurrentUserQueryKey() });
          toast({
            title: "Operational Role Switched",
            description: `Now viewing workspace as ${ROLE_CONFIG[newRole]?.label || newRole}.`,
          });
          if (!isRouteAllowedForRole(newRole, location)) {
            setLocation("/");
          }
        },
      }
    );
  };

  const handleSwitchAccount = async (targetUserId: number, targetName: string) => {
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: targetUserId }),
      });

      const updated = await res.json();
      if (!res.ok) throw new Error(updated.error || "Failed to switch account");

      try {
        localStorage.setItem("kanak_current_user_id", String(targetUserId));
      } catch {}

      queryClient.setQueryData(getGetCurrentUserQueryKey(), updated);
      queryClient.invalidateQueries({ queryKey: getGetCurrentUserQueryKey() });
      setIsSwitchUserModalOpen(false);

      toast({
        title: "Account Switched",
        description: `Signed in as ${targetName} (${updated.designation || updated.activeRole}).`,
      });

      const targetRole = (updated.activeRole as string) || (updated.roles && updated.roles[0]) || "viewer";
      if (!isRouteAllowedForRole(targetRole, location)) {
        setLocation("/");
      }
    } catch (err: any) {
      toast({
        title: "Switch Error",
        description: err.message,
        variant: "destructive",
      });
    }
  };

  const handleLogout = async () => {
    try {
      localStorage.removeItem("kanak_current_user_id");
    } catch {}
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // Ignore
    }
    queryClient.removeQueries({ queryKey: getGetCurrentUserQueryKey() });
    toast({
      title: "Logged Out",
      description: "You have been safely signed out.",
    });
    setLocation("/login");
  };

  if (!user) return null;

  const activeRole = user.activeRole || "viewer";
  const currentRoleConfig = ROLE_CONFIG[activeRole] || {
    label: activeRole.replace("_", " "),
    icon: UserIcon,
    color: "text-muted-foreground",
    badgeClass: "bg-muted text-foreground border-border",
  };
  const RoleIcon = currentRoleConfig.icon;
  const breadcrumbs = getBreadcrumbs(location);
  const userExt = user as any;

  return (
    <>
      <header className="h-16 border-b border-border/80 bg-card/90 backdrop-blur-md flex items-center justify-between px-6 sticky top-0 z-30 transition-all">
        {/* Left: Dynamic Breadcrumb Trail */}
        <div className="flex items-center gap-2 text-sm">
          <Link href="/">
            <div className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
              <LayoutDashboard className="h-4 w-4" />
            </div>
          </Link>

          {breadcrumbs.map((crumb, idx) => {
            const isLast = idx === breadcrumbs.length - 1;
            return (
              <div key={crumb.label} className="flex items-center gap-1.5">
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0" />
                {isLast ? (
                  <span className="font-semibold text-foreground tracking-tight">
                    {crumb.label}
                  </span>
                ) : (
                  <Link href={crumb.href}>
                    <span className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
                      {crumb.label}
                    </span>
                  </Link>
                )}
              </div>
            );
          })}
        </div>

        {/* Right: Role Persona, Notifications & User Menu */}
        <div className="flex items-center gap-3">
          {/* Active Role Selector Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={`h-9 px-3 gap-2 border shadow-2xs transition-all hover:bg-muted/60 ${currentRoleConfig.badgeClass}`}
              >
                <RoleIcon className={`h-4 w-4 ${currentRoleConfig.color}`} />
                <span className="font-semibold text-xs tracking-tight">
                  {currentRoleConfig.label}
                </span>
                <ChevronDown className="h-3.5 w-3.5 opacity-60 ml-0.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 p-1.5">
              <DropdownMenuLabel className="text-xs text-muted-foreground uppercase tracking-wider py-1">
                Active Perspective
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="my-1" />
              {user.roles && user.roles.length > 0 ? (
                user.roles.map((roleKey) => {
                  const cfg = ROLE_CONFIG[roleKey] || {
                    label: roleKey.replace("_", " "),
                    icon: UserIcon,
                    color: "text-muted-foreground",
                  };
                  const Icon = cfg.icon;
                  const isActive = user.activeRole === roleKey;

                  return (
                    <DropdownMenuItem
                      key={roleKey}
                      onClick={() => handleRoleSwitch(roleKey)}
                      className={`flex items-center justify-between text-xs py-2 cursor-pointer rounded-md ${
                        isActive ? "bg-primary/10 font-semibold text-primary" : ""
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Icon className={`h-4 w-4 ${cfg.color}`} />
                        <span>{cfg.label}</span>
                      </div>
                      {isActive && <Check className="h-3.5 w-3.5 text-primary" />}
                    </DropdownMenuItem>
                  );
                })
              ) : (
                <DropdownMenuItem disabled className="text-xs">
                  No roles assigned
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Notifications Flyout */}
          <Button
            variant="ghost"
            size="icon"
            className="relative h-9 w-9 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground"
            onClick={() => setLocation("/notifications")}
            title="Notifications"
          >
            <Bell className="h-4 w-4" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </Button>

          {/* User Profile Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="relative h-9 pl-2 pr-3 py-1 rounded-full flex items-center gap-2.5 hover:bg-muted/80 border border-transparent hover:border-border transition-all"
              >
                <Avatar className="h-7 w-7 border">
                  <AvatarImage src={user.avatarUrl || undefined} alt={user.name} />
                  <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                    {user.name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div className="text-left hidden lg:block leading-tight">
                  <div className="text-xs font-semibold text-foreground line-clamp-1">
                    {user.name}
                  </div>
                  <div className="text-[10px] text-muted-foreground line-clamp-1">
                    {userExt.designation || currentRoleConfig.label}
                  </div>
                </div>
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground/70" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64 p-2" forceMount>
              <DropdownMenuLabel className="font-normal p-2">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10 border">
                    <AvatarImage src={user.avatarUrl || undefined} alt={user.name} />
                    <AvatarFallback className="bg-primary/10 text-primary font-bold">
                      {user.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="space-y-0.5 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{user.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                    <Badge variant="outline" className={`text-[10px] px-1.5 py-0 mt-1 ${currentRoleConfig.badgeClass}`}>
                      {currentRoleConfig.label}
                    </Badge>
                  </div>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="my-1.5" />

              <DropdownMenuItem
                onClick={() => setLocation("/settings")}
                className="gap-2.5 text-xs py-2 cursor-pointer"
              >
                <Settings className="h-4 w-4 text-muted-foreground" />
                <span>Account Settings & Password</span>
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={() => setIsSwitchUserModalOpen(true)}
                className="gap-2.5 text-xs py-2 cursor-pointer text-indigo-600 focus:text-indigo-600 focus:bg-indigo-50"
              >
                <ArrowRightLeft className="h-4 w-4" />
                <span>Switch Team Persona</span>
              </DropdownMenuItem>

              <DropdownMenuSeparator className="my-1.5" />

              <DropdownMenuItem
                onClick={handleLogout}
                className="gap-2.5 text-xs py-2 text-destructive focus:text-destructive cursor-pointer"
              >
                <LogOut className="h-4 w-4" />
                <span>Sign Out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Switch Team Persona Modal */}
      <Dialog open={isSwitchUserModalOpen} onOpenChange={setIsSwitchUserModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Switch Active Team Account
            </DialogTitle>
            <DialogDescription>
              Select an account persona below to immediately switch context and test role privileges.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-2 max-h-[60vh] overflow-y-auto py-2 pr-1">
            {allUsers.map((u) => {
              const isCurrent = u.id === user.id;
              const primaryRole = u.roles[0] || "viewer";
              const cfg = ROLE_CONFIG[primaryRole] || {
                label: primaryRole,
                icon: UserIcon,
                color: "text-muted-foreground",
              };
              const Icon = cfg.icon;

              return (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => handleSwitchAccount(u.id, u.name)}
                  disabled={isCurrent || u.status === "inactive"}
                  className={`flex items-center justify-between p-3 rounded-lg border text-left transition-all ${
                    isCurrent
                      ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                      : u.status === "inactive"
                      ? "opacity-50 cursor-not-allowed bg-muted/20"
                      : "hover:bg-muted/50 cursor-pointer shadow-2xs"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm shrink-0">
                      {u.name.charAt(0)}
                    </div>
                    <div>
                      <div className="font-semibold text-xs text-foreground flex items-center gap-1.5">
                        {u.name}
                        {isCurrent && (
                          <Badge variant="default" className="text-[9px] px-1.5 py-0 h-4">
                            Active
                          </Badge>
                        )}
                      </div>
                      <div className="text-[11px] text-muted-foreground">{u.designation || u.email}</div>
                      <div className="text-[10px] text-muted-foreground/70">{u.department}</div>
                    </div>
                  </div>

                  <div className="text-right">
                    <Badge variant="outline" className="text-[10px] capitalize">
                      {cfg.label}
                    </Badge>
                  </div>
                </button>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
