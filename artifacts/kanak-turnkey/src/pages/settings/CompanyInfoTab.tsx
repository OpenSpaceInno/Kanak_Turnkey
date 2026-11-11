import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
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
import { useToast } from "@/hooks/use-toast";
import {
  Building2,
  FileText,
  Landmark,
  MapPin,
  CheckCircle2,
  Globe,
  Phone,
  Mail,
  ShieldAlert,
  Image as ImageIcon,
} from "lucide-react";

export interface CompanySettingsData {
  id?: number;
  companyName: string;
  legalEntityType: string;
  gstin: string;
  pan: string;
  cin: string;
  email: string;
  phone: string;
  website: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
  bankName: string;
  bankAccountName: string;
  bankAccountNumber: string;
  bankIfsc: string;
  bankBranch: string;
  currency: string;
  currencySymbol: string;
  logoUrl?: string;
  termsAndConditions: string;
}

const ENTITY_TYPES = [
  "Private Limited",
  "Public Limited",
  "Limited Liability Partnership (LLP)",
  "Partnership Firm",
  "Sole Proprietorship",
  "Joint Venture",
];

const MAJOR_BANKS = [
  "HDFC Bank Ltd.",
  "ICICI Bank Ltd.",
  "State Bank of India (SBI)",
  "Axis Bank Ltd.",
  "Kotak Mahindra Bank",
  "Bank of Baroda",
  "Punjab National Bank",
  "Other Bank",
];

export function CompanyInfoTab() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: company, isLoading } = useQuery<CompanySettingsData>({
    queryKey: ["/api/settings/company"],
    queryFn: async () => {
      const res = await fetch("/api/settings/company");
      if (!res.ok) throw new Error("Failed to load company profile");
      return res.json();
    },
  });

  const [form, setForm] = useState<CompanySettingsData>({
    companyName: "Kanak Turnkey Solutions Pvt. Ltd.",
    legalEntityType: "Private Limited",
    gstin: "27AABCK1234F1Z5",
    pan: "AABCK1234F",
    cin: "U45200MH2021PTC123456",
    email: "billing@kanakturnkey.com",
    phone: "+91 22 6789 4321",
    website: "https://kanakturnkey.com",
    address: "Unit 801-804, Platinum Techno Park, Sector 30A, Vashi",
    city: "Navi Mumbai",
    state: "Maharashtra",
    pincode: "400703",
    country: "India",
    bankName: "HDFC Bank Ltd.",
    bankAccountName: "Kanak Turnkey Solutions Private Limited",
    bankAccountNumber: "50200055443322",
    bankIfsc: "HDFC0000123",
    bankBranch: "Vashi Sector 30A Branch, Navi Mumbai",
    currency: "INR",
    currencySymbol: "₹",
    logoUrl: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=128&auto=format&fit=crop&q=80",
    termsAndConditions:
      "1. All payments strictly payable within 30 days of RA Bill / Invoice submission.\n2. Retention release upon issuance of Defect Liability Period (DLP) certificate.\n3. GST 18% applied as per prevailing CBIC norms.",
  });

  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (company) {
      setForm((prev) => ({
        ...prev,
        ...company,
      }));
    }
  }, [company]);

  const handleChange = (field: keyof CompanySettingsData, value: string) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSaveCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const res = await fetch("/api/settings/company", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save company settings");

      toast({
        title: "Company Settings Saved",
        description: "Corporate profile, GSTIN tax details, and billing bank information updated.",
      });

      queryClient.setQueryData(["/api/settings/company"], data);
    } catch (err: any) {
      toast({
        title: "Save Failed",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <div className="p-8 text-center text-muted-foreground">Loading company profile...</div>;
  }

  return (
    <form onSubmit={handleSaveCompany} className="space-y-6">
      {/* 1. Corporate Identity */}
      <Card className="shadow-sm border">
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            Corporate Identity & Legal Entity
          </CardTitle>
          <CardDescription>
            Official company naming, corporate identification number, and branding assets
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="company-name">Company Legal Name *</Label>
              <Input
                id="company-name"
                value={form.companyName}
                onChange={(e) => handleChange("companyName", e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="entity-type">Legal Entity Type</Label>
              <Select
                value={form.legalEntityType}
                onValueChange={(val) => handleChange("legalEntityType", val)}
              >
                <SelectTrigger id="entity-type">
                  <SelectValue placeholder="Select Entity Type" />
                </SelectTrigger>
                <SelectContent>
                  {ENTITY_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="cin-number">CIN (Corporate ID Number)</Label>
              <Input
                id="cin-number"
                value={form.cin}
                onChange={(e) => handleChange("cin", e.target.value.toUpperCase())}
                placeholder="U45200MH2021PTC123456"
                className="font-mono text-sm uppercase"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="official-website">Official Website</Label>
              <div className="relative">
                <Input
                  id="official-website"
                  value={form.website}
                  onChange={(e) => handleChange("website", e.target.value)}
                  placeholder="https://kanakturnkey.com"
                  className="pl-8"
                />
                <Globe className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="logo-url">Company Logo URL</Label>
              <div className="relative">
                <Input
                  id="logo-url"
                  value={form.logoUrl || ""}
                  onChange={(e) => handleChange("logoUrl", e.target.value)}
                  placeholder="https://..."
                  className="pl-8"
                />
                <ImageIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              </div>
            </div>
          </div>

          {form.logoUrl && (
            <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-md border text-xs">
              <img
                src={form.logoUrl}
                alt="Company Logo Preview"
                className="h-10 w-10 object-cover rounded-md border"
                onError={(e) => {
                  (e.target as any).style.display = "none";
                }}
              />
              <span className="text-muted-foreground">
                Logo preview will appear on exported RA Bills, Work Orders, and Client Tax Invoices.
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 2. Tax & Compliance Details */}
      <Card className="shadow-sm border">
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-primary" />
            Tax Compliance & Statutory Registrations
          </CardTitle>
          <CardDescription>
            Required tax identifiers for GST filing, TDS deductions, and commercial invoices
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="gstin">GSTIN (15 Digits) *</Label>
              <Input
                id="gstin"
                value={form.gstin}
                onChange={(e) => handleChange("gstin", e.target.value.toUpperCase())}
                placeholder="27AABCK1234F1Z5"
                className="font-mono text-sm uppercase font-semibold"
                maxLength={15}
                required
              />
              <p className="text-[11px] text-muted-foreground">Applicable state code + PAN + entity code</p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="pan">Permanent Account Number (PAN) *</Label>
              <Input
                id="pan"
                value={form.pan}
                onChange={(e) => handleChange("pan", e.target.value.toUpperCase())}
                placeholder="AABCK1234F"
                className="font-mono text-sm uppercase font-semibold"
                maxLength={10}
                required
              />
              <p className="text-[11px] text-muted-foreground">Income tax PAN for TDS certificate mapping</p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="currency">Operational Currency</Label>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  id="currency"
                  value={form.currency}
                  onChange={(e) => handleChange("currency", e.target.value.toUpperCase())}
                  placeholder="INR"
                  className="font-mono text-sm uppercase"
                />
                <Input
                  id="currency-sym"
                  value={form.currencySymbol}
                  onChange={(e) => handleChange("currencySymbol", e.target.value)}
                  placeholder="₹"
                  className="text-center font-bold"
                />
              </div>
              <p className="text-[11px] text-muted-foreground">Default billing & accounting currency</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 3. Corporate Office Address & Contact */}
      <Card className="shadow-sm border">
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            Corporate Office & Contact Info
          </CardTitle>
          <CardDescription>
            Registered head office coordinates printed on contractual correspondence
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="address">Office Street / Building Address *</Label>
            <Input
              id="address"
              value={form.address}
              onChange={(e) => handleChange("address", e.target.value)}
              placeholder="Building, Floor, Business Park, Road"
              required
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-4">
            <div className="space-y-1.5">
              <Label htmlFor="city">City *</Label>
              <Input
                id="city"
                value={form.city}
                onChange={(e) => handleChange("city", e.target.value)}
                placeholder="e.g. Mumbai"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="state">State *</Label>
              <Input
                id="state"
                value={form.state}
                onChange={(e) => handleChange("state", e.target.value)}
                placeholder="e.g. Maharashtra"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="pincode">Postal PIN Code *</Label>
              <Input
                id="pincode"
                value={form.pincode}
                onChange={(e) => handleChange("pincode", e.target.value)}
                placeholder="e.g. 400076"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="country">Country</Label>
              <Input
                id="country"
                value={form.country}
                onChange={(e) => handleChange("country", e.target.value)}
                placeholder="India"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 pt-1">
            <div className="space-y-1.5">
              <Label htmlFor="phone">Official Telephone / Helpdesk</Label>
              <div className="relative">
                <Input
                  id="phone"
                  value={form.phone}
                  onChange={(e) => handleChange("phone", e.target.value)}
                  placeholder="+91 22 6789 4321"
                  className="pl-8"
                />
                <Phone className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="billing-email">Billing / Accounts Email *</Label>
              <div className="relative">
                <Input
                  id="billing-email"
                  type="email"
                  value={form.email}
                  onChange={(e) => handleChange("email", e.target.value)}
                  placeholder="billing@kanakturnkey.com"
                  className="pl-8"
                  required
                />
                <Mail className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 4. Invoice Banking Details (Printed on RA Bills & Invoices) */}
      <Card className="shadow-sm border">
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2">
            <Landmark className="h-5 w-5 text-primary" />
            Bank Account Details (Client Invoicing & RA Bills)
          </CardTitle>
          <CardDescription>
            Direct NEFT/RTGS banking particulars embedded on client invoices for payment settlement
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="bank-name">Bank Name *</Label>
              <Input
                id="bank-name"
                value={form.bankName}
                onChange={(e) => handleChange("bankName", e.target.value)}
                placeholder="e.g. HDFC Bank Ltd."
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="account-name">Beneficiary / Account Name *</Label>
              <Input
                id="account-name"
                value={form.bankAccountName}
                onChange={(e) => handleChange("bankAccountName", e.target.value)}
                placeholder="Kanak Turnkey Solutions Private Limited"
                required
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="account-num">Bank Account Number *</Label>
              <Input
                id="account-num"
                value={form.bankAccountNumber}
                onChange={(e) => handleChange("bankAccountNumber", e.target.value)}
                placeholder="50200055443322"
                className="font-mono font-semibold"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="ifsc-code">IFSC Code (11 Characters) *</Label>
              <Input
                id="ifsc-code"
                value={form.bankIfsc}
                onChange={(e) => handleChange("bankIfsc", e.target.value.toUpperCase())}
                placeholder="HDFC0000123"
                className="font-mono uppercase font-semibold"
                maxLength={11}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="branch-name">Branch Location</Label>
              <Input
                id="branch-name"
                value={form.bankBranch}
                onChange={(e) => handleChange("bankBranch", e.target.value)}
                placeholder="e.g. Powai Branch, Mumbai"
              />
            </div>
          </div>

          <div className="space-y-1.5 pt-2">
            <Label htmlFor="terms-cond">Default Terms & Conditions (Client Invoices)</Label>
            <Textarea
              id="terms-cond"
              value={form.termsAndConditions}
              onChange={(e) => handleChange("termsAndConditions", e.target.value)}
              rows={3}
              placeholder="Standard payment terms, retention timelines, and interest clauses..."
            />
          </div>
        </CardContent>

        <CardFooter className="border-t bg-muted/10 py-4 flex items-center justify-between">
          <div className="text-xs text-muted-foreground flex items-center gap-1.5">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>Bank details and terms automatically sync with the Client Billing (AR) module.</span>
          </div>
          <Button type="submit" disabled={isSaving} className="gap-2 shrink-0">
            {isSaving ? "Saving Configuration..." : "Save Company Configuration"}
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}

