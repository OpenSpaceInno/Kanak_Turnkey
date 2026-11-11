import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import {
  Users,
  UserPlus,
  Search,
  MoreVertical,
  Pencil,
  KeyRound,
  Trash2,
  CheckCircle2,
  XCircle,
  Shield,
  Briefcase,
  Building,
  Phone,
  Mail,
  UserCheck,
  UserX,
} from "lucide-react";

export interface ManagedUser {
  id: number;
  email: string;
  name: string;
  avatarUrl: string | null;
  roles: string[];
  activeRole: string;
  phone: string;
  designation: string;
  department: string;
  status: string;
  hasPasswordSet: boolean;
  createdAt: string;
}

export interface ManagedRole {
  id: number;
  key: string;
  name: string;
  description: string;
  isSystem: boolean;
  permissions: string[];
  userCount: number;
}

const DEPARTMENTS = [
  "Executive Management",
  "Operations & Projects",
  "Site Engineering",
  "Field Operations & Supervision",
  "Supply Chain & Procurement",
  "Trade Contractors & Subcontractors",
  "Finance & Accounts",
  "Pre-Construction & Sales",
  "General Administration",
];

export function UserManagementTab() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  // Modals state
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<ManagedUser | null>(null);
  const [resettingUser, setResettingUser] = useState<ManagedUser | null>(null);
  const [deletingUser, setDeletingUser] = useState<ManagedUser | null>(null);

  // Form states for Add User
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("Kanak@123");
  const [newPhone, setNewPhone] = useState("");
  const [newDesignation, setNewDesignation] = useState("");
  const [newDepartment, setNewDepartment] = useState(DEPARTMENTS[1]);
  const [newRoles, setNewRoles] = useState<string[]>(["engineer"]);
  const [newActiveRole, setNewActiveRole] = useState("engineer");
  const [newStatus, setNewStatus] = useState("active");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form states for Edit User
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editDesignation, setEditDesignation] = useState("");
  const [editDepartment, setEditDepartment] = useState("");
  const [editRoles, setEditRoles] = useState<string[]>([]);
  const [editActiveRole, setEditActiveRole] = useState("");
  const [editStatus, setEditStatus] = useState("active");

  // Reset password modal state
  const [adminNewPassword, setAdminNewPassword] = useState("");

  const { data: users = [], isLoading: isLoadingUsers } = useQuery<ManagedUser[]>({
    queryKey: ["/api/users"],
    queryFn: async () => {
      const res = await fetch("/api/users");
      if (!res.ok) throw new Error("Failed to load users");
      return res.json();
    },
  });

  const { data: roles = [] } = useQuery<ManagedRole[]>({
    queryKey: ["/api/roles"],
    queryFn: async () => {
      const res = await fetch("/api/roles");
      if (!res.ok) throw new Error("Failed to load roles");
      return res.json();
    },
  });

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.designation.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.department.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.phone.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesRole = roleFilter === "all" || u.roles.includes(roleFilter);
    const matchesStatus = statusFilter === "all" || u.status === statusFilter;

    return matchesSearch && matchesRole && matchesStatus;
  });

  const totalUsers = users.length;
  const activeUsers = users.filter((u) => u.status === "active").length;
  const inactiveUsers = totalUsers - activeUsers;

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newEmail) return;

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName,
          email: newEmail,
          password: newPassword,
          phone: newPhone,
          designation: newDesignation,
          department: newDepartment,
          roles: newRoles,
          activeRole: newActiveRole,
          status: newStatus,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create user");

      toast({
        title: "User Created",
        description: `Successfully added ${newName} to the team.`,
      });

      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/roles"] });
      setIsAddUserOpen(false);

      // Reset form
      setNewName("");
      setNewEmail("");
      setNewPhone("");
      setNewDesignation("");
      setNewPassword("Kanak@123");
      setNewRoles(["engineer"]);
      setNewActiveRole("engineer");
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

  const openEditDialog = (u: ManagedUser) => {
    setEditingUser(u);
    setEditName(u.name);
    setEditEmail(u.email);
    setEditPhone(u.phone);
    setEditDesignation(u.designation);
    setEditDepartment(u.department || DEPARTMENTS[0]);
    setEditRoles(u.roles || []);
    setEditActiveRole(u.activeRole || u.roles[0] || "viewer");
    setEditStatus(u.status || "active");
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/users/${editingUser.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName,
          email: editEmail,
          phone: editPhone,
          designation: editDesignation,
          department: editDepartment,
          roles: editRoles,
          activeRole: editActiveRole,
          status: editStatus,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update user");

      toast({
        title: "User Updated",
        description: `Successfully updated profile for ${editName}.`,
      });

      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/roles"] });
      setEditingUser(null);
    } catch (err: any) {
      toast({
        title: "Update Error",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAdminResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resettingUser || !adminNewPassword) return;

    if (adminNewPassword.length < 6) {
      toast({
        title: "Password Error",
        description: "Password must be at least 6 characters long.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/users/${resettingUser.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          newPassword: adminNewPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to reset password");

      toast({
        title: "Password Reset Complete",
        description: `Password for ${resettingUser.name} has been updated.`,
      });

      setResettingUser(null);
      setAdminNewPassword("");
    } catch (err: any) {
      toast({
        title: "Reset Error",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (user: ManagedUser) => {
    const nextStatus = user.status === "active" ? "inactive" : "active";
    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });

      if (!res.ok) throw new Error("Failed to toggle status");

      toast({
        title: "Status Changed",
        description: `${user.name} is now ${nextStatus}.`,
      });

      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
    } catch (err: any) {
      toast({
        title: "Action Failed",
        description: err.message,
        variant: "destructive",
      });
    }
  };

  const handleDeleteUser = async () => {
    if (!deletingUser) return;

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/users/${deletingUser.id}`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete user");

      toast({
        title: "User Removed",
        description: `Account for ${deletingUser.name} has been deleted.`,
      });

      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/roles"] });
      setDeletingUser(null);
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
      {/* User Stats Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4 flex items-center gap-3 border shadow-xs">
          <div className="p-2.5 rounded-lg bg-primary/10 text-primary">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <div className="text-2xl font-bold">{totalUsers}</div>
            <div className="text-xs text-muted-foreground">Total Team Members</div>
          </div>
        </Card>

        <Card className="p-4 flex items-center gap-3 border shadow-xs">
          <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-600">
            <UserCheck className="h-5 w-5" />
          </div>
          <div>
            <div className="text-2xl font-bold text-emerald-600">{activeUsers}</div>
            <div className="text-xs text-muted-foreground">Active Accounts</div>
          </div>
        </Card>

        <Card className="p-4 flex items-center gap-3 border shadow-xs">
          <div className="p-2.5 rounded-lg bg-amber-500/10 text-amber-600">
            <UserX className="h-5 w-5" />
          </div>
          <div>
            <div className="text-2xl font-bold text-amber-600">{inactiveUsers}</div>
            <div className="text-xs text-muted-foreground">Suspended / Inactive</div>
          </div>
        </Card>

        <Card className="p-4 flex items-center gap-3 border shadow-xs">
          <div className="p-2.5 rounded-lg bg-indigo-500/10 text-indigo-600">
            <Shield className="h-5 w-5" />
          </div>
          <div>
            <div className="text-2xl font-bold text-indigo-600">{roles.length}</div>
            <div className="text-xs text-muted-foreground">Configured Roles</div>
          </div>
        </Card>
      </div>

      {/* Main Directory Card */}
      <Card className="shadow-sm border">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-xl flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                User Directory & Access Control
              </CardTitle>
              <CardDescription>
                Provision team logins, assign project roles, set departments, and manage access credentials
              </CardDescription>
            </div>
            <Button onClick={() => setIsAddUserOpen(true)} className="gap-2 shrink-0">
              <UserPlus className="h-4 w-4" />
              Add Team Member
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Search & Filter Toolbar */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, designation, or phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Filter by Role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                {roles.map((r) => (
                  <SelectItem key={r.key} value={r.key}>
                    {r.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="active">Active Only</SelectItem>
                <SelectItem value="inactive">Inactive Only</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Users Table */}
          <div className="border rounded-md overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead>User / Email</TableHead>
                  <TableHead>Designation & Department</TableHead>
                  <TableHead>Assigned Roles</TableHead>
                  <TableHead>Contact Phone</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoadingUsers ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      Loading user accounts...
                    </TableCell>
                  </TableRow>
                ) : filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No team members found matching your search filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsers.map((u) => (
                    <TableRow key={u.id} className="hover:bg-muted/30">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm shrink-0">
                            {u.name.charAt(0)}
                          </div>
                          <div>
                            <div className="font-medium text-sm text-foreground flex items-center gap-1.5">
                              {u.name}
                            </div>
                            <div className="text-xs text-muted-foreground">{u.email}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm font-medium">{u.designation || "Project Team Member"}</div>
                        <div className="text-xs text-muted-foreground">{u.department || "General Operations"}</div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1 max-w-[260px]">
                          {u.roles.map((r) => (
                            <Badge
                              key={r}
                              variant={r === "admin" ? "default" : "secondary"}
                              className="text-[11px] px-1.5 py-0 capitalize"
                            >
                              {r.replace("_", " ")}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-xs text-muted-foreground flex items-center gap-1">
                          <Phone className="h-3 w-3 shrink-0" />
                          {u.phone || "—"}
                        </div>
                      </TableCell>
                      <TableCell>
                        {u.status === "active" ? (
                          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5 animate-pulse" />
                            Active
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-muted text-muted-foreground text-xs">
                            <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground mr-1.5" />
                            Inactive
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem onClick={() => openEditDialog(u)} className="gap-2 cursor-pointer">
                              <Pencil className="h-4 w-4" />
                              Edit Profile & Roles
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                setResettingUser(u);
                                setAdminNewPassword("");
                              }}
                              className="gap-2 cursor-pointer"
                            >
                              <KeyRound className="h-4 w-4" />
                              Reset Password
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleToggleStatus(u)}
                              className="gap-2 cursor-pointer"
                            >
                              {u.status === "active" ? (
                                <>
                                  <XCircle className="h-4 w-4 text-amber-600" />
                                  <span>Suspend Access</span>
                                </>
                              ) : (
                                <>
                                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                                  <span>Activate Access</span>
                                </>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => setDeletingUser(u)}
                              className="gap-2 text-destructive focus:text-destructive cursor-pointer"
                            >
                              <Trash2 className="h-4 w-4" />
                              Delete Account
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Add User Dialog */}
      <Dialog open={isAddUserOpen} onOpenChange={setIsAddUserOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-primary" />
              Add New Team Member
            </DialogTitle>
            <DialogDescription>
              Create login credentials and assign business roles for a new user in the organization.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateUser} className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="add-name">Full Name *</Label>
                <Input
                  id="add-name"
                  placeholder="e.g. Rahul Sharma"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="add-email">Email Address *</Label>
                <Input
                  id="add-email"
                  type="email"
                  placeholder="rahul.sharma@kanak.in"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="add-phone">Contact Phone</Label>
                <Input
                  id="add-phone"
                  placeholder="+91 98765 43210"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="add-password">Initial Password</Label>
                <Input
                  id="add-password"
                  placeholder="Default: Kanak@123"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="add-designation">Designation</Label>
                <Input
                  id="add-designation"
                  placeholder="e.g. Project Manager, Site Engineer"
                  value={newDesignation}
                  onChange={(e) => setNewDesignation(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="add-dept">Department</Label>
                <Select value={newDepartment} onValueChange={setNewDepartment}>
                  <SelectTrigger id="add-dept">
                    <SelectValue placeholder="Select Department" />
                  </SelectTrigger>
                  <SelectContent>
                    {DEPARTMENTS.map((d) => (
                      <SelectItem key={d} value={d}>
                        {d}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2 pt-1 border-t">
              <Label className="text-sm font-semibold">Assign System Roles</Label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {roles.map((r) => {
                  const isChecked = newRoles.includes(r.key);
                  return (
                    <label
                      key={r.key}
                      className={`flex items-center gap-2 p-2 border rounded-md text-xs cursor-pointer transition-colors ${
                        isChecked ? "bg-primary/5 border-primary/50" : "hover:bg-muted/40"
                      }`}
                    >
                      <Checkbox
                        checked={isChecked}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setNewRoles([...newRoles, r.key]);
                          } else {
                            if (newRoles.length > 1) {
                              setNewRoles(newRoles.filter((k) => k !== r.key));
                            }
                          }
                        }}
                      />
                      <span className="capitalize">{r.name}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-1">
              <div className="space-y-1.5">
                <Label htmlFor="add-active-role">Default Active Role</Label>
                <Select value={newActiveRole} onValueChange={setNewActiveRole}>
                  <SelectTrigger id="add-active-role">
                    <SelectValue placeholder="Active Role" />
                  </SelectTrigger>
                  <SelectContent>
                    {newRoles.map((rk) => (
                      <SelectItem key={rk} value={rk} className="capitalize">
                        {rk.replace("_", " ")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="add-status">Account Status</Label>
                <Select value={newStatus} onValueChange={setNewStatus}>
                  <SelectTrigger id="add-status">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setIsAddUserOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting || !newName || !newEmail}>
                {isSubmitting ? "Creating User..." : "Create Account"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={Boolean(editingUser)} onOpenChange={(open) => !open && setEditingUser(null)}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-5 w-5 text-primary" />
              Edit User Profile & Access
            </DialogTitle>
            <DialogDescription>
              Update organization info, assigned privileges, and contact details for {editingUser?.name}.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleUpdateUser} className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="edit-name">Full Name *</Label>
                <Input
                  id="edit-name"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="edit-email">Email Address *</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="edit-phone">Contact Phone</Label>
                <Input
                  id="edit-phone"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="edit-dept">Department</Label>
                <Select value={editDepartment} onValueChange={setEditDepartment}>
                  <SelectTrigger id="edit-dept">
                    <SelectValue placeholder="Department" />
                  </SelectTrigger>
                  <SelectContent>
                    {DEPARTMENTS.map((d) => (
                      <SelectItem key={d} value={d}>
                        {d}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="edit-designation">Designation</Label>
                <Input
                  id="edit-designation"
                  value={editDesignation}
                  onChange={(e) => setEditDesignation(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="edit-status">Status</Label>
                <Select value={editStatus} onValueChange={setEditStatus}>
                  <SelectTrigger id="edit-status">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2 pt-1 border-t">
              <Label className="text-sm font-semibold">Assigned Business Roles</Label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {roles.map((r) => {
                  const isChecked = editRoles.includes(r.key);
                  return (
                    <label
                      key={r.key}
                      className={`flex items-center gap-2 p-2 border rounded-md text-xs cursor-pointer transition-colors ${
                        isChecked ? "bg-primary/5 border-primary/50" : "hover:bg-muted/40"
                      }`}
                    >
                      <Checkbox
                        checked={isChecked}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setEditRoles([...editRoles, r.key]);
                          } else {
                            if (editRoles.length > 1) {
                              setEditRoles(editRoles.filter((k) => k !== r.key));
                            }
                          }
                        }}
                      />
                      <span className="capitalize">{r.name}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="space-y-1.5 pt-1">
              <Label htmlFor="edit-active-role">Active Role (Default Perspective)</Label>
              <Select value={editActiveRole} onValueChange={setEditActiveRole}>
                <SelectTrigger id="edit-active-role">
                  <SelectValue placeholder="Active Role" />
                </SelectTrigger>
                <SelectContent>
                  {editRoles.map((rk) => (
                    <SelectItem key={rk} value={rk} className="capitalize">
                      {rk.replace("_", " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setEditingUser(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting || !editName || !editEmail}>
                {isSubmitting ? "Saving Changes..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Admin Reset Password Dialog */}
      <Dialog open={Boolean(resettingUser)} onOpenChange={(open) => !open && setResettingUser(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-primary" />
              Reset Account Password
            </DialogTitle>
            <DialogDescription>
              Set a new permanent password for <strong>{resettingUser?.name}</strong> ({resettingUser?.email}).
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAdminResetPassword} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="admin-new-pw">New Password</Label>
              <Input
                id="admin-new-pw"
                type="text"
                placeholder="Enter new password (min. 6 characters)"
                value={adminNewPassword}
                onChange={(e) => setAdminNewPassword(e.target.value)}
                required
              />
              <p className="text-xs text-muted-foreground">
                The user can immediately log in with this new credential.
              </p>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setResettingUser(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting || adminNewPassword.length < 6}>
                {isSubmitting ? "Updating..." : "Reset Password"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete User Confirmation Dialog */}
      <Dialog open={Boolean(deletingUser)} onOpenChange={(open) => !open && setDeletingUser(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-destructive flex items-center gap-2">
              <Trash2 className="h-5 w-5" />
              Confirm Account Removal
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to permanently delete the user account for{" "}
              <strong>{deletingUser?.name}</strong>? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => setDeletingUser(null)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDeleteUser}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Deleting..." : "Permanently Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

