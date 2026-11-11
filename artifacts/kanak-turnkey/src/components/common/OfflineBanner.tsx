import { WifiOff, RefreshCw, CheckCircle2, HardDrive } from "lucide-react";
import { useOfflineSync } from "@/hooks/useOfflineSync";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function OfflineBanner() {
  const { isOnline, pendingDraftsCount, syncNow } = useOfflineSync();

  if (isOnline && pendingDraftsCount === 0) {
    return null;
  }

  return (
    <aside
      aria-label="Network and synchronization status"
      className="sticky top-0 z-50 w-full px-3 py-1.5 transition-all duration-300"
    >
      <div
        className={`max-w-2xl mx-auto rounded-xl px-3 py-1.5 flex items-center justify-between text-xs font-medium shadow-md backdrop-blur-md border ${
          !isOnline
            ? "bg-amber-950/90 text-amber-200 border-amber-800/80"
            : "bg-slate-900/90 text-slate-200 border-slate-700/80"
        }`}
      >
        <div className="flex items-center gap-2 min-w-0">
          {!isOnline ? (
            <>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
              </span>
              <WifiOff className="w-3.5 h-3.5 shrink-0 text-amber-400" />
              <span className="truncate">Offline Mode • Safe local storage active</span>
            </>
          ) : (
            <>
              <HardDrive className="w-3.5 h-3.5 shrink-0 text-primary" />
              <span className="truncate">
                {pendingDraftsCount} local field draft{pendingDraftsCount > 1 ? "s" : ""} cached
              </span>
            </>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {pendingDraftsCount > 0 && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-white/20 bg-white/10 text-white">
              {pendingDraftsCount} Pending
            </Badge>
          )}
          {isOnline && (
            <Button
              size="sm"
              variant="ghost"
              onClick={syncNow}
              className="h-6 px-2 text-[11px] text-white hover:bg-white/10 cursor-pointer gap-1"
            >
              <RefreshCw className="w-3 h-3" /> Sync
            </Button>
          )}
        </div>
      </div>
    </aside>
  );
}

