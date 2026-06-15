import express from "express";
import multer from "multer";
import { authMiddleware } from "../middleware/auth.middleware";

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

router.post(
  "/import-excel",
  authMiddleware,
  upload.single("file"),
  importPurchases
);

router.post(
  "/extract-bill",
  authMiddleware,
  upload.single("bill"),
  extractPurchaseBill
);

router.get("/total", authMiddleware, getPurchaseTotal);
router.get("/", authMiddleware, getPurchases);
router.post("/", authMiddleware, createPurchase);
router.put("/:id", authMiddleware, updatePurchase);
router.delete("/:id", authMiddleware, deletePurchase);

export default router;