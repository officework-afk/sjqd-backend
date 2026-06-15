import express from "express";
import {
  createPurchaseAdjustment,
  deletePurchaseAdjustment,
  getPurchaseAdjustments,
  updatePurchaseAdjustment,
} from "../controllers/purchaseAdjustment.controller";

const router = express.Router();

router.get("/", getPurchaseAdjustments);
router.post("/", createPurchaseAdjustment);
router.put("/:id", updatePurchaseAdjustment);
router.delete("/:id", deletePurchaseAdjustment);

export default router;
