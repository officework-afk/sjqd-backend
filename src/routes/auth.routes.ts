import express from "express";
import {
  register,
  login,
  changePassword,
  requestLoginOtp,
  verifyOtpLogin,
} from "../controllers/auth.controller";

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.post("/request-login-otp", requestLoginOtp);
router.post("/verify-otp-login", verifyOtpLogin);
router.post("/change-password", changePassword);

export default router;
