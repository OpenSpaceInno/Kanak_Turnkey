import { useState } from "react";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { getGetCurrentUserQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Shield,
  Briefcase,
  User,
  Calculator,
  ShoppingCart,
  Eye,
  EyeOff,
  Lock,
  Building2,
  HardHat,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  UserCheck,
  Building,
} from "lucide-react";

interface DemoUser {
  id: number;
  name: string;
  email: string;
  role: string;
  roleTitle: string;
  department: string;
  icon: any;
  badgeColor: string;
}

const DEMO_USERS: DemoUser[] = [
  {
    id: 1,
    name: "Ananya Rao",
    email: "ananya.rao@kanak.in",
    role: "admin",
    roleTitle: "Managing Director & CEO",
    department: "Executive Management",
    icon: Shield,
    badgeColor: "bg-purple-100 text-purple-800 border-purple-200",
  },
  {
    id: 2,
    name: "Rohan Mehta",
    email: "rohan.mehta@kanak.in",
    role: "project_manager",
    roleTitle: "Senior Project Manager",
    department: "Operations & Projects",
    icon: Briefcase,
    badgeColor: "bg-blue-100 text-blue-800 border-blue-200",
  },
  {
    id: 3,
    name: "Priya Iyer",
    email: "priya.iyer@kanak.in",
    role: "engineer",
    roleTitle: "Lead Site Engineer",
    department: "Site Engineering",
    icon: HardHat,
    badgeColor: "bg-emerald-100 text-emerald-800 border-emerald-200",
  },
  {
    id: 67,
    name: "Rajesh Verma",
    email: "rajesh.verma@kanak.in",
    role: "supervisor",
    roleTitle: "Site Supervisor & Foreman",
    department: "Field Execution",
    icon: UserCheck,
    badgeColor: "bg-amber-100 text-amber-800 border-amber-300",
  },
  {
    id: 68,
    name: "Dinesh Patel",
    email: "dinesh.patel@kanak.in",
    role: "storekeeper",
    roleTitle: "Storekeeper & Material Controller",
    department: "Warehouse & Logistics",
    icon: ShoppingCart,
    badgeColor: "bg-teal-100 text-teal-800 border-teal-300",
  },
  {
    id: 69,
    name: "Apex Engineering (Suresh Nair)",
    email: "apex.mep@turnkeypartners.com",
    role: "subcontractor",
    roleTitle: "Subcontractor Project Lead",
    department: "MEP Trade Partner",
    icon: Building,
    badgeColor: "bg-orange-100 text-orange-800 border-orange-300",
  },
  {
    id: 4,
    name: "Vikram Shah",
    email: "vikram.shah@kanak.in",
    role: "accountant",
    roleTitle: "Chief Financial Controller",
    department: "Finance & Accounts",
    icon: Calculator,
    badgeColor: "bg-amber-100 text-amber-800 border-amber-200",
  },
  {
    id: 5,
    name: "Neha Kapoor",
    email: "neha.kapoor@kanak.in",
    role: "procurement_officer",
    roleTitle: "Head of Procurement",
    department: "Supply Chain",
    icon: ShoppingCart,
    badgeColor: "bg-teal-100 text-teal-800 border-teal-200",
  },
  {
    id: 7,
    name: "Kavita Sharma",
    email: "kavita.sharma@kanak.in",
    role: "sales_manager",
    roleTitle: "VP - Business Development",
    department: "Pre-Construction & Sales",
    icon: User,
    badgeColor: "bg-indigo-100 text-indigo-800 border-indigo-200",
  },
  {
    id: 6,
    name: "Arjun Singh",
    email: "arjun.singh@kanak.in",
    role: "viewer",
    roleTitle: "Project Stakeholder",
    department: "Client Oversight",
    icon: Eye,
    badgeColor: "bg-slate-100 text-slate-800 border-slate-200",
  },
];

export default function LoginPage() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [email, setEmail] = useState("ananya.rao@kanak.in");
  const [password, setPassword] = useState("Kanak@123");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const executeLogin = async (credentials: { email?: string; password?: string; userId?: number }) => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(credentials),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Authentication failed");
      }

      if (data?.id) {
        try {
          localStorage.setItem("kanak_current_user_id", String(data.id));
        } catch {}
      }

      queryClient.setQueryData(getGetCurrentUserQueryKey(), data);
      queryClient.invalidateQueries({ queryKey: getGetCurrentUserQueryKey() });

      toast({
        title: `Welcome, ${data.name}!`,
        description: `Successfully signed in as ${data.designation || data.activeRole.replace("_", " ")}.`,
      });

      setLocation("/");
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to log in");
    } finally {
      setIsLoading(false);
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    executeLogin({ email, password });
  };

  const handleQuickPersonaSelect = (user: DemoUser) => {
    setEmail(user.email);
    setPassword("Kanak@123");
    executeLogin({ userId: user.id, email: user.email, password: "Kanak@123" });
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-background">
      {/* Left side: Premium Architecture & Brand Canvas */}
      <div className="relative md:w-5/12 lg:w-1/2 bg-sidebar text-sidebar-foreground p-8 md:p-12 flex flex-col justify-between overflow-hidden">
        {/* Architectural Background Overlay with Subtle Gradient */}
        <div
          className="absolute inset-0 opacity-15 bg-cover bg-center pointer-events-none mix-blend-luminosity"
          style={{
            backgroundImage:
              'url("https://images.unsplash.com/photo-1541888946425-d0fbb1861593?q=80&w=1600&auto=format&fit=crop")',
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-sidebar via-sidebar/90 to-transparent pointer-events-none" />

        {/* Brand Header */}
        <div className="relative z-10 space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center font-bold text-xl text-primary-foreground shadow-md">
              K
            </div>
            <div>
              <span className="font-extrabold text-xl tracking-tight text-white block">
                Kanak Turnkey
              </span>
              <span className="text-xs uppercase tracking-widest text-primary font-semibold">
                Solutions Pvt. Ltd.
              </span>
            </div>
          </div>
          <Badge variant="outline" className="text-[11px] border-primary/30 text-primary bg-primary/10">
            Enterprise Turnkey Construction ERP
          </Badge>
        </div>

        {/* Narrative & Metrics */}
        <div className="relative z-10 my-auto py-8 space-y-6">
          <h2 className="text-2xl lg:text-3xl font-extrabold tracking-tight text-white leading-tight">
            Integrated Pre-Construction, Execution & Financial Control.
          </h2>
          <p className="text-sidebar-foreground/75 text-sm leading-relaxed max-w-md">
            Streamlining civil construction, commercial interiors, estimation, site DPRs, procurement 3-way matching,
            and GST billing into an authoritative single source of truth.
          </p>

          <div className="grid grid-cols-3 gap-4 pt-4 border-t border-sidebar-border/60 max-w-md">
            <div>
              <div className="text-2xl font-bold text-primary">₹120Cr+</div>
              <div className="text-[11px] text-sidebar-foreground/60">Portfolio Delivered</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-white">14+</div>
              <div className="text-[11px] text-sidebar-foreground/60">Active Sites</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-emerald-400">99.2%</div>
              <div className="text-[11px] text-sidebar-foreground/60">On-Time Handover</div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="relative z-10 text-xs text-sidebar-foreground/50 flex items-center justify-between">
          <span>Kanak Turnkey ERP v2.4</span>
          <span>ISO 9001:2015 & GST Compliant</span>
        </div>
      </div>

      {/* Right side: Login Form & Persona Switcher */}
      <div className="flex-1 flex items-center justify-center p-6 md:p-12 lg:p-16">
        <div className="w-full max-w-md space-y-6">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-foreground">Sign in to your account</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Enter your credentials or choose a team persona below for instant 1-click preview.
            </p>
          </div>

          {errorMessage && (
            <div className="p-3 text-sm rounded-lg bg-destructive/10 border border-destructive/20 text-destructive flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleManualSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="login-email">Work Email Address</Label>
              <Input
                id="login-email"
                type="email"
                placeholder="name@kanak.in"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="login-password">Password</Label>
                <span className="text-xs text-muted-foreground">Default: Kanak@123</span>
              </div>
              <div className="relative">
                <Input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button type="submit" disabled={isLoading} className="w-full gap-2">
              {isLoading ? (
                "Signing In..."
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </form>

          {/* Quick Demo Personas Selector */}
          <div className="space-y-3 pt-4 border-t">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                1-Click Role Switch & Demo Sign-In
              </span>
              <Badge variant="outline" className="text-[10px]">
                Pre-configured
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {DEMO_USERS.map((user) => {
                const Icon = user.icon;
                return (
                  <button
                    key={user.id}
                    type="button"
                    onClick={() => handleQuickPersonaSelect(user)}
                    disabled={isLoading}
                    className="flex flex-col items-start p-2.5 rounded-lg border bg-card hover:bg-muted/50 hover:border-primary/50 transition-all text-left group cursor-pointer shadow-2xs"
                  >
                    <div className="flex items-center justify-between w-full mb-1">
                      <div className="flex items-center gap-1.5">
                        <div className="p-1 rounded-md bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                          <Icon className="h-3.5 w-3.5" />
                        </div>
                        <span className="font-semibold text-xs text-foreground group-hover:text-primary transition-colors">
                          {user.name}
                        </span>
                      </div>
                    </div>
                    <div className="text-[11px] text-muted-foreground line-clamp-1">{user.roleTitle}</div>
                    <div className="text-[10px] text-muted-foreground/70">{user.department}</div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

