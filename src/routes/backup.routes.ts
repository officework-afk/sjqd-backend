import express from "express";
import { exportBackup, restoreBackup } from "../controllers/backup.controller";

const router = express.Router();

router.get("/export", exportBackup);
router.post("/restore", restoreBackup);

export default router;