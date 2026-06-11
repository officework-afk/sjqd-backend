import { Request, Response } from "express";
import Tesseract from "tesseract.js";
import fs from "fs";

const pdfParse = require("pdf-parse");

function n(value: any) {
  return Number(String(value || "0").replace(/,/g, "")) || 0;
}

function findFirst(text: string, patterns: RegExp[]) {
  for (const p of patterns) {
    const m = text.match(p);
    if (m?.[1]) return m[1].trim();
  }
  return "";
}

function parseInvoice(text: string, pageType: string) {
  const clean = text.replace(/\r/g, "\n");
  const oneLine = clean.replace(/\s+/g, " ");

  const invoiceNo = findFirst(oneLine, [
    /Invoice\s*No\.?\s*[:\-]?\s*([A-Z0-9\/\-]+)/i,
    /Bill\s*No\.?\s*[:\-]?\s*([A-Z0-9\/\-]+)/i,
    /Delivery\s*Note\s*[:\-]?\s*([A-Z0-9\/\-]+)/i,
  ]);

  const gstNo =
    findFirst(oneLine, [
      /GSTIN\s*[:\-]?\s*([0-9A-Z]{15})/i,
      /GST\s*No\.?\s*[:\-]?\s*([0-9A-Z]{15})/i,
      /VAT\s*No\.?\s*[:\-]?\s*([A-Z0-9]+)/i,
      /PIN\s*[:\-]?\s*([A-Z0-9]+)/i,
    ]) || "B2C";

  const partyName = findFirst(oneLine, [
    /Buyer\s+([A-Za-z0-9 &.,]+)/i,
    /Bill\s*To\s+([A-Za-z0-9 &.,]+)/i,
    /Supplier\s+([A-Za-z0-9 &.,]+)/i,
  ]);

  const itemLine = clean
    .split("\n")
    .find((l) => /\d+\s+.*\d+\s*(Nos|PCS|Qty)?/i.test(l));

  let itemName = "";
  let quantity = 1;
  let rate = 0;

  if (itemLine) {
    const qtyMatch = itemLine.match(/(\d+)\s*(Nos|PCS|Qty)?/i);
    quantity = qtyMatch ? Number(qtyMatch[1]) : 1;

    const rateMatch = itemLine.match(
      /(\d{1,3}(?:,\d{3})*(?:\.\d+)?)\s*(Nos|PCS)?\s+(\d{1,3}(?:,\d{3})*(?:\.\d+)?)/i
    );

    rate = rateMatch ? Number(rateMatch[3].replace(/,/g, "")) : 0;

    itemName = itemLine
      .replace(/^\s*\d+\s*/, "")
      .replace(/\d+\s*(Nos|PCS|Qty)?/gi, "")
      .replace(/\d{1,3}(?:,\d{3})*(?:\.\d+)?/g, "")
      .trim();
  }

  const totalAmount = n(
    findFirst(oneLine, [
      /Grand\s*Total\s*[:₹A-Z\s]*([\d,]+(?:\.\d+)?)/i,
      /Total\s*[:₹A-Z\s]*([\d,]+(?:\.\d+)?)/i,
      /Amount\s*[:₹A-Z\s]*([\d,]+(?:\.\d+)?)/i,
    ])
  );

  return {
    pageType,
    invoiceNo,
    returnNo: invoiceNo,
    originalInvoiceNo: invoiceNo,
    partyName,
    supplierName: partyName,
    gstNo,
    itemName,
    quantity,
    rate,
    gstRate: 0,
    taxableAmount: quantity * rate,
    totalAmount,
    rawText: text,
  };
}

export const extractInvoice = async (req: Request, res: Response) => {
  console.log("AI extraction API hit");

  try {
    const file = req.file;
    const pageType = String(req.body.pageType || "");

    if (!file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    let text = "";

    if (file.mimetype === "application/pdf") {
      const buffer = fs.readFileSync(file.path);
      const pdf = await pdfParse(buffer);
      text = pdf.text || "";
    } else {
      const result = await Tesseract.recognize(file.path, "eng");
      text = result.data.text || "";
    }

    fs.unlinkSync(file.path);

    const extracted = parseInvoice(text, pageType);

    return res.status(200).json({
      success: true,
      extracted,
    });
  } catch (error) {
    console.error("AI EXTRACT ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Invoice extraction failed",
      error: String(error),
    });
  }
};