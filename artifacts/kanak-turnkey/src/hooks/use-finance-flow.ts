import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { customFetch } from "@workspace/api-client-react";

export type FinanceOverviewResponse = {
  inflow: {
    totalBilled: number;
    totalCollected: number;
    outstandingReceivables: number;
    overdueCount: number;
    collectionRate: number;
  };
  outflow: {
    totalVendorInvoiced: number;
    totalVendorPaid: number;
    totalExpensesLogged: number;
    totalExpensesSettled: number;
    totalOutflow: number;
    pendingVendorPayments: number;
  };
  netOperatingCashFlow: number;
  pettyCash: {
    totalSanctionedFloat: number;
    totalCurrentFloat: number;
    pendingFieldExpenses: number;
    sites: Array<{
      projectId: number;
      projectName: string;
      sanctionedFloat: number;
      spent: number;
      currentBalance: number;
      pendingApprovalCount: number;
    }>;
  };
  actionsRequired: {
    pendingRaApprovals: number;
    activeDiscrepancies: number;
    overdueInvoices: number;
    pendingFieldExpenses: number;
  };
};

export type RaBill = {
  id: number;
  projectId: number;
  projectName?: string;
  billNumber: string;
  milestone: string | null;
  description: string | null;
  workCompletionPercent: number | null;
  grossAmount: number;
  retentionPercent: number;
  retentionAmount: number;
  advanceDeduction: number;
  netBillableAmount: number;
  amount: number;
  supportingDocsUrl: string | null;
  verifiedById: number | null;
  verifiedAt: string | null;
  pmApprovedById: number | null;
  pmApprovedAt: string | null;
  revisionRemarks: string | null;
  invoiceId: number | null;
  status:
    | "draft"
    | "verified"
    | "submitted"
    | "revision_requested"
    | "approved"
    | "invoiced";
  createdByName?: string;
  createdAt: string;
  updatedAt: string;
};

export type ClientInvoice = {
  id: number;
  projectId: number;
  projectName?: string;
  raBillId: number | null;
  raBillNumber?: string;
  invoiceNumber: string;
  clientName: string;
  amount: number;
  gstin: string | null;
  taxRate: number;
  taxAmount: number;
  totalWithTax: number;
  invoiceDate: string;
  dueDate: string;
  sentDate: string | null;
  paymentDate: string | null;
  reconciled: boolean;
  status:
    | "draft"
    | "sent"
    | "overdue"
    | "partially_paid"
    | "paid"
    | "reconciled"
    | "closed";
  paymentRemindersCount: number;
  lastReminderDate: string | null;
  reminderNotes: string | null;
  paymentReference: string | null;
  tdsAmount: number;
  netReceivedAmount: number;
  reconciledAt: string | null;
  closedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type VendorInvoice = {
  id: number;
  projectId: number;
  projectName?: string;
  vendorId: number;
  vendorName?: string;
  purchaseOrderId: number | null;
  poNumber?: string;
  poTotalAmount?: number;
  poInspectionStatus?: string;
  poGrnNumber?: string;
  invoiceNumber: string;
  amount: number;
  invoiceDate: string | null;
  dueDate: string | null;
  taxAmount: number | null;
  poAmount: number | null;
  grnNumber: string | null;
  isMatched: boolean;
  matchedAt: string | null;
  discrepancyType: string | null;
  discrepancyNotes: string | null;
  resolutionNotes: string | null;
  resolvedAt: string | null;
  scheduledPaymentDate: string | null;
  paymentReference: string | null;
  paymentMode: string | null;
  paidAmount: number | null;
  status:
    | "received"
    | "discrepancy"
    | "matched"
    | "approved_for_payment"
    | "scheduled"
    | "paid";
  paymentDate: string | null;
  createdAt: string;
  updatedAt: string;
};

export type SiteExpense = {
  id: number;
  projectId: number;
  projectName?: string;
  description: string;
  amount: number;
  category: string;
  expenseDate: string;
  receiptUrl: string | null;
  paymentMode: "petty_cash" | "site_upi" | "personal_reimbursement" | "company_card";
  vendorOrShopName: string | null;
  billReferenceNumber: string | null;
  materialName: string | null;
  materialQuantity: number | null;
  materialUnit: string | null;
  creditedToInventory: boolean;
  status: "draft" | "submitted" | "approved" | "settled" | "reimbursed" | "rejected";
  submittedByName?: string;
  approvedById: number | null;
  approvedAt: string | null;
  settledAt: string | null;
  settlementReference: string | null;
  createdAt: string;
  updatedAt: string;
};

export const FINANCE_OVERVIEW_QUERY_KEY = ["/api/finance/overview"] as const;
export const RA_BILLS_QUERY_KEY = ["/api/ra-bills"] as const;
export const INVOICES_QUERY_KEY = ["/api/invoices"] as const;
export const VENDOR_INVOICES_QUERY_KEY = ["/api/vendor-invoices"] as const;
export const EXPENSES_QUERY_KEY = ["/api/expenses"] as const;

// 1. Overview Hook
export function useGetFinanceOverview() {
  return useQuery<FinanceOverviewResponse>({
    queryKey: FINANCE_OVERVIEW_QUERY_KEY,
    queryFn: async () => {
      return customFetch<FinanceOverviewResponse>("/api/finance/overview", {
        method: "GET",
      });
    },
    refetchInterval: 15000,
  });
}

// 2. RA Bills Hooks (Track 1)
export function useListRaBills(projectId?: number | null) {
  return useQuery<RaBill[]>({
    queryKey: projectId ? [...RA_BILLS_QUERY_KEY, projectId] : RA_BILLS_QUERY_KEY,
    queryFn: async () => {
      const url = projectId
        ? `/api/ra-bills?projectId=${projectId}`
        : "/api/ra-bills";
      return customFetch<RaBill[]>(url, { method: "GET" });
    },
  });
}

export function useCreateRaBill() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: Partial<RaBill>) => {
      return customFetch<RaBill>("/api/ra-bills", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: RA_BILLS_QUERY_KEY });
      qc.invalidateQueries({ queryKey: FINANCE_OVERVIEW_QUERY_KEY });
    },
  });
}

export function useVerifyRaBill() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      return customFetch<RaBill>(`/api/ra-bills/${id}/verify`, {
        method: "POST",
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: RA_BILLS_QUERY_KEY });
      qc.invalidateQueries({ queryKey: FINANCE_OVERVIEW_QUERY_KEY });
    },
  });
}

export function useSubmitRaBill() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      return customFetch<RaBill>(`/api/ra-bills/${id}/submit`, {
        method: "POST",
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: RA_BILLS_QUERY_KEY });
      qc.invalidateQueries({ queryKey: FINANCE_OVERVIEW_QUERY_KEY });
    },
  });
}

export function useApproveRaBill() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      return customFetch<RaBill>(`/api/ra-bills/${id}/approve`, {
        method: "POST",
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: RA_BILLS_QUERY_KEY });
      qc.invalidateQueries({ queryKey: FINANCE_OVERVIEW_QUERY_KEY });
    },
  });
}

export function useRequestRevisionRaBill() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, remarks }: { id: number; remarks: string }) => {
      return customFetch<RaBill>(`/api/ra-bills/${id}/request-revision`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ remarks }),
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: RA_BILLS_QUERY_KEY });
      qc.invalidateQueries({ queryKey: FINANCE_OVERVIEW_QUERY_KEY });
    },
  });
}

export function useGenerateInvoiceFromRa() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, gstin }: { id: number; gstin?: string }) => {
      return customFetch<ClientInvoice>(`/api/ra-bills/${id}/generate-invoice`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gstin }),
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: RA_BILLS_QUERY_KEY });
      qc.invalidateQueries({ queryKey: INVOICES_QUERY_KEY });
      qc.invalidateQueries({ queryKey: FINANCE_OVERVIEW_QUERY_KEY });
    },
  });
}

// 3. Client Invoices Hooks (Track 1 AR)
export function useListClientInvoices(projectId?: number | null) {
  return useQuery<ClientInvoice[]>({
    queryKey: projectId ? [...INVOICES_QUERY_KEY, projectId] : INVOICES_QUERY_KEY,
    queryFn: async () => {
      const url = projectId
        ? `/api/invoices?projectId=${projectId}`
        : "/api/invoices";
      return customFetch<ClientInvoice[]>(url, { method: "GET" });
    },
  });
}

export function useSendInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      return customFetch<ClientInvoice>(`/api/invoices/${id}/send`, {
        method: "POST",
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: INVOICES_QUERY_KEY });
      qc.invalidateQueries({ queryKey: FINANCE_OVERVIEW_QUERY_KEY });
    },
  });
}

export function useSendInvoiceReminder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, notes }: { id: number; notes?: string }) => {
      return customFetch<ClientInvoice>(`/api/invoices/${id}/send-reminder`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes }),
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: INVOICES_QUERY_KEY });
      qc.invalidateQueries({ queryKey: FINANCE_OVERVIEW_QUERY_KEY });
    },
  });
}

export function useRecordClientPayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      id: number;
      paymentReference: string;
      tdsAmount?: number;
      netReceivedAmount?: number;
      paymentDate?: string;
    }) => {
      return customFetch<ClientInvoice>(`/api/invoices/${data.id}/record-payment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: INVOICES_QUERY_KEY });
      qc.invalidateQueries({ queryKey: FINANCE_OVERVIEW_QUERY_KEY });
    },
  });
}

export function useReconcileInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      return customFetch<ClientInvoice>(`/api/invoices/${id}/reconcile`, {
        method: "POST",
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: INVOICES_QUERY_KEY });
      qc.invalidateQueries({ queryKey: FINANCE_OVERVIEW_QUERY_KEY });
    },
  });
}

export function useCloseInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      return customFetch<ClientInvoice>(`/api/invoices/${id}/close`, {
        method: "POST",
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: INVOICES_QUERY_KEY });
      qc.invalidateQueries({ queryKey: FINANCE_OVERVIEW_QUERY_KEY });
    },
  });
}

// 4. Vendor Invoices Hooks (Track 2 AP)
export function useListVendorInvoicesCustom(projectId?: number | null) {
  return useQuery<VendorInvoice[]>({
    queryKey: projectId
      ? [...VENDOR_INVOICES_QUERY_KEY, projectId]
      : VENDOR_INVOICES_QUERY_KEY,
    queryFn: async () => {
      const url = projectId
        ? `/api/vendor-invoices?projectId=${projectId}`
        : "/api/vendor-invoices";
      return customFetch<VendorInvoice[]>(url, { method: "GET" });
    },
  });
}

export function useCreateVendorInvoiceCustom() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: Partial<VendorInvoice>) => {
      return customFetch<VendorInvoice>("/api/vendor-invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: VENDOR_INVOICES_QUERY_KEY });
      qc.invalidateQueries({ queryKey: FINANCE_OVERVIEW_QUERY_KEY });
    },
  });
}

export function useMatchVendorInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      return customFetch<VendorInvoice>(`/api/vendor-invoices/${id}/match`, {
        method: "POST",
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: VENDOR_INVOICES_QUERY_KEY });
      qc.invalidateQueries({ queryKey: FINANCE_OVERVIEW_QUERY_KEY });
    },
  });
}

export function useRaiseVendorDiscrepancy() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      discrepancyType,
      notes,
    }: {
      id: number;
      discrepancyType: string;
      notes: string;
    }) => {
      return customFetch<VendorInvoice>(
        `/api/vendor-invoices/${id}/raise-discrepancy`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ discrepancyType, notes }),
        },
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: VENDOR_INVOICES_QUERY_KEY });
      qc.invalidateQueries({ queryKey: FINANCE_OVERVIEW_QUERY_KEY });
    },
  });
}

export function useResolveVendorDiscrepancy() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      resolutionNotes,
      adjustedAmount,
    }: {
      id: number;
      resolutionNotes: string;
      adjustedAmount?: number;
    }) => {
      return customFetch<VendorInvoice>(
        `/api/vendor-invoices/${id}/resolve-discrepancy`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ resolutionNotes, adjustedAmount }),
        },
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: VENDOR_INVOICES_QUERY_KEY });
      qc.invalidateQueries({ queryKey: FINANCE_OVERVIEW_QUERY_KEY });
    },
  });
}

export function useApproveVendorInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      return customFetch<VendorInvoice>(`/api/vendor-invoices/${id}/approve`, {
        method: "POST",
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: VENDOR_INVOICES_QUERY_KEY });
      qc.invalidateQueries({ queryKey: FINANCE_OVERVIEW_QUERY_KEY });
    },
  });
}

export function useScheduleVendorPayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      scheduledPaymentDate,
    }: {
      id: number;
      scheduledPaymentDate: string;
    }) => {
      return customFetch<VendorInvoice>(
        `/api/vendor-invoices/${id}/schedule-payment`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ scheduledPaymentDate }),
        },
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: VENDOR_INVOICES_QUERY_KEY });
      qc.invalidateQueries({ queryKey: FINANCE_OVERVIEW_QUERY_KEY });
    },
  });
}

export function useProcessVendorPayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      id: number;
      paidAmount: number;
      paymentReference: string;
      paymentMode?: string;
      paymentDate?: string;
    }) => {
      return customFetch<VendorInvoice>(
        `/api/vendor-invoices/${data.id}/process-payment`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        },
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: VENDOR_INVOICES_QUERY_KEY });
      qc.invalidateQueries({ queryKey: FINANCE_OVERVIEW_QUERY_KEY });
    },
  });
}

// 5. Site Petty Cash & Field Expenses Hooks (Track 3)
export function useListSiteExpenses(projectId?: number | null) {
  return useQuery<SiteExpense[]>({
    queryKey: projectId ? [...EXPENSES_QUERY_KEY, projectId] : EXPENSES_QUERY_KEY,
    queryFn: async () => {
      const url = projectId
        ? `/api/expenses?projectId=${projectId}`
        : "/api/expenses";
      return customFetch<SiteExpense[]>(url, { method: "GET" });
    },
  });
}

export function useCreateQuickExpenseVoucher() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      projectId: number;
      description: string;
      amount: number;
      category: string;
      expenseDate?: string;
      paymentMode?: string;
      vendorOrShopName?: string;
      billReferenceNumber?: string;
      receiptUrl?: string;
      materialName?: string;
      materialQuantity?: number;
      materialUnit?: string;
    }) => {
      return customFetch<SiteExpense>("/api/expenses/quick-voucher", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: EXPENSES_QUERY_KEY });
      qc.invalidateQueries({ queryKey: FINANCE_OVERVIEW_QUERY_KEY });
      qc.invalidateQueries({ queryKey: ["/api/materials"] });
      qc.invalidateQueries({ queryKey: ["/api/procurement/stock-matrix"] });
    },
  });
}

export function useApproveExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      return customFetch<SiteExpense>(`/api/expenses/${id}/approve`, {
        method: "POST",
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: EXPENSES_QUERY_KEY });
      qc.invalidateQueries({ queryKey: FINANCE_OVERVIEW_QUERY_KEY });
    },
  });
}

export function useSettleExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      settlementReference,
    }: {
      id: number;
      settlementReference?: string;
    }) => {
      return customFetch<SiteExpense>(`/api/expenses/${id}/settle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settlementReference }),
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: EXPENSES_QUERY_KEY });
      qc.invalidateQueries({ queryKey: FINANCE_OVERVIEW_QUERY_KEY });
    },
  });
}

export function useReplenishSiteFloat() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      projectId,
      amount,
    }: {
      projectId: number;
      amount: number;
    }) => {
      return customFetch<{
        projectId: number;
        newSanctionedFloat: number;
        message: string;
      }>("/api/finance/replenish-float", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, amount }),
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: FINANCE_OVERVIEW_QUERY_KEY });
      qc.invalidateQueries({ queryKey: ["/api/projects"] });
    },
  });
}

