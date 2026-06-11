import { Request, Response } from "express";
import prisma from "../config/db";

export const getSettings = async (_req: Request, res: Response) => {
  try {
    let settings = await prisma.appSetting.findFirst();

    if (!settings) {
      settings = await prisma.appSetting.create({
        data: {
          stockMethod: "WEIGHTED_AVG",
          allowNegative: false,
          lowStockLimit: 10,
          gstType: "REGULAR",
        },
      });
    }

    return res.json(settings);
  } catch (error) {
    console.error("GET SETTINGS ERROR:", error);
    return res.status(500).json({ message: "Failed to fetch settings" });
  }
};

export const updateSettings = async (req: Request, res: Response) => {
  try {
    const { stockMethod, allowNegative, lowStockLimit, gstType } = req.body;

    let settings = await prisma.appSetting.findFirst();

    if (!settings) {
      settings = await prisma.appSetting.create({
        data: {
          stockMethod: stockMethod || "WEIGHTED_AVG",
          allowNegative: Boolean(allowNegative),
          lowStockLimit: Number(lowStockLimit || 10),
          gstType: gstType || "REGULAR",
        },
      });
    } else {
      settings = await prisma.appSetting.update({
        where: { id: settings.id },
        data: {
          stockMethod,
          allowNegative: Boolean(allowNegative),
          lowStockLimit: Number(lowStockLimit || 10),
          gstType,
        },
      });
    }

    return res.json(settings);
  } catch (error) {
    console.error("UPDATE SETTINGS ERROR:", error);
    return res.status(500).json({ message: "Failed to update settings" });
  }
};