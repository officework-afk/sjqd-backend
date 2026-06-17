import bcrypt from "bcryptjs";
import { Response } from "express";
import prisma from "../config/db";
import { AuthRequest } from "../middleware/auth.middleware";

const getUserId = (req: AuthRequest) =>
  Number(req.user?.userId || req.user?.id || 0);

const clearUserOwnedData = async (userId: number) => {
  await prisma.purchaseAdjustment.deleteMany({ where: { userId } });
  await prisma.salesAdjustment.deleteMany({ where: { userId } });
  await prisma.purchaseReturn.deleteMany({ where: { userId } });
  await prisma.salesReturn.deleteMany({ where: { userId } });
  await prisma.sale.deleteMany({ where: { userId } });
  await prisma.purchase.deleteMany({ where: { userId } });
  await prisma.customer.deleteMany({ where: { userId } });
  await prisma.item.deleteMany({ where: { userId } });
  await prisma.appSetting.deleteMany({ where: { userId } });
  await prisma.company.deleteMany({ where: { userId } });
};

export const exportBackup = async (req: AuthRequest, res: Response) => {
  try {
    const userId = getUserId(req);

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const data = {
      exportedAt: new Date().toISOString(),
      account: await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          role: true,
        },
      }),
      companies: await prisma.company.findMany({ where: { userId } }),
      settings: await prisma.appSetting.findMany({ where: { userId } }),
      items: await prisma.item.findMany({ where: { userId } }),
      customers: await prisma.customer.findMany({ where: { userId } }),
      sales: await prisma.sale.findMany({ where: { userId } }),
      purchases: await prisma.purchase.findMany({ where: { userId } }),
      salesReturns: await prisma.salesReturn.findMany({ where: { userId } }),
      purchaseReturns: await prisma.purchaseReturn.findMany({ where: { userId } }),
      salesAdjustments: await prisma.salesAdjustment.findMany({ where: { userId } }),
      purchaseAdjustments: await prisma.purchaseAdjustment.findMany({ where: { userId } }),
    };

    return res.json(data);
  } catch (error) {
    console.error("BACKUP EXPORT ERROR:", error);
    return res.status(500).json({ message: "Backup export failed" });
  }
};

export const restoreBackup = async (req: AuthRequest, res: Response) => {
  try {
    const userId = getUserId(req);

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const data = req.body;

    if (!data || !Array.isArray(data.items)) {
      return res.status(400).json({ message: "Invalid backup file" });
    }

    await clearUserOwnedData(userId);

    if (Array.isArray(data.companies)) {
      for (const company of data.companies) {
        await prisma.company.create({
          data: {
            companyName: company.companyName || "SJQD SOFTWARE",
            proprietorName: company.proprietorName || null,
            gstNumber: company.gstNumber || null,
            businessType: company.businessType || "Retail",
            phone: company.phone || null,
            email: company.email || null,
            address: company.address || null,
            logo: company.logo || null,
            stockMethod: company.stockMethod || "WEIGHTED_AVG",
            financialYear: company.financialYear || "2026-27",
            salesPrefix: company.salesPrefix || "SAL",
            purchasePrefix: company.purchasePrefix || "PUR",
            salesReturnPrefix: company.salesReturnPrefix || "SR",
            purchaseReturnPrefix: company.purchaseReturnPrefix || "PR",
            bankName: company.bankName || null,
            accountNumber: company.accountNumber || null,
            ifscCode: company.ifscCode || null,
            branchName: company.branchName || null,
            terms: company.terms || null,
            userId,
          },
        });
      }
    }

    if (Array.isArray(data.settings)) {
      for (const setting of data.settings) {
        await prisma.appSetting.create({
          data: {
            stockMethod: setting.stockMethod || "WEIGHTED_AVG",
            allowNegative: Boolean(setting.allowNegative),
            lowStockLimit: Number(setting.lowStockLimit || 0),
            gstType: setting.gstType || "REGULAR",
            invoiceEditEnabled: Boolean(setting.invoiceEditEnabled),
            invoiceEditPasswordHash: setting.invoiceEditPasswordHash || null,
            userId,
          },
        });
      }
    }

    for (const customer of data.customers || []) {
      await prisma.customer.create({
        data: {
          partyName: customer.partyName || "",
          gstNo: customer.gstNo || null,
          userId,
        },
      });
    }

    for (const item of data.items || []) {
      await prisma.item.create({
        data: {
          barcode: item.barcode || null,
          itemName: item.itemName,
          gstRate: Number(item.gstRate || 0),
          salesRate: Number(item.salesRate || 0),
          purchaseRate: Number(item.purchaseRate || 0),
          currentStock: Number(item.currentStock || 0),
          lastPurchaseRate: Number(item.lastPurchaseRate || 0),
          userId,
        },
      });
    }

    for (const purchase of data.purchases || []) {
      await prisma.purchase.create({
        data: {
          invoiceNo: purchase.invoiceNo,
          supplierName: purchase.supplierName,
          itemName: purchase.itemName,
          quantity: Number(purchase.quantity || 0),
          rate: Number(purchase.rate || 0),
          gstNo: purchase.gstNo || null,
          taxableAmount: Number(purchase.taxableAmount || 0),
          gstRate: Number(purchase.gstRate || 0),
          cgst: Number(purchase.cgst || 0),
          sgst: Number(purchase.sgst || 0),
          igst: Number(purchase.igst || 0),
          totalAmount: Number(purchase.totalAmount || 0),
          userId,
        },
      });
    }

    for (const sale of data.sales || []) {
      await prisma.sale.create({
        data: {
          invoiceNo: sale.invoiceNo,
          partyName: sale.partyName,
          itemName: sale.itemName,
          quantity: Number(sale.quantity || 0),
          rate: Number(sale.rate || 0),
          gstNo: sale.gstNo || null,
          taxableAmount: Number(sale.taxableAmount || 0),
          gstRate: Number(sale.gstRate || 0),
          cgst: Number(sale.cgst || 0),
          sgst: Number(sale.sgst || 0),
          igst: Number(sale.igst || 0),
          totalAmount: Number(sale.totalAmount || 0),
          costPrice: Number(sale.costPrice || 0),
          profitAmount: Number(sale.profitAmount || 0),
          userId,
        },
      });
    }

    for (const salesReturn of data.salesReturns || []) {
      await prisma.salesReturn.create({
        data: {
          returnNo: salesReturn.returnNo,
          originalInvoiceNo: salesReturn.originalInvoiceNo,
          partyName: salesReturn.partyName,
          itemName: salesReturn.itemName,
          quantity: Number(salesReturn.quantity || 0),
          rate: Number(salesReturn.rate || 0),
          gstNo: salesReturn.gstNo || null,
          taxableAmount: Number(salesReturn.taxableAmount || 0),
          gstRate: Number(salesReturn.gstRate || 0),
          cgst: Number(salesReturn.cgst || 0),
          sgst: Number(salesReturn.sgst || 0),
          igst: Number(salesReturn.igst || 0),
          totalAmount: Number(salesReturn.totalAmount || 0),
          userId,
        },
      });
    }

    for (const purchaseReturn of data.purchaseReturns || []) {
      await prisma.purchaseReturn.create({
        data: {
          returnNo: purchaseReturn.returnNo,
          originalInvoiceNo: purchaseReturn.originalInvoiceNo,
          supplierName: purchaseReturn.supplierName,
          itemName: purchaseReturn.itemName,
          quantity: Number(purchaseReturn.quantity || 0),
          rate: Number(purchaseReturn.rate || 0),
          gstNo: purchaseReturn.gstNo || null,
          taxableAmount: Number(purchaseReturn.taxableAmount || 0),
          gstRate: Number(purchaseReturn.gstRate || 0),
          cgst: Number(purchaseReturn.cgst || 0),
          sgst: Number(purchaseReturn.sgst || 0),
          igst: Number(purchaseReturn.igst || 0),
          totalAmount: Number(purchaseReturn.totalAmount || 0),
          userId,
        },
      });
    }

    for (const salesAdjustment of data.salesAdjustments || []) {
      await prisma.salesAdjustment.create({
        data: {
          noteNo: salesAdjustment.noteNo,
          noteType: salesAdjustment.noteType || "ADJUSTMENT",
          originalInvoiceNo: salesAdjustment.originalInvoiceNo || "",
          partyName: salesAdjustment.partyName || "",
          itemName: salesAdjustment.itemName || "",
          quantity: Number(salesAdjustment.quantity || 0),
          rate: Number(salesAdjustment.rate || 0),
          gstNo: salesAdjustment.gstNo || null,
          taxableAmount: Number(salesAdjustment.taxableAmount || 0),
          gstRate: Number(salesAdjustment.gstRate || 0),
          cgst: Number(salesAdjustment.cgst || 0),
          sgst: Number(salesAdjustment.sgst || 0),
          igst: Number(salesAdjustment.igst || 0),
          totalAmount: Number(salesAdjustment.totalAmount || 0),
          originalTotalAmount: Number(salesAdjustment.originalTotalAmount || 0),
          adjustedTotalAmount: Number(salesAdjustment.adjustedTotalAmount || 0),
          adjustmentAmount: Number(salesAdjustment.adjustmentAmount || 0),
          items: salesAdjustment.items || null,
          originalItems: salesAdjustment.originalItems || null,
          dueDate: salesAdjustment.dueDate || null,
          phone: salesAdjustment.phone || null,
          state: salesAdjustment.state || null,
          pincode: salesAdjustment.pincode || null,
          address: salesAdjustment.address || null,
          userId,
        },
      });
    }

    for (const purchaseAdjustment of data.purchaseAdjustments || []) {
      await prisma.purchaseAdjustment.create({
        data: {
          noteNo: purchaseAdjustment.noteNo,
          noteType: purchaseAdjustment.noteType || "ADJUSTMENT",
          originalInvoiceNo: purchaseAdjustment.originalInvoiceNo || "",
          supplierName: purchaseAdjustment.supplierName || "",
          itemName: purchaseAdjustment.itemName || "",
          quantity: Number(purchaseAdjustment.quantity || 0),
          rate: Number(purchaseAdjustment.rate || 0),
          gstNo: purchaseAdjustment.gstNo || null,
          taxableAmount: Number(purchaseAdjustment.taxableAmount || 0),
          gstRate: Number(purchaseAdjustment.gstRate || 0),
          cgst: Number(purchaseAdjustment.cgst || 0),
          sgst: Number(purchaseAdjustment.sgst || 0),
          igst: Number(purchaseAdjustment.igst || 0),
          totalAmount: Number(purchaseAdjustment.totalAmount || 0),
          originalTotalAmount: Number(purchaseAdjustment.originalTotalAmount || 0),
          adjustedTotalAmount: Number(purchaseAdjustment.adjustedTotalAmount || 0),
          adjustmentAmount: Number(purchaseAdjustment.adjustmentAmount || 0),
          items: purchaseAdjustment.items || null,
          originalItems: purchaseAdjustment.originalItems || null,
          dueDate: purchaseAdjustment.dueDate || null,
          phone: purchaseAdjustment.phone || null,
          state: purchaseAdjustment.state || null,
          pincode: purchaseAdjustment.pincode || null,
          address: purchaseAdjustment.address || null,
          userId,
        },
      });
    }

    return res.json({ message: "Backup restored successfully" });
  } catch (error) {
    console.error("RESTORE BACKUP ERROR:", error);
    return res.status(500).json({ message: "Backup restore failed" });
  }
};

export const clearAccountData = async (req: AuthRequest, res: Response) => {
  try {
    const userId = getUserId(req);

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const password = String(req.body?.password || "").trim();

    if (!password) {
      return res.status(400).json({ message: "Current account password is required" });
    }

    const account = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        password: true,
      },
    });

    if (!account) {
      return res.status(404).json({ message: "Account not found" });
    }

    const validPassword = await bcrypt.compare(password, account.password);

    if (!validPassword) {
      return res.status(401).json({ message: "Current account password is incorrect" });
    }

    await clearUserOwnedData(userId);

    return res.json({
      message: "All business data for this account has been deleted successfully",
    });
  } catch (error) {
    console.error("CLEAR ACCOUNT DATA ERROR:", error);
    return res.status(500).json({ message: "Failed to clear account data" });
  }
};
