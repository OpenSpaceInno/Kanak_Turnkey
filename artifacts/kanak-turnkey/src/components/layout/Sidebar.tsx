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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useGetCurrentUser } from "@workspace/api-client-react";

type NavItem = { name: string; href: string; icon: React.ElementType };

const ALL_NAV_ITEMS: NavItem[] = [
  { name: "Dashboard",      href: "/",               icon: LayoutDashboard },
  { name: "Leads",          href: "/leads",           icon: Users           },
  { name: "Projects",       href: "/projects",        icon: Briefcase       },
  { name: "Tasks",          href: "/tasks",           icon: CheckSquare     },
  { name: "Task Templates", href: "/task-templates",  icon: LayoutTemplate  },
  { name: "Finance",        href: "/finance",         icon: DollarSign      },
  { name: "Procurement",    href: "/procurement",     icon: ShoppingCart    },
  { name: "Communications", href: "/communications",  icon: MessageSquare   },
  { name: "Meetings",       href: "/meetings",        icon: Calendar        },
  { name: "Documents",      href: "/documents",       icon: FileText        },
];

const ROLE_NAV_HREFS: Record<string, string[]> = {
  admin: [
    "/", "/leads", "/projects", "/tasks", "/task-templates",
    "/finance", "/procurement", "/communications", "/meetings", "/documents",
  ],
  project_manager: [
    "/", "/leads", "/projects", "/tasks", "/task-templates",
    "/finance", "/procurement", "/communications", "/meetings", "/documents",
  ],
  sales_manager: [
    "/", "/leads", "/communications", "/meetings", "/documents",
  ],
  engineer: [
    "/", "/projects", "/tasks", "/task-templates",
    "/communications", "/meetings", "/documents",
  ],
  accountant: [
    "/", "/finance", "/projects",
    "/communications", "/meetings", "/documents",
  ],
  procurement_officer: [
    "/", "/procurement", "/projects",
    "/communications", "/meetings", "/documents",
  ],
  viewer: [
    "/", "/projects", "/tasks",
    "/communications", "/meetings", "/documents",
  ],
};

export function Sidebar() {
  const [location] = useLocation();
  const { data: user } = useGetCurrentUser();

  const role = user?.activeRole ?? "viewer";
  const allowedHrefs = new Set(ROLE_NAV_HREFS[role] ?? ROLE_NAV_HREFS.viewer);
  const navigation = ALL_NAV_ITEMS.filter((item) => allowedHrefs.has(item.href));

  const secondaryNavigation: NavItem[] = [
    { name: "Notifications", href: "/notifications", icon: Bell     },
    { name: "Settings",      href: "/settings",      icon: Settings },
    ...(role === "admin" ? [
      { name: "Audit Logs", href: "/audit-logs", icon: ShieldAlert },
      { name: "Admin",      href: "/admin",      icon: Users       },
    ] : []),
  ];

  return (
    <div className="flex flex-col w-64 border-r bg-sidebar text-sidebar-foreground">
      <div className="h-16 flex items-center px-6 border-b border-sidebar-border">
        <div className="flex items-center gap-2 font-bold text-lg tracking-tight text-sidebar-primary">
          <div className="w-8 h-8 rounded bg-sidebar-primary flex items-center justify-center text-sidebar-primary-foreground">
            K
          </div>
          Kanak Turnkey
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-4 px-3 space-y-8">
        <div>
          <div className="text-xs font-semibold text-sidebar-foreground/50 uppercase tracking-wider mb-3 px-3">
            Core Operations
          </div>
          <nav className="space-y-1">
            {navigation.map((item) => {
              const isActive =
                location === item.href ||
                (item.href !== "/" && location.startsWith(item.href));
              return (
                <Link key={item.name} href={item.href}>
                  <div
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer",
                      isActive
                        ? "bg-sidebar-accent text-sidebar-accent-foreground"
                        : "text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                    )}
                  >
                    <item.icon
                      className={cn(
                        "w-4 h-4",
                        isActive ? "text-sidebar-primary" : "text-sidebar-foreground/50"
                      )}
                    />
                    {item.name}
                  </div>
                </Link>
              );
            })}
          </nav>
        </div>

        <div>
          <div className="text-xs font-semibold text-sidebar-foreground/50 uppercase tracking-wider mb-3 px-3">
            System
          </div>
          <nav className="space-y-1">
            {secondaryNavigation.map((item) => {
              const isActive = location === item.href;
              return (
                <Link key={item.name} href={item.href}>
                  <div
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer",
                      isActive
                        ? "bg-sidebar-accent text-sidebar-accent-foreground"
                        : "text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                    )}
                  >
                    <item.icon
                      className={cn(
                        "w-4 h-4",
                        isActive ? "text-sidebar-primary" : "text-sidebar-foreground/50"
                      )}
                    />
                    {item.name}
                  </div>
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
    </div>
  );
}
