import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export interface AuthRequest extends Request {
  user?: {
    id: number;
    userId: number;
    role?: string;
    email?: string | null;
    phone?: string | null;
  };
}

export const authMiddleware = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized. Token missing.",
      });
    }

    const token = authHeader.split(" ")[1];

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "sjqd_super_secret_key_change_later"
    ) as any;

    const userId = Number(decoded.id || decoded.userId);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Invalid token.",
      });
    }

    req.user = {
      id: userId,
      userId,
      role: decoded.role,
      email: decoded.email || null,
      phone: decoded.phone || null,
    };

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized. Invalid or expired token.",
    });
  }
};

export default authMiddleware;