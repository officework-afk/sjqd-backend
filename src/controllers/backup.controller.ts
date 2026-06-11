import { Request, Response } from "express";
import prisma from "../config/db";

export const exportBackup = async (_req: Request, res: Response) => {
  try {
    const data = {
      exportedAt: new Date().toISOString(),
      users: await prisma.user.findMany(),
      companies: await prisma.company.findMany(),
      settings: await prisma.appSetting.findMany(),
      items: await prisma.item.findMany(),
      sales: await prisma.sale.findMany(),
      purchases: await prisma.purchase.findMany(),
      salesReturns: await prisma.salesReturn.findMany(),
      purchaseReturns: await prisma.purchaseReturn.findMany(),
    };

    res.json(data);
  } catch (error) {
    console.error("BACKUP EXPORT ERROR:", error);
    res.status(500).json({ message: "Backup export failed" });
  }
};

export const restoreBackup = async (req: Request, res: Response) => {
  try {
    const data = req.body;

    if (!data || !data.items) {
      return res.status(400).json({ message: "Invalid backup file" });
    }

    await prisma.purchaseReturn.deleteMany();
    await prisma.salesReturn.deleteMany();
    await prisma.sale.deleteMany();
    await prisma.purchase.deleteMany();
    await prisma.item.deleteMany();
    await prisma.appSetting.deleteMany();
    await prisma.company.deleteMany();

    if (data.companies?.length) {
      for (const c of data.companies) {
        await prisma.company.create({
          data: {
            companyName: c.companyName,
            proprietorName: c.proprietorName,
            gstNumber: c.gstNumber,
            businessType: c.businessType,
            phone: c.phone,
            email: c.email,
            address: c.address,
            logo: c.logo,
            stockMethod: c.stockMethod,
            invoicePrefix: c.invoicePrefix,
            financialYear: c.financialYear,
          },
        });
      }
    }

    if (data.settings?.length) {
      for (const s of data.settings) {
        await prisma.appSetting.create({
          data: {
            stockMethod: s.stockMethod,
            allowNegative: s.allowNegative,
            lowStockLimit: s.lowStockLimit,
            gstType: s.gstType,
          },
        });
      }
    }

    for (const i of data.items || []) {
      await prisma.item.create({
        data: {
          itemName: i.itemName,
          currentStock: Number(i.currentStock || 0),
          lastPurchaseRate: Number(i.lastPurchaseRate || 0),
        },
      });
    }

    for (const p of data.purchases || []) {
      await prisma.purchase.create({
        data: {
          invoiceNo: p.invoiceNo,
          supplierName: p.supplierName,
          itemName: p.itemName,
          quantity: Number(p.quantity || 0),
          rate: Number(p.rate || 0),
          gstNo: p.gstNo,
          gstRate: Number(p.gstRate || 0),
          taxableAmount: Number(p.taxableAmount || 0),
          cgst: Number(p.cgst || 0),
          sgst: Number(p.sgst || 0),
          igst: Number(p.igst || 0),
          totalAmount: Number(p.totalAmount || 0),
        },
      });
    }

    for (const s of data.sales || []) {
      await prisma.sale.create({
        data: {
          invoiceNo: s.invoiceNo,
          partyName: s.partyName,
          itemName: s.itemName,
          quantity: Number(s.quantity || 0),
          rate: Number(s.rate || 0),
          gstNo: s.gstNo,
          gstRate: Number(s.gstRate || 0),
          taxableAmount: Number(s.taxableAmount || 0),
          cgst: Number(s.cgst || 0),
          sgst: Number(s.sgst || 0),
          igst: Number(s.igst || 0),
          totalAmount: Number(s.totalAmount || 0),
        },
      });
    }

    for (const sr of data.salesReturns || []) {
      await prisma.salesReturn.create({
        data: {
          returnNo: sr.returnNo,
          originalInvoiceNo: sr.originalInvoiceNo,
          partyName: sr.partyName,
          itemName: sr.itemName,
          quantity: Number(sr.quantity || 0),
          rate: Number(sr.rate || 0),
          gstNo: sr.gstNo,
          gstRate: Number(sr.gstRate || 0),
          taxableAmount: Number(sr.taxableAmount || 0),
          cgst: Number(sr.cgst || 0),
          sgst: Number(sr.sgst || 0),
          igst: Number(sr.igst || 0),
          totalAmount: Number(sr.totalAmount || 0),
        },
      });
    }

    for (const pr of data.purchaseReturns || []) {
      await prisma.purchaseReturn.create({
        data: {
          returnNo: pr.returnNo,
          originalInvoiceNo: pr.originalInvoiceNo,
          supplierName: pr.supplierName,
          itemName: pr.itemName,
          quantity: Number(pr.quantity || 0),
          rate: Number(pr.rate || 0),
          gstNo: pr.gstNo,
          gstRate: Number(pr.gstRate || 0),
          taxableAmount: Number(pr.taxableAmount || 0),
          cgst: Number(pr.cgst || 0),
          sgst: Number(pr.sgst || 0),
          igst: Number(pr.igst || 0),
          totalAmount: Number(pr.totalAmount || 0),
        },
      });
    }

    res.json({ message: "Backup restored successfully" });
  } catch (error) {
    console.error("RESTORE BACKUP ERROR:", error);
    res.status(500).json({ message: "Backup restore failed" });
  }
};