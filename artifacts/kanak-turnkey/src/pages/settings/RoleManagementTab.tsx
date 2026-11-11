import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  Shield,
  ShieldCheck,
  Plus,
  Pencil,
  Trash2,
  Users,
  CheckCircle2,
  Lock,
  Layers,
  FileCheck,
  HardHat,
  Truck,
  IndianRupee,
  Sliders,
} from "lucide-react";
import type { ManagedRole } from "./UserManagementTab";

export interface PermissionItem {
  key: string;
  label: string;
  module: string;
  description: string;
}

const MODULE_ICONS: Record<string, any> = {
  "Pre-Construction": FileCheck,
  "Projects & Sites": HardHat,
  "Procurement & Stock": Truck,
  "Finance & Accounts": IndianRupee,
  "Settings & Admin": Sliders,
};

export function RoleManagementTab() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [isCreateRoleOpen, setIsCreateRoleOpen] = useState(false);
  const [configuringRole, setConfiguringRole] = useState<ManagedRole | null>(null);
  const [deletingRole, setDeletingRole] = useState<ManagedRole | null>(null);

  // Create role form states
  const [newRoleName, setNewRoleName] = useState("");
  const [newRoleKey, setNewRoleKey] = useState("");
  const [newRoleDesc, setNewRoleDesc] = useState("");
  const [newRolePerms, setNewRolePerms] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Edit permissions state
  const [activePerms, setActivePerms] = useState<string[]>([]);

  const { data: roles = [], isLoading: isLoadingRoles } = useQuery<ManagedRole[]>({
    queryKey: ["/api/roles"],
    queryFn: async () => {
      const res = await fetch("/api/roles");
      if (!res.ok) throw new Error("Failed to load roles");
      return res.json();
    },
  });

  const { data: permissions = [] } = useQuery<PermissionItem[]>({
    queryKey: ["/api/permissions"],
    queryFn: async () => {
      const res = await fetch("/api/permissions");
      if (!res.ok) throw new Error("Failed to load permissions");
      return res.json();
    },
  });

  // Group permissions by module
  const groupedPermissions = permissions.reduce<Record<string, PermissionItem[]>>((acc, item) => {
    if (!acc[item.module]) acc[item.module] = [];
    acc[item.module].push(item);
    return acc;
  }, {});

  const handleOpenConfig = (role: ManagedRole) => {
    setConfiguringRole(role);
    setActivePerms(role.permissions || []);
  };

  const handleTogglePermission = (permKey: string) => {
    if (activePerms.includes(permKey)) {
      setActivePerms(activePerms.filter((p) => p !== permKey));
    } else {
      setActivePerms([...activePerms, permKey]);
    }
  };

  const handleToggleModuleAll = (moduleName: string, selectAll: boolean) => {
    const modulePermKeys = (groupedPermissions[moduleName] || []).map((p) => p.key);
    if (selectAll) {
      const merged = Array.from(new Set([...activePerms, ...modulePermKeys]));
      setActivePerms(merged);
    } else {
      setActivePerms(activePerms.filter((p) => !modulePermKeys.includes(p)));
    }
  };

  const handleSaveRolePermissions = async () => {
    if (!configuringRole) return;

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/roles/${configuringRole.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          permissions: activePerms,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update permissions");

      toast({
        title: "Permissions Updated",
        description: `Access privileges for role ${configuringRole.name} have been saved.`,
      });

      queryClient.invalidateQueries({ queryKey: ["/api/roles"] });
      setConfiguringRole(null);
    } catch (err: any) {
      toast({
        title: "Update Failed",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoleName) return;

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newRoleName,
          key: newRoleKey || newRoleName.toLowerCase().replace(/[^a-z0-9_]/g, "_"),
          description: newRoleDesc,
          permissions: newRolePerms,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create role");

      toast({
        title: "Role Created",
        description: `Role "${newRoleName}" has been successfully added.`,
      });

      queryClient.invalidateQueries({ queryKey: ["/api/roles"] });
      setIsCreateRoleOpen(false);

      // Reset
      setNewRoleName("");
      setNewRoleKey("");
      setNewRoleDesc("");
      setNewRolePerms([]);
    } catch (err: any) {
      toast({
        title: "Creation Error",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteRole = async () => {
    if (!deletingRole) return;

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/roles/${deletingRole.id}`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete role");

      toast({
        title: "Role Removed",
        description: `Role "${deletingRole.name}" has been deleted.`,
      });

      queryClient.invalidateQueries({ queryKey: ["/api/roles"] });
      setDeletingRole(null);
    } catch (err: any) {
      toast({
        title: "Delete Error",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <Card className="shadow-sm border">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-xl flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-primary" />
                Role Management & Permission Matrix
              </CardTitle>
              <CardDescription>
                Define operational roles, assign granular read/write privileges across construction workflows, and enforce security policies.
              </CardDescription>
            </div>
            <Button onClick={() => setIsCreateRoleOpen(true)} className="gap-2 shrink-0">
              <Plus className="h-4 w-4" />
              Create Custom Role
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Roles Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {isLoadingRoles ? (
          <div className="col-span-full text-center py-12 text-muted-foreground">
            Loading system roles...
          </div>
        ) : (
          roles.map((role) => {
            const permCount = role.permissions?.length || 0;
            const totalCount = permissions.length;
            const isFullAdmin = role.key === "admin";

            return (
              <Card key={role.id} className="border shadow-xs hover:border-primary/40 transition-colors flex flex-col justify-between">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <CardTitle className="text-base flex items-center gap-2">
                        <Shield className={`h-4 w-4 ${isFullAdmin ? "text-primary" : "text-muted-foreground"}`} />
                        {role.name}
                      </CardTitle>
                      <div className="text-xs font-mono text-muted-foreground mt-0.5">
                        Code: {role.key}
                      </div>
                    </div>
                    {role.isSystem ? (
                      <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 text-[10px]">
                        System Built-in
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200 text-[10px]">
                        Custom
                      </Badge>
                    )}
                  </div>
                  <CardDescription className="text-xs line-clamp-2 mt-2 leading-relaxed">
                    {role.description || "Custom business role defined for project operations."}
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-3 pb-3">
                  <div className="flex items-center justify-between text-xs pt-2 border-t">
                    <span className="text-muted-foreground flex items-center gap-1.5">
                      <Users className="h-3.5 w-3.5" />
                      Assigned Members:
                    </span>
                    <Badge variant="secondary" className="font-semibold text-xs">
                      {role.userCount} {role.userCount === 1 ? "user" : "users"}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground flex items-center gap-1.5">
                      <Layers className="h-3.5 w-3.5" />
                      Privileges Enabled:
                    </span>
                    <span className="font-medium text-xs">
                      {isFullAdmin ? (
                        <span className="text-emerald-600 font-semibold">Full Access (All)</span>
                      ) : (
                        <span>{permCount} / {totalCount}</span>
                      )}
                    </span>
                  </div>
                </CardContent>

                <CardFooter className="pt-2 pb-3 border-t bg-muted/10 flex items-center justify-between gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 gap-1.5 text-xs h-8"
                    onClick={() => handleOpenConfig(role)}
                  >
                    <Sliders className="h-3.5 w-3.5" />
                    Configure Permissions
                  </Button>

                  {!role.isSystem && role.userCount === 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive h-8 px-2"
                      onClick={() => setDeletingRole(role)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </CardFooter>
              </Card>
            );
          })
        )}
      </div>

      {/* Configure Role Permissions Dialog */}
      <Dialog open={Boolean(configuringRole)} onOpenChange={(open) => !open && setConfiguringRole(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
          <DialogHeader className="shrink-0 border-b pb-3">
            <div className="flex items-center justify-between pr-6">
              <div>
                <DialogTitle className="flex items-center gap-2">
                  <Sliders className="h-5 w-5 text-primary" />
                  Permissions Matrix: {configuringRole?.name}
                </DialogTitle>
                <DialogDescription>
                  Configure granular capability flags across each business module for role code{" "}
                  <code className="font-mono text-xs font-semibold">{configuringRole?.key}</code>.
                </DialogDescription>
              </div>
              <Badge variant="secondary" className="text-xs">
                {activePerms.length} / {permissions.length} enabled
              </Badge>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-6 py-4 pr-1">
            {Object.entries(groupedPermissions).map(([moduleName, items]) => {
              const Icon = MODULE_ICONS[moduleName] || Layers;
              const moduleKeys = items.map((i) => i.key);
              const allSelected = moduleKeys.every((k) => activePerms.includes(k));
              const someSelected = moduleKeys.some((k) => activePerms.includes(k));

              return (
                <div key={moduleName} className="border rounded-lg p-4 bg-card shadow-2xs space-y-3">
                  <div className="flex items-center justify-between border-b pb-2">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-md bg-primary/10 text-primary">
                        <Icon className="h-4 w-4" />
                      </div>
                      <h4 className="font-semibold text-sm">{moduleName}</h4>
                      <Badge variant="outline" className="text-[10px]">
                        {moduleKeys.filter((k) => activePerms.includes(k)).length} / {items.length}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-xs h-7 px-2"
                        onClick={() => handleToggleModuleAll(moduleName, !allSelected)}
                      >
                        {allSelected ? "Deselect All" : "Select All"}
                      </Button>
                    </div>
                  </div>

                  <div className="grid gap-2.5 sm:grid-cols-2 pt-1">
                    {items.map((perm) => {
                      const isChecked = activePerms.includes(perm.key);
                      return (
                        <div
                          key={perm.key}
                          className={`flex items-start justify-between p-2.5 rounded-md border text-xs transition-colors ${
                            isChecked ? "border-primary/40 bg-primary/5" : "bg-muted/10 hover:bg-muted/30"
                          }`}
                        >
                          <div className="space-y-0.5 pr-2">
                            <div className="font-medium text-foreground">{perm.label}</div>
                            <div className="text-[11px] text-muted-foreground leading-tight">
                              {perm.description}
                            </div>
                            <div className="font-mono text-[10px] text-muted-foreground/70">
                              {perm.key}
                            </div>
                          </div>
                          <Switch
                            checked={isChecked}
                            onCheckedChange={() => handleTogglePermission(perm.key)}
                            className="shrink-0 mt-0.5"
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          <DialogFooter className="shrink-0 border-t pt-3 flex items-center justify-between sm:justify-between">
            <span className="text-xs text-muted-foreground">
              Changes take effect on subsequent user actions and navigation.
            </span>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => setConfiguringRole(null)}>
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleSaveRolePermissions}
                disabled={isSubmitting}
                className="gap-2"
              >
                <CheckCircle2 className="h-4 w-4" />
                {isSubmitting ? "Saving..." : "Save Permissions"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Custom Role Dialog */}
      <Dialog open={isCreateRoleOpen} onOpenChange={setIsCreateRoleOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-primary" />
              Create Custom Business Role
            </DialogTitle>
            <DialogDescription>
              Define a tailored access role for specific field specialists or site contractors.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateRole} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="create-role-name">Role Title *</Label>
              <Input
                id="create-role-name"
                placeholder="e.g. Quantity Surveyor & Auditor"
                value={newRoleName}
                onChange={(e) => {
                  setNewRoleName(e.target.value);
                  if (!newRoleKey) {
                    setNewRoleKey(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "_"));
                  }
                }}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="create-role-key">Role Key / Code Identifier</Label>
              <Input
                id="create-role-key"
                placeholder="e.g. quantity_surveyor"
                value={newRoleKey}
                onChange={(e) => setNewRoleKey(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Unique internal identifier used in permission checks (letters, numbers, underscores).
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="create-role-desc">Description</Label>
              <Textarea
                id="create-role-desc"
                placeholder="Explain the duties and operational scope of this role..."
                value={newRoleDesc}
                onChange={(e) => setNewRoleDesc(e.target.value)}
                rows={3}
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setIsCreateRoleOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting || !newRoleName}>
                {isSubmitting ? "Creating Role..." : "Create Role"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Role Confirmation Dialog */}
      <Dialog open={Boolean(deletingRole)} onOpenChange={(open) => !open && setDeletingRole(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-destructive flex items-center gap-2">
              <Trash2 className="h-5 w-5" />
              Delete Custom Role
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete role <strong>{deletingRole?.name}</strong>?
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => setDeletingRole(null)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDeleteRole}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Deleting..." : "Delete Role"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

