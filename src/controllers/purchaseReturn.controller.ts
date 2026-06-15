import { Response } from "express";
import prisma from "../config/db";
import { AuthRequest } from "../middleware/auth.middleware";

function getUserId(req: AuthRequest) {
  return Number(req.user?.userId || req.user?.id || 0);
}

function generateReturnNo(prefix: string, id: number) {
  const year = new Date().getFullYear();
  const number = String(id).padStart(4, "0");
  return `${prefix}-${year}-${number}`;
}

function calculateGst(quantity: number, rate: number, gstRate: number) {
  const taxableAmount = quantity * rate;
  const gstAmount = (taxableAmount * gstRate) / 100;

  return {
    taxableAmount,
    cgst: gstAmount / 2,
    sgst: gstAmount / 2,
    igst: 0,
    totalAmount: taxableAmount + gstAmount,
  };
}

export const getPurchaseReturns = async (req: AuthRequest, res: Response) => {
  try {
    const userId = getUserId(req);

    const data = await prisma.purchaseReturn.findMany({
      where: userId ? { userId } : {},
      orderBy: { id: "desc" },
    });

    res.json(data);
  } catch (error) {
    console.error("GET PURCHASE RETURN ERROR:", error);
    res.status(500).json({ message: "Failed to fetch purchase returns" });
  }
};

export const createPurchaseReturn = async (req: AuthRequest, res: Response) => {
  try {
    const userId = getUserId(req);

    const {
      returnNo,
      originalInvoiceNo,
      supplierName,
      itemName,
      quantity,
      rate,
      gstNo,
      gstRate,
    } = req.body;

    if (!supplierName || !itemName || !quantity || !rate) {
      return res.status(400).json({
        message: "Supplier name, item, quantity and rate are required",
      });
    }

    const qty = Number(quantity);
    const itemRate = Number(rate);
    const itemGstRate = Number(gstRate || 0);

    const item = await prisma.item.findFirst({
      where: {
        itemName,
        ...(userId ? { userId } : {}),
      },
    });

    if (!item) {
      return res.status(400).json({
        message: `Item "${itemName}" not found in stock`,
      });
    }

    if (Number(item.currentStock || 0) < qty) {
      return res.status(400).json({
        message: `Insufficient stock. Available: ${item.currentStock}, Return Qty: ${qty}`,
      });
    }

    const gst = calculateGst(qty, itemRate, itemGstRate);

    const created = await prisma.purchaseReturn.create({
      data: {
        returnNo: returnNo || "TEMP",
        originalInvoiceNo: originalInvoiceNo || "-",
        supplierName,
        itemName,
        quantity: qty,
        rate: itemRate,
        gstNo: gstNo || "B2C",
        gstRate: itemGstRate,
        taxableAmount: gst.taxableAmount,
        cgst: gst.cgst,
        sgst: gst.sgst,
        igst: gst.igst,
        totalAmount: gst.totalAmount,
        ...(userId ? { userId } : {}),
      },
    });

    const finalReturnNo = returnNo || generateReturnNo("PR", created.id);

    const updated = await prisma.purchaseReturn.update({
      where: { id: created.id },
      data: { returnNo: finalReturnNo },
    });

    await prisma.item.update({
      where: { id: item.id },
      data: {
        currentStock: Number(item.currentStock || 0) - qty,
      },
    });

    res.json({
      message: "Purchase return saved and stock reduced",
      data: updated,
    });
  } catch (error) {
    console.error("CREATE PURCHASE RETURN ERROR:", error);
    res.status(500).json({ message: "Failed to create purchase return" });
  }
};

export const updatePurchaseReturn = async (req: AuthRequest, res: Response) => {
  try {
    const userId = getUserId(req);
    const id = Number(req.params.id);

    const oldReturn = await prisma.purchaseReturn.findFirst({
      where: {
        id,
        ...(userId ? { userId } : {}),
      },
    });

    if (!oldReturn) {
      return res.status(404).json({ message: "Purchase return not found" });
    }

    const {
      returnNo,
      originalInvoiceNo,
      supplierName,
      itemName,
      quantity,
      rate,
      gstNo,
      gstRate,
    } = req.body;

    const qty = Number(quantity);
    const itemRate = Number(rate);
    const itemGstRate = Number(gstRate || 0);

    const oldItem = await prisma.item.findFirst({
      where: {
        itemName: oldReturn.itemName,
        ...(userId ? { userId } : {}),
      },
    });

    if (oldItem) {
      await prisma.item.update({
        where: { id: oldItem.id },
        data: {
          currentStock:
            Number(oldItem.currentStock || 0) + Number(oldReturn.quantity || 0),
        },
      });
    }

    const newItem = await prisma.item.findFirst({
      where: {
        itemName,
        ...(userId ? { userId } : {}),
      },
    });

    if (!newItem) {
      return res.status(400).json({
        message: `Item "${itemName}" not found in stock`,
      });
    }

    if (Number(newItem.currentStock || 0) < qty) {
      return res.status(400).json({
        message: `Insufficient stock. Available: ${newItem.currentStock}, Return Qty: ${qty}`,
      });
    }

    await prisma.item.update({
      where: { id: newItem.id },
      data: {
        currentStock: Number(newItem.currentStock || 0) - qty,
      },
    });

    const gst = calculateGst(qty, itemRate, itemGstRate);

    const updated = await prisma.purchaseReturn.update({
      where: { id },
      data: {
        returnNo,
        originalInvoiceNo: originalInvoiceNo || "-",
        supplierName,
        itemName,
        quantity: qty,
        rate: itemRate,
        gstNo: gstNo || "B2C",
        gstRate: itemGstRate,
        taxableAmount: gst.taxableAmount,
        cgst: gst.cgst,
        sgst: gst.sgst,
        igst: gst.igst,
        totalAmount: gst.totalAmount,
      },
    });

    res.json({
      message: "Purchase return updated and stock adjusted",
      data: updated,
    });
  } catch (error) {
    console.error("UPDATE PURCHASE RETURN ERROR:", error);
    res.status(500).json({ message: "Failed to update purchase return" });
  }
};

export const deletePurchaseReturn = async (req: AuthRequest, res: Response) => {
  try {
    const userId = getUserId(req);
    const id = Number(req.params.id);

    const oldReturn = await prisma.purchaseReturn.findFirst({
      where: {
        id,
        ...(userId ? { userId } : {}),
      },
    });

    if (!oldReturn) {
      return res.status(404).json({ message: "Purchase return not found" });
    }

    const item = await prisma.item.findFirst({
      where: {
        itemName: oldReturn.itemName,
        ...(userId ? { userId } : {}),
      },
    });

    if (item) {
      await prisma.item.update({
        where: { id: item.id },
        data: {
          currentStock:
            Number(item.currentStock || 0) + Number(oldReturn.quantity || 0),
        },
      });
    } else {
      await prisma.item.create({
        data: {
          itemName: oldReturn.itemName,
          currentStock: Number(oldReturn.quantity || 0),
          lastPurchaseRate: Number(oldReturn.rate || 0),
          ...(userId ? { userId } : {}),
        },
      });
    }

    await prisma.purchaseReturn.delete({
      where: { id },
    });

    res.json({ message: "Purchase return deleted and stock restored" });
  } catch (error) {
    console.error("DELETE PURCHASE RETURN ERROR:", error);
    res.status(500).json({ message: "Failed to delete purchase return" });
  }
};