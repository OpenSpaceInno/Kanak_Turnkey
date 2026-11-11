import React, { useState, useEffect } from "react";
import { Download, Share, X, Smartphone, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export const PwaInstallPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState<boolean>(false);
  const [isIos, setIsIos] = useState<boolean>(false);
  const [showIosGuide, setShowIosGuide] = useState<boolean>(false);
  const [isDismissed, setIsDismissed] = useState<boolean>(false);

  useEffect(() => {
    // Check if dismissed in this session
    if (sessionStorage.getItem("turnkey_pwa_dismissed") === "true") {
      setIsDismissed(true);
    }

    // Check standalone mode
    const isStandaloneMode =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;
    setIsStandalone(isStandaloneMode);

    // Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIos(isIosDevice);

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  if (isStandalone || isDismissed) {
    return null;
  }

  // Only show if either Android/Desktop prompt is ready OR on iOS
  if (!deferredPrompt && !isIos) {
    return null;
  }

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === "accepted") {
        setIsDismissed(true);
      }
      setDeferredPrompt(null);
    } else if (isIos) {
      setShowIosGuide(true);
    }
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    sessionStorage.setItem("turnkey_pwa_dismissed", "true");
  };

  return (
    <>
      <div className="fixed bottom-20 md:bottom-6 left-4 right-4 md:left-auto md:right-6 md:max-w-md z-40 animate-in slide-in-from-bottom duration-300">
        <div className="bg-slate-900/95 backdrop-blur-md text-white border border-slate-700/80 rounded-2xl p-3.5 shadow-2xl flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center shrink-0 shadow-md">
              <Smartphone className="w-5 h-5 text-slate-950 font-bold" />
            </div>
            <div className="min-w-0">
              <h4 className="text-xs font-bold text-white tracking-wide truncate">
                Install Turnkey App
              </h4>
              <p className="text-[11px] text-slate-300 truncate">
                Instant access, camera offline & 1-tap DPR
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <Button
              size="sm"
              onClick={handleInstallClick}
              className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs h-8 px-3 rounded-lg shadow"
            >
              <Download className="w-3.5 h-3.5 mr-1" />
              Install
            </Button>
            <button
              onClick={handleDismiss}
              aria-label="Dismiss install prompt"
              className="text-slate-400 hover:text-white p-1 rounded-md transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* iOS Instructions Dialog */}
      <Dialog open={showIosGuide} onOpenChange={setShowIosGuide}>
        <DialogContent className="max-w-xs sm:max-w-sm rounded-2xl p-6">
          <DialogHeader className="text-left">
            <DialogTitle className="flex items-center gap-2 text-slate-900 font-bold text-lg">
              <Smartphone className="w-5 h-5 text-amber-500" />
              Install on iOS Safari
            </DialogTitle>
            <DialogDescription className="text-slate-500 text-xs mt-1">
              Follow these simple steps to install Turnkey Field Operations on your iPhone / iPad:
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 my-2 text-sm text-slate-700">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-800 shrink-0 mt-0.5">
                1
              </div>
              <p className="text-xs leading-relaxed">
                Tap the <span className="font-semibold text-blue-600 inline-flex items-center gap-1"><Share className="w-3.5 h-3.5" /> Share</span> icon at the bottom of your Safari browser bar.
              </p>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-800 shrink-0 mt-0.5">
                2
              </div>
              <p className="text-xs leading-relaxed">
                Scroll down and tap <span className="font-semibold text-slate-900">Add to Home Screen</span>.
              </p>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-800 shrink-0 mt-0.5">
                3
              </div>
              <p className="text-xs leading-relaxed">
                Tap <span className="font-semibold text-amber-600">Add</span> in the top right corner. The Turnkey app icon will appear on your home screen!
              </p>
            </div>
          </div>

          <Button
            onClick={() => setShowIosGuide(false)}
            className="w-full bg-slate-900 text-white hover:bg-slate-800 text-xs font-medium h-9 rounded-xl"
          >
            <CheckCircle2 className="w-4 h-4 mr-1.5 text-emerald-400" />
            Got It
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
};

