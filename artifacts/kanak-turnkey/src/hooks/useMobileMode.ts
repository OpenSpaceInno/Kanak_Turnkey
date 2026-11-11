import { useState, useEffect, useCallback } from "react";

const MOBILE_BREAKPOINT = 768;
const STORAGE_KEY = "kanak_force_desktop";

export function useMobileMode() {
  const [isMobileViewport, setIsMobileViewport] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth < MOBILE_BREAKPOINT;
  });

  const [isStandalonePwa, setIsStandalonePwa] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return (
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true
    );
  });

  const [forceDesktop, setForceDesktopState] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(STORAGE_KEY) === "true";
  });

  useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const pwaMql = window.matchMedia("(display-mode: standalone)");

    const onResize = () => {
      setIsMobileViewport(window.innerWidth < MOBILE_BREAKPOINT);
    };

    const onPwaChange = (e: MediaQueryListEvent) => {
      setIsStandalonePwa(e.matches);
    };

    const onStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) {
        setForceDesktopState(e.newValue === "true");
      }
    };

    mql.addEventListener("change", onResize);
    pwaMql.addEventListener("change", onPwaChange);
    window.addEventListener("storage", onStorageChange);

    return () => {
      mql.removeEventListener("change", onResize);
      pwaMql.removeEventListener("change", onPwaChange);
      window.removeEventListener("storage", onStorageChange);
    };
  }, []);

  const setForceDesktop = useCallback((force: boolean) => {
    setForceDesktopState(force);
    if (force) {
      localStorage.setItem(STORAGE_KEY, "true");
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  const toggleForceDesktop = useCallback(() => {
    setForceDesktop(!forceDesktop);
  }, [forceDesktop, setForceDesktop]);

  const isMobileMode = (isMobileViewport || isStandalonePwa) && !forceDesktop;

  return {
    isMobileMode,
    isMobileViewport,
    isStandalonePwa,
    forceDesktop,
    setForceDesktop,
    toggleForceDesktop,
  };
}

