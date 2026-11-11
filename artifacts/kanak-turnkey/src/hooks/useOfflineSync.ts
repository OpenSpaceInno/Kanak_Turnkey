import { useState, useEffect, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "./use-toast";

export interface OfflineStatus {
  isOnline: boolean;
  pendingDraftsCount: number;
  lastOnlineAt: Date | null;
  syncNow: () => Promise<void>;
}

export function useOfflineSync(): OfflineStatus {
  const [isOnline, setIsOnline] = useState<boolean>(() =>
    typeof navigator !== "undefined" ? navigator.onLine : true
  );
  const [lastOnlineAt, setLastOnlineAt] = useState<Date | null>(new Date());
  const [pendingDraftsCount, setPendingDraftsCount] = useState<number>(0);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const countPendingDrafts = useCallback(() => {
    if (typeof window === "undefined" || !window.localStorage) return 0;
    let count = 0;
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith("turnkey_dpr_draft_") || key.startsWith("turnkey_offline_"))) {
          count++;
        }
      }
    } catch {
      // ignore
    }
    setPendingDraftsCount(count);
    return count;
  }, []);

  useEffect(() => {
    countPendingDrafts();

    const handleOnline = () => {
      setIsOnline(true);
      setLastOnlineAt(new Date());
      toast({
        title: "Connection Restored",
        description: "Back online. Syncing field data with server...",
      });
      queryClient.invalidateQueries();
      countPendingDrafts();
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast({
        title: "Offline Mode Active",
        description: "Network disconnected. Field entries and DPRs will be cached locally.",
        variant: "destructive",
      });
      countPendingDrafts();
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Periodically update draft count
    const interval = setInterval(countPendingDrafts, 5000);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      clearInterval(interval);
    };
  }, [queryClient, toast, countPendingDrafts]);

  const syncNow = useCallback(async () => {
    try {
      await queryClient.refetchQueries();
      countPendingDrafts();
      toast({
        title: "Sync Complete",
        description: "All project dashboards and field records are up to date.",
      });
    } catch {
      toast({
        title: "Sync Failed",
        description: "Unable to reach server. Check connection.",
        variant: "destructive",
      });
    }
  }, [queryClient, countPendingDrafts, toast]);

  return {
    isOnline,
    pendingDraftsCount,
    lastOnlineAt,
    syncNow,
  };
}

