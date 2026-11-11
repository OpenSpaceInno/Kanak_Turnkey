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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useGetCurrentUser, getGetCurrentUserQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

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

const ROLE_NAV_HREFS: Record<string, string[]> = {
  admin: [
    "/",
    "/leads",
    "/projects",
    "/tasks",
    "/task-templates",
    "/finance",
    "/finance/ar",
    "/finance/ap",
    "/procurement",
    "/procurement/orders",
    "/procurement/stock",
    "/communications",
    "/meetings",
    "/documents",
  ],
  project_manager: [
    "/",
    "/leads",
    "/projects",
    "/tasks",
    "/task-templates",
    "/finance",
    "/finance/ar",
    "/finance/ap",
    "/procurement",
    "/procurement/orders",
    "/procurement/stock",
    "/communications",
    "/meetings",
    "/documents",
  ],
  sales_manager: ["/", "/leads", "/communications", "/meetings", "/documents"],
  engineer: [
    "/",
    "/projects",
    "/tasks",
    "/task-templates",
    "/procurement/stock",
    "/communications",
    "/meetings",
    "/documents",
  ],
  supervisor: [
    "/",
    "/projects",
    "/tasks",
    "/procurement/stock",
    "/communications",
    "/meetings",
    "/documents",
  ],
  storekeeper: [
    "/",
    "/procurement",
    "/procurement/orders",
    "/procurement/stock",
    "/projects",
    "/communications",
    "/documents",
  ],
  subcontractor: [
    "/",
    "/projects",
    "/tasks",
    "/finance/ar",
    "/communications",
    "/documents",
  ],
  accountant: [
    "/",
    "/finance",
    "/finance/ar",
    "/finance/ap",
    "/projects",
    "/communications",
    "/meetings",
    "/documents",
  ],
  procurement_officer: [
    "/",
    "/procurement",
    "/procurement/orders",
    "/procurement/stock",
    "/projects",
    "/communications",
    "/meetings",
    "/documents",
  ],
  viewer: ["/", "/projects", "/tasks", "/communications", "/meetings", "/documents"],
};

export function Sidebar() {
  const [location, setLocation] = useLocation();
  const { data: user } = useGetCurrentUser();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const role = user?.activeRole ?? "viewer";
  const allowedHrefs = new Set(ROLE_NAV_HREFS[role] ?? ROLE_NAV_HREFS.viewer);

  const navigation = ALL_NAV_ITEMS.filter((item) => allowedHrefs.has(item.href)).map((item) => {
    if (!item.children) return item;
    return {
      ...item,
      children: item.children.filter((sub) => allowedHrefs.has(sub.href)),
    };
  });

  const secondaryNavigation: NavItem[] = [
    { name: "Notifications", href: "/notifications", icon: Bell },
    { name: "Settings & Admin", href: "/settings", icon: Settings },
    ...(role === "admin"
      ? [
          { name: "Audit Logs", href: "/audit-logs", icon: ShieldAlert },
        ]
      : []),
  ];

  const handleLogout = async () => {
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

  return (
    <div className="hidden md:flex flex-col w-64 shrink-0 border-r border-sidebar-border/80 bg-sidebar text-sidebar-foreground shadow-sm">
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
          <div className="text-[10px] font-bold text-sidebar-foreground/40 uppercase tracking-widest mb-2 px-3">
            Core Operations
          </div>
          <nav className="space-y-0.5">
            {navigation.map((item) => {
              const isParentActive =
                location === item.href ||
                (item.href !== "/" && location.startsWith(item.href));
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
                        const isChildActive = location === child.href;
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

      {/* User Mini-Card Footer */}
      {user && (
        <div className="p-3 border-t border-sidebar-border/60 bg-sidebar-accent/30">
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
                  <div className="text-[10px] text-sidebar-foreground/60 truncate capitalize">
                    {(user.activeRole || "viewer").replace("_", " ")}
                  </div>
                </div>
              </div>
            </Link>

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
      )}
    </div>
  );
}
