import express from "express";
import { createPurchaseReturn, getPurchaseReturns, updatePurchaseReturn, deletePurchaseReturn, } from "../controllers/purchaseReturn.controller";
import authMiddleware from "../middleware/auth.middleware";
const router = express.Router();
router.post("/", authMiddleware, createPurchaseReturn);
router.get("/", authMiddleware, getPurchaseReturns);
router.put("/:id", authMiddleware, updatePurchaseReturn);
router.delete("/:id", authMiddleware, deletePurchaseReturn);
export default router;
