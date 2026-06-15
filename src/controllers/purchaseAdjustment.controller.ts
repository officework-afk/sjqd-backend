import { Request, Response } from "express";
import prisma from "../config/db";

type AdjustmentLine = {
  id: number;
  itemName: string;
  quantity: number;
  rate: number;
  gstRate: number;
  discountType: "amount" | "percentage";
  discountValue: number;
  subtotalAmount: number;
  discountAmount: number;
  taxableAmount: number;
  cgst: number;
  sgst: number;
  igst: number;
  totalAmount: number;
};

const toNumber = (value: unknown) => {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

const round2 = (value: number) => Number(value.toFixed(2));

const normalizeItemKey = (value: string) =>
  String(value || "").trim().toLowerCase();

const normalizeLine = (raw: any, gstNo?: string): AdjustmentLine => {
  const quantity = toNumber(raw?.quantity);
  const rate = toNumber(raw?.rate);
  const gstRate = toNumber(raw?.gstRate);
  const discountType =
    raw?.discountType === "amount" ? "amount" : "percentage";
  const discountValue = toNumber(raw?.discountValue);
  const subtotalAmount =
    toNumber(raw?.subtotalAmount) || round2(quantity * rate);
  const rawDiscount =
    discountType === "percentage"
      ? (subtotalAmount * discountValue) / 100
      : discountValue;
  const discountAmount = round2(
    Math.min(Math.max(rawDiscount, 0), subtotalAmount),
  );
  const taxableAmount = round2(
    toNumber(raw?.taxableAmount) || subtotalAmount - discountAmount,
  );
  const gstAmount = round2((taxableAmount * gstRate) / 100);
  const isB2C = !gstNo || String(gstNo).trim().toUpperCase() === "B2C";
  const cgst = round2(toNumber(raw?.cgst) || (isB2C ? gstAmount / 2 : 0));
  const sgst = round2(toNumber(raw?.sgst) || (isB2C ? gstAmount / 2 : 0));
  const igst = round2(toNumber(raw?.igst) || (isB2C ? 0 : gstAmount));
  const totalAmount = round2(
    toNumber(raw?.totalAmount) || taxableAmount + cgst + sgst + igst,
  );

  return {
    id: toNumber(raw?.id) || Date.now() + Math.floor(Math.random() * 100000),
    itemName: String(raw?.itemName || "").trim(),
    quantity,
    rate,
    gstRate,
    discountType,
    discountValue,
    subtotalAmount,
    discountAmount,
    taxableAmount,
    cgst,
    sgst,
    igst,
    totalAmount,
  };
};

const coerceLines = (rawItems: unknown, fallback: any, gstNo?: string) => {
  if (Array.isArray(rawItems) && rawItems.length > 0) {
    return rawItems
      .map((item) => normalizeLine(item, gstNo))
      .filter((line) => line.itemName);
  }

  if (fallback?.itemName) {
    return [normalizeLine(fallback, gstNo)].filter((line) => line.itemName);
  }

  return [] as AdjustmentLine[];
};

const summarizeLines = (lines: AdjustmentLine[]) => {
  const first = lines[0];

  return {
    itemName: lines.map((line) => line.itemName).filter(Boolean).join(", "),
    quantity: round2(
      lines.reduce((sum, line) => sum + toNumber(line.quantity), 0),
    ),
    rate: toNumber(first?.rate),
    gstRate: lines.length > 1 ? 0 : toNumber(first?.gstRate),
    subtotalAmount: round2(
      lines.reduce((sum, line) => sum + toNumber(line.subtotalAmount), 0),
    ),
    discountAmount: round2(
      lines.reduce((sum, line) => sum + toNumber(line.discountAmount), 0),
    ),
    taxableAmount: round2(
      lines.reduce((sum, line) => sum + toNumber(line.taxableAmount), 0),
    ),
    cgst: round2(lines.reduce((sum, line) => sum + toNumber(line.cgst), 0)),
    sgst: round2(lines.reduce((sum, line) => sum + toNumber(line.sgst), 0)),
    igst: round2(lines.reduce((sum, line) => sum + toNumber(line.igst), 0)),
    totalAmount: round2(
      lines.reduce((sum, line) => sum + toNumber(line.totalAmount), 0),
    ),
  };
};

const detectNoteType = (
  originalTotalAmount: number,
  adjustedTotalAmount: number,
) => {
  if (adjustedTotalAmount < originalTotalAmount) return "DEBIT";
  if (adjustedTotalAmount > originalTotalAmount) return "CREDIT";
  return null;
};

const generateAdjustmentNoteNo = async (
  db: any,
  noteType: "CREDIT" | "DEBIT",
  excludeId?: number,
) => {
  const prefix = noteType === "CREDIT" ? "CN" : "DN";
  const year = new Date().getFullYear();
  const start = new Date(Date.UTC(year, 0, 1, 0, 0, 0));
  const end = new Date(Date.UTC(year + 1, 0, 1, 0, 0, 0));
  const where: any = {
    noteType,
    createdAt: {
      gte: start,
      lt: end,
    },
  };

  if (excludeId) {
    where.id = { not: excludeId };
  }

  const count = await db.purchaseAdjustment.count({ where });
  return `${prefix}-${year}-${String(count + 1).padStart(4, "0")}`;
};

const buildStockChangeMap = (
  originalLines: AdjustmentLine[],
  revisedLines: AdjustmentLine[],
) => {
  const originalMap = new Map<
    string,
    { itemName: string; quantity: number; rate: number }
  >();
  const revisedMap = new Map<
    string,
    { itemName: string; quantity: number; rate: number }
  >();

  originalLines.forEach((line) => {
    const key = normalizeItemKey(line.itemName);
    if (!key) return;
    const existing = originalMap.get(key);
    originalMap.set(key, {
      itemName: line.itemName,
      quantity: round2(toNumber(existing?.quantity) + toNumber(line.quantity)),
      rate: toNumber(line.rate || existing?.rate || 0),
    });
  });

  revisedLines.forEach((line) => {
    const key = normalizeItemKey(line.itemName);
    if (!key) return;
    const existing = revisedMap.get(key);
    revisedMap.set(key, {
      itemName: line.itemName,
      quantity: round2(toNumber(existing?.quantity) + toNumber(line.quantity)),
      rate: toNumber(line.rate || existing?.rate || 0),
    });
  });

  const keys = new Set([
    ...Array.from(originalMap.keys()),
    ...Array.from(revisedMap.keys()),
  ]);

  return Array.from(keys)
    .map((key) => {
      const original = originalMap.get(key);
      const revised = revisedMap.get(key);
      const stockChange = round2(
        toNumber(revised?.quantity) - toNumber(original?.quantity),
      );
      const ref = revised || original;

      return {
        itemName: String(ref?.itemName || "").trim(),
        rate: toNumber(ref?.rate),
        stockChange,
      };
    })
    .filter((entry) => entry.itemName && entry.stockChange !== 0);
};

const applyStockDifference = async (
  db: any,
  originalLines: AdjustmentLine[],
  revisedLines: AdjustmentLine[],
) => {
  const changes = buildStockChangeMap(originalLines, revisedLines);

  for (const change of changes) {
    const item = await db.item.findUnique({
      where: { itemName: change.itemName },
    });

    if (item) {
      await db.item.update({
        where: { itemName: change.itemName },
        data: {
          currentStock: round2(
            toNumber(item.currentStock) + toNumber(change.stockChange),
          ),
        },
      });
      continue;
    }

    await db.item.create({
      data: {
        itemName: change.itemName,
        currentStock: change.stockChange,
        lastPurchaseRate: change.rate,
      },
    });
  }
};

const resolveBodyTotals = (
  body: any,
  linesSummary: ReturnType<typeof summarizeLines>,
  fallbackTotal: number,
) => {
  const adjustedTotalAmount = round2(
    toNumber(
      body?.adjustedTotalAmount ||
        body?.grandTotal ||
        body?.revisedTotalAmount,
    ) || linesSummary.totalAmount,
  );
  const originalTotalAmount = round2(
    toNumber(body?.originalTotalAmount) || fallbackTotal,
  );

  return { originalTotalAmount, adjustedTotalAmount };
};

export const getPurchaseAdjustments = async (_req: Request, res: Response) => {
  try {
    const data = await prisma.purchaseAdjustment.findMany({
      orderBy: { id: "desc" },
    });
    res.json(data);
  } catch (error) {
    console.error("GET PURCHASE ADJUSTMENT ERROR:", error);
    res
      .status(500)
      .json({ message: "Failed to fetch purchase adjustment notes" });
  }
};

export const createPurchaseAdjustment = async (req: Request, res: Response) => {
  try {
    const {
      noteNo,
      originalInvoiceNo,
      supplierName,
      gstNo,
      dueDate,
      phone,
      state,
      pincode,
      address,
      items,
      originalItems,
      itemName,
      quantity,
      rate,
      gstRate,
      discountType,
      discountValue,
    } = req.body;

    const revisedLines = coerceLines(
      items,
      {
        itemName,
        quantity,
        rate,
        gstRate,
        discountType,
        discountValue,
      },
      gstNo,
    );
    const sourceLines = coerceLines(originalItems, null, gstNo);

    if (!String(supplierName || "").trim()) {
      return res.status(400).json({ message: "Supplier name is required" });
    }

    if (revisedLines.length === 0) {
      return res
        .status(400)
        .json({ message: "At least one revised item is required" });
    }

    if (sourceLines.length === 0) {
      return res.status(400).json({
        message:
          "Original invoice items are required to create an adjustment note",
      });
    }

    const revisedSummary = summarizeLines(revisedLines);
    const sourceSummary = summarizeLines(sourceLines);
    const { originalTotalAmount, adjustedTotalAmount } = resolveBodyTotals(
      req.body,
      revisedSummary,
      sourceSummary.totalAmount,
    );
    const noteType = detectNoteType(originalTotalAmount, adjustedTotalAmount);

    if (!noteType) {
      return res.status(400).json({
        message: "No amount change found. Credit/Debit note needs a revised total.",
      });
    }

    const adjustmentAmount = round2(adjustedTotalAmount - originalTotalAmount);

    const created = await prisma.$transaction(async (tx) => {
      const finalNoteNo =
        String(noteNo || "").trim() ||
        (await generateAdjustmentNoteNo(tx, noteType));

      await applyStockDifference(tx, sourceLines, revisedLines);

      return tx.purchaseAdjustment.create({
        data: {
          noteNo: finalNoteNo,
          noteType,
          originalInvoiceNo: String(originalInvoiceNo || "").trim() || "-",
          supplierName: String(supplierName || "").trim(),
          itemName: revisedSummary.itemName || itemName || "-",
          quantity: revisedSummary.quantity,
          rate: revisedSummary.rate,
          gstNo: String(gstNo || "B2C").trim() || "B2C",
          taxableAmount: revisedSummary.taxableAmount,
          gstRate: revisedSummary.gstRate,
          cgst: revisedSummary.cgst,
          sgst: revisedSummary.sgst,
          igst: revisedSummary.igst,
          totalAmount: Math.abs(adjustmentAmount),
          originalTotalAmount,
          adjustedTotalAmount,
          adjustmentAmount,
          items: revisedLines,
          originalItems: sourceLines,
          dueDate: String(dueDate || "").trim() || null,
          phone: String(phone || "").trim() || null,
          state: String(state || "").trim() || null,
          pincode: String(pincode || "").trim() || null,
          address: String(address || "").trim() || null,
        },
      });
    });

    res.status(201).json(created);
  } catch (error) {
    console.error("CREATE PURCHASE ADJUSTMENT ERROR:", error);
    res
      .status(500)
      .json({ message: "Failed to create purchase adjustment note" });
  }
};

export const updatePurchaseAdjustment = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);

    const existing = await prisma.purchaseAdjustment.findUnique({
      where: { id },
    });

    if (!existing) {
      return res
        .status(404)
        .json({ message: "Purchase adjustment note not found" });
    }

    const {
      noteNo,
      originalInvoiceNo,
      supplierName,
      gstNo,
      dueDate,
      phone,
      state,
      pincode,
      address,
      items,
      originalItems,
      itemName,
      quantity,
      rate,
      gstRate,
      discountType,
      discountValue,
    } = req.body;

    const revisedLines = coerceLines(
      items,
      {
        itemName,
        quantity,
        rate,
        gstRate,
        discountType,
        discountValue,
      },
      gstNo || existing.gstNo || "B2C",
    );
    const sourceLines = coerceLines(
      originalItems,
      null,
      gstNo || existing.gstNo || "B2C",
    );
    const previousRevisedLines = coerceLines(
      existing.items,
      null,
      existing.gstNo || "B2C",
    );
    const previousSourceLines = coerceLines(
      existing.originalItems,
      null,
      existing.gstNo || "B2C",
    );

    if (!String(supplierName || "").trim()) {
      return res.status(400).json({ message: "Supplier name is required" });
    }

    if (revisedLines.length === 0) {
      return res
        .status(400)
        .json({ message: "At least one revised item is required" });
    }

    if (sourceLines.length === 0) {
      return res.status(400).json({
        message: "Original invoice items are required to update this note",
      });
    }

    const revisedSummary = summarizeLines(revisedLines);
    const sourceSummary = summarizeLines(sourceLines);
    const { originalTotalAmount, adjustedTotalAmount } = resolveBodyTotals(
      req.body,
      revisedSummary,
      sourceSummary.totalAmount,
    );
    const noteType = detectNoteType(originalTotalAmount, adjustedTotalAmount);

    if (!noteType) {
      return res.status(400).json({
        message: "No amount change found. Credit/Debit note needs a revised total.",
      });
    }

    const adjustmentAmount = round2(adjustedTotalAmount - originalTotalAmount);

    const updated = await prisma.$transaction(async (tx) => {
      const finalNoteNo =
        existing.noteType === noteType
          ? String(noteNo || existing.noteNo || "").trim() || existing.noteNo
          : await generateAdjustmentNoteNo(tx, noteType, existing.id);

      await applyStockDifference(tx, previousRevisedLines, previousSourceLines);
      await applyStockDifference(tx, sourceLines, revisedLines);

      return tx.purchaseAdjustment.update({
        where: { id },
        data: {
          noteNo: finalNoteNo,
          noteType,
          originalInvoiceNo:
            String(originalInvoiceNo || existing.originalInvoiceNo || "").trim() ||
            "-",
          supplierName: String(supplierName || "").trim(),
          itemName: revisedSummary.itemName || itemName || "-",
          quantity: revisedSummary.quantity,
          rate: revisedSummary.rate,
          gstNo: String(gstNo || existing.gstNo || "B2C").trim() || "B2C",
          taxableAmount: revisedSummary.taxableAmount,
          gstRate: revisedSummary.gstRate,
          cgst: revisedSummary.cgst,
          sgst: revisedSummary.sgst,
          igst: revisedSummary.igst,
          totalAmount: Math.abs(adjustmentAmount),
          originalTotalAmount,
          adjustedTotalAmount,
          adjustmentAmount,
          items: revisedLines,
          originalItems: sourceLines,
          dueDate: String(dueDate || existing.dueDate || "").trim() || null,
          phone: String(phone || existing.phone || "").trim() || null,
          state: String(state || existing.state || "").trim() || null,
          pincode: String(pincode || existing.pincode || "").trim() || null,
          address: String(address || existing.address || "").trim() || null,
        },
      });
    });

    res.json(updated);
  } catch (error) {
    console.error("UPDATE PURCHASE ADJUSTMENT ERROR:", error);
    res
      .status(500)
      .json({ message: "Failed to update purchase adjustment note" });
  }
};

export const deletePurchaseAdjustment = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);

    const existing = await prisma.purchaseAdjustment.findUnique({
      where: { id },
    });

    if (!existing) {
      return res
        .status(404)
        .json({ message: "Purchase adjustment note not found" });
    }

    const revisedLines = coerceLines(existing.items, null, existing.gstNo || "B2C");
    const sourceLines = coerceLines(
      existing.originalItems,
      null,
      existing.gstNo || "B2C",
    );

    await prisma.$transaction(async (tx) => {
      await applyStockDifference(tx, revisedLines, sourceLines);
      await tx.purchaseAdjustment.delete({
        where: { id },
      });
    });

    res.json({ message: "Purchase adjustment note deleted successfully" });
  } catch (error) {
    console.error("DELETE PURCHASE ADJUSTMENT ERROR:", error);
    res
      .status(500)
      .json({ message: "Failed to delete purchase adjustment note" });
  }
};
