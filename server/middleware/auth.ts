import { RequestHandler } from "express";
import jwt from "jsonwebtoken";
import { db } from "../../shared/supabase";

const JWT_SECRET =
  process.env.JWT_SECRET || "your-secret-key-change-in-production";

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

export const authenticateToken: RequestHandler = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "المصادقة مطلوبة" });
    }

    const token = authHeader.replace("Bearer ", "");

    // Handle custom token format for compatibility
    if (token.startsWith("supabase_")) {
      const userId = token.replace("supabase_", "");

      try {
        const user = await db.users.findById(userId);
        if (!user) {
          return res.status(401).json({ error: "المستخدم غير موجود" });
        }

        (req as any).user = {
          id: user.id,
          email: user.email,
          role: user.role,
        };

        return next();
      } catch (error) {
        return res.status(401).json({ error: "خطأ في التحقق من المستخدم" });
      }
    }

    // Handle JWT tokens
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;

      const user = await db.users.findById(decoded.userId);
      if (!user) {
        return res.status(401).json({ error: "المستخدم غير موجود" });
      }

      (req as any).user = {
        id: user.id,
        email: user.email,
        role: user.role,
      };

      next();
    } catch (jwtError) {
      console.error("JWT verification failed:", jwtError);
      return res.status(401).json({ error: "رمز المصادقة غير صالح" });
    }
  } catch (error) {
    console.error("Auth middleware error:", error);
    return res.status(500).json({ error: "خطأ في المصادقة" });
  }
};

export const requireRole = (roles: string[]): RequestHandler => {
  return (req, res, next) => {
    const user = (req as any).user;

    if (!user) {
      return res.status(401).json({ error: "المصادقة مطلوبة" });
    }

    if (!roles.includes(user.role)) {
      return res.status(403).json({ error: "غير مصرح لك بالوصول" });
    }

    next();
  };
};
