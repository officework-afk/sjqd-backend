import jwt from "jsonwebtoken";
export const authMiddleware = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized. Token missing.",
            });
        }
        const token = authHeader.split(" ")[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET || "sjqd_super_secret_key_change_later");
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
    }
    catch (error) {
        return res.status(401).json({
            success: false,
            message: "Unauthorized. Invalid or expired token.",
        });
    }
};
export default authMiddleware;
