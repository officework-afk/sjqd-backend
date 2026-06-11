import { Request, Response } from "express";
import prisma from "../config/db";

const calcTotals = (quantity: number, rate: number, gstRate: number) => {
  const taxableAmount = quantity * rate;
  const gstAmount = (taxableAmount * gstRate) / 100;
  const cgst = gstAmount / 2;
  const sgst = gstAmount / 2;
  const igst = 0;
  const totalAmount = taxableAmount + cgst + sgst + igst;

  return { taxableAmount, cgst, sgst, igst, totalAmount };
};

export const getSales = async (_req: Request, res: Response) => {
  try {
    const sales = await prisma.sale.findMany({
      orderBy: { createdAt: "desc" },
    });

    res.json(sales);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch sales", error });
  }
};

export const createSale = async (req: Request, res: Response) => {
  try {
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
      },
    });

    const item = await prisma.item.findUnique({
      where: { itemName },
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

export const updateSale = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);

    const { invoiceNo, partyName, gstNo, itemName, quantity, rate, gstRate } =
      req.body;

    const oldSale = await prisma.sale.findUnique({
      where: { id },
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

    const item = await prisma.item.findUnique({
      where: { itemName },
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

export const deleteSale = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);

    const sale = await prisma.sale.findUnique({
      where: { id },
    });

    if (!sale) {
      return res.status(404).json({ message: "Sale not found" });
    }

    const item = await prisma.item.findUnique({
      where: { itemName: sale.itemName },
    });

    if (item) {
      await prisma.item.update({
        where: { id: item.id },
        data: {
          currentStock: Number(item.currentStock || 0) + Number(sale.quantity || 0),
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