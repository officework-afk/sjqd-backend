import express from "express";
import {
  getCompany,
  saveCompany,
  getInvoiceSettings,
} from "../controllers/company.controller";
import authMiddleware from "../middleware/auth.middleware";

const router = express.Router();

router.get("/", authMiddleware, getCompany);
router.post("/", authMiddleware, saveCompany);
router.get("/invoice-settings", authMiddleware, getInvoiceSettings);

export default router;
