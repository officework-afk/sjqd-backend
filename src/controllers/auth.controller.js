import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { randomInt } from "crypto";
import prisma from "../config/db";
const JWT_SECRET = process.env.JWT_SECRET || "sjqd_secret_key";
const OTP_EXPIRY_MINUTES = Number(process.env.OTP_EXPIRY_MINUTES || 10);
const OTP_COOLDOWN_SECONDS = Number(process.env.OTP_COOLDOWN_SECONDS || 30);
const shouldExposeOtpPreview = process.env.OTP_PREVIEW_IN_RESPONSE === "true" ||
    process.env.NODE_ENV !== "production";
const normalizeEmail = (value) => String(value || "").trim().toLowerCase();
const normalizePhone = (value) => {
    const digits = String(value || "").replace(/\D/g, "");
    if (!digits)
        return "";
    if (digits.length === 10)
        return digits;
    if (digits.length === 11 && digits.startsWith("0"))
        return digits.slice(1);
    if (digits.length === 12 && digits.startsWith("91"))
        return digits.slice(2);
    if (digits.length >= 10 && digits.length <= 15)
        return digits;
    return "";
};
const resolveIdentifier = (value) => {
    const raw = String(value || "").trim();
    if (!raw) {
        return { type: "unknown", value: "" };
    }
    if (raw.includes("@")) {
        const email = normalizeEmail(raw);
        return email
            ? { type: "email", value: email }
            : { type: "unknown", value: raw };
    }
    const phone = normalizePhone(raw);
    return phone
        ? { type: "phone", value: phone }
        : { type: "unknown", value: raw };
};
const findUserByIdentifier = async (identifier) => {
    const resolved = resolveIdentifier(identifier);
    if (resolved.type === "email") {
        return prisma.user.findUnique({ where: { email: resolved.value } });
    }
    if (resolved.type === "phone") {
        return prisma.user.findUnique({ where: { phone: resolved.value } });
    }
    return null;
};
const createAuthToken = (user) => jwt.sign({
    id: user.id,
    email: user.email || "",
    phone: user.phone || "",
    role: user.role,
}, JWT_SECRET, { expiresIn: "7d" });
const buildUserPayload = (user) => ({
    id: user.id,
    name: user.name,
    email: user.email || "",
    phone: user.phone || "",
    role: user.role,
});
const generateOtp = () => String(randomInt(100000, 1000000));
export const register = async (req, res) => {
    try {
        const { name, email, phone, password } = req.body;
        const cleanName = String(name || "").trim();
        const cleanEmail = normalizeEmail(email || "");
        const cleanPhone = normalizePhone(phone || "");
        if (!cleanName || !password || (!cleanEmail && !cleanPhone)) {
            return res.status(400).json({
                message: "Name, password and at least one email or mobile number are required",
            });
        }
        if (phone && !cleanPhone) {
            return res.status(400).json({ message: "Enter a valid mobile number" });
        }
        if (cleanEmail) {
            const existingEmail = await prisma.user.findUnique({
                where: { email: cleanEmail },
            });
            if (existingEmail) {
                return res.status(400).json({ message: "Email already registered" });
            }
        }
        if (cleanPhone) {
            const existingPhone = await prisma.user.findUnique({
                where: { phone: cleanPhone },
            });
            if (existingPhone) {
                return res.status(400).json({ message: "Mobile number already registered" });
            }
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await prisma.user.create({
            data: {
                name: cleanName,
                email: cleanEmail || null,
                phone: cleanPhone || null,
                password: hashedPassword,
                role: "ADMIN",
            },
            select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                role: true,
                createdAt: true,
            },
        });
        const token = createAuthToken(user);
        return res.json({
            message: "User registered successfully",
            token,
            user: buildUserPayload(user),
        });
    }
    catch (error) {
        console.error("REGISTER ERROR:", error);
        return res.status(500).json({ message: "Registration failed" });
    }
};
export const login = async (req, res) => {
    try {
        const { identifier, email, password } = req.body;
        const loginIdentifier = String(identifier || email || "").trim();
        if (!loginIdentifier || !password) {
            return res
                .status(400)
                .json({ message: "Email/mobile number and password required" });
        }
        const user = await findUserByIdentifier(loginIdentifier);
        if (!user) {
            return res.status(404).json({
                message: "No account found for this email/mobile number in this software. Use the exact email/mobile saved during registration or register this account first.",
            });
        }
        const valid = await bcrypt.compare(password, user.password);
        if (!valid) {
            return res.status(401).json({ message: "Password is incorrect for this account" });
        }
        const token = createAuthToken(user);
        return res.json({
            message: "Login successful",
            token,
            user: buildUserPayload(user),
        });
    }
    catch (error) {
        console.error("LOGIN ERROR:", error);
        return res.status(500).json({ message: "Login failed" });
    }
};
export const requestLoginOtp = async (req, res) => {
    try {
        const { identifier } = req.body;
        const loginIdentifier = String(identifier || "").trim();
        const resolved = resolveIdentifier(loginIdentifier);
        if (!loginIdentifier || resolved.type === "unknown") {
            return res.status(400).json({ message: "Enter a valid email or mobile number" });
        }
        const user = await findUserByIdentifier(loginIdentifier);
        if (!user) {
            return res
                .status(404)
                .json({ message: "No account found for this email or mobile number" });
        }
        const now = Date.now();
        const requestedAt = user.otpRequestedAt
            ? new Date(user.otpRequestedAt).getTime()
            : 0;
        const secondsRemaining = Math.ceil(OTP_COOLDOWN_SECONDS - (now - requestedAt) / 1000);
        if (secondsRemaining > 0) {
            return res.status(429).json({
                message: `Please wait ${secondsRemaining} seconds before requesting another OTP`,
            });
        }
        const otp = generateOtp();
        const otpExpiresAt = new Date(now + OTP_EXPIRY_MINUTES * 60 * 1000);
        await prisma.user.update({
            where: { id: user.id },
            data: {
                otpCode: otp,
                otpExpiresAt,
                otpRequestedAt: new Date(now),
            },
        });
        console.log(`[AUTH OTP] SJQD login OTP for ${resolved.type} ${resolved.value}: ${otp}`);
        return res.json({
            message: `OTP created for your ${resolved.type}. ${shouldExposeOtpPreview
                ? "Use the demo OTP shown below."
                : "Connect email/SMS delivery to send it automatically."}`,
            otpPreview: shouldExposeOtpPreview ? otp : undefined,
            expiresInSeconds: OTP_EXPIRY_MINUTES * 60,
            identifierType: resolved.type,
        });
    }
    catch (error) {
        console.error("REQUEST OTP ERROR:", error);
        return res.status(500).json({ message: "Failed to create OTP" });
    }
};
export const verifyOtpLogin = async (req, res) => {
    try {
        const { identifier, otp } = req.body;
        const loginIdentifier = String(identifier || "").trim();
        const typedOtp = String(otp || "").trim();
        if (!loginIdentifier || !typedOtp) {
            return res
                .status(400)
                .json({ message: "Email/mobile number and OTP are required" });
        }
        const user = await findUserByIdentifier(loginIdentifier);
        if (!user || !user.otpCode || !user.otpExpiresAt) {
            return res
                .status(401)
                .json({ message: "OTP not found. Please request a new OTP." });
        }
        if (user.otpExpiresAt.getTime() < Date.now()) {
            await prisma.user.update({
                where: { id: user.id },
                data: {
                    otpCode: null,
                    otpExpiresAt: null,
                },
            });
            return res.status(401).json({ message: "OTP expired. Please request a new OTP." });
        }
        if (user.otpCode !== typedOtp) {
            return res.status(401).json({ message: "Invalid OTP" });
        }
        await prisma.user.update({
            where: { id: user.id },
            data: {
                otpCode: null,
                otpExpiresAt: null,
            },
        });
        const token = createAuthToken(user);
        return res.json({
            message: "OTP login successful",
            token,
            user: buildUserPayload(user),
        });
    }
    catch (error) {
        console.error("VERIFY OTP LOGIN ERROR:", error);
        return res.status(500).json({ message: "OTP login failed" });
    }
};
export const resetPasswordWithOtp = async (req, res) => {
    try {
        const { identifier, otp, newPassword } = req.body;
        const loginIdentifier = String(identifier || "").trim();
        const typedOtp = String(otp || "").trim();
        const nextPassword = String(newPassword || "").trim();
        if (!loginIdentifier || !typedOtp || !nextPassword) {
            return res
                .status(400)
                .json({ message: "Email/mobile number, OTP and new password are required" });
        }
        if (nextPassword.length < 4) {
            return res.status(400).json({ message: "New password must be at least 4 characters" });
        }
        const user = await findUserByIdentifier(loginIdentifier);
        if (!user || !user.otpCode || !user.otpExpiresAt) {
            return res
                .status(401)
                .json({ message: "OTP not found. Please request a new OTP." });
        }
        if (user.otpExpiresAt.getTime() < Date.now()) {
            await prisma.user.update({
                where: { id: user.id },
                data: {
                    otpCode: null,
                    otpExpiresAt: null,
                },
            });
            return res.status(401).json({ message: "OTP expired. Please request a new OTP." });
        }
        if (user.otpCode !== typedOtp) {
            return res.status(401).json({ message: "Invalid OTP" });
        }
        const hashedPassword = await bcrypt.hash(nextPassword, 10);
        await prisma.user.update({
            where: { id: user.id },
            data: {
                password: hashedPassword,
                otpCode: null,
                otpExpiresAt: null,
            },
        });
        return res.json({
            message: "Password reset successful. Login with your new password.",
        });
    }
    catch (error) {
        console.error("RESET PASSWORD WITH OTP ERROR:", error);
        return res.status(500).json({ message: "Password reset failed" });
    }
};
export const changePassword = async (req, res) => {
    try {
        const { identifier, email, oldPassword, newPassword } = req.body;
        const changeIdentifier = String(identifier || email || "").trim();
        if (!changeIdentifier || !oldPassword || !newPassword) {
            return res.status(400).json({ message: "All password fields required" });
        }
        const user = await findUserByIdentifier(changeIdentifier);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        const valid = await bcrypt.compare(oldPassword, user.password);
        if (!valid) {
            return res.status(401).json({ message: "Old password is incorrect" });
        }
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await prisma.user.update({
            where: { id: user.id },
            data: { password: hashedPassword },
        });
        return res.json({ message: "Password changed successfully" });
    }
    catch (error) {
        console.error("CHANGE PASSWORD ERROR:", error);
        return res.status(500).json({ message: "Password change failed" });
    }
};
