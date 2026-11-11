import { useState } from "react";
import { useGetCurrentUser } from "@workspace/api-client-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { User, Users, Shield, Building2, Sliders, ShieldCheck } from "lucide-react";

import { ProfileSecurityTab } from "./ProfileSecurityTab";
import { UserManagementTab } from "./UserManagementTab";
import { RoleManagementTab } from "./RoleManagementTab";
import { CompanyInfoTab } from "./CompanyInfoTab";

export default function Settings() {
  const { data: user, isLoading } = useGetCurrentUser();
  const [activeTab, setActiveTab] = useState(() => {
    if (typeof window !== "undefined") {
      const param = new URLSearchParams(window.location.search).get("tab");
      if (param && ["profile", "users", "roles", "company"].includes(param)) {
        return param;
      }
    }
    return "profile";
  });

  if (isLoading || !user) {
    return (
      <div className="flex items-center justify-center min-h-[400px] text-muted-foreground">
        Loading system settings...
      </div>
    );
  }

  const isAdmin = user.roles.includes("admin") || user.activeRole === "admin";

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("tab", tab);
      window.history.replaceState({}, "", url.toString());
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold tracking-tight">Settings & Administration</h1>
            <Badge variant="outline" className="text-xs bg-primary/5 text-primary border-primary/20">
              Enterprise v2.4
            </Badge>
          </div>
          <p className="text-muted-foreground text-sm mt-1">
            Manage your personal credentials, company profile, user accounts, and system role permissions.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto bg-muted/40 p-2 rounded-lg border text-xs">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-muted-foreground">Signed in as:</span>
            <span className="font-semibold text-foreground">{user.name}</span>
            <Badge variant="secondary" className="capitalize text-[11px] font-medium">
              {(user.activeRole || "admin").replace("_", " ")}
            </Badge>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
        <TabsList className="grid grid-cols-2 md:grid-cols-4 w-full h-auto p-1.5 bg-muted/70 border border-border/80 rounded-xl gap-1.5 shadow-2xs">
          <TabsTrigger
            value="profile"
            className="flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium"
          >
            <User className="h-4 w-4" />
            <span>Profile & Security</span>
          </TabsTrigger>

          <TabsTrigger
            value="users"
            className="flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium"
          >
            <Users className="h-4 w-4" />
            <span>User Management</span>
          </TabsTrigger>

          <TabsTrigger
            value="roles"
            className="flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium"
          >
            <ShieldCheck className="h-4 w-4" />
            <span>Role Permissions</span>
          </TabsTrigger>

          <TabsTrigger
            value="company"
            className="flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium"
          >
            <Building2 className="h-4 w-4" />
            <span>Company Info & Tax</span>
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Profile & Security (With Change Password) */}
        <TabsContent value="profile" className="focus-visible:outline-none focus-visible:ring-0">
          <ProfileSecurityTab />
        </TabsContent>

        {/* Tab 2: User Management Module */}
        <TabsContent value="users" className="focus-visible:outline-none focus-visible:ring-0">
          <UserManagementTab />
        </TabsContent>

        {/* Tab 3: Role Management Module */}
        <TabsContent value="roles" className="focus-visible:outline-none focus-visible:ring-0">
          <RoleManagementTab />
        </TabsContent>

        {/* Tab 4: Company Info Configuration */}
        <TabsContent value="company" className="focus-visible:outline-none focus-visible:ring-0">
          <CompanyInfoTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
