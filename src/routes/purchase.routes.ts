import express from "express";
import multer from "multer";

import {
  createPurchase,
  getPurchases,
  updatePurchase,
  deletePurchase,
  getPurchaseTotal,
  importPurchases,
  extractPurchaseBill,
} from "../controllers/purchase.controller";

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

router.post("/import-excel", upload.single("file"), importPurchases);
router.post("/extract-bill", upload.single("bill"), extractPurchaseBill);

router.get("/total", getPurchaseTotal);
router.get("/", getPurchases);
router.post("/", createPurchase);
router.put("/:id", updatePurchase);
router.delete("/:id", deletePurchase);

export default router;