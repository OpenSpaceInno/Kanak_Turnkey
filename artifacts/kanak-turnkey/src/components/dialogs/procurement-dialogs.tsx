import { useState, useEffect, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useCreateVendor,
  useCreatePurchaseOrder,
  useCreateRfq,
  useCreateMaterial,
  useCreateMaterialRequest,
  useListProjects,
  useListVendors,
  getListVendorsQueryKey,
  getListPurchaseOrdersQueryKey,
  getListRfqsQueryKey,
  getListMaterialsQueryKey,
  getListMaterialRequestsQueryKey,
} from "@workspace/api-client-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </Label>
      {children}
    </div>
  );
}

export function NewVendorDialog({ trigger }: { trigger: ReactNode }) {
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();
  const create = useCreateVendor();

  const [form, setForm] = useState({
    name: "",
    contactPerson: "",
    email: "",
    phone: "",
    category: "",
    address: "",
    rating: "",
    status: "active",
  });

  const submit = async () => {
    if (!form.name.trim()) return;
    await create.mutateAsync({
      data: {
        name: form.name,
        contactPerson: form.contactPerson || null,
        email: form.email || null,
        phone: form.phone || null,
        category: form.category || null,
        address: form.address || null,
        rating: form.rating ? Number(form.rating) : null,
        status: form.status as "active" | "inactive",
      },
    });
    await qc.invalidateQueries({ queryKey: getListVendorsQueryKey() });
    setOpen(false);
    setForm({
      name: "",
      contactPerson: "",
      email: "",
      phone: "",
      category: "",
      address: "",
      rating: "",
      status: "active",
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Vendor</DialogTitle>
          <DialogDescription>
            Onboard a new supplier or subcontractor.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-2">
          <div className="sm:col-span-2">
            <Field label="Vendor name *">
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Apex Steel & Cement Co."
              />
            </Field>
          </div>
          <Field label="Contact person">
            <Input
              value={form.contactPerson}
              onChange={(e) =>
                setForm({ ...form, contactPerson: e.target.value })
              }
              placeholder="Rajesh Kumar"
            />
          </Field>
          <Field label="Category">
            <Input
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              placeholder="Building Materials"
            />
          </Field>
          <Field label="Email">
            <Input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="contact@apex.com"
            />
          </Field>
          <Field label="Phone">
            <Input
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="+91 98765 43210"
            />
          </Field>
          <Field label="Rating (0–5)">
            <Input
              type="number"
              step="0.1"
              min="0"
              max="5"
              value={form.rating}
              onChange={(e) => setForm({ ...form, rating: e.target.value })}
              placeholder="4.5"
            />
          </Field>
          <Field label="Status">
            <Select
              value={form.status}
              onValueChange={(v) => setForm({ ...form, status: v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <div className="sm:col-span-2">
            <Field label="Address">
              <Textarea
                value={form.address}
                onChange={(e) =>
                  setForm({ ...form, address: e.target.value })
                }
                rows={2}
              />
            </Field>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={submit}
            disabled={!form.name.trim() || create.isPending}
          >
            {create.isPending ? "Saving..." : "Add vendor"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function NewPurchaseOrderDialog({
  trigger,
}: {
  trigger: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();
  const create = useCreatePurchaseOrder();
  const { data: projects } = useListProjects();
  const { data: vendors } = useListVendors();

  const [form, setForm] = useState({
    projectId: "",
    vendorId: "",
    description: "",
    totalAmount: "",
    deliveryDate: "",
    status: "draft",
  });

  const submit = async () => {
    if (!form.projectId || !form.vendorId || !form.totalAmount) return;
    await create.mutateAsync({
      data: {
        projectId: Number(form.projectId),
        vendorId: Number(form.vendorId),
        description: form.description || null,
        totalAmount: Number(form.totalAmount),
        deliveryDate: form.deliveryDate || null,
        status: form.status as
          | "draft"
          | "issued"
          | "acknowledged"
          | "in_transit"
          | "delivered"
          | "cancelled",
      },
    });
    await qc.invalidateQueries({ queryKey: getListPurchaseOrdersQueryKey() });
    setOpen(false);
    setForm({
      projectId: "",
      vendorId: "",
      description: "",
      totalAmount: "",
      deliveryDate: "",
      status: "draft",
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Create Purchase Order</DialogTitle>
          <DialogDescription>
            PO number is generated automatically.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-2">
          <Field label="Project *">
            <Select
              value={form.projectId}
              onValueChange={(v) => setForm({ ...form, projectId: v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select project" />
              </SelectTrigger>
              <SelectContent>
                {projects?.map((p) => (
                  <SelectItem key={p.id} value={String(p.id)}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Vendor *">
            <Select
              value={form.vendorId}
              onValueChange={(v) => setForm({ ...form, vendorId: v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select vendor" />
              </SelectTrigger>
              <SelectContent>
                {vendors?.map((v) => (
                  <SelectItem key={v.id} value={String(v.id)}>
                    {v.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Total amount (INR) *">
            <Input
              type="number"
              value={form.totalAmount}
              onChange={(e) =>
                setForm({ ...form, totalAmount: e.target.value })
              }
              placeholder="850000"
            />
          </Field>
          <Field label="Delivery date">
            <Input
              type="date"
              value={form.deliveryDate}
              onChange={(e) =>
                setForm({ ...form, deliveryDate: e.target.value })
              }
            />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Status">
              <Select
                value={form.status}
                onValueChange={(v) => setForm({ ...form, status: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="issued">Issued</SelectItem>
                  <SelectItem value="acknowledged">Acknowledged</SelectItem>
                  <SelectItem value="in_transit">In transit</SelectItem>
                  <SelectItem value="delivered">Delivered</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </div>
          <div className="sm:col-span-2">
            <Field label="Description">
              <Textarea
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                placeholder="Items, terms, delivery instructions"
                rows={3}
              />
            </Field>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={submit}
            disabled={
              !form.projectId ||
              !form.vendorId ||
              !form.totalAmount ||
              create.isPending
            }
          >
            {create.isPending ? "Creating..." : "Create PO"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function NewRfqDialog({
  trigger,
  defaultMrId,
  defaultProjectId,
  defaultTitle,
}: {
  trigger: ReactNode;
  defaultMrId?: number;
  defaultProjectId?: number;
  defaultTitle?: string;
}) {
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();
  const create = useCreateRfq();
  const { data: projects } = useListProjects();

  const [form, setForm] = useState({
    projectId: defaultProjectId ? String(defaultProjectId) : "",
    title: defaultTitle ? `RFQ: ${defaultTitle}` : "",
    description: defaultMrId ? `Generated from Material Request #${defaultMrId}` : "",
  });

  useEffect(() => {
    if (open) {
      setForm({
        projectId: defaultProjectId ? String(defaultProjectId) : "",
        title: defaultTitle ? (defaultTitle.startsWith("RFQ:") ? defaultTitle : `RFQ: ${defaultTitle}`) : "",
        description: defaultMrId ? `Generated from Material Request #${defaultMrId}` : "",
      });
    }
  }, [open, defaultProjectId, defaultTitle, defaultMrId]);

  const submit = async () => {
    if (!form.projectId || !form.title.trim()) return;
    await create.mutateAsync({
      data: {
        projectId: Number(form.projectId),
        materialRequestId: defaultMrId || null,
        title: form.title,
        description: form.description || null,
      },
    });
    await qc.invalidateQueries({ queryKey: getListRfqsQueryKey() });
    setOpen(false);
    setForm({ projectId: "", title: "", description: "" });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Create RFQ</DialogTitle>
          <DialogDescription>
            Issue a request for quotations to vendors.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-2">
          <Field label="Project *">
            <Select
              value={form.projectId}
              onValueChange={(v) => setForm({ ...form, projectId: v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select project" />
              </SelectTrigger>
              <SelectContent>
                {projects?.map((p) => (
                  <SelectItem key={p.id} value={String(p.id)}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <div className="sm:col-span-2">
            <Field label="Title *">
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Supply of vitrified flooring tiles"
              />
            </Field>
          </div>
          <div className="sm:col-span-2">
            <Field label="Description">
              <Textarea
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                placeholder="Specifications, quantity, delivery requirements"
                rows={3}
              />
            </Field>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={submit}
            disabled={
              !form.projectId || !form.title.trim() || create.isPending
            }
          >
            {create.isPending ? "Creating..." : "Create RFQ"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function NewMaterialDialog({ trigger }: { trigger: ReactNode }) {
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();
  const create = useCreateMaterial();
  const { data: projects } = useListProjects();

  const [form, setForm] = useState({
    projectId: "none",
    name: "",
    description: "",
    unit: "nos",
    quantityOnHand: "0",
    quantityCommitted: "0",
    quantityConsumed: "0",
    minimumStock: "0",
  });

  const submit = async () => {
    if (!form.name.trim() || !form.unit) return;
    await create.mutateAsync({
      data: {
        projectId:
          form.projectId && form.projectId !== "none"
            ? Number(form.projectId)
            : null,
        name: form.name,
        description: form.description || null,
        unit: form.unit,
        quantityOnHand: form.quantityOnHand
          ? Number(form.quantityOnHand)
          : null,
        quantityCommitted: form.quantityCommitted
          ? Number(form.quantityCommitted)
          : null,
        quantityConsumed: form.quantityConsumed
          ? Number(form.quantityConsumed)
          : null,
        minimumStock: form.minimumStock ? Number(form.minimumStock) : null,
      },
    });
    await qc.invalidateQueries({ queryKey: getListMaterialsQueryKey() });
    setOpen(false);
    setForm({
      projectId: "none",
      name: "",
      description: "",
      unit: "nos",
      quantityOnHand: "0",
      quantityCommitted: "0",
      quantityConsumed: "0",
      minimumStock: "0",
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Material</DialogTitle>
          <DialogDescription>
            Track inventory for a material or component.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-2">
          <div className="sm:col-span-2">
            <Field label="Material name *">
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Portland Cement OPC 53 Grade"
              />
            </Field>
          </div>
          <Field label="Project">
            <Select
              value={form.projectId}
              onValueChange={(v) => setForm({ ...form, projectId: v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="None" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None (general stock)</SelectItem>
                {projects?.map((p) => (
                  <SelectItem key={p.id} value={String(p.id)}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Unit *">
            <Input
              value={form.unit}
              onChange={(e) => setForm({ ...form, unit: e.target.value })}
              placeholder="bags / kg / m / nos"
            />
          </Field>
          <Field label="On hand">
            <Input
              type="number"
              value={form.quantityOnHand}
              onChange={(e) =>
                setForm({ ...form, quantityOnHand: e.target.value })
              }
            />
          </Field>
          <Field label="Minimum stock">
            <Input
              type="number"
              value={form.minimumStock}
              onChange={(e) =>
                setForm({ ...form, minimumStock: e.target.value })
              }
            />
          </Field>
          <Field label="Committed">
            <Input
              type="number"
              value={form.quantityCommitted}
              onChange={(e) =>
                setForm({ ...form, quantityCommitted: e.target.value })
              }
            />
          </Field>
          <Field label="Consumed">
            <Input
              type="number"
              value={form.quantityConsumed}
              onChange={(e) =>
                setForm({ ...form, quantityConsumed: e.target.value })
              }
            />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Description">
              <Textarea
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                rows={2}
              />
            </Field>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={submit}
            disabled={
              !form.name.trim() || !form.unit || create.isPending
            }
          >
            {create.isPending ? "Saving..." : "Add material"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function NewMaterialRequestDialog({
  trigger,
  defaultTitle,
  defaultProjectId,
}: {
  trigger: ReactNode;
  defaultTitle?: string;
  defaultProjectId?: number;
}) {
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();
  const create = useCreateMaterialRequest();
  const { data: projects } = useListProjects();

  const [form, setForm] = useState({
    projectId: defaultProjectId ? String(defaultProjectId) : "",
    title: defaultTitle || "",
    description: "",
    quantity: "",
    unit: "nos",
  });

  const submit = async () => {
    if (!form.projectId || !form.title.trim() || !form.quantity) return;
    await create.mutateAsync({
      data: {
        projectId: Number(form.projectId),
        title: form.title,
        description: form.description || null,
        quantity: Number(form.quantity),
        unit: form.unit,
      },
    });
    await qc.invalidateQueries({ queryKey: getListMaterialRequestsQueryKey() });
    setOpen(false);
    setForm({ projectId: "", title: "", description: "", quantity: "", unit: "nos" });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>New Material Request</DialogTitle>
          <DialogDescription>
            Identify a material need before sending RFQs to vendors.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-2">
          <div className="sm:col-span-2">
            <Field label="Project *">
              <Select
                value={form.projectId}
                onValueChange={(v) => setForm({ ...form, projectId: v })}
              >
                <SelectTrigger><SelectValue placeholder="Select project" /></SelectTrigger>
                <SelectContent>
                  {projects?.map((p) => (
                    <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>
          <div className="sm:col-span-2">
            <Field label="Material / item *">
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Portland Cement OPC 53 Grade"
              />
            </Field>
          </div>
          <Field label="Quantity *">
            <Input
              type="number"
              min="0"
              value={form.quantity}
              onChange={(e) => setForm({ ...form, quantity: e.target.value })}
              placeholder="500"
            />
          </Field>
          <Field label="Unit *">
            <Input
              value={form.unit}
              onChange={(e) => setForm({ ...form, unit: e.target.value })}
              placeholder="bags / kg / m / nos"
            />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Description / specs">
              <Textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={2}
                placeholder="Grade, brand preference, delivery site, etc."
              />
            </Field>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button
            onClick={submit}
            disabled={!form.projectId || !form.title.trim() || !form.quantity || create.isPending}
          >
            {create.isPending ? "Submitting..." : "Submit request"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
