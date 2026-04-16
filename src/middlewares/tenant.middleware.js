import prisma from "../config/prisma.js";

export const tenantGuard = async (req, res, next) => {
//   console.log("TENANT GUARD:", {
//   user: req.user,
//   body: req.body,
//   query: req.query
// });
  try {
    // 1️⃣ validar user del token
    const user = req.user;

    if (!user) {
      return res.status(401).json({
        message: "No autenticado (req.user no existe)"
      });
    }

    const { id, companyId, branchId } = user;

    if (!companyId) {
      return res.status(403).json({
        message: "Usuario sin companyId"
      });
    }

    // 2️⃣ validar que el usuario exista y esté activo
    const dbUser = await prisma.user.findFirst({
      where: {
        id,
        companyId,
        isActive: true
      },
      include: {
        company: true,
        branch: true
      }
    });

    if (!dbUser) {
      return res.status(403).json({
        message: "Usuario no válido o inactivo"
      });
    }

    // 3️⃣ validar company activa
    if (!dbUser.company?.isActive) {
      return res.status(403).json({
        message: "Empresa inactiva"
      });
    }

    // 4️⃣ validar branch activa
    if (!dbUser.branch || !dbUser.branch.isActive) {
      return res.status(403).json({
        message: "Sucursal inactiva"
      });
    }

    // 5️⃣ inyectar contexto limpio
    req.context = {
      userId: dbUser.id,
      companyId: dbUser.companyId,
      branchId: dbUser.branchId
    };

    // (opcional mantener compatibilidad)
    //req.user = dbUser;

    next();
  } catch (error) {
    
    res.status(500).json({
      message: "Error en tenant guard"
    });
  }
};