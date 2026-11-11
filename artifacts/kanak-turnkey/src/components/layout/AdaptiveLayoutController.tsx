import { ReactNode } from "react";
import { AppLayout } from "./AppLayout";
import { MobileAppLayout } from "./mobile/MobileAppLayout";
import { useMobileMode } from "@/hooks/useMobileMode";

interface AdaptiveLayoutControllerProps {
  children: ReactNode;
}

/**
 * Adaptive Layout Controller:
 * Routes between the 100% UNTOUCHED desktop enterprise layout (`AppLayout`)
 * and the thumb-optimized native mobile app shell (`MobileAppLayout`).
 */
export function AdaptiveLayoutController({ children }: AdaptiveLayoutControllerProps) {
  const { isMobileMode } = useMobileMode();

  if (isMobileMode) {
    return <MobileAppLayout>{children}</MobileAppLayout>;
  }

  // Strict guarantee: zero modifications to the existing desktop Web UI
  return <AppLayout>{children}</AppLayout>;
}

