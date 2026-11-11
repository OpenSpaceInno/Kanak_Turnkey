import { useState } from "react";
import {
  useListTasks,
  useListMaterialRequests,
  useListPurchaseOrders,
} from "@workspace/api-client-react";
import { MobileApprovalCard, MobileApprovalItem } from "@/components/mobile/MobileApprovalCard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { CheckSquare, FileCheck, Check, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

export default function MobileApprovalsPage() {
  const [activeTab, setActiveTab] = useState("tasks");

  const { data: tasks, isLoading: tasksLoading, refetch: refetchTasks } = useListTasks();
  const { data: materialRequests, isLoading: mrLoading, refetch: refetchMrs } = useListMaterialRequests();
  const { data: purchaseOrders, isLoading: poLoading, refetch: refetchPos } = useListPurchaseOrders();

  // Build approval items from MRs and POs
  const approvalItems: MobileApprovalItem[] = [];

  (materialRequests || [])
    .filter((mr) => mr.status === "pending")
    .forEach((mr) => {
      approvalItems.push({
        id: mr.id,
        type: "material_request",
        title: mr.title || mr.description || "Material Requisition",
        referenceNumber: `MR-${String(mr.id).padStart(4, "0")}`,
        projectName: mr.projectName || `Project #${mr.projectId}`,
        requesterOrVendor: `Requested by ${mr.createdByName || "Site Engineer"}`,
        amountOrQuantity: `${mr.quantity || 0} ${mr.unit || "Nos"}`,
        status: mr.status,
      });
    });

  (purchaseOrders || [])
    .filter((po) => po.status === "issued" || po.status === "draft")
    .forEach((po) => {
      approvalItems.push({
        id: po.id,
        type: "purchase_order",
        title: po.description || "Purchase Order",
        referenceNumber: po.poNumber || `PO-${po.id}`,
        projectName: po.projectName || `Project #${po.projectId}`,
        requesterOrVendor: po.vendorName || "Vendor",
        amountOrQuantity: `₹${Number(po.totalAmount || 0).toLocaleString("en-IN")}`,
        status: po.status,
      });
    });

  return (
    <div className="space-y-3.5 pb-6">
      {/* Page Header */}
      <div className="pt-1">
        <h1 className="text-xl font-black tracking-tight text-foreground">
          Tasks & Approvals
        </h1>
        <p className="text-xs text-muted-foreground">
          Actionable queue for field site execution and commercial sign-offs
        </p>
      </div>

      {/* Segmented Control Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-2 w-full h-10 rounded-xl bg-muted/60 p-1">
          <TabsTrigger
            value="tasks"
            className="rounded-lg text-xs font-semibold data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-xs flex items-center gap-1.5"
          >
            <CheckSquare className="w-3.5 h-3.5" />
            Site Tasks
            <Badge variant="secondary" className="text-[10px] px-1 py-0 ml-1">
              {tasks?.length || 0}
            </Badge>
          </TabsTrigger>

          <TabsTrigger
            value="approvals"
            className="rounded-lg text-xs font-semibold data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-xs flex items-center gap-1.5"
          >
            <FileCheck className="w-3.5 h-3.5" />
            Approvals
            {approvalItems.length > 0 && (
              <Badge className="bg-amber-500 text-white text-[10px] px-1 py-0 ml-1">
                {approvalItems.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Site Tasks */}
        <TabsContent value="tasks" className="space-y-2 mt-3">
          {tasksLoading ? (
            <div className="p-8 text-center text-xs text-muted-foreground">
              Loading tasks...
            </div>
          ) : (tasks || []).length === 0 ? (
            <div className="p-8 text-center text-xs text-muted-foreground bg-card rounded-2xl border border-border">
              No tasks assigned.
            </div>
          ) : (
            (tasks || []).map((t) => (
              <Card key={t.id} className="rounded-xl border-border/80 shadow-xs bg-card">
                <CardContent className="p-3.5 flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-xs text-foreground truncate">
                      {t.title}
                    </p>
                    <div className="flex items-center gap-2 mt-1 text-[11px] text-muted-foreground">
                      <span className="capitalize">{t.status || "todo"}</span>
                      {t.priority && (
                        <span className="font-mono capitalize text-primary font-medium">
                          • {t.priority}
                        </span>
                      )}
                      {t.assignedToName && (
                        <span className="truncate">• {t.assignedToName}</span>
                      )}
                    </div>
                  </div>

                  <Badge
                    variant={t.status === "completed" ? "default" : "outline"}
                    className={cn(
                      "text-[10px] shrink-0 font-medium",
                      t.status === "completed" && "bg-emerald-600 text-white"
                    )}
                  >
                    {t.progress ?? 0}%
                  </Badge>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        {/* Tab 2: Approvals Feed */}
        <TabsContent value="approvals" className="space-y-2.5 mt-3">
          {mrLoading || poLoading ? (
            <div className="p-8 text-center text-xs text-muted-foreground">
              Checking approval queues...
            </div>
          ) : approvalItems.length === 0 ? (
            <div className="p-8 text-center text-xs text-muted-foreground bg-card rounded-2xl border border-border flex flex-col items-center justify-center gap-2">
              <Check className="w-8 h-8 text-emerald-500/80" />
              <span>All approvals cleared. No pending sign-offs.</span>
            </div>
          ) : (
            approvalItems.map((item) => (
              <MobileApprovalCard
                key={`${item.type}-${item.id}`}
                item={item}
                onActionComplete={() => {
                  refetchMrs();
                  refetchPos();
                }}
              />
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
