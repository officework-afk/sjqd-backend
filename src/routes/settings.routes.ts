import express from "express";
import {
  getSettings,
  updateSettings,
  verifyInvoiceEditPassword,
} from "../controllers/settings.controller";

const router = express.Router();

router.get("/", getSettings);
router.post("/invoice-edit/verify", verifyInvoiceEditPassword);
router.put("/", updateSettings);

export default router;
