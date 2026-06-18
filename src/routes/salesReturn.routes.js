import express from "express";
import { getSalesReturns, createSalesReturn, updateSalesReturn, deleteSalesReturn, } from "../controllers/salesReturn.controller";
import authMiddleware from "../middleware/auth.middleware";
const router = express.Router();
router.get("/", authMiddleware, getSalesReturns);
router.post("/", authMiddleware, createSalesReturn);
router.put("/:id", authMiddleware, updateSalesReturn);
router.delete("/:id", authMiddleware, deleteSalesReturn);
export default router;
