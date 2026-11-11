import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  FileCheck,
  Check,
  X,
  Package,
  FileText,
  DollarSign,
  AlertCircle,
  Building2,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface MobileApprovalItem {
  id: number;
  type: "material_request" | "purchase_order" | "ra_bill" | "expense";
  title: string;
  referenceNumber: string;
  projectName?: string;
  requesterOrVendor: string;
  amountOrQuantity: string;
  status: string;
  createdAt?: string;
}

interface MobileApprovalCardProps {
  item: MobileApprovalItem;
  onActionComplete?: () => void;
}

export function MobileApprovalCard({ item, onActionComplete }: MobileApprovalCardProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [handled, setHandled] = useState(false);

  const handleAction = async (action: "approve" | "reject") => {
    setLoading(true);

    try {
      if (item.type === "material_request") {
        await fetch(`/api/material-requests/${item.id}/${action}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-user-id": localStorage.getItem("kanak_current_user_id") || "1",
          },
          body: JSON.stringify({
            notes: action === "approve" ? "Approved via mobile app" : "Rejected via mobile app",
          }),
        });
      } else if (item.type === "purchase_order") {
        await fetch(`/api/purchase-orders/${item.id}/acknowledge`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-user-id": localStorage.getItem("kanak_current_user_id") || "1",
          },
        });
      }

      setHandled(true);
      toast({
        title: action === "approve" ? "Request Approved" : "Request Rejected",
        description: `${item.referenceNumber} has been updated.`,
      });
      onActionComplete?.();
    } catch {
      toast({
        title: "Action failed",
        description: "Could not process approval. Please retry.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (handled) {
    return null;
  }

  const getTypeIcon = () => {
    switch (item.type) {
      case "material_request":
        return <Package className="w-4 h-4 text-blue-500" />;
      case "purchase_order":
        return <FileCheck className="w-4 h-4 text-purple-500" />;
      case "ra_bill":
        return <FileText className="w-4 h-4 text-emerald-500" />;
      default:
        return <DollarSign className="w-4 h-4 text-amber-500" />;
    }
  };

  return (
    <Card className="rounded-2xl border-border/80 shadow-xs overflow-hidden bg-card">
      <CardContent className="p-3.5 sm:p-4">
        {/* Top: Icon + Ref + Type Badge */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center shrink-0">
              {getTypeIcon()}
            </div>
            <span className="font-mono text-xs font-semibold text-foreground">
              {item.referenceNumber}
            </span>
          </div>

          <Badge variant="outline" className="text-[10px] uppercase font-normal tracking-wider">
            {item.type.replace("_", " ")}
          </Badge>
        </div>

        {/* Title & Details */}
        <div className="mt-2 space-y-1">
          <h4 className="font-bold text-sm text-foreground line-clamp-2">
            {item.title}
          </h4>
          <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
            <span className="truncate max-w-[180px]">
              {item.requesterOrVendor}
            </span>
            <span className="font-semibold text-foreground shrink-0">
              {item.amountOrQuantity}
            </span>
          </div>
          {item.projectName && (
            <p className="text-[11px] text-muted-foreground/80 flex items-center gap-1 truncate pt-0.5">
              <Building2 className="w-3 h-3 text-muted-foreground shrink-0" />
              {item.projectName}
            </p>
          )}
        </div>

        {/* Action Buttons: 1-Tap Approve & Reject */}
        <div className="mt-3 pt-3 border-t border-border/60 flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleAction("reject")}
            disabled={loading}
            className="flex-1 rounded-xl h-9 text-xs font-semibold text-destructive hover:bg-destructive/10 hover:text-destructive border-border active:scale-95 transition-all"
          >
            <X className="w-3.5 h-3.5 mr-1" />
            Reject
          </Button>

          <Button
            size="sm"
            onClick={() => handleAction("approve")}
            disabled={loading}
            className="flex-1 rounded-xl h-9 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs active:scale-95 transition-all"
          >
            <Check className="w-3.5 h-3.5 mr-1 stroke-[3]" />
            Approve
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

