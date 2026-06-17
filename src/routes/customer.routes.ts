import express from "express";
import authMiddleware from "../middleware/auth.middleware";
import { getCustomers } from "../controllers/customer.controller";

const router = express.Router();

router.get("/", authMiddleware, getCustomers);

export default router;
