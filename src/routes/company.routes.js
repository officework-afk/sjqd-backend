import express from "express";
import authMiddleware from "../middleware/auth.middleware";
import { getCompany, saveCompany, getInvoiceSettings, } from "../controllers/company.controller";
const router = express.Router();
router.get("/", authMiddleware, getCompany);
router.post("/", authMiddleware, saveCompany);
router.get("/invoice-settings", authMiddleware, getInvoiceSettings);
export default router;
