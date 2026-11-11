import { Router, type IRouter } from "express";
import { db, companySettingsTable, auditLogsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { getCurrentUser } from "../lib/session";
import { requireRole } from "../lib/auth-middleware";

const router: IRouter = Router();

router.get("/settings/company", async (_req, res): Promise<void> => {
  let [company] = await db.select().from(companySettingsTable).limit(1);
  if (!company) {
    const [inserted] = await db
      .insert(companySettingsTable)
      .values([
        {
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
        },
      ])
      .returning();
    company = inserted;
  }
  res.json(company);
});

const updateCompanyHandler = async (req: any, res: any): Promise<void> => {
  let [company] = await db.select().from(companySettingsTable).limit(1);

  const updates: any = {};
  const allowedFields = [
    "companyName",
    "legalEntityType",
    "gstin",
    "pan",
    "cin",
    "email",
    "phone",
    "website",
    "address",
    "city",
    "state",
    "pincode",
    "country",
    "bankName",
    "bankAccountName",
    "bankAccountNumber",
    "bankIfsc",
    "bankBranch",
    "currency",
    "currencySymbol",
    "logoUrl",
    "termsAndConditions",
  ];

  for (const field of allowedFields) {
    if (req.body[field] !== undefined) {
      updates[field] = req.body[field];
    }
  }

  let result;
  if (!company) {
    const [inserted] = await db.insert(companySettingsTable).values([updates]).returning();
    result = inserted;
  } else {
    const [updated] = await db
      .update(companySettingsTable)
      .set(updates)
      .where(eq(companySettingsTable.id, company.id))
      .returning();
    result = updated;
  }

  const me = await getCurrentUser();
  await db.insert(auditLogsTable).values([
    {
      userId: me.id,
      activity: "Updated company corporate profile and billing configuration",
      resourceType: "company_settings",
      resourceId: result!.id,
      status: "success",
    },
  ]);

  res.json(result);
};

router.put("/settings/company", requireRole(["admin"]), updateCompanyHandler);
router.patch("/settings/company", requireRole(["admin"]), updateCompanyHandler);

export default router;

