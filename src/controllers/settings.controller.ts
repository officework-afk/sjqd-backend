import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import prisma from "../config/db";

const buildSettingsResponse = (settings: {
  id: number;
  stockMethod: string;
  allowNegative: boolean;
  lowStockLimit: number;
  gstType: string;
  invoiceEditEnabled: boolean;
  invoiceEditPasswordHash: string | null;
  createdAt: Date;
  updatedAt: Date;
}) => {
  const { invoiceEditPasswordHash, ...safeSettings } = settings;

  return {
    ...safeSettings,
    invoiceEditPasswordConfigured: Boolean(invoiceEditPasswordHash),
  };
};

const ensureSettings = async () => {
  const existing = await prisma.appSetting.findFirst();

  if (existing) {
    return existing;
  }

  return prisma.appSetting.create({
    data: {
      stockMethod: "WEIGHTED_AVG",
      allowNegative: false,
      lowStockLimit: 10,
      gstType: "REGULAR",
      invoiceEditEnabled: false,
    },
  });
};

export const getSettings = async (_req: Request, res: Response) => {
  try {
    const settings = await ensureSettings();

    return res.json(buildSettingsResponse(settings));
  } catch (error) {
    console.error("GET SETTINGS ERROR:", error);
    return res.status(500).json({ message: "Failed to fetch settings" });
  }
};

export const updateSettings = async (req: Request, res: Response) => {
  try {
    const {
      stockMethod,
      allowNegative,
      lowStockLimit,
      gstType,
      invoiceEditEnabled,
      invoiceEditPassword,
    } = req.body;

    const settings = await ensureSettings();
    const cleanPassword = String(invoiceEditPassword || "").trim();
    const nextInvoiceEditEnabled =
      typeof invoiceEditEnabled === "boolean"
        ? invoiceEditEnabled
        : settings.invoiceEditEnabled;

    if (
      nextInvoiceEditEnabled &&
      !cleanPassword &&
      !settings.invoiceEditPasswordHash
    ) {
      return res.status(400).json({
        message: "Please set an invoice edit password before enabling invoice edit.",
      });
    }

    const updatedSettings = await prisma.appSetting.update({
      where: { id: settings.id },
      data: {
        stockMethod: stockMethod || settings.stockMethod || "WEIGHTED_AVG",
        allowNegative:
          typeof allowNegative === "boolean"
            ? allowNegative
            : settings.allowNegative,
        lowStockLimit:
          lowStockLimit === undefined || lowStockLimit === null || lowStockLimit === ""
            ? settings.lowStockLimit
            : Number(lowStockLimit),
        gstType: gstType || settings.gstType || "REGULAR",
        invoiceEditEnabled: nextInvoiceEditEnabled,
        ...(cleanPassword
          ? {
              invoiceEditPasswordHash: await bcrypt.hash(cleanPassword, 10),
            }
          : {}),
      },
    });

    return res.json(buildSettingsResponse(updatedSettings));
  } catch (error) {
    console.error("UPDATE SETTINGS ERROR:", error);
    return res.status(500).json({ message: "Failed to update settings" });
  }
};

export const verifyInvoiceEditPassword = async (
  req: Request,
  res: Response,
) => {
  try {
    const password = String(req.body?.password || "").trim();

    if (!password) {
      return res.status(400).json({
        message: "Invoice edit password is required",
      });
    }

    const settings = await ensureSettings();

    if (!settings.invoiceEditPasswordHash) {
      return res.status(400).json({
        message: "Invoice edit password is not configured",
      });
    }

    const isValid = await bcrypt.compare(
      password,
      settings.invoiceEditPasswordHash,
    );

    if (!isValid) {
      return res.status(401).json({
        message: "Invoice edit password is incorrect",
      });
    }

    return res.json({ success: true });
  } catch (error) {
    console.error("VERIFY INVOICE EDIT PASSWORD ERROR:", error);
    return res.status(500).json({
      message: "Failed to verify invoice edit password",
    });
  }
};
