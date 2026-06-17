import { Response } from "express";
import prisma from "../config/db";
import { AuthRequest } from "../middleware/auth.middleware";

const getUserId = (req: AuthRequest) =>
  Number(req.user?.userId || req.user?.id || 0);

const getDefaultCompanyData = (userId: number) => ({
  companyName: "SJQD SOFTWARE",
  businessType: "Retail",
  stockMethod: "WEIGHTED_AVG",
  financialYear: "2026-27",
  salesPrefix: "SAL",
  purchasePrefix: "PUR",
  salesReturnPrefix: "SR",
  purchaseReturnPrefix: "PR",
  userId,
});

export const getCompany = async (req: AuthRequest, res: Response) => {
  try {
    const userId = getUserId(req);

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    let company = await prisma.company.findFirst({
      where: { userId },
    });

    if (!company) {
      company = await prisma.company.create({
        data: getDefaultCompanyData(userId),
      });
    }

    res.json(company);
  } catch (error) {
    console.error("GET COMPANY ERROR:", error);
    res.status(500).json({ message: "Failed to fetch company" });
  }
};

export const saveCompany = async (req: AuthRequest, res: Response) => {
  try {
    const userId = getUserId(req);

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const body = req.body;

    const existing = await prisma.company.findFirst({
      where: { userId },
    });

    const data = {
      companyName: body.companyName || "SJQD SOFTWARE",
      proprietorName: body.proprietorName || "",
      gstNumber: body.gstNumber || "",
      businessType: body.businessType || "Retail",
      phone: body.phone || "",
      email: body.email || "",
      address: body.address || "",
      logo: body.logo || "",
      stockMethod: body.stockMethod || "WEIGHTED_AVG",
      financialYear: body.financialYear || "2026-27",

      salesPrefix: body.salesPrefix || "SAL",
      purchasePrefix: body.purchasePrefix || "PUR",
      salesReturnPrefix: body.salesReturnPrefix || "SR",
      purchaseReturnPrefix: body.purchaseReturnPrefix || "PR",

      bankName: body.bankName || "",
      accountNumber: body.accountNumber || "",
      ifscCode: body.ifscCode || "",
      branchName: body.branchName || "",
      terms:
        body.terms ||
        "Goods once sold will not be taken back. Subject to local jurisdiction.",
      userId,
    };

    const company = existing
      ? await prisma.company.update({
          where: { id: existing.id },
          data,
        })
      : await prisma.company.create({ data });

    res.json(company);
  } catch (error) {
    console.error("SAVE COMPANY ERROR:", error);
    res.status(500).json({ message: "Failed to save company" });
  }
};

export const getInvoiceSettings = async (req: AuthRequest, res: Response) => {
  try {
    const userId = getUserId(req);

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    let company = await prisma.company.findFirst({
      where: { userId },
    });

    if (!company) {
      company = await prisma.company.create({
        data: getDefaultCompanyData(userId),
      });
    }

    res.json({
      salesPrefix: company?.salesPrefix || "SAL",
      purchasePrefix: company?.purchasePrefix || "PUR",
      salesReturnPrefix: company?.salesReturnPrefix || "SR",
      purchaseReturnPrefix: company?.purchaseReturnPrefix || "PR",
      financialYear: company?.financialYear || "2026-27",
    });
  } catch (error) {
    console.error("GET INVOICE SETTINGS ERROR:", error);
    res.status(500).json({ message: "Failed to fetch invoice settings" });
  }
};
