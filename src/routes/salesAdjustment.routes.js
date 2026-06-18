import express from "express";
import authMiddleware from "../middleware/auth.middleware";
import { createSalesAdjustment, deleteSalesAdjustment, getSalesAdjustments, updateSalesAdjustment, } from "../controllers/salesAdjustment.controller";
const router = express.Router();
router.get("/", authMiddleware, getSalesAdjustments);
router.post("/", authMiddleware, createSalesAdjustment);
router.put("/:id", authMiddleware, updateSalesAdjustment);
router.delete("/:id", authMiddleware, deleteSalesAdjustment);
export default router;
