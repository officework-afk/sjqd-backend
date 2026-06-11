import express from "express";
import {
  createPurchaseReturn,
  getPurchaseReturns,
  updatePurchaseReturn,
  deletePurchaseReturn,
} from "../controllers/purchaseReturn.controller";

const router = express.Router();

router.post("/", createPurchaseReturn);
router.get("/", getPurchaseReturns);
router.put("/:id", updatePurchaseReturn);
router.delete("/:id", deletePurchaseReturn);

export default router;