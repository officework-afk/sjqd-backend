import express from "express";
import {
  createSalesAdjustment,
  deleteSalesAdjustment,
  getSalesAdjustments,
  updateSalesAdjustment,
} from "../controllers/salesAdjustment.controller";

const router = express.Router();

router.get("/", getSalesAdjustments);
router.post("/", createSalesAdjustment);
router.put("/:id", updateSalesAdjustment);
router.delete("/:id", deleteSalesAdjustment);

export default router;
