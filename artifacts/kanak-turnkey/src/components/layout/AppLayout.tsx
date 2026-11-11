import { ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { MobileBottomNav } from "./MobileBottomNav";
import { OfflineBanner } from "@/components/common/OfflineBanner";
import { PwaInstallPrompt } from "@/components/common/PwaInstallPrompt";

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Desktop / Tablet Collapsible Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <OfflineBanner />
        <Topbar />
        <main className="flex-1 overflow-y-auto p-3 sm:p-5 md:p-6 pb-24 md:pb-6">
          {children}
        </main>
      </div>

      {/* PWA Floating Install Prompt */}
      <PwaInstallPrompt />

      {/* Mobile-First Bottom Dock Navigation */}
      <MobileBottomNav />
    </div>
  );
}
