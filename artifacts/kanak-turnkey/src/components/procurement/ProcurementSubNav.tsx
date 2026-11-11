import { Link, useLocation } from "wouter";
import { Layers, ShoppingCart, Warehouse } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProcurementSubNavProps {
  className?: string;
}

export function ProcurementSubNav({ className }: ProcurementSubNavProps) {
  const [location] = useLocation();

  const links = [
    {
      name: "Procurement Overview",
      href: "/procurement",
      icon: Layers,
      active: location === "/procurement",
    },
    {
      name: "Purchasing & Orders",
      href: "/procurement/orders",
      icon: ShoppingCart,
      active: location === "/procurement/orders",
      badge: "Buying & RFQs",
    },
    {
      name: "Stock & Inventory",
      href: "/procurement/stock",
      icon: Warehouse,
      active: location === "/procurement/stock",
      badge: "Godowns & Sites",
    },
  ];

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-1.5 p-1 bg-muted/70 border border-border/80 rounded-xl w-fit shadow-2xs backdrop-blur-xs",
        className
      )}
    >
      {links.map((link) => (
        <Link key={link.href} href={link.href}>
          <div
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all duration-200 cursor-pointer select-none",
              link.active
                ? "bg-background text-foreground shadow-sm ring-1 ring-primary/25 border-primary/40 font-bold"
                : "text-muted-foreground hover:text-foreground hover:bg-background/40"
            )}
          >
            <link.icon
              className={cn(
                "w-4 h-4 transition-colors",
                link.active ? "text-primary" : "text-muted-foreground"
              )}
            />
            <span>{link.name}</span>
            {link.badge && (
              <span
                className={cn(
                  "text-[10px] px-2 py-0.5 rounded-full font-medium transition-colors",
                  link.active
                    ? "bg-primary/10 text-primary border border-primary/20"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {link.badge}
              </span>
            )}
          </div>
        </Link>
      ))}
    </div>
  );
}
