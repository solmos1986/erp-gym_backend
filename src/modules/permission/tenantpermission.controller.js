import { PrismaClient } from "@prisma/client";
import { applyTenantFilter } from "../../utils/tenant.util.js";

const prisma = new PrismaClient();


// =========================
// 📋 LISTAR PERMISOS
// =========================
export const getPermissions = async (req, res) => {
  try {

    // 🔥 SI ES SYSTEM → ver todo
    if (req.user.systemRoles?.includes("SYSTEM_ADMIN")) {
      const permissions = await prisma.permission.findMany({
        where: { scope: "TENANT" }
      });

      return res.json(permissions);
    }

    // 🔥 SI ES TENANT → solo lo permitido
    const permissions = await prisma.companyPermission.findMany({
      where: { companyId: req.user.companyId },
      include: {
        permission: true
      }
    });

    return res.json(
      permissions.map(p => p.permission)
    );

  } catch (error) {
    res.status(500).json({ message: "Error obteniendo permisos" });
  }
};