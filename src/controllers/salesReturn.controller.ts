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

export const getSalesReturns = async (req: AuthRequest, res: Response) => {
  try {
    const userId = getUserId(req);

    const data = await prisma.salesReturn.findMany({
      where: userId ? { userId } : {},
      orderBy: { id: "desc" },
    });

    res.json(data);
  } catch (error) {
    console.error("GET SALES RETURN ERROR:", error);
    res.status(500).json({ message: "Failed to fetch sales returns" });
  }
};

export const createSalesReturn = async (req: AuthRequest, res: Response) => {
  try {
    const userId = getUserId(req);

    const {
      returnNo,
      originalInvoiceNo,
      partyName,
      itemName,
      quantity,
      rate,
      gstNo,
      gstRate,
    } = req.body;

    if (!partyName || !itemName || !quantity || !rate) {
      return res.status(400).json({
        message: "Party name, item, quantity and rate are required",
      });
    }

    const qty = Number(quantity);
    const itemRate = Number(rate);
    const itemGstRate = Number(gstRate || 0);

    const gst = calculateGst(qty, itemRate, itemGstRate);

    const created = await prisma.salesReturn.create({
      data: {
        returnNo: returnNo || "TEMP",
        originalInvoiceNo: originalInvoiceNo || "-",
        partyName,
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

    const finalReturnNo = returnNo || generateReturnNo("SR", created.id);

    const updated = await prisma.salesReturn.update({
      where: { id: created.id },
      data: { returnNo: finalReturnNo },
    });

    const item = await prisma.item.findFirst({
      where: {
        itemName,
        ...(userId ? { userId } : {}),
      },
    });

    if (item) {
      await prisma.item.update({
        where: { id: item.id },
        data: {
          currentStock: Number(item.currentStock || 0) + qty,
        },
      });
    } else {
      await prisma.item.create({
        data: {
          itemName,
          currentStock: qty,
          lastPurchaseRate: itemRate,
          ...(userId ? { userId } : {}),
        },
      });
    }

    res.json({
      message: "Sales return saved and stock added back",
      data: updated,
    });
  } catch (error) {
    console.error("CREATE SALES RETURN ERROR:", error);
    res.status(500).json({ message: "Failed to create sales return" });
  }
};

export const updateSalesReturn = async (req: AuthRequest, res: Response) => {
  try {
    const userId = getUserId(req);
    const id = Number(req.params.id);

    const oldReturn = await prisma.salesReturn.findFirst({
      where: {
        id,
        ...(userId ? { userId } : {}),
      },
    });

    if (!oldReturn) {
      return res.status(404).json({ message: "Sales return not found" });
    }

    const {
      returnNo,
      originalInvoiceNo,
      partyName,
      itemName,
      quantity,
      rate,
      gstNo,
      gstRate,
    } = req.body;

    const qty = Number(quantity);
    const itemRate = Number(rate);
    const itemGstRate = Number(gstRate || 0);

    const gst = calculateGst(qty, itemRate, itemGstRate);

    const oldItem = await prisma.item.findFirst({
      where: {
        itemName: oldReturn.itemName,
        ...(userId ? { userId } : {}),
      },
    });

    if (oldItem) {
      const reversedStock =
        Number(oldItem.currentStock || 0) - Number(oldReturn.quantity || 0);

      if (reversedStock < 0) {
        return res.status(400).json({
          message: "Cannot update. Old return reversal makes stock negative.",
        });
      }

      await prisma.item.update({
        where: { id: oldItem.id },
        data: {
          currentStock: reversedStock,
        },
      });
    }

    const item = await prisma.item.findFirst({
      where: {
        itemName,
        ...(userId ? { userId } : {}),
      },
    });

    if (item) {
      await prisma.item.update({
        where: { id: item.id },
        data: {
          currentStock: Number(item.currentStock || 0) + qty,
        },
      });
    } else {
      await prisma.item.create({
        data: {
          itemName,
          currentStock: qty,
          lastPurchaseRate: itemRate,
          ...(userId ? { userId } : {}),
        },
      });
    }

    const updated = await prisma.salesReturn.update({
      where: { id },
      data: {
        returnNo,
        originalInvoiceNo: originalInvoiceNo || "-",
        partyName,
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
      message: "Sales return updated and stock adjusted",
      data: updated,
    });
  } catch (error) {
    console.error("UPDATE SALES RETURN ERROR:", error);
    res.status(500).json({ message: "Failed to update sales return" });
  }
};

export const deleteSalesReturn = async (req: AuthRequest, res: Response) => {
  try {
    const userId = getUserId(req);
    const id = Number(req.params.id);

    const oldReturn = await prisma.salesReturn.findFirst({
      where: {
        id,
        ...(userId ? { userId } : {}),
      },
    });

    if (!oldReturn) {
      return res.status(404).json({ message: "Sales return not found" });
    }

    const item = await prisma.item.findFirst({
      where: {
        itemName: oldReturn.itemName,
        ...(userId ? { userId } : {}),
      },
    });

    if (item) {
      const newStock =
        Number(item.currentStock || 0) - Number(oldReturn.quantity || 0);

      if (newStock < 0) {
        return res.status(400).json({
          message: "Cannot delete. Stock will become negative.",
        });
      }

      await prisma.item.update({
        where: { id: item.id },
        data: { currentStock: newStock },
      });
    }

    await prisma.salesReturn.delete({
      where: { id },
    });

    res.json({ message: "Sales return deleted and stock reversed" });
  } catch (error) {
    console.error("DELETE SALES RETURN ERROR:", error);
    res.status(500).json({ message: "Failed to delete sales return" });
  }
};