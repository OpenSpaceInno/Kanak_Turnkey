import { useState } from "react";
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
import {
  useListProjects,
  useCreateMaterialRequest,
} from "@workspace/api-client-react";
import { ShoppingCart, Flame, Package } from "lucide-react";

interface QuickMaterialRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultProjectId?: number;
}

const VISUAL_CONSUMABLES = [
  { name: "OPC 53 Cement", defaultQty: 50, unit: "Bags", icon: "🧱", quickOptions: [50, 100] },
  { name: "TMT Steel Fe550D", defaultQty: 1, unit: "MT", icon: "🔩", quickOptions: [1, 2, 5] },
  { name: "River / M-Sand", defaultQty: 2, unit: "Brass", icon: "⏳", quickOptions: [1, 2] },
  { name: "20mm Aggregates", defaultQty: 2, unit: "Brass", icon: "🪨", quickOptions: [1, 2] },
  { name: "Generator Diesel", defaultQty: 50, unit: "Litres", icon: "⛽", quickOptions: [50, 100] },
  { name: "Binding Wire", defaultQty: 5, unit: "Rolls", icon: "➰", quickOptions: [5, 10] },
  { name: "AAC Blocks 6-inch", defaultQty: 500, unit: "Blocks", icon: "🧱", quickOptions: [500, 1000] },
  { name: "PVC Conduits 25mm", defaultQty: 20, unit: "Pcs", icon: "🔌", quickOptions: [20, 50] },
];

export function QuickMaterialRequestDialog({
  open,
  onOpenChange,
  defaultProjectId,
}: QuickMaterialRequestDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: projects } = useListProjects();
  const createMr = useCreateMaterialRequest();

  const [projectId, setProjectId] = useState<number>(defaultProjectId || 1);
  const [materialName, setMaterialName] = useState("OPC 53 Cement");
  const [quantity, setQuantity] = useState("50");
  const [unit, setUnit] = useState("Bags");
  const [selectedPreset, setSelectedPreset] = useState<string>("OPC 53 Cement");
  const [requiredDate, setRequiredDate] = useState(
    new Date(Date.now() + 86400000 * 2).toISOString().slice(0, 10)
  );
  const [isUrgent, setIsUrgent] = useState(false);
  const [notes, setNotes] = useState("");

  const handleSelectPreset = (item: (typeof VISUAL_CONSUMABLES)[0], chosenQty?: number) => {
    setSelectedPreset(item.name);
    setMaterialName(item.name);
    setQuantity(String(chosenQty || item.defaultQty));
    setUnit(item.unit);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!materialName.trim()) {
      toast({ title: "Material name required", variant: "destructive" });
      return;
    }
    const qty = parseFloat(quantity);
    if (!qty || qty <= 0) {
      toast({ title: "Valid quantity required", variant: "destructive" });
      return;
    }

    try {
      const urgentTag = isUrgent ? "[URGENT] " : "";
      await createMr.mutateAsync({
        data: {
          projectId,
          title: `${urgentTag}${materialName.trim()}`,
          quantity: qty,
          unit,
          description: notes.trim()
            ? `${notes.trim()} • Required by: ${requiredDate}`
            : `Required by site: ${requiredDate}`,
        },
      });

      queryClient.invalidateQueries();
      toast({
        title: "Material Request Raised",
        description: `${qty} ${unit} of ${materialName} requested for ${requiredDate}.`,
      });

      onOpenChange(false);
      setMaterialName("");
      setQuantity("");
      setNotes("");
      setIsUrgent(false);
    } catch (err: any) {
      toast({
        title: "Failed to raise request",
        description: err.message,
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0 overflow-hidden sm:rounded-2xl">
        <div className="bg-blue-950 text-white p-4">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-blue-500/20 text-blue-400 border border-blue-500/30">
              <ShoppingCart className="w-4 h-4" />
            </span>
            <div>
              <DialogTitle className="text-base font-bold text-white">
                Site Material Indent
              </DialogTitle>
              <DialogDescription className="text-xs text-blue-200">
                Raise requisition directly to procurement & central store
              </DialogDescription>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Target Site</Label>
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

          {/* 1-Tap Visual Consumable Catalog */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <span>📦 1-Tap Site Consumables</span>
              </Label>
              <span className="text-[10px] text-muted-foreground">Tap preset to fill</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {VISUAL_CONSUMABLES.map((item) => {
                const isSelected = selectedPreset === item.name;
                return (
                  <div
                    key={item.name}
                    onClick={() => handleSelectPreset(item)}
                    className={`p-2.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between text-left ${
                      isSelected
                        ? "bg-blue-500/10 border-blue-500 text-blue-900 dark:text-blue-200 ring-1 ring-blue-500 shadow-2xs"
                        : "bg-card border-border hover:bg-muted/40 text-foreground"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-1 mb-1.5">
                      <span className="text-base leading-none">{item.icon}</span>
                      <span className="text-[10px] font-mono font-bold text-muted-foreground">{item.unit}</span>
                    </div>
                    <span className="text-xs font-bold leading-tight line-clamp-1 mb-1.5">{item.name}</span>
                    <div className="flex items-center gap-1 mt-auto">
                      {item.quickOptions.map((qty) => (
                        <button
                          key={qty}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectPreset(item, qty);
                          }}
                          className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-md transition-colors ${
                            isSelected && quantity === String(qty)
                              ? "bg-blue-600 text-white"
                              : "bg-muted text-foreground hover:bg-muted-foreground/20"
                          }`}
                        >
                          +{qty}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="space-y-1.5 pt-1">
            <Label className="text-xs font-semibold">Custom Material Name (Optional edit)</Label>
            <Input
              placeholder="e.g. Ultratech Cement OPC 53 Grade"
              value={materialName}
              onChange={(e) => {
                setMaterialName(e.target.value);
                setSelectedPreset("");
              }}
              className="h-9 text-xs"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Quantity *</Label>
              <Input
                type="number"
                step="any"
                placeholder="e.g. 50"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="h-9 text-xs font-mono font-bold"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Unit of Measure</Label>
              <Input
                placeholder="Bags, MT, Boxes, Sq.m"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="h-9 text-xs"
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Required at Site By</Label>
            <Input
              type="date"
              value={requiredDate}
              onChange={(e) => setRequiredDate(e.target.value)}
              className="h-9 text-xs"
            />
          </div>

          {/* Urgent Switch Button */}
          <div className="flex items-center justify-between p-2.5 rounded-xl border bg-muted/30">
            <div className="flex items-center gap-2">
              <Flame className={`w-4 h-4 ${isUrgent ? "text-rose-600 animate-pulse" : "text-muted-foreground"}`} />
              <div>
                <p className="text-xs font-bold text-foreground">Critical Delivery</p>
                <p className="text-[10px] text-muted-foreground">Flags priority in procurement queue</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsUrgent(!isUrgent)}
              className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
                isUrgent
                  ? "bg-rose-600 text-white shadow-xs"
                  : "bg-muted text-muted-foreground border"
              }`}
            >
              {isUrgent ? "URGENT" : "Normal"}
            </button>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Location / Delivery Notes</Label>
            <Textarea
              rows={2}
              placeholder="e.g. Unload at Tower B ground floor staging area..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="text-xs"
            />
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
              disabled={createMr.isPending}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold"
            >
              {createMr.isPending ? "Submitting..." : "Send Indent"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
