import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { useGetCurrentUser, useSwitchRole, getGetCurrentUserQueryKey } from "@workspace/api-client-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ROLE_CONFIG } from "@/lib/role-navigation";
import { useMobileMode } from "@/hooks/useMobileMode";
import { useToast } from "@/hooks/use-toast";
import {
  User,
  Check,
  Monitor,
  LogOut,
  RefreshCw,
  Sparkles,
  Smartphone,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface MobileRoleDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MobileRoleDrawer({ open, onOpenChange }: MobileRoleDrawerProps) {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: user } = useGetCurrentUser();
  const switchRoleMutation = useSwitchRole();
  const { forceDesktop, toggleForceDesktop } = useMobileMode();

  const activeRole = user?.activeRole || "viewer";
  const userRoles = user?.roles || ["viewer"];

  const handleRoleSwitch = async (roleKey: string) => {
    if (roleKey === activeRole) {
      onOpenChange(false);
      return;
    }

    try {
      const updatedUser = await switchRoleMutation.mutateAsync({
        data: { role: roleKey as any },
      });

      // Update TanStack query cache immediately
      queryClient.setQueryData(getGetCurrentUserQueryKey(), updatedUser);
      queryClient.invalidateQueries({ queryKey: getGetCurrentUserQueryKey() });
      localStorage.setItem("kanak_current_role", roleKey);

      const targetMeta = ROLE_CONFIG[roleKey];
      toast({
        title: `Switched to ${targetMeta?.label || roleKey}`,
        description: "Mobile interface and permissions updated.",
      });

      onOpenChange(false);
      setLocation("/");
    } catch {
      toast({
        title: "Role switch failed",
        description: "Could not switch active persona. Please retry.",
        variant: "destructive",
      });
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("kanak_current_user_id");
    localStorage.removeItem("kanak_current_role");
    onOpenChange(false);
    setLocation("/login");
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl max-h-[90vh] p-4 flex flex-col">
        <SheetHeader className="text-left pb-2 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20 shrink-0">
              <User className="w-5 h-5 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <SheetTitle className="text-base font-bold truncate">
                {user?.name || "Kanak User"}
              </SheetTitle>
              <SheetDescription className="text-xs truncate text-muted-foreground">
                {user?.email || "user@kanak.in"} • {(user as any)?.designation || ROLE_CONFIG[activeRole]?.label || "Executive"}
              </SheetDescription>
            </div>
            <Badge variant="secondary" className="text-[10px] uppercase tracking-wider shrink-0">
              {activeRole.replace("_", " ")}
            </Badge>
          </div>
        </SheetHeader>

        {/* Role Selector Grid */}
        <div className="my-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            Switch Active Role (10 System Personas)
          </p>
        </div>

        <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
          {Object.entries(ROLE_CONFIG).map(([key, meta]) => {
            const isCurrent = key === activeRole;
            const Icon = meta.icon;
            const isAssigned = (userRoles as string[]).includes(key) || activeRole === "admin";

            return (
              <button
                key={key}
                onClick={() => handleRoleSwitch(key)}
                disabled={switchRoleMutation.isPending}
                className={cn(
                  "w-full text-left p-3 rounded-xl border transition-all flex items-center justify-between gap-3 active:scale-[0.99]",
                  isCurrent
                    ? "bg-primary/10 border-primary shadow-sm"
                    : "bg-card border-border hover:bg-muted/40"
                )}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={cn(
                      "w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border",
                      isCurrent
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-muted text-muted-foreground border-border"
                    )}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-xs sm:text-sm text-foreground">
                        {meta.label}
                      </span>
                      {isAssigned && (
                        <span className="text-[10px] text-muted-foreground/70 font-mono">
                          (Assigned)
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground line-clamp-1">
                      {meta.description}
                    </p>
                  </div>
                </div>

                {isCurrent && (
                  <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center shrink-0">
                    <Check className="w-3 h-3 text-primary-foreground stroke-[3]" />
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Footer Actions: Desktop View Toggle & Logout */}
        <div className="pt-3 mt-2 border-t border-border space-y-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              toggleForceDesktop();
              onOpenChange(false);
            }}
            className="w-full justify-between rounded-xl h-10 text-xs"
          >
            <span className="flex items-center gap-2 text-muted-foreground">
              {forceDesktop ? (
                <>
                  <Smartphone className="w-4 h-4 text-primary" />
                  Switch back to Mobile App View
                </>
              ) : (
                <>
                  <Monitor className="w-4 h-4 text-primary" />
                  Request Full Desktop ERP View
                </>
              )}
            </span>
            <Badge variant="outline" className="text-[10px]">
              {forceDesktop ? "Desktop Active" : "Mobile Active"}
            </Badge>
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="w-full text-destructive hover:bg-destructive/10 rounded-xl h-10 text-xs flex items-center justify-center gap-2"
          >
            <LogOut className="w-4 h-4" />
            Sign Out of Kanak Turnkey
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
