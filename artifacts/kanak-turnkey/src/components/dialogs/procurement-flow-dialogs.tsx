import { useState, useEffect, type ReactNode } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  useCreateStockTransfer,
  useApproveMaterialRequest,
  useRejectMaterialRequest,
  useTransferMaterialRequest,
  useConvertToPo,
  useTrackPo,
  useFollowUpPo,
  useInspectPo,
  useConsumeMaterial,
  useAddQuotation,
  type StockMatrixResponse,
} from "@/hooks/use-procurement-flow";
import { useListVendors } from "@workspace/api-client-react";
import { CheckCircle2, XCircle, ArrowRight, Truck, ShieldCheck, Star, IndianRupee, Plus } from "lucide-react";

// ============================================================================
// 1. New Stock Transfer Dialog
// ============================================================================
export function NewStockTransferDialog({
  open,
  onOpenChange,
  stockMatrix,
  defaultMaterial,
  defaultProject,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stockMatrix?: StockMatrixResponse;
  defaultMaterial?: string;
  defaultProject?: number;
}) {
  const { toast } = useToast();
  const createTransfer = useCreateStockTransfer();

  const [materialName, setMaterialName] = useState(defaultMaterial || "");
  const [toProjectId, setToProjectId] = useState(defaultProject ? String(defaultProject) : "");
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState("Nos");
  const [notes, setNotes] = useState("");

  const selectedMatInfo = stockMatrix?.materials.find(
    (m) => m.materialName.toLowerCase() === materialName.toLowerCase()
  );

  const handleSubmit = async () => {
    if (!materialName || !toProjectId || !quantity) {
      toast({ title: "Incomplete details", description: "Please fill in all required fields", variant: "destructive" });
      return;
    }

    try {
      await createTransfer.mutateAsync({
        materialName,
        fromProjectId: null, // Central Warehouse
        toProjectId: Number(toProjectId),
        quantity: Number(quantity),
        unit: selectedMatInfo?.unit || unit,
        notes,
      });

      toast({
        title: "Stock Transfer Initiated",
        description: `Transfer of ${quantity} ${selectedMatInfo?.unit || unit} from Central Warehouse scheduled.`,
      });
      onOpenChange(false);
      setQuantity("");
      setNotes("");
    } catch (err: any) {
      toast({ title: "Transfer Failed", description: err.message, variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Transfer from Central Warehouse</DialogTitle>
          <DialogDescription>
            Dispatch in-house surplus stock directly to a project site.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase text-muted-foreground">Material</Label>
            <Select value={materialName} onValueChange={(val) => {
              setMaterialName(val);
              const m = stockMatrix?.materials.find(x => x.materialName === val);
              if (m) setUnit(m.unit);
            }}>
              <SelectTrigger>
                <SelectValue placeholder="Select in-house material" />
              </SelectTrigger>
              <SelectContent>
                {stockMatrix?.materials.map((m) => (
                  <SelectItem key={m.materialName} value={m.materialName}>
                    {m.materialName} (Available: {m.inHouseStock} {m.unit})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedMatInfo && (
              <p className="text-xs text-muted-foreground">
                In-House Available: <span className="font-semibold text-foreground">{selectedMatInfo.inHouseStock} {selectedMatInfo.unit}</span>
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase text-muted-foreground">Destination Project Site</Label>
            <Select value={toProjectId} onValueChange={setToProjectId}>
              <SelectTrigger>
                <SelectValue placeholder="Select receiving project" />
              </SelectTrigger>
              <SelectContent>
                {stockMatrix?.projects.map((p) => (
                  <SelectItem key={p.id} value={String(p.id)}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase text-muted-foreground">Transfer Quantity</Label>
              <Input
                type="number"
                placeholder="0"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase text-muted-foreground">Unit</Label>
              <Input value={selectedMatInfo?.unit || unit} readOnly className="bg-muted/50" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase text-muted-foreground">Notes / Gate Pass Details</Label>
            <Textarea
              placeholder="e.g., Required for 3rd floor slab casting"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={createTransfer.isPending}>
            {createTransfer.isPending ? "Scheduling..." : "Create Transfer Order"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// 2. Approve / Reject Material Request Dialog
// ============================================================================
export function ApproveRejectMrDialog({
  mr,
  open,
  onOpenChange,
  mode,
}: {
  mr: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "approve" | "reject";
}) {
  const { toast } = useToast();
  const approve = useApproveMaterialRequest();
  const reject = useRejectMaterialRequest();
  const [reason, setReason] = useState("");

  const handleAction = async () => {
    if (!mr) return;
    try {
      if (mode === "approve") {
        await approve.mutateAsync(mr.id);
        toast({ title: "Approved", description: `Material Request "${mr.title}" has been approved.` });
      } else {
        if (!reason.trim()) {
          toast({ title: "Reason Required", description: "Please provide a rejection reason.", variant: "destructive" });
          return;
        }
        await reject.mutateAsync({ id: mr.id, reason });
        toast({ title: "Rejected", description: `Material Request rejected and requester notified.` });
      }
      onOpenChange(false);
      setReason("");
    } catch (err: any) {
      toast({ title: "Action Failed", description: err.message, variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>{mode === "approve" ? "Approve Material Request" : "Reject Material Request"}</DialogTitle>
          <DialogDescription>
            {mode === "approve"
              ? `Authorize requisition for ${mr?.quantity} ${mr?.unit} of "${mr?.title}". This unlocks RFQ creation.`
              : `Specify rejection rationale for "${mr?.title}". The site team will be notified.`}
          </DialogDescription>
        </DialogHeader>

        {mode === "reject" ? (
          <div className="space-y-2 py-2">
            <Label className="text-xs font-semibold uppercase text-muted-foreground">Rejection Reason</Label>
            <Textarea
              placeholder="e.g. Budget exhausted, specifications need revision, or material available on site..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
            />
          </div>
        ) : (
          <div className="bg-muted/40 p-3 rounded-md text-sm space-y-1.5 my-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Project:</span>
              <span className="font-medium">{mr?.projectName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Quantity:</span>
              <span className="font-medium">{mr?.quantity} {mr?.unit}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Priority:</span>
              <Badge variant="outline" className="capitalize">{mr?.priority || "medium"}</Badge>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            variant={mode === "approve" ? "default" : "destructive"}
            onClick={handleAction}
            disabled={approve.isPending || reject.isPending}
          >
            {mode === "approve"
              ? (approve.isPending ? "Approving..." : "Confirm Approval")
              : (reject.isPending ? "Rejecting..." : "Reject & Notify")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// 3. Quotation Comparison & Award Matrix Dialog
// ============================================================================
export function QuoteComparisonDialog({
  rfq,
  open,
  onOpenChange,
  onRefresh,
}: {
  rfq: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRefresh?: () => void;
}) {
  const { toast } = useToast();
  const convertToPo = useConvertToPo();
  const [currentRfq, setCurrentRfq] = useState(rfq);
  const [addQuoteOpen, setAddQuoteOpen] = useState(false);

  useEffect(() => {
    setCurrentRfq(rfq);
  }, [rfq]);

  const refreshQuotes = async () => {
    if (rfq?.id) {
      try {
        const res = await fetch(`/api/rfqs/${rfq.id}`);
        const data = await res.json();
        setCurrentRfq(data);
        onRefresh?.();
      } catch (err) {
        console.error("Failed to refresh RFQ details", err);
      }
    }
  };

  const quotes = currentRfq?.quotations || [];

  const handleAwardAndPo = async (quoteId: number) => {
    try {
      await convertToPo.mutateAsync({ id: currentRfq.id, quotationId: quoteId });
      toast({
        title: "Vendor Awarded & PO Created!",
        description: `Purchase Order generated and sent to vendor. RFQ status updated to Awarded.`,
      });
      onOpenChange(false);
      onRefresh?.();
    } catch (err: any) {
      toast({ title: "Failed to generate PO", description: err.message, variant: "destructive" });
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <DialogTitle className="flex items-center gap-2">
                  Quotation Comparative Statement (CS)
                  <Badge variant="outline">{currentRfq?.title}</Badge>
                </DialogTitle>
                <DialogDescription>
                  Side-by-side vendor evaluation with lowest bid (L1) ranking. Award winning vendor to auto-generate PO.
                </DialogDescription>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 text-xs h-8 shrink-0 border-purple-300 dark:border-purple-800 hover:bg-purple-50 dark:hover:bg-purple-950/30"
                onClick={() => setAddQuoteOpen(true)}
              >
                <Plus className="w-3.5 h-3.5 text-purple-600" /> Record Vendor Quote
              </Button>
            </div>
          </DialogHeader>

          {quotes.length === 0 ? (
            <div className="py-10 text-center space-y-3 bg-muted/20 border border-dashed rounded-lg">
              <p className="text-muted-foreground text-sm">No quotations received yet for this RFQ.</p>
              <Button size="sm" onClick={() => setAddQuoteOpen(true)} className="gap-1.5 bg-purple-600 hover:bg-purple-700 text-white">
                <Plus className="w-3.5 h-3.5" /> Submit First Vendor Quote
              </Button>
            </div>
          ) : (
            <div className="rounded-md border overflow-hidden">
              <table className="w-full text-sm text-left">
                <thead className="bg-muted text-muted-foreground border-b text-xs uppercase">
                  <tr>
                    <th className="px-4 py-3">Vendor</th>
                    <th className="px-4 py-3">Rating</th>
                    <th className="px-4 py-3">Delivery Lead Time</th>
                    <th className="px-4 py-3 text-right">Landed Cost</th>
                    <th className="px-4 py-3 text-center">Rank</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {quotes.map((q: any, idx: number) => {
                    const isLowest = q.isL1 || idx === 0;
                    return (
                      <tr key={q.id} className={isLowest ? "bg-emerald-50/50 dark:bg-emerald-950/20" : ""}>
                        <td className="px-4 py-3 font-medium">
                          {q.vendorName}
                          {q.notes && <p className="text-xs text-muted-foreground mt-0.5">{q.notes}</p>}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1 text-amber-500">
                            <Star className="w-3.5 h-3.5 fill-current" />
                            <span className="font-semibold">{q.vendorRating ? q.vendorRating.toFixed(1) : "—"}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {q.deliveryDays} Days
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-bold">
                          ₹{Number(q.amount).toLocaleString("en-IN")}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {isLowest ? (
                            <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold">
                              L1 Lowest
                            </Badge>
                          ) : (
                            <Badge variant="outline">L{idx + 1}</Badge>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Button
                            size="sm"
                            variant={isLowest ? "default" : "outline"}
                            className="gap-1.5"
                            disabled={convertToPo.isPending}
                            onClick={() => handleAwardAndPo(q.id)}
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" /> Award & PO
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <DialogFooter className="flex justify-between items-center sm:justify-between">
            <span className="text-xs text-muted-foreground">
              Total Quotes: <strong>{quotes.length}</strong>
            </span>
            <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Record Vendor Quotation Modal */}
      <AddQuotationDialog
        rfq={currentRfq}
        open={addQuoteOpen}
        onOpenChange={setAddQuoteOpen}
        onSuccess={refreshQuotes}
      />
    </>
  );
}

// ============================================================================
// 3b. Add Vendor Quotation Dialog
// ============================================================================
export function AddQuotationDialog({
  rfq,
  open,
  onOpenChange,
  onSuccess,
}: {
  rfq: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}) {
  const { toast } = useToast();
  const { data: vendors } = useListVendors();
  const addQuotation = useAddQuotation();

  const [vendorId, setVendorId] = useState("");
  const [quoteQty, setQuoteQty] = useState("1");
  const [unitPrice, setUnitPrice] = useState("");
  const [taxAmount, setTaxAmount] = useState("");
  const [freightCharges, setFreightCharges] = useState("");
  const [amount, setAmount] = useState("");
  const [isManualAmount, setIsManualAmount] = useState(false);
  const [deliveryDays, setDeliveryDays] = useState("14");
  const [paymentTerms, setPaymentTerms] = useState("30 Days Net");
  const [notes, setNotes] = useState("");

  const q = Number(quoteQty) || 1;
  const up = Number(unitPrice) || 0;
  const tax = Number(taxAmount) || 0;
  const freight = Number(freightCharges) || 0;
  const baseTotal = q * up;
  const computedLanded = baseTotal + tax + freight;

  // Auto-sync landed total if user hasn't typed a custom override
  useEffect(() => {
    if (!isManualAmount && (up > 0 || tax > 0 || freight > 0)) {
      setAmount(computedLanded > 0 ? String(computedLanded) : "");
    }
  }, [quoteQty, unitPrice, taxAmount, freightCharges, computedLanded, isManualAmount, up, tax, freight]);

  const handleSubmit = async () => {
    const finalAmount = amount ? Number(amount) : computedLanded;
    if (!vendorId || !finalAmount) {
      toast({ title: "Incomplete details", description: "Vendor and landed total amount are required", variant: "destructive" });
      return;
    }

    try {
      await addQuotation.mutateAsync({
        rfqId: rfq.id,
        vendorId: Number(vendorId),
        amount: finalAmount,
        unitPrice: unitPrice ? Number(unitPrice) : undefined,
        taxAmount: taxAmount ? Number(taxAmount) : undefined,
        freightCharges: freightCharges ? Number(freightCharges) : undefined,
        deliveryDays: Number(deliveryDays || 14),
        paymentTerms,
        notes,
      });

      toast({
        title: "Quotation Recorded",
        description: `Vendor bid of ₹${finalAmount.toLocaleString("en-IN")} submitted to Comparative Statement.`,
      });
      onOpenChange(false);
      setAmount("");
      setUnitPrice("");
      setTaxAmount("");
      setFreightCharges("");
      setIsManualAmount(false);
      setNotes("");
      onSuccess?.();
    } catch (err: any) {
      toast({ title: "Failed to record quotation", description: err.message, variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5 text-purple-600" />
            Record Vendor Quotation
          </DialogTitle>
          <DialogDescription>
            Submit commercial bid for: <span className="font-semibold text-foreground">{rfq?.title}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3.5 py-2">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase text-muted-foreground">Select Vendor *</Label>
            <Select value={vendorId} onValueChange={setVendorId}>
              <SelectTrigger>
                <SelectValue placeholder="Select supplier / contractor" />
              </SelectTrigger>
              <SelectContent>
                {vendors?.filter((v: any) => v.status === "active").map((v: any) => (
                  <SelectItem key={v.id} value={String(v.id)}>
                    {v.name} ({v.category || "General"} | {v.rating ? `${v.rating}★` : "Unrated"})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase text-muted-foreground">Quantity Quoted</Label>
              <Input
                type="number"
                placeholder="Quantity"
                value={quoteQty}
                onChange={(e) => {
                  setQuoteQty(e.target.value);
                  setIsManualAmount(false);
                }}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase text-muted-foreground">Base Unit Price (₹)</Label>
              <Input
                type="number"
                placeholder="Rate per unit"
                value={unitPrice}
                onChange={(e) => {
                  setUnitPrice(e.target.value);
                  setIsManualAmount(false);
                }}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase text-muted-foreground">GST / Tax Amount (₹)</Label>
              <Input
                type="number"
                placeholder="e.g. 18% GST"
                value={taxAmount}
                onChange={(e) => {
                  setTaxAmount(e.target.value);
                  setIsManualAmount(false);
                }}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase text-muted-foreground">Freight & Logistics (₹)</Label>
              <Input
                type="number"
                placeholder="F.O.R / Transport"
                value={freightCharges}
                onChange={(e) => {
                  setFreightCharges(e.target.value);
                  setIsManualAmount(false);
                }}
              />
            </div>
          </div>

          {/* Dynamic Landed Cost Live Summary */}
          {(up > 0 || tax > 0 || freight > 0) && (
            <div className="p-3 rounded-lg bg-purple-50/60 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800 text-xs space-y-1.5">
              <div className="flex justify-between text-muted-foreground">
                <span>Base Subtotal ({q} × ₹{up.toLocaleString("en-IN")}):</span>
                <span className="font-mono font-medium text-foreground">₹{baseTotal.toLocaleString("en-IN")}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>GST / Taxes:</span>
                <span className="font-mono text-foreground">+ ₹{tax.toLocaleString("en-IN")}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Freight & Transport:</span>
                <span className="font-mono text-foreground">+ ₹{freight.toLocaleString("en-IN")}</span>
              </div>
              <div className="flex justify-between font-bold text-foreground pt-1.5 border-t border-purple-200 dark:border-purple-800 text-sm">
                <span className="text-purple-800 dark:text-purple-300 font-semibold">Total Landed Cost:</span>
                <span className="font-mono text-purple-700 dark:text-purple-300">₹{computedLanded.toLocaleString("en-IN")}</span>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <Label className="text-xs font-semibold uppercase text-muted-foreground">Landed Total (₹) *</Label>
                {isManualAmount && (
                  <button
                    type="button"
                    onClick={() => {
                      setAmount(String(computedLanded));
                      setIsManualAmount(false);
                    }}
                    className="text-[10px] text-primary hover:underline"
                  >
                    Reset to calculated
                  </button>
                )}
              </div>
              <Input
                type="number"
                placeholder="Total landed bid"
                value={amount}
                onChange={(e) => {
                  setAmount(e.target.value);
                  setIsManualAmount(true);
                }}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase text-muted-foreground">Lead Time (Days) *</Label>
              <Input
                type="number"
                placeholder="e.g. 14"
                value={deliveryDays}
                onChange={(e) => setDeliveryDays(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase text-muted-foreground">Payment Terms</Label>
            <Input
              placeholder="e.g. 30 Days Net / 50% Advance"
              value={paymentTerms}
              onChange={(e) => setPaymentTerms(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase text-muted-foreground">Scope Notes & Warranty</Label>
            <Textarea
              placeholder="Include warranty terms, accessories, freight F.O.R conditions..."
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            onClick={handleSubmit}
            disabled={addQuotation.isPending || (!amount && !computedLanded) || !vendorId}
            className="bg-purple-600 hover:bg-purple-700 text-white"
          >
            {addQuotation.isPending ? "Submitting..." : "Save Vendor Bid"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// 4. PO Tracking & Delivery Follow-up Dialog
// ============================================================================
export function PoTrackingDialog({
  po,
  open,
  onOpenChange,
}: {
  po: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { toast } = useToast();
  const trackPo = useTrackPo();
  const followUpPo = useFollowUpPo();

  const [trackingNumber, setTrackingNumber] = useState(po?.trackingNumber || "");
  const [transporterName, setTransporterName] = useState(po?.transporterName || "");
  const [followUpNotes, setFollowUpNotes] = useState("");

  const handleUpdateTracking = async () => {
    try {
      await trackPo.mutateAsync({
        id: po.id,
        trackingNumber,
        transporterName,
      });
      toast({ title: "Tracking Updated", description: "PO marked as In-Transit with courier details." });
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: "Update Failed", description: err.message, variant: "destructive" });
    }
  };

  const handleLogFollowUp = async () => {
    if (!followUpNotes.trim()) return;
    try {
      await followUpPo.mutateAsync({
        id: po.id,
        notes: followUpNotes,
      });
      toast({ title: "Follow-up Logged", description: "Vendor contact and notes recorded." });
      setFollowUpNotes("");
    } catch (err: any) {
      toast({ title: "Failed", description: err.message, variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Truck className="w-5 h-5 text-indigo-500" />
            Track Delivery: {po?.poNumber}
          </DialogTitle>
          <DialogDescription>
            Vendor: {po?.vendorName} | Destination: {po?.projectName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase text-muted-foreground">Transporter Name</Label>
              <Input
                placeholder="e.g. VRL Logistics / BlueDart"
                value={transporterName}
                onChange={(e) => setTransporterName(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase text-muted-foreground">LR / Docket Number</Label>
              <Input
                placeholder="e.g. LR-9823411"
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
              />
            </div>
          </div>

          <div className="border-t pt-3 space-y-2">
            <div className="flex justify-between items-center">
              <Label className="text-xs font-semibold uppercase text-muted-foreground">Vendor Follow-up Log</Label>
              <span className="text-xs text-muted-foreground">Attempts: {po?.followUpCount || 0}</span>
            </div>
            {po?.followUpNotes && (
              <div className="bg-muted/40 p-2.5 rounded text-xs whitespace-pre-wrap max-h-24 overflow-y-auto text-muted-foreground">
                {po.followUpNotes}
              </div>
            )}
            <div className="flex gap-2">
              <Input
                placeholder="Log follow-up note (e.g. Called dispatch manager, truck left yard)..."
                value={followUpNotes}
                onChange={(e) => setFollowUpNotes(e.target.value)}
                className="text-xs"
              />
              <Button size="sm" variant="secondary" onClick={handleLogFollowUp} disabled={followUpPo.isPending}>
                Log
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleUpdateTracking} disabled={trackPo.isPending}>
            Save Tracking Info
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// 5. Goods Receipt & Quality Inspection Dialog (GRN)
// ============================================================================
export function PoInspectionDialog({
  po,
  open,
  onOpenChange,
}: {
  po: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { toast } = useToast();
  const inspectPo = useInspectPo();

  const [passed, setPassed] = useState<boolean>(true);
  const [quantityReceived, setQuantityReceived] = useState("100");
  const [notes, setNotes] = useState("");

  const handleInspect = async () => {
    try {
      await inspectPo.mutateAsync({
        id: po.id,
        passed,
        notes,
        quantityReceived: Number(quantityReceived || 1),
      });

      if (passed) {
        toast({
          title: "Quality Passed & GRN Issued!",
          description: `Stock credited to ${po.projectName} and project budget actuals synchronized.`,
        });
      } else {
        toast({
          title: "Quality Rejected",
          description: "Material marked for return to vendor. Replacement RFQ can now be issued.",
          variant: "destructive",
        });
      }
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: "Inspection submission failed", description: err.message, variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-500" />
            Quality Inspection: {po?.poNumber}
          </DialogTitle>
          <DialogDescription>
            Inspect delivered goods against specifications and bill of quantities.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase text-muted-foreground">Quality Decision</Label>
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant={passed ? "default" : "outline"}
                className={passed ? "bg-emerald-600 hover:bg-emerald-700 text-white" : ""}
                onClick={() => setPassed(true)}
              >
                <CheckCircle2 className="w-4 h-4 mr-1.5" /> Quality OK (Pass)
              </Button>
              <Button
                type="button"
                variant={!passed ? "destructive" : "outline"}
                onClick={() => setPassed(false)}
              >
                <XCircle className="w-4 h-4 mr-1.5" /> Reject & Return
              </Button>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase text-muted-foreground">Accepted Quantity</Label>
            <Input
              type="number"
              placeholder="Quantity verified on site"
              value={quantityReceived}
              onChange={(e) => setQuantityReceived(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase text-muted-foreground">
              {passed ? "Inspection Checklist Remarks" : "Defect / Non-Compliance Reason"}
            </Label>
            <Textarea
              placeholder={passed ? "Physical dimensions, batch certificate, and test reports verified." : "Explain why material was rejected (e.g. cracks, off-spec dimensions, damaged packaging)..."}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>

          {passed ? (
            <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 p-3 rounded-md text-xs space-y-1 text-emerald-800 dark:text-emerald-300">
              <p className="font-semibold">Automated Sync on Confirmation:</p>
              <ul className="list-disc list-inside space-y-0.5">
                <li>Issues Goods Receipt Note (GRN)</li>
                <li>Credits <strong>+{quantityReceived || 0} units</strong> to {po?.projectName} Inventory</li>
                <li>Updates Project Budget actuals by <strong>₹{Number(po?.totalAmount || 0).toLocaleString("en-IN")}</strong></li>
                <li>Marks Requisition as <strong>Fulfilled</strong></li>
              </ul>
            </div>
          ) : (
            <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 p-3 rounded-md text-xs text-red-800 dark:text-red-300">
              <p className="font-semibold">Rejection Protocol:</p>
              <p>Material marked for return to vendor. Prompts replacement RFQ initiation.</p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            variant={passed ? "default" : "destructive"}
            onClick={handleInspect}
            disabled={inspectPo.isPending}
          >
            {inspectPo.isPending ? "Submitting..." : passed ? "Approve & Credit Inventory" : "Confirm Rejection"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// 6. Log Site Consumption Dialog
// ============================================================================
export function LogConsumptionDialog({
  material,
  open,
  onOpenChange,
}: {
  material: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { toast } = useToast();
  const consume = useConsumeMaterial();
  const [quantity, setQuantity] = useState("");
  const [notes, setNotes] = useState("");

  const handleConsume = async () => {
    if (!quantity || Number(quantity) <= 0) return;
    try {
      await consume.mutateAsync({
        id: material.id,
        quantity: Number(quantity),
        notes,
      });
      toast({
        title: "Consumption Logged",
        description: `Deducted ${quantity} ${material.unit} of "${material.name}" from site stock.`,
      });
      onOpenChange(false);
      setQuantity("");
      setNotes("");
    } catch (err: any) {
      toast({ title: "Failed", description: err.message, variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>Log Material Consumption</DialogTitle>
          <DialogDescription>
            Record material used on site for {material?.name} ({material?.projectName || "Central"}).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="bg-muted/40 p-2.5 rounded text-xs flex justify-between">
            <span className="text-muted-foreground">Currently on hand:</span>
            <span className="font-bold">{material?.quantityOnHand} {material?.unit}</span>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase text-muted-foreground">Consumed Quantity ({material?.unit})</Label>
            <Input
              type="number"
              placeholder="0"
              max={material?.quantityOnHand}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase text-muted-foreground">Task / Purpose Notes</Label>
            <Textarea
              placeholder="e.g. Ground floor masonry plastering completed"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleConsume} disabled={consume.isPending || !quantity}>
            {consume.isPending ? "Logging..." : "Confirm Consumption"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

