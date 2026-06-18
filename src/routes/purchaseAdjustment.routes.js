import express from "express";
import authMiddleware from "../middleware/auth.middleware";
import { createPurchaseAdjustment, deletePurchaseAdjustment, getPurchaseAdjustments, updatePurchaseAdjustment, } from "../controllers/purchaseAdjustment.controller";
const router = express.Router();
router.get("/", authMiddleware, getPurchaseAdjustments);
router.post("/", authMiddleware, createPurchaseAdjustment);
router.put("/:id", authMiddleware, updatePurchaseAdjustment);
router.delete("/:id", authMiddleware, deletePurchaseAdjustment);
export default router;
