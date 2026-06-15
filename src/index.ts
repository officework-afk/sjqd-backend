import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import authRoutes from "./routes/auth.routes";
import companyRoutes from "./routes/company.routes";
import settingsRoutes from "./routes/settings.routes";
import backupRoutes from "./routes/backup.routes";

import salesRoutes from "./routes/sales.routes";
import salesAdjustmentRoutes from "./routes/salesAdjustment.routes";
import purchaseRoutes from "./routes/purchase.routes";
import purchaseAdjustmentRoutes from "./routes/purchaseAdjustment.routes";
import salesReturnRoutes from "./routes/salesReturn.routes";
import purchaseReturnRoutes from "./routes/purchaseReturn.routes";
import itemRoutes from "./routes/item.routes";

import aiRoutes from "./routes/ai.routes";

dotenv.config();

const app = express();
const allowedOrigins = String(process.env.CORS_ORIGINS || "*")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes("*") || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error("Origin not allowed by CORS"));
    },
  }),
);
app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ extended: true, limit: "20mb" }));

app.get("/", (_req, res) => {
  res.json({ message: "SJQD GST Software backend running" });
});

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/auth", authRoutes);
app.use("/company", companyRoutes);
app.use("/settings", settingsRoutes);
app.use("/backup", backupRoutes);

app.use("/sales", salesRoutes);
app.use("/sales-adjustment", salesAdjustmentRoutes);
app.use("/purchase", purchaseRoutes);
app.use("/purchase-adjustment", purchaseAdjustmentRoutes);
app.use("/sales-return", salesReturnRoutes);
app.use("/purchase-return", purchaseReturnRoutes);
app.use("/items", itemRoutes);

app.use("/ai", aiRoutes);

const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || "0.0.0.0";

app.listen(Number(PORT), HOST, () => {
  console.log(`Server running on http://${HOST}:${PORT}`);
});
