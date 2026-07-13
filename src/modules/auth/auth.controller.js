import prisma from "../../config/prisma.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

// =======================
// LOGIN
// =======================
export const login = async (req, res) => {
  console.log("LOGIN REQUEST BODY:", req.body); // 🔥 DEBUG
  const { email, password } = req.body;
  console.log("usuario", email, "contraseña: ", password);
  // 🔥 DEBUG
  try {
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        roles: {
          include: {
            role: {
              include: {
                permissions: {
                  include: {
                    permission: true
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!user) {
      return res.status(401).json({ message: "Usuario Invalido" });
    }

    // 🔐 Validar password
    const valid = await bcrypt.compare(password, user.password);

    if (!valid) {
      return res.status(401).json({ message: "Contraseña Invalida" });
    }
    // ==========================
    // 🌐 OBTENER IP PUBLICA REAL
    // ==========================
    const clientIp = req.ip.replace("::ffff:", "");
    // ==========================
    // 🛡️ VALIDAR CAJEROS POR IP
    // ==========================
    const cashierRoles = ["CAJA", "CAJERO"];

    const isCashier = user.roles.some((r) => cashierRoles.includes(r.role.name?.toUpperCase()));

    if (isCashier) {
      // Buscar agent activo de la sucursal
      const agent = await prisma.agent.findFirst({
        where: {
          branchId: user.branchId,
          isActive: true
        }
      });

      // No existe agent
      if (!agent) {
        return res.status(403).json({
          message: "No existe un agent activo para esta sucursal"
        });
      }

      // Agent sin IP aún
      if (!agent.publicIp) {
        return res.status(403).json({
          message: "El agent aún no reportó IP pública"
        });
      }

      console.log("CLIENT IP:", clientIp);
      console.log("AGENT  IP:", agent.publicIp);

      // Comparar IPs
      if (clientIp !== agent.publicIp) {
        return res.status(403).json({
          message: "Debes iniciar sesión desde el gimnasio"
        });
      }
    }
    // ==========================
    // 🔥 SEPARAR ROLES
    // ==========================
    const systemRoles = user.roles.filter((r) => r.role.scope === "SYSTEM").map((r) => r.role.name);

    const tenantRoles = user.roles.map((r) => ({
      role: r.role.name,
      companyId: r.companyId
    }));

    // ==========================
    // 🔥 EXTRAER PERMISOS (ARRAY REAL)
    // ==========================
    const permissions = user.roles.flatMap((ur) => (ur.role.permissions || []).map((rp) => rp.permission.code));

    // 🔥 eliminar duplicados + limpiar nulls
    const uniquePermissions = [...new Set(permissions.filter(Boolean))];

    // ==========================
    // 🔑 JWT
    // ==========================
    const token = jwt.sign(
      {
        userId: user.id,
        companyId: user.companyId || null,
        branchId: user.branchId || null,
        isOwner: user.isOwner, // 👈 NUEVO
        systemRoles,
        permissions: uniquePermissions // 🔥 ARRAY GARANTIZADO
      },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        isOwner: user.isOwner, // 🔥 AGREGAR
        systemRoles,
        permissions: uniquePermissions,
        companies: tenantRoles
      }
    });
  } catch (error) {
    console.error("LOGIN ERROR:", error); // 🔥 AGREGAR ESTO
    res.status(500).json({ message: "Login error" });
  }
};

// =======================
// ME
// =======================
export const me = async (req, res) => {
  try {
    res.json({
      id: req.user.userId,
      companyId: req.user.companyId,
      branchId: req.user.branchId,

      isOwner: req.user.isOwner,
      permissions: req.user.permissions || [],
      systemRoles: req.user.systemRoles || []
    });
  } catch (error) {
    res.status(500).json({ message: "Error getting user" });
  }
};
