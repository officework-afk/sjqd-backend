import { Request, Response } from "express";
import prisma from "../config/db";
import { generateInvoiceNo } from "../utils/invoice";

export const getPurchases = async (_req: Request, res: Response) => {
  try {
    const purchases = await prisma.purchase.findMany({
      orderBy: { createdAt: "desc" },
    });

    res.json(purchases);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch purchases" });
  }
};

export const getPurchaseTotal = async (_req: Request, res: Response) => {
  try {
    const purchases = await prisma.purchase.findMany();

    const total = purchases.reduce(
      (sum, item) => sum + Number(item.totalAmount || 0),
      0
    );

    res.json({ total });
  } catch (error) {
    res.status(500).json({ message: "Failed to calculate purchase total" });
  }
};

export const createPurchase = async (req: Request, res: Response) => {
  try {
    const {
      invoiceNo,
      supplierName,
      itemName,
      quantity,
      rate,
      gstNo,
      gstRate,
      taxableAmount,
      cgst,
      sgst,
      igst,
      totalAmount,
    } = req.body;

    if (!supplierName || !itemName || !quantity || !rate) {
      return res.status(400).json({
        message: "Supplier name, item name, quantity and rate are required",
      });
    }

    const qty = Number(quantity);
    const itemRate = Number(rate);
    const gst = Number(gstRate || 0);
    const taxable = Number(taxableAmount || qty * itemRate);
    const cgstAmount = Number(cgst || 0);
    const sgstAmount = Number(sgst || 0);
    const igstAmount = Number(igst || 0);
    const total = Number(totalAmount || taxable + cgstAmount + sgstAmount + igstAmount);

    const count = await prisma.purchase.count();
    const autoInvoiceNo = invoiceNo || generateInvoiceNo("PUR", count + 1);

    const purchase = await prisma.purchase.create({
      data: {
        invoiceNo: autoInvoiceNo,
        supplierName,
        itemName,
        quantity: qty,
        rate: itemRate,
        gstNo: gstNo || null,
        taxableAmount: taxable,
        gstRate: gst,
        cgst: cgstAmount,
        sgst: sgstAmount,
        igst: igstAmount,
        totalAmount: total,
      },
    });

    const existingItem = await prisma.item.findUnique({
      where: { itemName },
    });

    if (existingItem) {
      await prisma.item.update({
        where: { itemName },
        data: {
          currentStock: Number(existingItem.currentStock || 0) + qty,
          lastPurchaseRate: itemRate,
        },
      });
    } else {
      await prisma.item.create({
        data: {
          itemName,
          currentStock: qty,
          lastPurchaseRate: itemRate,
        },
      });
    }

    res.json({
      message: "Purchase saved and stock updated",
      purchase,
    });
  } catch (error) {
    console.error("CREATE PURCHASE ERROR:", error);
    res.status(500).json({ message: "Failed to create purchase" });
  }
};

export const updatePurchase = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);

    const oldPurchase = await prisma.purchase.findUnique({
      where: { id },
    });

    if (!oldPurchase) {
      return res.status(404).json({ message: "Purchase not found" });
    }

    const {
      invoiceNo,
      supplierName,
      itemName,
      quantity,
      rate,
      gstNo,
      gstRate,
      taxableAmount,
      cgst,
      sgst,
      igst,
      totalAmount,
    } = req.body;

    const newQty = Number(quantity);
    const oldQty = Number(oldPurchase.quantity);
    const difference = newQty - oldQty;

    const updatedPurchase = await prisma.purchase.update({
      where: { id },
      data: {
        invoiceNo,
        supplierName,
        itemName,
        quantity: newQty,
        rate: Number(rate),
        gstNo: gstNo || null,
        gstRate: Number(gstRate || 0),
        taxableAmount: Number(taxableAmount || 0),
        cgst: Number(cgst || 0),
        sgst: Number(sgst || 0),
        igst: Number(igst || 0),
        totalAmount: Number(totalAmount || 0),
      },
    });

    const existingItem = await prisma.item.findUnique({
      where: { itemName },
    });

    if (existingItem) {
      await prisma.item.update({
        where: { itemName },
        data: {
          currentStock: Number(existingItem.currentStock || 0) + difference,
          lastPurchaseRate: Number(rate),
        },
      });
    }

    res.json({
      message: "Purchase updated and stock adjusted",
      purchase: updatedPurchase,
    });
  } catch (error) {
    console.error("UPDATE PURCHASE ERROR:", error);
    res.status(500).json({ message: "Failed to update purchase" });
  }
};

export const deletePurchase = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);

    const purchase = await prisma.purchase.findUnique({
      where: { id },
    });

    if (!purchase) {
      return res.status(404).json({ message: "Purchase not found" });
    }

    const item = await prisma.item.findUnique({
      where: { itemName: purchase.itemName },
    });

    if (item) {
      await prisma.item.update({
        where: { itemName: purchase.itemName },
        data: {
          currentStock: Number(item.currentStock || 0) - Number(purchase.quantity || 0),
        },
      });
    }

    await prisma.purchase.delete({
      where: { id },
    });

    res.json({ message: "Purchase deleted and stock adjusted" });
  } catch (error) {
    console.error("DELETE PURCHASE ERROR:", error);
    res.status(500).json({ message: "Failed to delete purchase" });
  }
};

export const importPurchases = async (_req: Request, res: Response) => {
  res.status(400).json({ message: "Excel import will be handled in next phase" });
};

export const extractPurchaseBill = async (_req: Request, res: Response) => {
  res.status(400).json({ message: "AI bill extraction will be handled separately" });
};