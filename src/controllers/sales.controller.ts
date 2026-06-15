import { Request, Response } from "express";
import prisma from "../config/db";
import { AuthRequest } from "../middleware/auth.middleware";

const calcTotals = (quantity: number, rate: number, gstRate: number) => {
  const taxableAmount = quantity * rate;
  const gstAmount = (taxableAmount * gstRate) / 100;
  const cgst = gstAmount / 2;
  const sgst = gstAmount / 2;
  const igst = 0;
  const totalAmount = taxableAmount + cgst + sgst + igst;

  return { taxableAmount, cgst, sgst, igst, totalAmount };
};

const getUserId = (req: AuthRequest) => {
  return Number(req.user?.userId || req.user?.id);
};

export const getSales = async (req: AuthRequest, res: Response) => {
  try {
    const userId = getUserId(req);

    const sales = await prisma.sale.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });

    res.json(sales);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch sales", error });
  }
};

export const createSale = async (req: AuthRequest, res: Response) => {
  try {
    const userId = getUserId(req);

    const { invoiceNo, partyName, gstNo, itemName, quantity, rate, gstRate } =
      req.body;

    const qty = Number(quantity || 0);
    const itemRate = Number(rate || 0);
    const taxRate = Number(gstRate || 0);

    const totals = calcTotals(qty, itemRate, taxRate);

    const sale = await prisma.sale.create({
      data: {
        invoiceNo,
        partyName,
        gstNo: gstNo || "B2C",
        itemName,
        quantity: qty,
        rate: itemRate,
        gstRate: taxRate,
        taxableAmount: totals.taxableAmount,
        cgst: totals.cgst,
        sgst: totals.sgst,
        igst: totals.igst,
        totalAmount: totals.totalAmount,
        userId,
      },
    });

    const item = await prisma.item.findFirst({
      where: { userId, itemName },
    });

    if (item) {
      await prisma.item.update({
        where: { id: item.id },
        data: {
          currentStock: Number(item.currentStock || 0) - qty,
        },
      });
    }

    res.status(201).json(sale);
  } catch (error) {
    res.status(500).json({ message: "Failed to create sale", error });
  }
};

export const updateSale = async (req: AuthRequest, res: Response) => {
  try {
    const userId = getUserId(req);
    const id = Number(req.params.id);

    const { invoiceNo, partyName, gstNo, itemName, quantity, rate, gstRate } =
      req.body;

    const oldSale = await prisma.sale.findFirst({
      where: { id, userId },
    });

    if (!oldSale) {
      return res.status(404).json({ message: "Sale not found" });
    }

    const oldQty = Number(oldSale.quantity || 0);
    const newQty = Number(quantity || 0);
    const difference = newQty - oldQty;

    const itemRate = Number(rate || 0);
    const taxRate = Number(gstRate || 0);
    const totals = calcTotals(newQty, itemRate, taxRate);

    const updatedSale = await prisma.sale.update({
      where: { id },
      data: {
        invoiceNo,
        partyName,
        gstNo: gstNo || "B2C",
        itemName,
        quantity: newQty,
        rate: itemRate,
        gstRate: taxRate,
        taxableAmount: totals.taxableAmount,
        cgst: totals.cgst,
        sgst: totals.sgst,
        igst: totals.igst,
        totalAmount: totals.totalAmount,
      },
    });

    const item = await prisma.item.findFirst({
      where: { userId, itemName },
    });

    if (item) {
      await prisma.item.update({
        where: { id: item.id },
        data: {
          currentStock: Number(item.currentStock || 0) - difference,
        },
      });
    }

    res.json(updatedSale);
  } catch (error) {
    res.status(500).json({ message: "Failed to update sale", error });
  }
};

export const deleteSale = async (req: AuthRequest, res: Response) => {
  try {
    const userId = getUserId(req);
    const id = Number(req.params.id);

    const sale = await prisma.sale.findFirst({
      where: { id, userId },
    });

    if (!sale) {
      return res.status(404).json({ message: "Sale not found" });
    }

    const item = await prisma.item.findFirst({
      where: { userId, itemName: sale.itemName },
    });

    if (item) {
      await prisma.item.update({
        where: { id: item.id },
        data: {
          currentStock:
            Number(item.currentStock || 0) + Number(sale.quantity || 0),
        },
      });
    }

    await prisma.sale.delete({
      where: { id },
    });

    res.json({ message: "Sale deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete sale", error });
  }
};