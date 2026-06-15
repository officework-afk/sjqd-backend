import express from "express";
import { authMiddleware } from "../middleware/auth.middleware";

import {
  getSalesReturns,
  createSalesReturn,
  updateSalesReturn,
  deleteSalesReturn,
} from "../controllers/salesReturn.controller";

const router = express.Router();

router.get("/", authMiddleware, getSalesReturns);
router.post("/", authMiddleware, createSalesReturn);
router.put("/:id", authMiddleware, updateSalesReturn);
router.delete("/:id", authMiddleware, deleteSalesReturn);

export default router;