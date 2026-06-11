import { Request, Response } from "express";
import prisma from "../config/db";

const normalizeBarcode = (value: unknown) => {
  const barcode = String(value || "").trim();
  return barcode || null;
};

const getCurrentStock = (body: Record<string, unknown>) => {
  return Number(body.currentStock ?? body.openingStock ?? 0);
};

export const getItems = async (_req: Request, res: Response) => {
  try {
    const items = await prisma.item.findMany({
      orderBy: { itemName: "asc" },
    });

    return res.status(200).json(items);
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch items", error });
  }
};

export const createItem = async (req: Request, res: Response) => {
  try {
    const barcode = normalizeBarcode(req.body.barcode);
    const itemName = String(req.body.itemName || "").trim();
    const gstRate = Number(req.body.gstRate || 0);
    const salesRate = Number(req.body.salesRate || 0);
    const purchaseRate = Number(req.body.purchaseRate || 0);
    const currentStock = getCurrentStock(req.body);

    if (!itemName) {
      return res.status(400).json({ message: "Item name is required" });
    }

    const item = await prisma.item.create({
      data: {
        barcode,
        itemName,
        gstRate,
        salesRate,
        purchaseRate,
        currentStock,
      },
    });

    return res.status(201).json(item);
  } catch (error) {
    console.error("CREATE ITEM ERROR:", error);
    return res.status(500).json({ message: "Failed to create item", error });
  }
};

export const updateItem = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const barcode = normalizeBarcode(req.body.barcode);
    const itemName = String(req.body.itemName || "").trim();
    const gstRate = Number(req.body.gstRate || 0);
    const salesRate = Number(req.body.salesRate || 0);
    const purchaseRate = Number(req.body.purchaseRate || 0);
    const currentStock = getCurrentStock(req.body);

    const item = await prisma.item.update({
      where: { id },
      data: {
        barcode,
        itemName,
        gstRate,
        salesRate,
        purchaseRate,
        currentStock,
      },
    });

    return res.status(200).json(item);
  } catch (error) {
    console.error("UPDATE ITEM ERROR:", error);
    return res.status(500).json({ message: "Failed to update item", error });
  }
};

export const deleteItem = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);

    await prisma.item.delete({
      where: { id },
    });

    return res.status(200).json({ message: "Item deleted successfully" });
  } catch (error) {
    console.error("DELETE ITEM ERROR:", error);
    return res.status(500).json({ message: "Delete failed", error });
  }
};
