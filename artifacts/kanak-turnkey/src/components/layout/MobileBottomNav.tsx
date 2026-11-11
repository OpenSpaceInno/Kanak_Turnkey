import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useGetCurrentUser } from "@workspace/api-client-react";
import {
  LayoutDashboard,
  CheckSquare,
  Plus,
  Briefcase,
  HardHat,
  ShieldCheck,
  AlertCircle,
  FileCheck,
  Settings,
  Layers,
  DollarSign,
  ShoppingCart,
  Users,
  Building,
  Receipt,
  UserCheck,
} from "lucide-react";
import { FieldQuickActionSheet } from "@/components/field/FieldQuickActionSheet";
import { cn } from "@/lib/utils";

export function MobileBottomNav() {
  const [location] = useLocation();
  const { data: user } = useGetCurrentUser();
  const [actionSheetOpen, setActionSheetOpen] = useState(false);

  const role = (user?.activeRole as string) || "viewer";

  // Build role-tailored navigation items (2 on left, 2 on right of central button)
  let leftItems: { label: string; href: string; icon: any }[] = [];
  let rightItems: { label: string; href: string; icon: any }[] = [];

  if (role === "engineer") {
    leftItems = [
      { label: "Today", href: "/", icon: HardHat },
      { label: "Tasks", href: "/tasks", icon: CheckSquare },
    ];
    rightItems = [
      { label: "Projects", href: "/projects", icon: Briefcase },
      { label: "Profile", href: "/settings", icon: Settings },
    ];
  } else if (role === "project_manager") {
    leftItems = [
      { label: "Overview", href: "/", icon: LayoutDashboard },
      { label: "Projects", href: "/projects", icon: Briefcase },
    ];
    rightItems = [
      { label: "Schedule", href: "/tasks", icon: CheckSquare },
      { label: "Finance", href: "/finance", icon: DollarSign },
    ];
  } else if (role === "supervisor") {
    leftItems = [
      { label: "Site", href: "/", icon: HardHat },
      { label: "Work", href: "/tasks", icon: CheckSquare },
    ];
    rightItems = [
      { label: "Materials", href: "/procurement/stock", icon: Layers },
      { label: "Profile", href: "/settings", icon: Settings },
    ];
  } else if (role === "sales_manager") {
    leftItems = [
      { label: "Overview", href: "/", icon: LayoutDashboard },
      { label: "Leads", href: "/leads", icon: Users },
    ];
    rightItems = [
      { label: "Projects", href: "/projects", icon: Briefcase },
      { label: "Profile", href: "/settings", icon: Settings },
    ];
  } else if (role === "storekeeper" || role === "procurement_officer") {
    leftItems = [
      { label: "Store", href: "/", icon: ShoppingCart },
      { label: "Stock", href: "/procurement/stock", icon: Layers },
    ];
    rightItems = [
      { label: "Orders", href: "/procurement/orders", icon: FileCheck },
      { label: "Profile", href: "/settings", icon: Settings },
    ];
  } else if (role === "subcontractor") {
    leftItems = [
      { label: "My Scope", href: "/", icon: Building },
      { label: "Work", href: "/tasks", icon: CheckSquare },
    ];
    rightItems = [
      { label: "My Bills", href: "/finance/ar", icon: Receipt },
      { label: "Profile", href: "/settings", icon: Settings },
    ];
  } else if (role === "accountant") {
    leftItems = [
      { label: "Financials", href: "/", icon: DollarSign },
      { label: "Client AR", href: "/finance/ar", icon: Layers },
    ];
    rightItems = [
      { label: "Vendor AP", href: "/finance/ap", icon: ShieldCheck },
      { label: "Profile", href: "/settings", icon: Settings },
    ];
  } else {
    // Admin / Viewer
    leftItems = [
      { label: "Command", href: "/", icon: LayoutDashboard },
      { label: "Projects", href: "/projects", icon: Briefcase },
    ];
    rightItems = [
      { label: "Tasks", href: "/tasks", icon: CheckSquare },
      { label: "Settings", href: "/settings", icon: Settings },
    ];
  }

  return (
    <>
      <nav aria-label="Mobile navigation" className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-background/95 backdrop-blur-md border-t border-border/80 shadow-lg px-2 pb-safe">
        <div className="flex items-center justify-around h-16 max-w-md mx-auto relative">
          {/* Left Navigation Items */}
          {leftItems.map((item) => {
            const Icon = item.icon;
            const isActive = location === item.href;
            return (
              <Link key={item.href} href={item.href}>
                <div
                  className={cn(
                    "flex flex-col items-center justify-center py-1 px-3 text-center transition-colors cursor-pointer select-none",
                    isActive
                      ? "text-primary font-bold"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Icon className={cn("w-5 h-5 mb-1 transition-transform", isActive && "scale-110")} />
                  <span className="text-[10px] leading-tight font-medium tracking-tight">
                    {item.label}
                  </span>
                </div>
              </Link>
            );
          })}

          {/* Central Quick Action Button */}
          <div className="flex flex-col items-center justify-center -mt-6">
            <button
              type="button"
              onClick={() => setActionSheetOpen(true)}
              className="w-13 h-13 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center ring-4 ring-background cursor-pointer hover:scale-105 active:scale-95 transition-all group"
              aria-label="Open Field Quick Actions"
            >
              <Plus className="w-6 h-6 stroke-[2.5] group-hover:rotate-90 transition-transform duration-200" />
            </button>
            <span className="text-[10px] font-bold text-foreground mt-1">
              Field Action
            </span>
          </div>

          {/* Right Navigation Items */}
          {rightItems.map((item) => {
            const Icon = item.icon;
            const isActive = location === item.href;
            return (
              <Link key={item.href} href={item.href}>
                <div
                  className={cn(
                    "flex flex-col items-center justify-center py-1 px-3 text-center transition-colors cursor-pointer select-none",
                    isActive
                      ? "text-primary font-bold"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Icon className={cn("w-5 h-5 mb-1 transition-transform", isActive && "scale-110")} />
                  <span className="text-[10px] leading-tight font-medium tracking-tight">
                    {item.label}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Quick Action Sheet */}
      <FieldQuickActionSheet
        open={actionSheetOpen}
        onOpenChange={setActionSheetOpen}
      />
    </>
  );
}

