import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { useGetCurrentUser } from "@workspace/api-client-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  HardHat,
  Clock,
  AlertCircle,
  IndianRupee,
  ShoppingCart,
  Camera,
  CalendarCheck,
  ChevronRight,
  Sparkles,
  Compass,
  Users,
  Warehouse,
  Ruler,
  CheckCircle2,
  Truck,
  Package,
} from "lucide-react";

import { StepDprWizardModal } from "./StepDprWizardModal";
import { QuickPunchDialog } from "./QuickPunchDialog";
import { QuickExpenseDialog } from "./QuickExpenseDialog";
import { QuickMaterialRequestDialog } from "./QuickMaterialRequestDialog";
import { QuickAttendanceDialog } from "./QuickAttendanceDialog";
import { PocketDrawingsModal } from "./PocketDrawingsModal";

interface FieldQuickActionSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultProjectId?: number;
}

export function FieldQuickActionSheet({
  open,
  onOpenChange,
  defaultProjectId,
}: FieldQuickActionSheetProps) {
  const [, setLocation] = useLocation();
  const { data: user } = useGetCurrentUser();
  const role = (user?.activeRole as string) || "engineer";

  const [dprOpen, setDprOpen] = useState(false);
  const [punchOpen, setPunchOpen] = useState(false);
  const [expenseOpen, setExpenseOpen] = useState(false);
  const [mrOpen, setMrOpen] = useState(false);
  const [attendanceOpen, setAttendanceOpen] = useState(false);
  const [drawingsOpen, setDrawingsOpen] = useState(false);

  const actions = useMemo(() => {
    // 1. Role: Site Supervisor / Foreman
    if (role === "supervisor") {
      return [
        {
          id: "muster",
          title: "Gang Headcount Muster",
          desc: "1-tap count for masons, carpenters, bar benders & helpers",
          icon: Users,
          color: "bg-amber-500/10 text-amber-600 border-amber-500/20",
          action: () => {
            onOpenChange(false);
            setLocation("/dashboard");
          },
        },
        {
          id: "work_done",
          title: "Log Trade Work Done",
          desc: "Select activity chip & completed quantity with camera proof",
          icon: HardHat,
          color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
          action: () => {
            onOpenChange(false);
            setLocation("/dashboard");
          },
        },
        {
          id: "punch",
          title: "Report Site Defect / Snag",
          desc: "Capture punch item with severity tag & live camera proof",
          icon: AlertCircle,
          color: "bg-rose-500/10 text-rose-600 border-rose-500/20",
          action: () => {
            onOpenChange(false);
            setPunchOpen(true);
          },
        },
        {
          id: "indent",
          title: "Request Site Consumables",
          desc: "Indent cement, steel, sand, aggregates & binding wire",
          icon: ShoppingCart,
          color: "bg-blue-500/10 text-blue-600 border-blue-500/20",
          action: () => {
            onOpenChange(false);
            setMrOpen(true);
          },
        },
        {
          id: "drawings",
          title: "Pocket Blueprints & Drawings",
          desc: "Instant access to GFC architectural, structural, and MEP plans",
          icon: Compass,
          color: "bg-sky-500/10 text-sky-600 border-sky-500/20",
          action: () => {
            onOpenChange(false);
            setDrawingsOpen(true);
          },
        },
      ];
    }

    // 2. Role: Storekeeper / Material Controller
    if (role === "storekeeper") {
      return [
        {
          id: "receive_grn",
          title: "Receive GRN (Delivery Challan)",
          desc: "1-tap arrival check, PO link & stamped challan camera snap",
          icon: Truck,
          color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
          action: () => {
            onOpenChange(false);
            setLocation("/dashboard");
          },
        },
        {
          id: "issue_store",
          title: "Issue Material to Foreman",
          desc: "Dispatch cement, rebar, pipes or tiles to site work package",
          icon: Package,
          color: "bg-blue-500/10 text-blue-600 border-blue-500/20",
          action: () => {
            onOpenChange(false);
            setLocation("/dashboard");
          },
        },
        {
          id: "stock_matrix",
          title: "Check Stock Levels & Buffer",
          desc: "Real-time quantity on hand, consumption & low stock alerts",
          icon: Warehouse,
          color: "bg-indigo-500/10 text-indigo-600 border-indigo-500/20",
          action: () => {
            onOpenChange(false);
            setLocation("/dashboard");
          },
        },
        {
          id: "reorder",
          title: "Raise Material Reorder",
          desc: "Submit urgent store replenishment indent to procurement",
          icon: ShoppingCart,
          color: "bg-amber-500/10 text-amber-600 border-amber-500/20",
          action: () => {
            onOpenChange(false);
            setMrOpen(true);
          },
        },
      ];
    }

    // 3. Role: Subcontractor / Trade Partner
    if (role === "subcontractor") {
      return [
        {
          id: "claim_measurement",
          title: "Claim Joint Measurement",
          desc: "Submit completed work quantity, dimensions & sheet photo",
          icon: Ruler,
          color: "bg-purple-500/10 text-purple-600 border-purple-500/20",
          action: () => {
            onOpenChange(false);
            setLocation("/dashboard");
          },
        },
        {
          id: "drawings",
          title: "Pocket Blueprints & Drawings",
          desc: "Inspect GFC drawings and architectural plans for your trade",
          icon: Compass,
          color: "bg-sky-500/10 text-sky-600 border-sky-500/20",
          action: () => {
            onOpenChange(false);
            setDrawingsOpen(true);
          },
        },
        {
          id: "packages",
          title: "View Assigned Work Packages",
          desc: "Check scope of work, certified progress & deadlines",
          icon: HardHat,
          color: "bg-blue-500/10 text-blue-600 border-blue-500/20",
          action: () => {
            onOpenChange(false);
            setLocation("/dashboard");
          },
        },
        {
          id: "bills",
          title: "Review RA Bills & Payments",
          desc: "Track payment certifications and milestone disbursements",
          icon: IndianRupee,
          color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
          action: () => {
            onOpenChange(false);
            setLocation("/dashboard");
          },
        },
      ];
    }

    // 4. Default / Site Engineer / Project Manager / Admin
    return [
      {
        id: "dpr",
        title: "Log Daily DPR",
        desc: "Workforce headcount, execution notes, machinery & camera photos",
        icon: HardHat,
        color: "bg-amber-500/10 text-amber-600 border-amber-500/20",
        action: () => {
          onOpenChange(false);
          setDprOpen(true);
        },
      },
      {
        id: "attendance",
        title: "Site Attendance & Clock-In",
        desc: "Record morning arrival, site geofence, and shift duty hours",
        icon: Clock,
        color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
        action: () => {
          onOpenChange(false);
          setAttendanceOpen(true);
        },
      },
      {
        id: "drawings",
        title: "Pocket Blueprints & Drawings",
        desc: "Instant access to GFC architectural, structural, and MEP floor plans",
        icon: Compass,
        color: "bg-sky-500/10 text-sky-600 border-sky-500/20",
        action: () => {
          onOpenChange(false);
          setDrawingsOpen(true);
        },
      },
      {
        id: "punch",
        title: "Report Site Defect / Snag",
        desc: "Capture punch item with severity tag & live camera proof",
        icon: AlertCircle,
        color: "bg-rose-500/10 text-rose-600 border-rose-500/20",
        action: () => {
          onOpenChange(false);
          setPunchOpen(true);
        },
      },
      {
        id: "indent",
        title: "Request Site Materials",
        desc: "Raise instant material indent or urgent delivery requisition",
        icon: ShoppingCart,
        color: "bg-blue-500/10 text-blue-600 border-blue-500/20",
        action: () => {
          onOpenChange(false);
          setMrOpen(true);
        },
      },
      {
        id: "expense",
        title: "Claim Site Petty Cash",
        desc: "Log local purchases, fuel, or daily wage vouchers with receipt snap",
        icon: IndianRupee,
        color: "bg-indigo-500/10 text-indigo-600 border-indigo-500/20",
        action: () => {
          onOpenChange(false);
          setExpenseOpen(true);
        },
      },
    ];
  }, [role, onOpenChange, setLocation]);

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="rounded-t-3xl max-h-[85vh] p-4 sm:p-6 bg-background">
          <div className="w-12 h-1.5 bg-muted rounded-full mx-auto mb-4" />
          <SheetHeader className="text-left pb-3 border-b">
            <div className="flex items-center gap-2">
              <span className="p-1 rounded-md bg-primary/10 text-primary">
                <Sparkles className="w-4 h-4" />
              </span>
              <SheetTitle className="text-lg font-bold">Field Quick Actions</SheetTitle>
            </div>
            <SheetDescription className="text-xs text-muted-foreground">
              One-tap entry tools designed for site engineers and field supervisors
            </SheetDescription>
          </SheetHeader>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 py-4 overflow-y-auto max-h-[60vh]">
            {actions.map((act) => {
              const Icon = act.icon;
              return (
                <button
                  type="button"
                  key={act.id}
                  onClick={act.action}
                  className="flex items-center justify-between p-3.5 rounded-2xl border bg-card hover:bg-muted/40 transition-all text-left group shadow-2xs hover:shadow-sm"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border ${act.color}`}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-sm font-bold text-foreground group-hover:text-primary transition-colors truncate">
                        {act.title}
                      </h4>
                      <p className="text-[11px] text-muted-foreground line-clamp-1">
                        {act.desc}
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground/60 group-hover:text-foreground shrink-0 transition-transform group-hover:translate-x-0.5" />
                </button>
              );
            })}
          </div>
        </SheetContent>
      </Sheet>

      {/* Connected Modals */}
      <StepDprWizardModal
        open={dprOpen}
        onOpenChange={setDprOpen}
        defaultProjectId={defaultProjectId}
      />
      <QuickAttendanceDialog
        open={attendanceOpen}
        onOpenChange={setAttendanceOpen}
        defaultProjectId={defaultProjectId}
      />
      <QuickPunchDialog
        open={punchOpen}
        onOpenChange={setPunchOpen}
        defaultProjectId={defaultProjectId}
      />
      <QuickExpenseDialog
        open={expenseOpen}
        onOpenChange={setExpenseOpen}
        defaultProjectId={defaultProjectId}
      />
      <QuickMaterialRequestDialog
        open={mrOpen}
        onOpenChange={setMrOpen}
        defaultProjectId={defaultProjectId}
      />
      <PocketDrawingsModal
        open={drawingsOpen}
        onOpenChange={setDrawingsOpen}
        projectId={defaultProjectId || 1}
      />
    </>
  );
}

