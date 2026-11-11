import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { customFetch } from "@workspace/api-client-react";

export type StockMatrixItem = {
  materialName: string;
  unit: string;
  inHouseStock: number;
  siteStock: number;
  totalOnHand: number;
  minimumStock: number;
  reorderLevel: number;
  unitCost: number;
  openMrQuantity: number;
  inTransitPoQuantity: number;
  toProcureQuantity: number;
  sites: Array<{
    projectId: number | null;
    projectName: string;
    quantity: number;
  }>;
};

export type StockMatrixResponse = {
  summary: {
    totalMaterialsTracked: number;
    totalInHouseValuation: number;
    totalSiteStockValuation: number;
    itemsNeedingProcurement: number;
  };
  materials: StockMatrixItem[];
  projects: Array<{ id: number; name: string }>;
};

export type StockTransfer = {
  id: number;
  transferNumber: string;
  materialName: string;
  fromProjectId: number | null;
  toProjectId: number;
  fromLocationName: string;
  toLocationName: string;
  quantity: number;
  unit: string;
  status: "pending" | "dispatched" | "received" | "cancelled";
  dispatchDate: string | null;
  receivedDate: string | null;
  notes: string | null;
  createdByName?: string;
  createdAt: string;
};

export const STOCK_MATRIX_QUERY_KEY = ["/api/procurement/stock-matrix"] as const;
export const STOCK_TRANSFERS_QUERY_KEY = ["/api/stock-transfers"] as const;

// 1. Stock Matrix Hook
export function useGetStockMatrix() {
  return useQuery<StockMatrixResponse>({
    queryKey: STOCK_MATRIX_QUERY_KEY,
    queryFn: async () => {
      return customFetch<StockMatrixResponse>("/api/procurement/stock-matrix", {
        method: "GET",
      });
    },
  });
}

// 2. Stock Transfers Hooks
export function useListStockTransfers() {
  return useQuery<StockTransfer[]>({
    queryKey: STOCK_TRANSFERS_QUERY_KEY,
    queryFn: async () => {
      return customFetch<StockTransfer[]>("/api/stock-transfers", {
        method: "GET",
      });
    },
  });
}

export function useCreateStockTransfer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      materialName: string;
      fromProjectId?: number | null;
      toProjectId: number;
      quantity: number;
      unit: string;
      notes?: string;
    }) => {
      return customFetch<StockTransfer>("/api/stock-transfers", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: STOCK_TRANSFERS_QUERY_KEY });
      qc.invalidateQueries({ queryKey: STOCK_MATRIX_QUERY_KEY });
      qc.invalidateQueries({ queryKey: ["/api/materials"] });
    },
  });
}

export function useDispatchStockTransfer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      return customFetch<StockTransfer>(`/api/stock-transfers/${id}/dispatch`, {
        method: "POST",
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: STOCK_TRANSFERS_QUERY_KEY });
      qc.invalidateQueries({ queryKey: STOCK_MATRIX_QUERY_KEY });
      qc.invalidateQueries({ queryKey: ["/api/materials"] });
    },
  });
}

export function useReceiveStockTransfer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      return customFetch<StockTransfer>(`/api/stock-transfers/${id}/receive`, {
        method: "POST",
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: STOCK_TRANSFERS_QUERY_KEY });
      qc.invalidateQueries({ queryKey: STOCK_MATRIX_QUERY_KEY });
      qc.invalidateQueries({ queryKey: ["/api/materials"] });
    },
  });
}

// 3. Material Request Lifecycle Hooks
export function useApproveMaterialRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      return customFetch(`/api/material-requests/${id}/approve`, {
        method: "POST",
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/material-requests"] });
      qc.invalidateQueries({ queryKey: STOCK_MATRIX_QUERY_KEY });
    },
  });
}

export function useRejectMaterialRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, reason }: { id: number; reason: string }) => {
      return customFetch(`/api/material-requests/${id}/reject`, {
        method: "POST",
        body: JSON.stringify({ reason }),
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/material-requests"] });
      qc.invalidateQueries({ queryKey: STOCK_MATRIX_QUERY_KEY });
    },
  });
}

export function useTransferMaterialRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, quantity }: { id: number; quantity?: number }) => {
      return customFetch(`/api/material-requests/${id}/transfer`, {
        method: "POST",
        body: JSON.stringify({ quantity }),
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/material-requests"] });
      qc.invalidateQueries({ queryKey: STOCK_TRANSFERS_QUERY_KEY });
      qc.invalidateQueries({ queryKey: STOCK_MATRIX_QUERY_KEY });
    },
  });
}

// 4. RFQ Lifecycle Hooks
export function useSendRfq() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, vendorIds }: { id: number; vendorIds?: number[] }) => {
      return customFetch(`/api/rfqs/${id}/send`, {
        method: "POST",
        body: JSON.stringify({ vendorIds }),
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/rfqs"] });
    },
  });
}

export function useAddQuotation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      rfqId,
      vendorId,
      amount,
      unitPrice,
      taxAmount,
      freightCharges,
      deliveryDays,
      paymentTerms,
      notes,
    }: {
      rfqId: number;
      vendorId: number;
      amount: number;
      unitPrice?: number;
      taxAmount?: number;
      freightCharges?: number;
      deliveryDays: number;
      paymentTerms?: string;
      notes?: string;
    }) => {
      return customFetch(`/api/rfqs/${rfqId}/quotations`, {
        method: "POST",
        body: JSON.stringify({
          vendorId,
          amount,
          unitPrice,
          taxAmount,
          freightCharges,
          deliveryDays,
          paymentTerms,
          notes,
        }),
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/rfqs"] });
    },
  });
}

export function useConvertToPo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, quotationId }: { id: number; quotationId?: number }) => {
      return customFetch(`/api/rfqs/${id}/convert-to-po`, {
        method: "POST",
        body: JSON.stringify({ quotationId }),
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/rfqs"] });
      qc.invalidateQueries({ queryKey: ["/api/purchase-orders"] });
      qc.invalidateQueries({ queryKey: STOCK_MATRIX_QUERY_KEY });
    },
  });
}

// 5. PO Lifecycle Hooks
export function useAcknowledgePo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      return customFetch(`/api/purchase-orders/${id}/acknowledge`, {
        method: "POST",
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/purchase-orders"] });
    },
  });
}

export function useTrackPo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      trackingNumber,
      transporterName,
      expectedDeliveryDate,
    }: {
      id: number;
      trackingNumber?: string;
      transporterName?: string;
      expectedDeliveryDate?: string;
    }) => {
      return customFetch(`/api/purchase-orders/${id}/track`, {
        method: "POST",
        body: JSON.stringify({ trackingNumber, transporterName, expectedDeliveryDate }),
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/purchase-orders"] });
    },
  });
}

export function useFollowUpPo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, notes }: { id: number; notes: string }) => {
      return customFetch(`/api/purchase-orders/${id}/follow-up`, {
        method: "POST",
        body: JSON.stringify({ notes }),
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/purchase-orders"] });
    },
  });
}

export function useReceivePo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      return customFetch(`/api/purchase-orders/${id}/receive`, {
        method: "POST",
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/purchase-orders"] });
    },
  });
}

export function useInspectPo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      passed,
      notes,
      quantityReceived,
    }: {
      id: number;
      passed: boolean;
      notes: string;
      quantityReceived?: number;
    }) => {
      return customFetch(`/api/purchase-orders/${id}/inspect`, {
        method: "POST",
        body: JSON.stringify({ passed, notes, quantityReceived }),
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/purchase-orders"] });
      qc.invalidateQueries({ queryKey: ["/api/material-requests"] });
      qc.invalidateQueries({ queryKey: ["/api/materials"] });
      qc.invalidateQueries({ queryKey: STOCK_MATRIX_QUERY_KEY });
      qc.invalidateQueries({ queryKey: ["/api/dashboard/summary"] });
    },
  });
}

// 6. Material Consumption Hook
export function useConsumeMaterial() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, quantity, notes }: { id: number; quantity: number; notes?: string }) => {
      return customFetch(`/api/materials/${id}/consume`, {
        method: "POST",
        body: JSON.stringify({ quantity, notes }),
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/materials"] });
      qc.invalidateQueries({ queryKey: STOCK_MATRIX_QUERY_KEY });
    },
  });
}

