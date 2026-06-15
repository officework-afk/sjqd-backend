import express from "express";
import multer from "multer";
import { extractInvoice } from "../controllers/ai.controller";

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 15 * 1024 * 1024,
  },
});

router.post("/extract-invoice", upload.single("invoice"), extractInvoice);

export default router;