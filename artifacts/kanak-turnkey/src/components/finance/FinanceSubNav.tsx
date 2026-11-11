import { Link, useLocation } from "wouter";
import { TrendingUp, Receipt, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

interface FinanceSubNavProps {
  className?: string;
}

export function FinanceSubNav({ className }: FinanceSubNavProps) {
  const [location] = useLocation();

  const links = [
    {
      name: "Finance Overview",
      href: "/finance",
      icon: TrendingUp,
      active: location === "/finance",
    },
    {
      name: "Client Billing (AR)",
      href: "/finance/ar",
      icon: Receipt,
      active: location === "/finance/ar",
      badge: "Receivables",
    },
    {
      name: "Vendor Invoicing (AP)",
      href: "/finance/ap",
      icon: ShieldCheck,
      active: location === "/finance/ap",
      badge: "Payables",
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
