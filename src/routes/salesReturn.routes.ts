import express from "express";
import {
  getSalesReturns,
  createSalesReturn,
  updateSalesReturn,
  deleteSalesReturn,
} from "../controllers/salesReturn.controller";

const router = express.Router();

router.get("/", getSalesReturns);
router.post("/", createSalesReturn);
router.put("/:id", updateSalesReturn);
router.delete("/:id", deleteSalesReturn);

export default router;