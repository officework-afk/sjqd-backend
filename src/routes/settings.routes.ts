import express from "express";
import {
  getSettings,
  updateSettings,
  verifyInvoiceEditPassword,
} from "../controllers/settings.controller";
import authMiddleware from "../middleware/auth.middleware";

const router = express.Router();

router.get("/", authMiddleware, getSettings);
router.post("/invoice-edit/verify", authMiddleware, verifyInvoiceEditPassword);
router.put("/", authMiddleware, updateSettings);

export default router;
