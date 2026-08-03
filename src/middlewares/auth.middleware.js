import jwt from "jsonwebtoken";
import { tenant } from "../utils/logger.js";

export const requireAuth = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        message: "Token requerido"
      });
    }

    const token = authHeader.split(" ")[1];

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

tenant({
    event: "JWT_VERIFIED",
    method: req.method,
    url: req.originalUrl,
    // ip: req.ip,
    userId: decoded.userId,
    companyId: decoded.companyId,
    branchId: decoded.branchId
});

req.user = decoded;

next();
  } catch (error) {
    return res.status(401).json({
      message: "Token inválido"
    });
  }
};
