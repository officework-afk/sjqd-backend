import { Response } from "express";
import prisma from "../config/db";
import { AuthRequest } from "../middleware/auth.middleware";

const getUserId = (req: AuthRequest) => {
  return Number(req.user?.userId || req.user?.id);
};

const normalizeBarcode = (value: unknown) => {
  const barcode = String(value || "").trim();
  return barcode || null;
};

const getCurrentStock = (body: Record<string, unknown>) => {
  return Number(body.currentStock ?? body.openingStock ?? 0);
};

const findExistingItemByName = async (
  userId: number,
  itemName: string,
  excludeId?: number
) => {
  return prisma.item.findFirst({
    where: {
      userId,
      itemName: {
        equals: itemName,
        mode: "insensitive",
      },
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
    orderBy: { id: "asc" },
  });
};

export const getItems = async (req: AuthRequest, res: Response) => {
  try {
    const userId = getUserId(req);

    const items = await prisma.item.findMany({
      where: { userId },
      orderBy: { itemName: "asc" },
    });

    return res.status(200).json(items);
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch items", error });
  }
};

export const createItem = async (req: AuthRequest, res: Response) => {
  try {
    const userId = getUserId(req);

    const barcode = normalizeBarcode(req.body.barcode);
    const itemName = String(req.body.itemName || "").trim();
    const gstRate = Number(req.body.gstRate || 0);
    const salesRate = Number(req.body.salesRate || 0);
    const purchaseRate = Number(req.body.purchaseRate || 0);
    const currentStock = getCurrentStock(req.body);

    if (!itemName) {
      return res.status(400).json({ message: "Item name is required" });
    }

    const duplicate = await findExistingItemByName(userId, itemName);

    if (duplicate) {
      return res.status(409).json({
        message: `Item "${duplicate.itemName}" already exists`,
        item: duplicate,
      });
    }

    const item = await prisma.item.create({
      data: {
        barcode,
        itemName,
        gstRate,
        salesRate,
        purchaseRate,
        currentStock,
        userId,
      },
    });

    return res.status(201).json(item);
  } catch (error) {
    console.error("CREATE ITEM ERROR:", error);
    return res.status(500).json({ message: "Failed to create item", error });
  }
};

export const updateItem = async (req: AuthRequest, res: Response) => {
  try {
    const userId = getUserId(req);
    const id = Number(req.params.id);

    const existing = await prisma.item.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      return res.status(404).json({ message: "Item not found" });
    }

    const barcode = normalizeBarcode(req.body.barcode);
    const itemName = String(req.body.itemName || "").trim();
    const gstRate = Number(req.body.gstRate || 0);
    const salesRate = Number(req.body.salesRate || 0);
    const purchaseRate = Number(req.body.purchaseRate || 0);
    const currentStock = getCurrentStock(req.body);

    if (!itemName) {
      return res.status(400).json({ message: "Item name is required" });
    }

    const duplicate = await findExistingItemByName(userId, itemName, id);

    if (duplicate) {
      return res.status(409).json({
        message: `Item "${duplicate.itemName}" already exists`,
        item: duplicate,
      });
    }

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

export const deleteItem = async (req: AuthRequest, res: Response) => {
  try {
    const userId = getUserId(req);
    const id = Number(req.params.id);

    const existing = await prisma.item.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      return res.status(404).json({ message: "Item not found" });
    }

    await prisma.item.delete({
      where: { id },
    });

    return res.status(200).json({ message: "Item deleted successfully" });
  } catch (error) {
    console.error("DELETE ITEM ERROR:", error);
    return res.status(500).json({ message: "Delete failed", error });
  }
};