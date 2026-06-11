import express from "express";
import {
  getCompany,
  saveCompany,
  getInvoiceSettings,
} from "../controllers/company.controller";

const router = express.Router();

router.get("/", getCompany);
router.post("/", saveCompany);
router.get("/invoice-settings", getInvoiceSettings);

export default router;