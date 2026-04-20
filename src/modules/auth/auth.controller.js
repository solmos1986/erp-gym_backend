import prisma from "../../config/prisma.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

// =======================
// LOGIN
// =======================
export const login = async (req, res) => {
  const { email, password } = req.body;
  console.log('usuario', email, 'contraseña: ', password);
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
      },
    });

    if (!user) {
      return res.status(401).json({ message: "Invalid credentialses" });
    }

    // 🔐 Validar password
    const valid = await bcrypt.compare(password, user.password);

    if (!valid) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // ==========================
    // 🔥 SEPARAR ROLES
    // ==========================
    const systemRoles = user.roles
      .filter((r) => r.role.scope === "SYSTEM")
      .map((r) => r.role.name);

    const tenantRoles = user.roles.map((r) => ({
      role: r.role.name,
      companyId: r.companyId,
    }));

    // ==========================
    // 🔥 EXTRAER PERMISOS (ARRAY REAL)
    // ==========================
    const permissions = user.roles.flatMap((ur) =>
      (ur.role.permissions || []).map((rp) => rp.permission.code)
    );

    // 🔥 eliminar duplicados + limpiar nulls
    const uniquePermissions = [
      ...new Set(permissions.filter(Boolean))
    ];

    // ==========================
    // 🔑 JWT
    // ==========================
    const token = jwt.sign(
      {
        userId: user.id,
        companyId: user.companyId || null,
        branchId: user.branchId || null,
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
        systemRoles,
        permissions: uniquePermissions,
        companies: tenantRoles
      },
    });

  } catch (error) {
    console.error('LOGIN ERROR:', error); // 🔥 AGREGAR ESTO
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
      permissions: req.user.permissions || [],
      systemRoles: req.user.systemRoles || []
    });
  } catch (error) {
    res.status(500).json({ message: "Error getting user" });
  }
};