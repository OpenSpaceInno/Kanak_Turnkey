import { useState, useEffect, type ReactNode } from "react";
import { format } from "date-fns";
import {
  FileText,
  CheckCircle2,
  AlertCircle,
  Clock,
  Send,
  DollarSign,
  Building2,
  Receipt,
  Plus,
  RefreshCw,
  CreditCard,
  Package,
  Layers,
  ArrowRight,
  ShieldCheck,
  BellRing,
  Calendar,
} from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  useListProjects,
  useListVendors,
  useListPurchaseOrders,
} from "@workspace/api-client-react";
import {
  useCreateRaBill,
  useVerifyRaBill,
  useSubmitRaBill,
  useApproveRaBill,
  useRequestRevisionRaBill,
  useGenerateInvoiceFromRa,
  useSendInvoice,
  useSendInvoiceReminder,
  useRecordClientPayment,
  useReconcileInvoice,
  useCloseInvoice,
  useCreateVendorInvoiceCustom,
  useMatchVendorInvoice,
  useRaiseVendorDiscrepancy,
  useResolveVendorDiscrepancy,
  useApproveVendorInvoice,
  useScheduleVendorPayment,
  useProcessVendorPayment,
  useCreateQuickExpenseVoucher,
  useApproveExpense,
  useSettleExpense,
  useReplenishSiteFloat,
  type RaBill,
  type ClientInvoice,
  type VendorInvoice,
  type SiteExpense,
} from "@/hooks/use-finance-flow";

function formatINR(val: number | string | null | undefined): string {
  const n = Number(val || 0);
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);
}

// ============================================================================
// 1. Prepare & Submit RA Bill Dialog (Track 1 AR)
// ============================================================================
export function PrepareRaBillDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { toast } = useToast();
  const { data: projects } = useListProjects();
  const createRa = useCreateRaBill();

  const [projectId, setProjectId] = useState<string>("");
  const [milestone, setMilestone] = useState("50% Structural RCC Slab Completed");
  const [description, setDescription] = useState("Running bill for Tower 2 Floor 3 RCC cast and masonry.");
  const [workPercent, setWorkPercent] = useState("50");
  const [grossAmount, setGrossAmount] = useState("2500000");
  const [retentionPercent, setRetentionPercent] = useState("5");
  const [advanceDeduction, setAdvanceDeduction] = useState("100000");
  const [docsUrl, setDocsUrl] = useState("JMS_Measurement_Tower2_F3.pdf, QualityTest_Cube7Day.pdf");

  const gross = Number(grossAmount || 0);
  const retP = Number(retentionPercent || 0);
  const retAmt = (gross * retP) / 100;
  const adv = Number(advanceDeduction || 0);
  const netBillable = Math.max(0, gross - retAmt - adv);

  const handleSubmit = async () => {
    if (!projectId || gross <= 0) {
      toast({
        title: "Validation Error",
        description: "Please select a project and enter gross amount.",
        variant: "destructive",
      });
      return;
    }
    try {
      await createRa.mutateAsync({
        projectId: Number(projectId),
        milestone,
        description,
        workCompletionPercent: Number(workPercent),
        grossAmount: gross,
        retentionPercent: retP,
        retentionAmount: retAmt,
        advanceDeduction: adv,
        netBillableAmount: netBillable,
        supportingDocsUrl: docsUrl,
        status: "submitted",
      });
      toast({
        title: "RA Bill Prepared & Submitted",
        description: `Running Account Bill for ${formatINR(netBillable)} submitted for PM approval.`,
      });
      onOpenChange(false);
    } catch (err: any) {
      toast({
        title: "Submission Failed",
        description: err.message,
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-indigo-500" />
            Prepare Running Account (RA) Bill
          </DialogTitle>
          <DialogDescription>
            Record joint work measurements, calculate deductions, and submit for PM certification.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2 text-sm">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase text-muted-foreground">Project</Label>
            <Select value={projectId} onValueChange={setProjectId}>
              <SelectTrigger>
                <SelectValue placeholder="Select active project..." />
              </SelectTrigger>
              <SelectContent>
                {projects?.map((p) => (
                  <SelectItem key={p.id} value={String(p.id)}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase text-muted-foreground">Milestone Reference</Label>
              <Input
                value={milestone}
                onChange={(e) => setMilestone(e.target.value)}
                placeholder="e.g. 50% RCC Slab"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase text-muted-foreground">Work Completion %</Label>
              <Input
                type="number"
                value={workPercent}
                onChange={(e) => setWorkPercent(e.target.value)}
                placeholder="50"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase text-muted-foreground">Gross Measured (₹)</Label>
              <Input
                type="number"
                value={grossAmount}
                onChange={(e) => setGrossAmount(e.target.value)}
                placeholder="2500000"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase text-muted-foreground">Retention %</Label>
              <Input
                type="number"
                value={retentionPercent}
                onChange={(e) => setRetentionPercent(e.target.value)}
                placeholder="5"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase text-muted-foreground">Advance Recovery (₹)</Label>
              <Input
                type="number"
                value={advanceDeduction}
                onChange={(e) => setAdvanceDeduction(e.target.value)}
                placeholder="100000"
              />
            </div>
          </div>

          {/* Dynamic Deduction Breakdown Card */}
          <div className="p-3 rounded-lg border bg-muted/40 space-y-1.5 text-xs">
            <div className="flex justify-between text-muted-foreground">
              <span>Gross Measured Value:</span>
              <span className="font-mono font-medium">{formatINR(gross)}</span>
            </div>
            <div className="flex justify-between text-amber-600">
              <span>Less: Retention Deduction ({retP}%):</span>
              <span className="font-mono font-medium">-{formatINR(retAmt)}</span>
            </div>
            <div className="flex justify-between text-amber-600">
              <span>Less: Mobilization Advance Recovery:</span>
              <span className="font-mono font-medium">-{formatINR(adv)}</span>
            </div>
            <div className="pt-1.5 border-t flex justify-between font-semibold text-sm text-foreground">
              <span>Net Certified Billable Amount:</span>
              <span className="font-mono text-emerald-600">{formatINR(netBillable)}</span>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase text-muted-foreground">Supporting Docs / Measurement Sheets</Label>
            <Input
              value={docsUrl}
              onChange={(e) => setDocsUrl(e.target.value)}
              placeholder="e.g. JMS_Sheet_F3.pdf, CubeTestReport.pdf"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase text-muted-foreground">Description & Remarks</Label>
            <Textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Work items covered, floor level, grid lines..."
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={createRa.isPending}>
            {createRa.isPending ? "Submitting..." : "Submit RA Bill"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// 2. Review RA Bill Dialog: PM Approval / Request Revisions (Track 1)
// ============================================================================
export function ReviewRaBillDialog({
  bill,
  open,
  onOpenChange,
}: {
  bill: RaBill | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { toast } = useToast();
  const approveRa = useApproveRaBill();
  const submitRa = useSubmitRaBill();
  const requestRevision = useRequestRevisionRaBill();
  const generateInvoice = useGenerateInvoiceFromRa();

  const [remarks, setRemarks] = useState("");
  const [showRevisionInput, setShowRevisionInput] = useState(false);

  if (!bill) return null;

  const handleSubmitForApproval = async () => {
    try {
      await submitRa.mutateAsync(bill.id);
      toast({
        title: "Submitted for PM Approval",
        description: `${bill.billNumber} measurements certified and submitted for project manager review.`,
      });
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: "Submission failed", description: err.message, variant: "destructive" });
    }
  };

  const handleApprove = async () => {
    try {
      await approveRa.mutateAsync(bill.id);
      toast({
        title: "RA Bill Approved!",
        description: `${bill.billNumber} approved by Project Manager. Ready for Tax Invoice generation.`,
      });
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: "Approval failed", description: err.message, variant: "destructive" });
    }
  };

  const handleRequestRevision = async () => {
    if (!remarks.trim()) {
      toast({
        title: "Remarks Required",
        description: "Please provide revision remarks for the site engineer.",
        variant: "destructive",
      });
      return;
    }
    try {
      await requestRevision.mutateAsync({ id: bill.id, remarks });
      toast({
        title: "Revision Requested",
        description: `Feedback logged. RA bill sent back to site team.`,
      });
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: "Failed", description: err.message, variant: "destructive" });
    }
  };

  const handleGenerateInvoice = async () => {
    try {
      await generateInvoice.mutateAsync({ id: bill.id });
      toast({
        title: "Tax Invoice Generated!",
        description: `Official Tax Invoice generated for ${formatINR(bill.netBillableAmount || bill.amount)} (+18% GST).`,
      });
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: "Generation failed", description: err.message, variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-indigo-500" />
            Review RA Bill: {bill.billNumber}
          </DialogTitle>
          <DialogDescription>
            {bill.projectName} • {bill.milestone || "Progress Milestone"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2 text-sm">
          <div className="grid grid-cols-2 gap-3 p-3 rounded-lg border bg-card">
            <div>
              <span className="text-xs text-muted-foreground uppercase font-semibold">Gross Measured</span>
              <p className="font-mono font-medium text-base">{formatINR(bill.grossAmount || bill.amount)}</p>
            </div>
            <div>
              <span className="text-xs text-muted-foreground uppercase font-semibold">Net Certified</span>
              <p className="font-mono font-bold text-base text-emerald-600">
                {formatINR(bill.netBillableAmount || bill.amount)}
              </p>
            </div>
            <div>
              <span className="text-xs text-muted-foreground uppercase font-semibold">Retention ({bill.retentionPercent}%)</span>
              <p className="font-mono text-amber-600">-{formatINR(bill.retentionAmount)}</p>
            </div>
            <div>
              <span className="text-xs text-muted-foreground uppercase font-semibold">Advance Recovery</span>
              <p className="font-mono text-amber-600">-{formatINR(bill.advanceDeduction)}</p>
            </div>
          </div>

          {bill.supportingDocsUrl && (
            <div className="p-2.5 rounded border bg-muted/40 text-xs">
              <span className="font-semibold text-muted-foreground">Attached Documents: </span>
              <span className="font-mono">{bill.supportingDocsUrl}</span>
            </div>
          )}

          {bill.revisionRemarks && (
            <div className="p-2.5 rounded border border-rose-500/20 bg-rose-500/10 text-xs text-rose-700 dark:text-rose-300">
              <span className="font-semibold">Previous Revision Remarks: </span>
              <span>{bill.revisionRemarks}</span>
            </div>
          )}

          {showRevisionInput ? (
            <div className="space-y-2 pt-2 border-t">
              <Label className="text-xs font-semibold uppercase text-rose-600">Revision Remarks for Site Team</Label>
              <Textarea
                rows={3}
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Specify required corrections in measurement or deductions..."
              />
              <div className="flex justify-end gap-2">
                <Button size="sm" variant="ghost" onClick={() => setShowRevisionInput(false)}>
                  Cancel
                </Button>
                <Button size="sm" variant="destructive" onClick={handleRequestRevision}>
                  Submit Revision Request
                </Button>
              </div>
            </div>
          ) : null}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          {!showRevisionInput && (
            <>
              {(bill.status === "draft" || bill.status === "revision_requested") && (
                <Button onClick={handleSubmitForApproval} className="bg-blue-600 hover:bg-blue-700 text-white">
                  <Send className="w-4 h-4 mr-1.5" />
                  {bill.status === "revision_requested" ? "Re-Submit Revised Bill" : "Verify & Submit to PM"}
                </Button>
              )}
              {bill.status !== "approved" && bill.status !== "invoiced" && bill.status !== "draft" && (
                <Button
                  variant="outline"
                  className="text-rose-600 hover:text-rose-700"
                  onClick={() => setShowRevisionInput(true)}
                >
                  Request Revisions
                </Button>
              )}
              {bill.status === "submitted" || bill.status === "verified" ? (
                <Button onClick={handleApprove} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                  <CheckCircle2 className="w-4 h-4 mr-1.5" /> Approve RA Bill
                </Button>
              ) : null}
              {bill.status === "approved" ? (
                <Button onClick={handleGenerateInvoice} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                  <FileText className="w-4 h-4 mr-1.5" /> Generate Tax Invoice
                </Button>
              ) : null}
              {bill.status === "invoiced" && (
                <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 py-1.5 px-3 text-xs flex items-center gap-1.5 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Tax Invoice Generated
                </Badge>
              )}
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// 3. Client Payment & Reminder Dialog (Track 1 AR)
// ============================================================================
export function ClientInvoiceActionDialog({
  invoice,
  open,
  onOpenChange,
}: {
  invoice: ClientInvoice | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { toast } = useToast();
  const sendInvoice = useSendInvoice();
  const sendReminder = useSendInvoiceReminder();
  const recordPayment = useRecordClientPayment();
  const reconcileInvoice = useReconcileInvoice();
  const closeInvoice = useCloseInvoice();

  const [activeTab, setActiveTab] = useState<"reminder" | "payment" | "reconcile">("payment");
  const [reminderNote, setReminderNote] = useState("");
  const [utr, setUtr] = useState(`UTR-HDFC-${Date.now().toString().slice(-6)}`);
  const [tds, setTds] = useState(
    invoice ? String(Math.round((invoice.totalWithTax || invoice.amount) * 0.02)) : "0"
  );
  const [netReceived, setNetReceived] = useState(
    invoice ? String(Math.round((invoice.totalWithTax || invoice.amount) * 0.98)) : "0"
  );

  useEffect(() => {
    if (invoice) {
      const total = Number(invoice.totalWithTax || invoice.amount || 0);
      const tdsVal = Math.round(total * 0.02);
      setTds(String(tdsVal));
      setNetReceived(String(Math.max(0, total - tdsVal)));
      setUtr(`UTR-HDFC-${Date.now().toString().slice(-6)}`);
      setReminderNote("");
      if (invoice.status === "paid" || invoice.status === "reconciled") {
        setActiveTab("reconcile");
      } else if (invoice.status === "overdue" && invoice.paymentRemindersCount > 0) {
        setActiveTab("reminder");
      } else {
        setActiveTab("payment");
      }
    }
  }, [invoice]);

  if (!invoice) return null;

  const totalDue = Number(invoice.totalWithTax || invoice.amount);

  const handleSend = async () => {
    try {
      await sendInvoice.mutateAsync(invoice.id);
      toast({ title: "Invoice Dispatched", description: `${invoice.invoiceNumber} marked as Sent to client.` });
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: "Failed", description: err.message, variant: "destructive" });
    }
  };

  const handleSendReminder = async () => {
    try {
      await sendReminder.mutateAsync({ id: invoice.id, notes: reminderNote });
      toast({
        title: "Payment Reminder Sent",
        description: `Reminder recorded for ${invoice.invoiceNumber} (Total Sent: ${invoice.paymentRemindersCount + 1}).`,
      });
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: "Failed", description: err.message, variant: "destructive" });
    }
  };

  const handleRecordPayment = async () => {
    try {
      await recordPayment.mutateAsync({
        id: invoice.id,
        paymentReference: utr,
        tdsAmount: Number(tds),
        netReceivedAmount: Number(netReceived),
      });
      toast({
        title: "Payment Recorded!",
        description: `Receipt of ${formatINR(netReceived)} (+${formatINR(tds)} TDS) credited to accounts.`,
      });
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: "Recording failed", description: err.message, variant: "destructive" });
    }
  };

  const handleReconcile = async () => {
    try {
      await reconcileInvoice.mutateAsync(invoice.id);
      toast({ title: "Reconciled with Bank", description: `${invoice.invoiceNumber} matched against bank statements.` });
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: "Failed", description: err.message, variant: "destructive" });
    }
  };

  const handleClose = async () => {
    try {
      await closeInvoice.mutateAsync(invoice.id);
      toast({ title: "Invoice Closed", description: `${invoice.invoiceNumber} successfully closed and sealed.` });
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: "Failed", description: err.message, variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="w-5 h-5 text-emerald-500" />
            Invoice Actions: {invoice.invoiceNumber}
          </DialogTitle>
          <DialogDescription>
            {invoice.clientName} • Total Value: {formatINR(totalDue)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2 text-sm">
          {/* Status summary pill */}
          <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
            <div>
              <span className="text-xs text-muted-foreground uppercase font-semibold">Due Date</span>
              <p className="font-mono font-medium">{format(new Date(invoice.dueDate), "MMM d, yyyy")}</p>
            </div>
            <div>
              <span className="text-xs text-muted-foreground uppercase font-semibold">Reminders</span>
              <p className="font-mono font-bold text-amber-600">{invoice.paymentRemindersCount} notices</p>
            </div>
            <div>
              <span className="text-xs text-muted-foreground uppercase font-semibold">Status</span>
              <div>
                <Badge variant={invoice.status === "paid" || invoice.status === "closed" ? "default" : "outline"}>
                  {invoice.status}
                </Badge>
              </div>
            </div>
          </div>

          {invoice.status === "draft" && (
            <div className="p-4 rounded-lg border border-dashed text-center space-y-2">
              <p className="text-muted-foreground text-xs">This tax invoice is currently in draft status.</p>
              <Button onClick={handleSend} className="gap-2">
                <Send className="w-4 h-4" /> Send Invoice to Client
              </Button>
            </div>
          )}

          {invoice.status !== "draft" && invoice.status !== "closed" && (
            <div className="space-y-3">
              <div className="flex border-b text-xs font-semibold">
                <button
                  type="button"
                  className={`pb-2 px-3 ${activeTab === "payment" ? "border-b-2 border-emerald-500 text-emerald-600" : "text-muted-foreground"}`}
                  onClick={() => setActiveTab("payment")}
                >
                  Record Payment
                </button>
                <button
                  type="button"
                  className={`pb-2 px-3 ${activeTab === "reminder" ? "border-b-2 border-amber-500 text-amber-600" : "text-muted-foreground"}`}
                  onClick={() => setActiveTab("reminder")}
                >
                  Send Reminder
                </button>
                {invoice.status === "paid" && (
                  <button
                    type="button"
                    className={`pb-2 px-3 ${activeTab === "reconcile" ? "border-b-2 border-indigo-500 text-indigo-600" : "text-muted-foreground"}`}
                    onClick={() => setActiveTab("reconcile")}
                  >
                    Reconcile & Close
                  </button>
                )}
              </div>

              {activeTab === "payment" && (
                <div className="space-y-3 pt-1">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold uppercase text-muted-foreground">TDS Deducted (Sec 194C)</Label>
                      <Input value={tds} onChange={(e) => setTds(e.target.value)} placeholder="TDS amount" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold uppercase text-muted-foreground">Net Bank Credit (₹)</Label>
                      <Input value={netReceived} onChange={(e) => setNetReceived(e.target.value)} placeholder="Net amount" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold uppercase text-muted-foreground">Bank UTR / Cheque Reference</Label>
                    <Input value={utr} onChange={(e) => setUtr(e.target.value)} placeholder="UTR-XXX-12345" />
                  </div>
                  <Button onClick={handleRecordPayment} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white">
                    <CheckCircle2 className="w-4 h-4 mr-1.5" /> Confirm Payment Receipt
                  </Button>
                </div>
              )}

              {activeTab === "reminder" && (
                <div className="space-y-3 pt-1">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold uppercase text-muted-foreground">Reminder Remarks / Log</Label>
                    <Textarea
                      rows={2}
                      value={reminderNote}
                      onChange={(e) => setReminderNote(e.target.value)}
                      placeholder="e.g. Sent reminder notice via email to client accounts payable team..."
                    />
                  </div>
                  <Button onClick={handleSendReminder} variant="outline" className="w-full text-amber-600 border-amber-500/30">
                    <BellRing className="w-4 h-4 mr-1.5" /> Send & Record Payment Reminder
                  </Button>
                </div>
              )}

              {activeTab === "reconcile" && (
                <div className="space-y-3 pt-1 text-center">
                  <p className="text-xs text-muted-foreground">
                    Match client remittance against the bank credit statement and close out this invoice.
                  </p>
                  <div className="flex gap-2">
                    <Button onClick={handleReconcile} variant="outline" className="flex-1">
                      Reconcile with Accounting
                    </Button>
                    <Button onClick={handleClose} className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white">
                      Close Invoice
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Dismiss
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// 4. Vendor Invoice 3-Way Matching Dialog (Track 2 AP)
// ============================================================================
export function VendorInvoiceMatchDialog({
  invoice,
  open,
  onOpenChange,
}: {
  invoice: VendorInvoice | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { toast } = useToast();
  const matchInvoice = useMatchVendorInvoice();
  const raiseDiscrepancy = useRaiseVendorDiscrepancy();
  const resolveDiscrepancy = useResolveVendorDiscrepancy();
  const approveInvoice = useApproveVendorInvoice();
  const schedulePayment = useScheduleVendorPayment();
  const processPayment = useProcessVendorPayment();

  const [discrepancyNote, setDiscrepancyNote] = useState("");
  const [discrepancyType, setDiscrepancyType] = useState("price_variance");
  const [resolutionType, setResolutionType] = useState("Credit Note Received");
  const [creditNoteNumber, setCreditNoteNumber] = useState("");
  const [adjustedAmount, setAdjustedAmount] = useState("");
  const [resolutionNote, setResolutionNote] = useState("");
  const [paymentMode, setPaymentMode] = useState("neft");
  const [disbursedAmount, setDisbursedAmount] = useState("");
  const [scheduleDate, setScheduleDate] = useState(
    new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0]
  );
  const [utr, setUtr] = useState(`UTR-CORP-${Date.now().toString().slice(-6)}`);
  const [showDiscrepancyInput, setShowDiscrepancyInput] = useState(false);
  const [showResolutionInput, setShowResolutionInput] = useState(false);
  const [showScheduleInput, setShowScheduleInput] = useState(false);
  const [showDisburseInput, setShowDisburseInput] = useState(false);

  useEffect(() => {
    if (invoice) {
      setUtr(`UTR-CORP-${Date.now().toString().slice(-6)}`);
      setDisbursedAmount(String(invoice.paidAmount || invoice.amount || ""));
      setAdjustedAmount(String(invoice.poTotalAmount || invoice.poAmount || invoice.amount || ""));
      setShowDiscrepancyInput(false);
      setShowResolutionInput(false);
      setShowScheduleInput(false);
      setShowDisburseInput(false);
    }
  }, [invoice]);

  if (!invoice) return null;

  const invAmount = Number(invoice.amount || 0);
  const poAmount = Number(invoice.poTotalAmount || invoice.poAmount || 0);
  const diff = invAmount - poAmount;
  const isMatchOk = Math.abs(diff) <= 1 && invoice.poInspectionStatus === "passed";

  const handleMatch = async () => {
    try {
      await matchInvoice.mutateAsync(invoice.id);
      toast({ title: "3-Way Match Verified", description: "Evaluated against Purchase Order and GRN." });
    } catch (err: any) {
      toast({ title: "Match evaluation failed", description: err.message, variant: "destructive" });
    }
  };

  const handleRaiseDiscrepancy = async () => {
    try {
      await raiseDiscrepancy.mutateAsync({
        id: invoice.id,
        discrepancyType,
        notes: discrepancyNote || `Variance of ${formatINR(diff)} detected against PO.`,
      });
      toast({
        title: "Discrepancy Raised",
        description: "Invoice flagged and queued for vendor resolution.",
        variant: "destructive",
      });
      setShowDiscrepancyInput(false);
    } catch (err: any) {
      toast({ title: "Failed", description: err.message, variant: "destructive" });
    }
  };

  const handleResolveDiscrepancy = async () => {
    try {
      const notesCombined = [
        resolutionType,
        creditNoteNumber ? `(Credit Note: ${creditNoteNumber})` : null,
        resolutionNote ? `— ${resolutionNote}` : null,
      ]
        .filter(Boolean)
        .join(" ");

      await resolveDiscrepancy.mutateAsync({
        id: invoice.id,
        resolutionNotes: notesCombined || "Approved following vendor rate reconciliation.",
        adjustedAmount: adjustedAmount ? Number(adjustedAmount) : undefined,
      });
      toast({
        title: "Discrepancy Resolved",
        description: adjustedAmount
          ? `Settled at ${formatINR(adjustedAmount)}. Ready for payment approval.`
          : "Invoice discrepancy cleared and marked as matched.",
      });
      setShowResolutionInput(false);
    } catch (err: any) {
      toast({ title: "Failed", description: err.message, variant: "destructive" });
    }
  };

  const handleApprove = async () => {
    try {
      await approveInvoice.mutateAsync(invoice.id);
      toast({ title: "Approved for Payment", description: "Vendor invoice is cleared for treasury disbursement." });
    } catch (err: any) {
      toast({ title: "Approval failed", description: err.message, variant: "destructive" });
    }
  };

  const handleSchedule = async () => {
    try {
      await schedulePayment.mutateAsync({ id: invoice.id, scheduledPaymentDate: scheduleDate });
      toast({ title: "Payment Scheduled", description: `Disbursement batch scheduled for ${scheduleDate}.` });
      setShowScheduleInput(false);
    } catch (err: any) {
      toast({ title: "Failed", description: err.message, variant: "destructive" });
    }
  };

  const handleDisburse = async () => {
    const finalAmount = Number(disbursedAmount || invAmount);
    try {
      await processPayment.mutateAsync({
        id: invoice.id,
        paidAmount: finalAmount,
        paymentReference: utr,
        paymentMode,
      });
      toast({
        title: "Payment Disbursed!",
        description: `Disbursed ${formatINR(finalAmount)} to ${invoice.vendorName}. Project cost actuals updated.`,
      });
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: "Disbursement failed", description: err.message, variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-indigo-500" />
            3-Way PO Matching: {invoice.invoiceNumber}
          </DialogTitle>
          <DialogDescription>
            {invoice.vendorName} • {invoice.projectName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2 text-sm">
          {/* 3-Way Match Visualizer Grid */}
          <div className="grid grid-cols-3 gap-2.5 p-3 rounded-lg border bg-muted/40 text-xs">
            <div className="space-y-1">
              <span className="font-semibold text-muted-foreground uppercase">1. Vendor Bill</span>
              <p className="font-mono font-bold text-sm">{formatINR(invAmount)}</p>
              <p className="text-[11px] text-muted-foreground">{invoice.invoiceNumber}</p>
            </div>
            <div className="space-y-1 border-x px-2.5">
              <span className="font-semibold text-muted-foreground uppercase">2. Purchase Order</span>
              <p className="font-mono font-bold text-sm">{poAmount > 0 ? formatINR(poAmount) : "No PO"}</p>
              <p className="text-[11px] text-muted-foreground">{invoice.poNumber || "Direct Bill"}</p>
            </div>
            <div className="space-y-1">
              <span className="font-semibold text-muted-foreground uppercase">3. Goods Receipt</span>
              <div>
                <Badge
                  variant={invoice.poInspectionStatus === "passed" ? "default" : "secondary"}
                  className="text-[10px]"
                >
                  {invoice.poInspectionStatus === "passed" ? "QC Passed" : invoice.poInspectionStatus || "Pending"}
                </Badge>
              </div>
              <p className="text-[11px] text-muted-foreground font-mono">{invoice.poGrnNumber || "Awaiting GRN"}</p>
            </div>
          </div>

          {/* Status & Variance Banners */}
          {invoice.status === "paid" && (
            <div className="p-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 flex items-start gap-2.5 text-xs text-emerald-800 dark:text-emerald-300">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold">Disbursed & Settled: </span>
                Payment of <span className="font-mono font-bold">{formatINR(invoice.paidAmount || invAmount)}</span> processed via <span className="uppercase font-semibold">{invoice.paymentMode || "NEFT"}</span>{invoice.paymentDate ? ` on ${invoice.paymentDate}` : ""}.
                {invoice.paymentReference && <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">UTR / Transaction Ref: {invoice.paymentReference}</p>}
              </div>
            </div>
          )}

          {invoice.status === "scheduled" && (
            <div className="p-3 rounded-lg border border-amber-500/30 bg-amber-500/10 flex items-center gap-2 text-xs text-amber-800 dark:text-amber-300">
              <Clock className="w-4 h-4 shrink-0" />
              <span>Payment scheduled in treasury disbursement batch for <strong className="font-mono">{invoice.scheduledPaymentDate || "upcoming run"}</strong>.</span>
            </div>
          )}

          {invoice.status === "discrepancy" && (
            <div className="p-3 rounded-lg border border-rose-500/30 bg-rose-500/10 flex items-start gap-2.5 text-xs text-rose-800 dark:text-rose-300">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold">Discrepancy Flagged ({invoice.discrepancyType || "Variance"}): </span>
                {invoice.discrepancyNotes || `Variance of ${formatINR(Math.abs(diff))} detected against PO.`}
              </div>
            </div>
          )}

          {invoice.status === "received" && (
            <div className="p-3 rounded-lg border border-blue-500/20 bg-blue-500/5 flex items-center gap-2 text-xs text-blue-800 dark:text-blue-300">
              <Clock className="w-4 h-4 shrink-0" />
              <span>Vendor bill intake recorded. Click "Run 3-Way Match" to compare against PO amount and warehouse QC status.</span>
            </div>
          )}

          {(invoice.status === "matched" || invoice.status === "approved_for_payment") && isMatchOk && (
            <div className="p-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 flex items-center gap-2 text-xs text-emerald-800 dark:text-emerald-300">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>3-Way Match Verified! Billed amount matches PO total and goods inspection has passed.</span>
            </div>
          )}

          {invoice.resolutionNotes && invoice.status !== "discrepancy" && (
            <div className="p-2.5 rounded border border-emerald-500/20 bg-emerald-500/5 text-xs text-emerald-700 dark:text-emerald-300">
              <span className="font-semibold">Settlement / Resolution: </span>
              <span>{invoice.resolutionNotes}</span>
            </div>
          )}

          {/* Action sections */}
          {showDiscrepancyInput ? (
            <div className="space-y-3 pt-2 border-t">
              <Label className="text-xs font-semibold uppercase text-rose-600">Raise Discrepancy</Label>
              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground">Discrepancy Type</Label>
                <Select value={discrepancyType} onValueChange={setDiscrepancyType}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="price_variance">Rate / Price Variance</SelectItem>
                    <SelectItem value="quantity_shortage">Quantity Shortage</SelectItem>
                    <SelectItem value="unapproved_freight">Unapproved Freight / Extras</SelectItem>
                    <SelectItem value="inspection_pending">QC / Inspection Incomplete</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground">Discrepancy Remarks</Label>
                <Textarea
                  rows={2}
                  className="text-xs"
                  value={discrepancyNote}
                  onChange={(e) => setDiscrepancyNote(e.target.value)}
                  placeholder="Details of rate mismatch, quantity shortfall, or unapproved charges..."
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button size="sm" variant="ghost" onClick={() => setShowDiscrepancyInput(false)}>Cancel</Button>
                <Button size="sm" variant="destructive" onClick={handleRaiseDiscrepancy}>Confirm Discrepancy</Button>
              </div>
            </div>
          ) : showResolutionInput ? (
            <div className="space-y-3 pt-2 border-t">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold uppercase text-emerald-600">Resolve with Vendor</Label>
                <Badge variant="outline" className="text-[10px]">Vendor Resolution Loop</Badge>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground">Resolution Mechanism</Label>
                  <Select value={resolutionType} onValueChange={setResolutionType}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Credit Note Received">Credit Note Received</SelectItem>
                      <SelectItem value="Debit Note Issued to Vendor">Debit Note Issued to Vendor</SelectItem>
                      <SelectItem value="Shortage Deducted from Bill">Shortage Deducted from Bill</SelectItem>
                      <SelectItem value="Penalty / LD Deducted">Penalty / Liquidated Damages Deducted</SelectItem>
                      <SelectItem value="Revised Invoice Accepted">Revised Invoice Accepted</SelectItem>
                      <SelectItem value="Rate Approved by Commercial Head">Rate Approved by Commercial Head</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground">Credit Note / Settlement Ref</Label>
                  <Input
                    className="h-8 text-xs font-mono"
                    value={creditNoteNumber}
                    onChange={(e) => setCreditNoteNumber(e.target.value)}
                    placeholder="e.g. CN-POL-2026-042"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground">Adjusted Payable Amount (₹)</Label>
                <Input
                  className="h-8 text-xs font-mono"
                  value={adjustedAmount}
                  onChange={(e) => setAdjustedAmount(e.target.value)}
                  placeholder={String(poAmount || invAmount)}
                />
                <span className="text-[10px] text-muted-foreground">Adjust invoice value to settled amount (e.g. subtracting Credit Note).</span>
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground">Commercial Remarks</Label>
                <Textarea
                  rows={2}
                  className="text-xs"
                  value={resolutionNote}
                  onChange={(e) => setResolutionNote(e.target.value)}
                  placeholder="e.g. Vendor issued Credit Note CN-POL-2026-042 for ₹30,000 difference; accepted."
                />
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <Button size="sm" variant="ghost" onClick={() => setShowResolutionInput(false)}>Cancel</Button>
                <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={handleResolveDiscrepancy}>
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" /> Confirm Resolution & Re-Match
                </Button>
              </div>
            </div>
          ) : showScheduleInput ? (
            <div className="space-y-2 pt-2 border-t">
              <Label className="text-xs font-semibold uppercase text-muted-foreground">Select Disbursement Date</Label>
              <Input type="date" value={scheduleDate} onChange={(e) => setScheduleDate(e.target.value)} />
              <div className="flex justify-end gap-2">
                <Button size="sm" variant="ghost" onClick={() => setShowScheduleInput(false)}>Cancel</Button>
                <Button size="sm" className="bg-amber-600 hover:bg-amber-700 text-white" onClick={handleSchedule}>
                  Confirm Schedule
                </Button>
              </div>
            </div>
          ) : showDisburseInput ? (
            <div className="space-y-3 pt-2 border-t">
              <Label className="text-xs font-semibold uppercase text-emerald-600">Process Bank Disbursement</Label>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground">Payment Mode</Label>
                  <Select value={paymentMode} onValueChange={setPaymentMode}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="neft">NEFT Transfer</SelectItem>
                      <SelectItem value="rtgs">RTGS Fast Transfer</SelectItem>
                      <SelectItem value="cheque">Corporate Cheque</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground">Disbursed Amount (₹)</Label>
                  <Input
                    className="h-8 text-xs font-mono"
                    value={disbursedAmount}
                    onChange={(e) => setDisbursedAmount(e.target.value)}
                    placeholder={String(invAmount)}
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground">Bank UTR / Transaction Reference</Label>
                <Input className="h-8 text-xs font-mono" value={utr} onChange={(e) => setUtr(e.target.value)} placeholder="UTR-CORP-12345" />
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <Button size="sm" variant="ghost" onClick={() => setShowDisburseInput(false)}>Cancel</Button>
                <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={handleDisburse}>
                  <DollarSign className="w-3.5 h-3.5 mr-1" /> Execute Disbursement
                </Button>
              </div>
            </div>
          ) : null}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          {!showDiscrepancyInput && !showResolutionInput && !showScheduleInput && !showDisburseInput && (
            <>
              {invoice.status === "received" && (
                <>
                  <Button variant="outline" className="text-rose-600 hover:bg-rose-50" onClick={() => setShowDiscrepancyInput(true)}>
                    Raise Discrepancy
                  </Button>
                  <Button onClick={handleMatch} className="bg-blue-600 hover:bg-blue-700 text-white">
                    <Layers className="w-4 h-4 mr-1.5" /> Run 3-Way Match
                  </Button>
                </>
              )}

              {invoice.status === "discrepancy" && (
                <>
                  <Button variant="ghost" onClick={handleMatch} className="gap-1.5 text-xs text-muted-foreground">
                    <RefreshCw className="w-3.5 h-3.5" /> Re-Check Match
                  </Button>
                  <Button variant="outline" className="text-emerald-600 border-emerald-500/40 hover:bg-emerald-50" onClick={() => setShowResolutionInput(true)}>
                    Resolve with Vendor
                  </Button>
                </>
              )}

              {invoice.status === "matched" && (
                <>
                  <Button variant="outline" className="text-rose-600 hover:bg-rose-50" onClick={() => setShowDiscrepancyInput(true)}>
                    Raise Discrepancy
                  </Button>
                  <Button onClick={handleApprove} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                    <CheckCircle2 className="w-4 h-4 mr-1.5" /> Approve for Payment
                  </Button>
                </>
              )}

              {invoice.status === "approved_for_payment" && (
                <Button onClick={() => setShowScheduleInput(true)} className="bg-amber-600 hover:bg-amber-700 text-white">
                  <Calendar className="w-4 h-4 mr-1.5" /> Schedule Payment
                </Button>
              )}

              {invoice.status === "scheduled" && (
                <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => setShowDisburseInput(true)}>
                  <DollarSign className="w-4 h-4 mr-1.5" /> Disburse Payment
                </Button>
              )}

              {invoice.status === "paid" && (
                <Badge variant="default" className="bg-emerald-600 text-white py-1.5 px-3 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Disbursed & Reconciled
                </Badge>
              )}
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// 5. Site Petty Cash / Quick Field Expense Dialog (Track 3)
// ============================================================================
export function QuickFieldExpenseDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { toast } = useToast();
  const { data: projects } = useListProjects();
  const createExpense = useCreateQuickExpenseVoucher();

  const [projectId, setProjectId] = useState<string>("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("materials");
  const [paymentMode, setPaymentMode] = useState("petty_cash");
  const [vendorOrShop, setVendorOrShop] = useState("");
  const [billRef, setBillRef] = useState("");
  const [receiptUrl, setReceiptUrl] = useState("");
  const [isMaterial, setIsMaterial] = useState(false);
  const [materialName, setMaterialName] = useState("Cement — OPC 53 grade");
  const [materialQuantity, setMaterialQuantity] = useState("10");
  const [materialUnit, setMaterialUnit] = useState("bag");

  const handleSubmit = async () => {
    if (!projectId || !amount || !description) {
      toast({
        title: "Validation Error",
        description: "Please fill in project, amount, and description.",
        variant: "destructive",
      });
      return;
    }

    try {
      await createExpense.mutateAsync({
        projectId: Number(projectId),
        description,
        amount: Number(amount),
        category,
        paymentMode,
        vendorOrShopName: vendorOrShop,
        billReferenceNumber: billRef,
        receiptUrl: receiptUrl || "SiteCashMemo_" + Date.now() + ".jpg",
        materialName: isMaterial ? materialName : undefined,
        materialQuantity: isMaterial ? Number(materialQuantity) : undefined,
        materialUnit: isMaterial ? materialUnit : undefined,
      });

      toast({
        title: "Site Expense Recorded!",
        description: isMaterial
          ? `Voucher logged and ${materialQuantity} ${materialUnit} credited to site store!`
          : `Expense voucher of ${formatINR(amount)} logged for approval.`,
      });
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: "Failed", description: err.message, variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-amber-500" />
            Quick Site Expense / Cash Purchase
          </DialogTitle>
          <DialogDescription>
            Record immediate spot procurement or emergency field outlays from site petty cash or UPI.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3.5 py-2 text-sm">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase text-muted-foreground">Project Site</Label>
              <Select value={projectId} onValueChange={setProjectId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select site..." />
                </SelectTrigger>
                <SelectContent>
                  {projects?.map((p) => (
                    <SelectItem key={p.id} value={String(p.id)}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase text-muted-foreground">Amount Spent (₹)</Label>
              <Input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="e.g. 3800"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase text-muted-foreground">Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="materials">Emergency Materials</SelectItem>
                  <SelectItem value="fuel">Fuel / Generator Diesel</SelectItem>
                  <SelectItem value="labor">Daily Casual Labor</SelectItem>
                  <SelectItem value="transport">Local Transport / Crane</SelectItem>
                  <SelectItem value="tools">Minor Tools & Consumables</SelectItem>
                  <SelectItem value="refreshments">Site Refreshments / Sundry</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase text-muted-foreground">Paid Via</Label>
              <Select value={paymentMode} onValueChange={setPaymentMode}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="petty_cash">Site Petty Cash Float</SelectItem>
                  <SelectItem value="site_upi">Site UPI Handle</SelectItem>
                  <SelectItem value="personal_reimbursement">Personal Out-of-Pocket</SelectItem>
                  <SelectItem value="company_card">Company Debit Card</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase text-muted-foreground">Expense Description</Label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. 10 emergency bags OPC-53 cement for casting"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase text-muted-foreground">Local Shop / Vendor</Label>
              <Input
                value={vendorOrShop}
                onChange={(e) => setVendorOrShop(e.target.value)}
                placeholder="e.g. Shree Ganesh Hardware"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase text-muted-foreground">Cash Memo / Bill #</Label>
              <Input
                value={billRef}
                onChange={(e) => setBillRef(e.target.value)}
                placeholder="e.g. CM-8834"
              />
            </div>
          </div>

          {/* Automatic Inventory Credit Toggle */}
          <div className="p-3 rounded-lg border bg-muted/30 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-emerald-600" />
                <span className="text-xs font-semibold">Auto-Credit to Site Material Store?</span>
              </div>
              <input
                type="checkbox"
                checked={isMaterial}
                onChange={(e) => setIsMaterial(e.target.checked)}
                className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
              />
            </div>

            {isMaterial && (
              <div className="grid grid-cols-3 gap-2 pt-1 text-xs">
                <div className="col-span-2 space-y-1">
                  <Label className="text-[11px] text-muted-foreground">Material Name</Label>
                  <Input
                    className="h-8 text-xs"
                    value={materialName}
                    onChange={(e) => setMaterialName(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground">Qty ({materialUnit})</Label>
                  <Input
                    type="number"
                    className="h-8 text-xs"
                    value={materialQuantity}
                    onChange={(e) => setMaterialQuantity(e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={createExpense.isPending}>
            {createExpense.isPending ? "Submitting..." : "Record Expense"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// 6. Replenish Site Petty Cash Float Dialog (Track 3)
// ============================================================================
export function ReplenishSiteFloatDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { toast } = useToast();
  const { data: projects } = useListProjects();
  const replenish = useReplenishSiteFloat();

  const [projectId, setProjectId] = useState<string>("");
  const [amount, setAmount] = useState("50000");

  const handleReplenish = async () => {
    if (!projectId || Number(amount) <= 0) return;
    try {
      const res = await replenish.mutateAsync({
        projectId: Number(projectId),
        amount: Number(amount),
      });
      toast({
        title: "Float Replenished!",
        description: res.message,
      });
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: "Failed", description: err.message, variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-emerald-500" />
            Replenish Site Petty Cash Float
          </DialogTitle>
          <DialogDescription>
            Disburse funds from Head Office treasury to top up a project site cash box.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3.5 py-2 text-sm">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase text-muted-foreground">Project Site</Label>
            <Select value={projectId} onValueChange={setProjectId}>
              <SelectTrigger>
                <SelectValue placeholder="Select site..." />
              </SelectTrigger>
              <SelectContent>
                {projects?.map((p) => (
                  <SelectItem key={p.id} value={String(p.id)}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase text-muted-foreground">Top-up Amount (₹)</Label>
            <Input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="50000"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleReplenish} disabled={replenish.isPending}>
            {replenish.isPending ? "Disbursing..." : "Disburse Float Top-up"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// 7. Review Site Field Expense Voucher Dialog (Track 3)
// ============================================================================
export function ReviewSiteExpenseDialog({
  expense,
  open,
  onOpenChange,
}: {
  expense: SiteExpense | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { toast } = useToast();
  const approveExpense = useApproveExpense();
  const settleExpense = useSettleExpense();

  const [settlementRef, setSettlementRef] = useState(
    `FLOAT-SETTLE-${Date.now().toString().slice(-6)}`
  );
  const [showSettleInput, setShowSettleInput] = useState(false);

  useEffect(() => {
    if (expense) {
      setSettlementRef(`FLOAT-SETTLE-${Date.now().toString().slice(-6)}`);
      setShowSettleInput(false);
    }
  }, [expense]);

  if (!expense) return null;

  const handleApprove = async () => {
    try {
      await approveExpense.mutateAsync(expense.id);
      toast({
        title: "Expense Voucher Approved",
        description: `Voucher for ${formatINR(expense.amount)} approved by Project Manager. Ready for float settlement.`,
      });
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: "Approval failed", description: err.message, variant: "destructive" });
    }
  };

  const handleSettle = async () => {
    try {
      await settleExpense.mutateAsync({
        id: expense.id,
        settlementReference: settlementRef,
      });
      toast({
        title: "Voucher Settled!",
        description: `Settlement recorded against site imprest float with reference ${settlementRef}.`,
      });
      setShowSettleInput(false);
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: "Settlement failed", description: err.message, variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-amber-500" />
            Field Expense Voucher: {expense.description}
          </DialogTitle>
          <DialogDescription>
            {expense.projectName} • Logged on {format(new Date(expense.expenseDate), "MMM d, yyyy")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2 text-sm">
          {/* Top KPI breakdown */}
          <div className="grid grid-cols-2 gap-3 p-3 rounded-lg border bg-card">
            <div>
              <span className="text-xs text-muted-foreground uppercase font-semibold">Amount Spent</span>
              <p className="font-mono font-bold text-lg text-amber-600">{formatINR(expense.amount)}</p>
            </div>
            <div>
              <span className="text-xs text-muted-foreground uppercase font-semibold">Payment Mode</span>
              <p className="font-medium capitalize text-sm">{expense.paymentMode.replace('_', ' ')}</p>
            </div>
            <div>
              <span className="text-xs text-muted-foreground uppercase font-semibold">Category</span>
              <p className="font-medium capitalize text-xs">{expense.category}</p>
            </div>
            <div>
              <span className="text-xs text-muted-foreground uppercase font-semibold">Status</span>
              <div>
                <Badge
                  variant={expense.status === "settled" ? "default" : expense.status === "approved" ? "outline" : "secondary"}
                  className="text-[10px]"
                >
                  {expense.status}
                </Badge>
              </div>
            </div>
          </div>

          {/* Spot Purchase Details */}
          <div className="p-3 rounded-lg border bg-muted/20 space-y-1.5 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground font-semibold">Local Vendor / Shop:</span>
              <span className="font-medium">{expense.vendorOrShopName || "Local Cash Vendor"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground font-semibold">Cash Memo / Bill #:</span>
              <span className="font-mono font-medium">{expense.billReferenceNumber || "Cash Memo"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground font-semibold">Submitted By:</span>
              <span>{expense.submittedByName || "Site Team"}</span>
            </div>
            {expense.receiptUrl && (
              <div className="flex justify-between">
                <span className="text-muted-foreground font-semibold">Receipt Photo:</span>
                <span className="font-mono text-indigo-600 truncate max-w-[220px]">{expense.receiptUrl}</span>
              </div>
            )}
          </div>

          {/* Material Stock Auto-Credit Indicator */}
          {expense.creditedToInventory ? (
            <div className="p-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 flex items-start gap-2.5 text-xs text-emerald-800 dark:text-emerald-300">
              <Package className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
              <div>
                <span className="font-semibold">Site Store Auto-Credited: </span>
                <span>
                  +{expense.materialQuantity} {expense.materialUnit} of <strong>{expense.materialName}</strong> credited to site store stock upon voucher submission.
                </span>
              </div>
            </div>
          ) : (
            <div className="p-2.5 rounded-lg border bg-muted/40 text-xs text-muted-foreground">
              Operational / services spot expense (no physical materials stocked).
            </div>
          )}

          {/* Status Banners */}
          {expense.status === "approved" && !showSettleInput && (
            <div className="p-3 rounded-lg border border-indigo-500/30 bg-indigo-500/10 flex items-center gap-2 text-xs text-indigo-800 dark:text-indigo-300">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>Approved by Project Manager. Ready for site imprest float settlement.</span>
            </div>
          )}

          {expense.status === "settled" && (
            <div className="p-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 flex items-start gap-2 text-xs text-emerald-800 dark:text-emerald-300">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold">Settled & Reconciled: </span>
                Deducted from site imprest cash float. Ref: <strong className="font-mono">{expense.settlementReference || "FLOAT-SETTLE"}</strong>.
              </div>
            </div>
          )}

          {/* Settle Input Section */}
          {showSettleInput && (
            <div className="space-y-3 pt-2 border-t">
              <Label className="text-xs font-semibold uppercase text-emerald-600">Settle Against Site Imprest Float</Label>
              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground">Settlement Reference / Batch #</Label>
                <Input
                  className="h-8 text-xs font-mono"
                  value={settlementRef}
                  onChange={(e) => setSettlementRef(e.target.value)}
                  placeholder="FLOAT-SETTLE-12345"
                />
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <Button size="sm" variant="ghost" onClick={() => setShowSettleInput(false)}>Cancel</Button>
                <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={handleSettle}>
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Confirm Float Settlement
                </Button>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          {!showSettleInput && (
            <>
              {expense.status === "submitted" && (
                <Button onClick={handleApprove} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                  <CheckCircle2 className="w-4 h-4 mr-1.5" /> Approve Voucher
                </Button>
              )}

              {expense.status === "approved" && (
                <Button onClick={() => setShowSettleInput(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                  <DollarSign className="w-4 h-4 mr-1.5" /> Settle against Float
                </Button>
              )}

              {expense.status === "settled" && (
                <Badge variant="default" className="bg-emerald-600 text-white py-1.5 px-3 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Settled & Reconciled
                </Badge>
              )}
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

