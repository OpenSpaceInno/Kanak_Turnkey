import { useState } from "react";
import { useGetCurrentUser, useSwitchRole, getGetCurrentUserQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  User,
  Shield,
  Briefcase,
  Calculator,
  ShoppingCart,
  Eye,
  EyeOff,
  Lock,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  Building,
  Phone,
  Mail,
} from "lucide-react";

const ROLE_ICONS: Record<string, any> = {
  admin: Shield,
  project_manager: Briefcase,
  engineer: User,
  accountant: Calculator,
  procurement_officer: ShoppingCart,
  sales_manager: Briefcase,
  viewer: Eye,
};

export function ProfileSecurityTab() {
  const { data: user, isLoading } = useGetCurrentUser();
  const switchRole = useSwitchRole();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Change Password state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  if (isLoading || !user) {
    return <div className="p-8 text-center text-muted-foreground">Loading profile...</div>;
  }

  const handleRoleChange = (role: string) => {
    switchRole.mutate(
      { data: { role: role as any } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetCurrentUserQueryKey() });
          toast({
            title: "Role Switched",
            description: `Your active role is now ${role.replace("_", " ")}.`,
          });
        },
      }
    );
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);

    if (newPassword.length < 6) {
      setPasswordError("New password must be at least 6 characters long.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("New password and confirmation do not match.");
      return;
    }

    setIsChangingPassword(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to change password");
      }

      toast({
        title: "Password Updated",
        description: "Your account password has been successfully changed.",
      });

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      setPasswordError(err.message || "Failed to update password. Please check your credentials.");
    } finally {
      setIsChangingPassword(false);
    }
  };

  const userExt = user as any;

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2">
        {/* User Profile Card */}
        <Card className="shadow-sm border">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl flex items-center gap-2">
                  <User className="h-5 w-5 text-primary" />
                  User Profile
                </CardTitle>
                <CardDescription>Your personal and organizational details</CardDescription>
              </div>
              <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                Active Account
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4 p-3 bg-muted/40 rounded-lg border">
              <div className="h-12 w-12 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-lg">
                {user.name.charAt(0)}
              </div>
              <div>
                <div className="font-semibold text-base">{user.name}</div>
                <div className="text-sm text-muted-foreground flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5" />
                  {user.email}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-1">
              <div className="p-3 bg-muted/20 rounded-md border">
                <Label className="text-xs text-muted-foreground flex items-center gap-1">
                  <Briefcase className="h-3 w-3" /> Designation
                </Label>
                <div className="font-medium text-sm mt-1">{userExt.designation || "Executive Team"}</div>
              </div>
              <div className="p-3 bg-muted/20 rounded-md border">
                <Label className="text-xs text-muted-foreground flex items-center gap-1">
                  <Building className="h-3 w-3" /> Department
                </Label>
                <div className="font-medium text-sm mt-1">{userExt.department || "Operations"}</div>
              </div>
            </div>

            <div className="p-3 bg-muted/20 rounded-md border">
              <Label className="text-xs text-muted-foreground flex items-center gap-1">
                <Phone className="h-3 w-3" /> Contact Phone
              </Label>
              <div className="font-medium text-sm mt-1">{userExt.phone || "+91 98201 11223"}</div>
            </div>

            <div className="pt-2">
              <Label className="text-xs text-muted-foreground mb-1.5 block">Assigned Roles</Label>
              <div className="flex flex-wrap gap-1.5">
                {user.roles.map((r) => (
                  <Badge key={r} variant="secondary" className="capitalize text-xs">
                    {r.replace("_", " ")}
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Active Role Switcher Card */}
        <Card className="shadow-sm border">
          <CardHeader>
            <CardTitle className="text-xl flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Active Role Switcher
            </CardTitle>
            <CardDescription>
              Toggle your working view to preview module permissions and role perspectives
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RadioGroup value={user.activeRole} onValueChange={handleRoleChange} className="space-y-2.5">
              {user.roles.map((role) => {
                const Icon = ROLE_ICONS[role] || User;
                const isSelected = user.activeRole === role;
                return (
                  <div
                    key={role}
                    className={`flex items-center space-x-3 p-3 border rounded-lg transition-all cursor-pointer ${
                      isSelected
                        ? "border-primary bg-primary/5 ring-1 ring-primary/20 shadow-xs"
                        : "hover:bg-muted/50"
                    }`}
                    onClick={() => handleRoleChange(role)}
                  >
                    <RadioGroupItem value={role} id={role} />
                    <Label htmlFor={role} className="flex flex-1 items-center justify-between cursor-pointer">
                      <div className="flex items-center gap-3">
                        <div
                          className={`p-1.5 rounded-md ${
                            isSelected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                          }`}
                        >
                          <Icon className="h-4 w-4" />
                        </div>
                        <div>
                          <span className="font-medium capitalize text-sm">{role.replace("_", " ")}</span>
                          <span className="block text-xs text-muted-foreground">
                            {role === "admin" && "Full administrative authorization & approvals"}
                            {role === "project_manager" && "Site execution, scheduling & DPR verification"}
                            {role === "engineer" && "Field measurement, quality & material requests"}
                            {role === "accountant" && "Client billing (AR), vendor AP & petty cash"}
                            {role === "procurement_officer" && "RFQs, quotations & purchase orders"}
                            {role === "sales_manager" && "Lead conversion, BOQ estimation & customer intake"}
                            {role === "viewer" && "Read-only access across project matrices"}
                          </span>
                        </div>
                      </div>
                      {isSelected && (
                        <Badge variant="default" className="text-[10px] px-2 py-0.5">
                          Active
                        </Badge>
                      )}
                    </Label>
                  </div>
                );
              })}
            </RadioGroup>
          </CardContent>
        </Card>
      </div>

      {/* Change Password Card */}
      <Card className="shadow-sm border max-w-2xl">
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-primary" />
            Security & Change Password
          </CardTitle>
          <CardDescription>
            Update your account password to safeguard your access to the Kanak Turnkey ERP
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleChangePassword}>
          <CardContent className="space-y-4">
            {passwordError && (
              <div className="p-3 text-sm rounded-md bg-destructive/10 border border-destructive/20 text-destructive flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{passwordError}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="current-password">Current Password</Label>
              <div className="relative">
                <Input
                  id="current-password"
                  type={showCurrentPassword ? "text" : "password"}
                  placeholder="Enter current password (default: Kanak@123)"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <p className="text-xs text-muted-foreground">Default initialized password for seed accounts is Kanak@123</p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="new-password">New Password</Label>
                <div className="relative">
                  <Input
                    id="new-password"
                    type={showNewPassword ? "text" : "password"}
                    placeholder="Minimum 6 characters"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="confirm-password">Confirm New Password</Label>
                <div className="relative">
                  <Input
                    id="confirm-password"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Re-enter new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </div>

            <div className="text-xs text-muted-foreground bg-muted/30 p-2.5 rounded-md border flex items-start gap-2">
              <Lock className="h-3.5 w-3.5 mt-0.5 text-primary shrink-0" />
              <span>
                Passwords are cryptographically hashed using the standard scrypt Key Derivation Function (KDF) with
                per-user unique cryptographic salt.
              </span>
            </div>
          </CardContent>
          <CardFooter className="border-t bg-muted/10 py-3 flex justify-end">
            <Button type="submit" disabled={isChangingPassword || !newPassword || !confirmPassword} className="gap-2">
              {isChangingPassword ? (
                <>Updating Password...</>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  Save New Password
                </>
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}

