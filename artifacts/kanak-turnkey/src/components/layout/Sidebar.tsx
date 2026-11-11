import { useState } from "react";
import { Link, useLocation } from "wouter";
import {
  LayoutDashboard,
  Users,
  Briefcase,
  CheckSquare,
  DollarSign,
  ShoppingCart,
  MessageSquare,
  Calendar,
  FileText,
  Bell,
  Settings,
  ShieldAlert,
  LayoutTemplate,
  Receipt,
  ShieldCheck,
  TrendingUp,
  ChevronDown,
  Warehouse,
  Layers,
  HardHat,
  LogOut,
  Building,
  ArrowRightLeft,
  Sparkles,
  Check,
  User as UserIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  useGetCurrentUser,
  useSwitchRole,
  getGetCurrentUserQueryKey,
} from "@workspace/api-client-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
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
import {
  ROLE_CONFIG,
  ROLE_NAV_HREFS,
  isRouteAllowedForRole,
} from "@/lib/role-navigation";

type SubNavItem = { name: string; href: string; icon: React.ElementType };

type NavItem = {
  name: string;
  href: string;
  icon: React.ElementType;
  section?: string;
  badge?: string;
  children?: SubNavItem[];
};

const ALL_NAV_ITEMS: NavItem[] = [
  {
    name: "Dashboard",
    href: "/",
    icon: LayoutDashboard,
    section: "Overview",
  },
  {
    name: "Pre-Construction",
    href: "/leads",
    icon: Users,
    section: "Commercial & Estimation",
  },
  {
    name: "Projects & Sites",
    href: "/projects",
    icon: Briefcase,
    section: "Site Execution",
  },
  {
    name: "Tasks & Schedule",
    href: "/tasks",
    icon: CheckSquare,
    section: "Site Execution",
  },
  {
    name: "Task Templates",
    href: "/task-templates",
    icon: LayoutTemplate,
    section: "Site Execution",
  },
  {
    name: "Finance & Accounts",
    href: "/finance",
    icon: DollarSign,
    section: "Financial Management",
    children: [
      { name: "Overview & Cash Flow", href: "/finance", icon: TrendingUp },
      { name: "Client Billing (AR)", href: "/finance/ar", icon: Receipt },
      { name: "Vendor Invoicing (AP)", href: "/finance/ap", icon: ShieldCheck },
    ],
  },
  {
    name: "Procurement & Stock",
    href: "/procurement",
    icon: ShoppingCart,
    section: "Supply Chain & Materials",
    children: [
      { name: "Requisitions Pipeline", href: "/procurement", icon: Layers },
      { name: "Purchasing & POs", href: "/procurement/orders", icon: ShoppingCart },
      { name: "Stock & Warehouse", href: "/procurement/stock", icon: Warehouse },
    ],
  },
  {
    name: "Communications",
    href: "/communications",
    icon: MessageSquare,
    section: "Collaboration",
  },
  {
    name: "Meetings & MOM",
    href: "/meetings",
    icon: Calendar,
    section: "Collaboration",
  },
  {
    name: "Documents",
    href: "/documents",
    icon: FileText,
    section: "Collaboration",
  },
];

export function Sidebar() {
  const [location, setLocation] = useLocation();
  const { data: user } = useGetCurrentUser();
  const switchRole = useSwitchRole();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [isSwitchUserModalOpen, setIsSwitchUserModalOpen] = useState(false);

  // Users list for switcher
  const { data: allUsers = [] } = useQuery<any[]>({
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

  const role = (user?.activeRole as string) ?? "viewer";
  const allowedHrefs = new Set(ROLE_NAV_HREFS[role] ?? ROLE_NAV_HREFS.viewer);

  // Robust hierarchical filtering: allow parent if parent href is allowed OR any child is allowed
  const navigation = ALL_NAV_ITEMS.map((item) => {
    if (!item.children) {
      return allowedHrefs.has(item.href) ? item : null;
    }
    const allowedChildren = item.children.filter((sub) => allowedHrefs.has(sub.href));
    if (allowedChildren.length === 0 && !allowedHrefs.has(item.href)) {
      return null;
    }
    return {
      ...item,
      // If the parent href itself is not in allowedHrefs, default to the first allowed child href
      href: allowedHrefs.has(item.href) ? item.href : (allowedChildren[0]?.href ?? item.href),
      children: allowedChildren,
    };
  }).filter((item): item is NavItem => item !== null);

  const secondaryNavigation: NavItem[] = [
    { name: "Notifications", href: "/notifications", icon: Bell },
    {
      name: role === "admin" ? "Settings & Admin" : "Profile & Settings",
      href: "/settings",
      icon: Settings,
    },
    ...(role === "admin"
      ? [
          { name: "Audit Logs", href: "/audit-logs", icon: ShieldAlert },
        ]
      : []),
  ];

  const handleRoleSwitch = (newRole: string) => {
    switchRole.mutate(
      { data: { role: newRole as any } },
      {
        onSuccess: (updatedUser: any) => {
          if (updatedUser) {
            queryClient.setQueryData(getGetCurrentUserQueryKey(), updatedUser);
          }
          queryClient.invalidateQueries({ queryKey: getGetCurrentUserQueryKey() });
          toast({
            title: "Role Perspective Switched",
            description: `Sidebar and workspace now filtered as ${ROLE_CONFIG[newRole]?.label || newRole}.`,
          });

          // Redirect if current route is not allowed in new role
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

      const newRole = (updated.activeRole as string) || (updated.roles && updated.roles[0]) || "viewer";
      if (!isRouteAllowedForRole(newRole, location)) {
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
      // ignore
    }
    queryClient.removeQueries({ queryKey: getGetCurrentUserQueryKey() });
    toast({
      title: "Signed Out",
      description: "You have successfully signed out.",
    });
    setLocation("/login");
  };

  const userExt = user as any;
  const currentRoleConfig = ROLE_CONFIG[role] || {
    label: role.replace("_", " "),
    shortLabel: role,
    icon: UserIcon,
    color: "text-muted-foreground",
    badgeClass: "bg-muted text-foreground border-border",
    description: "",
  };
  const RoleIcon = currentRoleConfig.icon;

  return (
    <>
      <div className="hidden md:flex flex-col w-64 shrink-0 border-r border-sidebar-border/80 bg-sidebar text-sidebar-foreground shadow-sm select-none">
        {/* Brand Header */}
        <div className="h-16 flex items-center justify-between px-5 border-b border-sidebar-border/60">
          <Link href="/">
            <div className="flex items-center gap-2.5 cursor-pointer group">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center font-bold text-base text-primary-foreground shadow-xs group-hover:scale-105 transition-transform">
                K
              </div>
              <div>
                <div className="font-extrabold text-sm tracking-tight text-white group-hover:text-primary transition-colors">
                  Kanak Turnkey
                </div>
                <div className="text-[10px] text-sidebar-foreground/60 font-medium tracking-wider uppercase">
                  Contracting ERP
                </div>
              </div>
            </div>
          </Link>
          <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-sidebar-border bg-sidebar-accent/50 text-sidebar-foreground/70">
            PRO
          </Badge>
        </div>

        {/* Main Nav Scroll Area */}
        <div className="flex-1 overflow-y-auto py-3 px-3 space-y-6">
          <div>
            <div className="flex items-center justify-between px-3 mb-2">
              <span className="text-[10px] font-bold text-sidebar-foreground/40 uppercase tracking-widest">
                Navigation
              </span>
              <span className="text-[9px] font-semibold text-primary/80 uppercase">
                {currentRoleConfig.shortLabel}
              </span>
            </div>

            <nav className="space-y-0.5">
              {navigation.map((item) => {
                const isParentActive =
                  location === item.href ||
                  (item.href !== "/" && location.startsWith(item.href)) ||
                  Boolean(item.children?.some((child) => location === child.href || (child.href !== "/" && location.startsWith(child.href))));
                const hasChildren = Boolean(item.children && item.children.length > 0);

                return (
                  <div key={item.name} className="space-y-0.5">
                    <Link href={item.href}>
                      <div
                        className={cn(
                          "flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer",
                          isParentActive
                            ? "bg-sidebar-accent text-sidebar-accent-foreground font-semibold shadow-2xs border-l-2 border-primary"
                            : "text-sidebar-foreground/75 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                        )}
                      >
                        <div className="flex items-center gap-2.5">
                          <item.icon
                            className={cn(
                              "w-4 h-4 shrink-0 transition-colors",
                              isParentActive ? "text-primary" : "text-sidebar-foreground/50"
                            )}
                          />
                          <span>{item.name}</span>
                        </div>
                        {hasChildren && (
                          <ChevronDown
                            className={cn(
                              "w-3.5 h-3.5 text-sidebar-foreground/40 transition-transform duration-200",
                              isParentActive ? "rotate-0 text-primary" : "-rotate-90"
                            )}
                          />
                        )}
                      </div>
                    </Link>

                    {/* Render Submenu items */}
                    {hasChildren && isParentActive && (
                      <div className="ml-4 pl-2.5 border-l border-sidebar-border/60 space-y-0.5 my-1">
                        {item.children!.map((child) => {
                          const isChildActive =
                            location === child.href ||
                            (child.href !== "/" && location.startsWith(`${child.href}/`));
                          return (
                            <Link key={child.name} href={child.href}>
                              <div
                                className={cn(
                                  "flex items-center gap-2 px-2.5 py-1.5 rounded-md text-[11px] font-medium transition-colors cursor-pointer",
                                  isChildActive
                                    ? "bg-primary/15 text-primary font-semibold"
                                    : "text-sidebar-foreground/65 hover:bg-sidebar-accent/40 hover:text-sidebar-foreground"
                                )}
                              >
                                <child.icon
                                  className={cn(
                                    "w-3 h-3 shrink-0",
                                    isChildActive ? "text-primary" : "text-sidebar-foreground/45"
                                  )}
                                />
                                <span className="truncate">{child.name}</span>
                              </div>
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </nav>
          </div>

          <div>
            <div className="text-[10px] font-bold text-sidebar-foreground/40 uppercase tracking-widest mb-2 px-3">
              Administration
            </div>
            <nav className="space-y-0.5">
              {secondaryNavigation.map((item) => {
                const isActive = location === item.href;
                return (
                  <Link key={item.name} href={item.href}>
                    <div
                      className={cn(
                        "flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer",
                        isActive
                          ? "bg-sidebar-accent text-sidebar-accent-foreground font-semibold shadow-2xs border-l-2 border-primary"
                          : "text-sidebar-foreground/75 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                      )}
                    >
                      <item.icon
                        className={cn(
                          "w-4 h-4 shrink-0 transition-colors",
                          isActive ? "text-primary" : "text-sidebar-foreground/50"
                        )}
                      />
                      <span>{item.name}</span>
                    </div>
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>

        {/* User Mini-Card Footer with Built-in Role & Persona Switching */}
        {user && (
          <div className="p-3 border-t border-sidebar-border/60 bg-sidebar-accent/30 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Link href="/settings">
                <div className="flex items-center gap-2.5 min-w-0 cursor-pointer group">
                  <Avatar className="h-8 w-8 border border-sidebar-border shrink-0">
                    <AvatarImage src={user.avatarUrl || undefined} alt={user.name} />
                    <AvatarFallback className="bg-primary/20 text-primary text-xs font-bold">
                      {user.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-white truncate group-hover:text-primary transition-colors">
                      {user.name}
                    </div>
                    <div className="text-[10px] text-sidebar-foreground/60 truncate">
                      {userExt.designation || currentRoleConfig.label}
                    </div>
                  </div>
                </div>
              </Link>

              <div className="flex items-center gap-1 shrink-0">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsSwitchUserModalOpen(true)}
                  className="h-7 w-7 text-sidebar-foreground/60 hover:text-indigo-400 hover:bg-indigo-500/10 rounded-md shrink-0"
                  title="Switch Team Persona"
                >
                  <ArrowRightLeft className="h-3.5 w-3.5" />
                </Button>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleLogout}
                  className="h-7 w-7 text-sidebar-foreground/60 hover:text-destructive hover:bg-destructive/10 rounded-md shrink-0"
                  title="Sign Out"
                >
                  <LogOut className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            {/* Quick Role Switcher Pill in Sidebar Footer */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-md bg-sidebar-accent/60 hover:bg-sidebar-accent border border-sidebar-border/60 text-left transition-colors cursor-pointer group"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <RoleIcon className={`h-3.5 w-3.5 shrink-0 ${currentRoleConfig.color}`} />
                    <span className="text-[11px] font-semibold text-white truncate group-hover:text-primary transition-colors">
                      {currentRoleConfig.label}
                    </span>
                  </div>
                  <ChevronDown className="h-3 w-3 text-sidebar-foreground/50 shrink-0 group-hover:text-sidebar-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56 p-1.5 z-50">
                <DropdownMenuLabel className="text-[10px] text-muted-foreground uppercase tracking-wider py-1">
                  Switch Active Perspective
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="my-1" />
                {user.roles && user.roles.length > 0 ? (
                  user.roles.map((rKey: string) => {
                    const cfg = ROLE_CONFIG[rKey] || {
                      label: rKey.replace("_", " "),
                      icon: UserIcon,
                      color: "text-muted-foreground",
                    };
                    const Icon = cfg.icon;
                    const isActive = role === rKey;

                    return (
                      <DropdownMenuItem
                        key={rKey}
                        onClick={() => handleRoleSwitch(rKey)}
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
          </div>
        )}
      </div>

      {/* Switch Team Persona Modal */}
      <Dialog open={isSwitchUserModalOpen} onOpenChange={setIsSwitchUserModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Switch Active Team Account
            </DialogTitle>
            <DialogDescription>
              Select any account below to instantly switch login persona and test role-based sidebar access.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-2 max-h-[60vh] overflow-y-auto py-2 pr-1">
            {allUsers.map((u) => {
              const isCurrent = u.id === user?.id;
              const primaryRole = u.roles?.[0] || u.activeRole || "viewer";
              const cfg = ROLE_CONFIG[primaryRole] || {
                label: primaryRole,
                icon: UserIcon,
                color: "text-muted-foreground",
              };

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
