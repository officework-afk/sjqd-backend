import express from "express";
import authMiddleware from "../middleware/auth.middleware";
import { getSales, createSale, updateSale, deleteSale, } from "../controllers/sales.controller";
const router = express.Router();
router.get("/", authMiddleware, getSales);
router.post("/", authMiddleware, createSale);
router.put("/:id", authMiddleware, updateSale);
router.delete("/:id", authMiddleware, deleteSale);
export default router;
