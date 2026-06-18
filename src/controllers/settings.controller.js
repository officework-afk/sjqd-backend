import bcrypt from "bcryptjs";
import prisma from "../config/db";
const getUserId = (req) => Number(req.user?.userId || req.user?.id || 0);
const buildSettingsResponse = (settings) => {
    const { invoiceEditPasswordHash, ...safeSettings } = settings;
    return {
        ...safeSettings,
        invoiceEditPasswordConfigured: Boolean(invoiceEditPasswordHash),
    };
};
const ensureSettings = async (userId) => {
    const existing = await prisma.appSetting.findFirst({
        where: { userId },
    });
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
            userId,
        },
    });
};
export const getSettings = async (req, res) => {
    try {
        const userId = getUserId(req);
        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        const settings = await ensureSettings(userId);
        return res.json(buildSettingsResponse(settings));
    }
    catch (error) {
        console.error("GET SETTINGS ERROR:", error);
        return res.status(500).json({ message: "Failed to fetch settings" });
    }
};
export const updateSettings = async (req, res) => {
    try {
        const userId = getUserId(req);
        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        const { stockMethod, allowNegative, lowStockLimit, gstType, invoiceEditEnabled, invoiceEditPassword, } = req.body;
        const settings = await ensureSettings(userId);
        const cleanPassword = String(invoiceEditPassword || "").trim();
        const nextInvoiceEditEnabled = typeof invoiceEditEnabled === "boolean"
            ? invoiceEditEnabled
            : settings.invoiceEditEnabled;
        if (nextInvoiceEditEnabled &&
            !cleanPassword &&
            !settings.invoiceEditPasswordHash) {
            return res.status(400).json({
                message: "Please set an invoice edit password before enabling invoice edit.",
            });
        }
        const updatedSettings = await prisma.appSetting.update({
            where: { id: settings.id },
            data: {
                stockMethod: stockMethod || settings.stockMethod || "WEIGHTED_AVG",
                allowNegative: typeof allowNegative === "boolean"
                    ? allowNegative
                    : settings.allowNegative,
                lowStockLimit: lowStockLimit === undefined || lowStockLimit === null || lowStockLimit === ""
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
    }
    catch (error) {
        console.error("UPDATE SETTINGS ERROR:", error);
        return res.status(500).json({ message: "Failed to update settings" });
    }
};
export const verifyInvoiceEditPassword = async (req, res) => {
    try {
        const userId = getUserId(req);
        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        const password = String(req.body?.password || "").trim();
        if (!password) {
            return res.status(400).json({
                message: "Invoice edit password is required",
            });
        }
        const settings = await ensureSettings(userId);
        if (!settings.invoiceEditPasswordHash) {
            return res.status(400).json({
                message: "Invoice edit password is not configured",
            });
        }
        const isValid = await bcrypt.compare(password, settings.invoiceEditPasswordHash);
        if (!isValid) {
            return res.status(401).json({
                message: "Invoice edit password is incorrect",
            });
        }
        return res.json({ success: true });
    }
    catch (error) {
        console.error("VERIFY INVOICE EDIT PASSWORD ERROR:", error);
        return res.status(500).json({
            message: "Failed to verify invoice edit password",
        });
    }
};
