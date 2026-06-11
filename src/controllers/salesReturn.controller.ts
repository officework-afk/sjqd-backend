import { Request, Response } from "express";
import prisma from "../config/db";

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

export const getSalesReturns = async (_req: Request, res: Response) => {
  try {
    const data = await prisma.salesReturn.findMany({
      orderBy: { id: "desc" },
    });
    res.json(data);
  } catch (error) {
    console.error("GET SALES RETURN ERROR:", error);
    res.status(500).json({ message: "Failed to fetch sales returns" });
  }
};

export const createSalesReturn = async (req: Request, res: Response) => {
  try {
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
      return res.status(400).json({ message: "Party name, item, quantity and rate are required" });
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
      },
    });

    const finalReturnNo = returnNo || generateReturnNo("SR", created.id);

    const updated = await prisma.salesReturn.update({
      where: { id: created.id },
      data: { returnNo: finalReturnNo },
    });

    const item = await prisma.item.findUnique({
      where: { itemName },
    });

    if (item) {
      await prisma.item.update({
        where: { itemName },
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

export const updateSalesReturn = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);

    const oldReturn = await prisma.salesReturn.findUnique({
      where: { id },
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

    await prisma.item.update({
      where: { itemName: oldReturn.itemName },
      data: {
        currentStock: {
          decrement: Number(oldReturn.quantity || 0),
        },
      },
    });

    const item = await prisma.item.findUnique({
      where: { itemName },
    });

    if (item) {
      await prisma.item.update({
        where: { itemName },
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

export const deleteSalesReturn = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);

    const oldReturn = await prisma.salesReturn.findUnique({
      where: { id },
    });

    if (!oldReturn) {
      return res.status(404).json({ message: "Sales return not found" });
    }

    const item = await prisma.item.findUnique({
      where: { itemName: oldReturn.itemName },
    });

    if (item) {
      const newStock = Number(item.currentStock || 0) - Number(oldReturn.quantity || 0);

      if (newStock < 0) {
        return res.status(400).json({
          message: "Cannot delete. Stock will become negative.",
        });
      }

      await prisma.item.update({
        where: { itemName: oldReturn.itemName },
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