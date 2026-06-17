import express from "express";
import {
  clearAccountData,
  exportBackup,
  restoreBackup,
} from "../controllers/backup.controller";
import authMiddleware from "../middleware/auth.middleware";

const router = express.Router();

router.get("/export", authMiddleware, exportBackup);
router.post("/restore", authMiddleware, restoreBackup);
router.post("/clear-account", authMiddleware, clearAccountData);

export default router;
