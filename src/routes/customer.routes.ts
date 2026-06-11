import express from "express";
import { getCustomers } from "../controllers/customer.controller";

const router = express.Router();

router.get("/", getCustomers);

export default router;