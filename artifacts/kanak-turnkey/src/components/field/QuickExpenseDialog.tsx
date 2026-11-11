import { useState, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useListProjects } from "@workspace/api-client-react";
import { IndianRupee, Camera, Upload, Trash2, Receipt } from "lucide-react";

interface QuickExpenseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultProjectId?: number;
}

const EXPENSE_CATEGORIES = [
  { id: "local_purchase", label: "Local Hardware" },
  { id: "fuel", label: "Fuel & Generator" },
  { id: "labour_wages", label: "Daily Wages" },
  { id: "cartage", label: "Freight & Cartage" },
  { id: "refreshment", label: "Site Refreshment" },
  { id: "repair", label: "Equipment Repair" },
];

export function QuickExpenseDialog({
  open,
  onOpenChange,
  defaultProjectId,
}: QuickExpenseDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: projects } = useListProjects();

  const [projectId, setProjectId] = useState<number>(defaultProjectId || 1);
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("local_purchase");
  const [billNumber, setBillNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [receiptPhoto, setReceiptPhoto] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setReceiptPhoto(event.target.result as string);
        toast({ title: "Receipt Image Attached" });
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0) {
      toast({ title: "Valid amount required", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/expenses/quick-voucher", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          amount: numAmount,
          category,
          billReferenceNumber: billNumber || `VCH-${Date.now().toString().slice(-4)}`,
          notes: notes.trim() || undefined,
          receiptUrl: receiptPhoto || undefined,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to submit expense voucher");
      }

      queryClient.invalidateQueries();
      toast({
        title: "Expense Claim Submitted",
        description: `₹${numAmount.toLocaleString("en-IN")} submitted for reimbursement approval.`,
      });

      onOpenChange(false);
      setAmount("");
      setNotes("");
      setBillNumber("");
      setReceiptPhoto(null);
    } catch (err: any) {
      toast({
        title: "Submission Failed",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0 overflow-hidden sm:rounded-2xl">
        <div className="bg-amber-950 text-white p-4">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <IndianRupee className="w-4 h-4" />
            </span>
            <div>
              <DialogTitle className="text-base font-bold text-white">
                Site Petty Cash Claim
              </DialogTitle>
              <DialogDescription className="text-xs text-amber-200">
                Log spot expenditure with instant receipt snap
              </DialogDescription>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Project Float</Label>
            <select
              value={projectId}
              onChange={(e) => setProjectId(Number(e.target.value))}
              className="w-full h-9 px-3 rounded-lg border text-xs font-medium bg-background"
            >
              {(projects || []).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Expense Amount (₹) *</Label>
            <div className="relative">
              <span className="absolute left-3 top-2 text-xs font-bold text-muted-foreground">₹</span>
              <Input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="pl-7 h-10 text-base font-mono font-bold"
                required
              />
            </div>
          </div>

          {/* Quick Categories */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Expense Type</Label>
            <div className="grid grid-cols-2 gap-1.5">
              {EXPENSE_CATEGORIES.map((cat) => (
                <button
                  type="button"
                  key={cat.id}
                  onClick={() => setCategory(cat.id)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-medium text-left border transition-all ${
                    category === cat.id
                      ? "bg-amber-500/10 border-amber-500 text-amber-800 dark:text-amber-300 font-bold"
                      : "bg-muted/40 border-border text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Bill / Voucher # (Optional)</Label>
            <Input
              placeholder="e.g. INV-9042 or Cash Memo"
              value={billNumber}
              onChange={(e) => setBillNumber(e.target.value)}
              className="h-9 text-xs"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Description / Purpose</Label>
            <Textarea
              rows={2}
              placeholder="e.g. Bought 2 bags rapid-set cement and sand paper for urgent handover."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="text-xs"
            />
          </div>

          {/* Receipt Photo */}
          <div className="space-y-1.5">
            <input
              type="file"
              accept="image/*"
              ref={fileInputRef}
              onChange={handleCapture}
              className="hidden"
            />
            {receiptPhoto ? (
              <div className="relative rounded-xl overflow-hidden border aspect-video bg-black/5 flex items-center justify-center">
                <img src={receiptPhoto} alt="Receipt" className="max-h-full object-contain" />
                <button
                  type="button"
                  onClick={() => setReceiptPhoto(null)}
                  className="absolute top-2 right-2 bg-rose-600 text-white rounded-full p-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                className="w-full gap-1.5 border-dashed text-xs h-9"
              >
                <Camera className="w-3.5 h-3.5 text-primary" /> Snap Receipt / Voucher Photo
              </Button>
            )}
          </div>

          <div className="pt-2 flex justify-end gap-2 border-t">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting}
              className="bg-amber-600 hover:bg-amber-700 text-white font-bold"
            >
              {isSubmitting ? "Submitting..." : "Submit Claim"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

