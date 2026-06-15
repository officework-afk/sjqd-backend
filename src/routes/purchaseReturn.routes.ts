import express from "express";
import { authMiddleware } from "../middleware/auth.middleware";

import {
  createPurchaseReturn,
  getPurchaseReturns,
  updatePurchaseReturn,
  deletePurchaseReturn,
} from "../controllers/purchaseReturn.controller";

const router = express.Router();

router.post("/", authMiddleware, createPurchaseReturn);
router.get("/", authMiddleware, getPurchaseReturns);
router.put("/:id", authMiddleware, updatePurchaseReturn);
router.delete("/:id", authMiddleware, deletePurchaseReturn);

export default router;