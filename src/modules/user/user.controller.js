import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
import { applyTenantFilter } from "../../utils/tenant.util.js";

const prisma = new PrismaClient();

// =========================
// ➕ CREAR USUARIO
// =========================
export const createUser = async (req, res) => {
  const { email, password, fullName, roles, branchId } = req.body;
  // 🔥 DEBUG
  try {
    const result = await prisma.$transaction(async (tx) => {

      // 1. VALIDAR EMAIL
      const existingUser = await tx.user.findUnique({
        where: { email }
      });

      if (existingUser) {
        throw new Error("El email ya está registrado");
      }

      // 2. VALIDAR ROLES
      if (!roles || roles.length === 0) {
        throw new Error("Debe asignar al menos un rol");
      }

      const validRoles = await tx.role.findMany({
        where: {
          id: { in: roles },
          companyId: req.user.companyId
        }
      });

      if (validRoles.length !== roles.length) {
        throw new Error("Roles inválidos");
      }

      // 3. VALIDAR SUCURSAL
      const branch = await tx.branch.findFirst({
        where: {
          id: branchId,
          companyId: req.user.companyId
        }
      });

      if (!branch) {
        throw new Error("Sucursal inválida");
      }

      // 4. HASH PASSWORD
      const hashedPassword = await bcrypt.hash(password, 10);

      // 5. CREAR USER (🔥 FIX RELACIONES)
      const user = await tx.user.create({
        data: {
          email,
          password: hashedPassword,
          fullName,

          company: {
            connect: { id: req.user.companyId }
          },
          branch: {
            connect: { id: branchId }
          }
        }
      });

      // 6. ASIGNAR ROLES
      await tx.userRole.createMany({
        data: roles.map(roleId => ({
          userId: user.id,
          roleId,
          companyId: req.user.companyId
        }))
      });

      return user;
    });

    res.status(201).json({
      message: "Usuario creado correctamente",
      user: result
    });

  } catch (error) {
    

    res.status(400).json({
      message: error.message || "Error creando usuario"
    });
  }
};

// =========================
// 📋 LISTAR USUARIOS
// =========================
export const getUsers = async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      where: applyTenantFilter(req),
      include: {
        roles: {
          include: { role: true }
        },
        branch: true
      },
      orderBy: { createdAt: "desc" }
    });

    res.json(users);
  } catch (error) {
    

    res.status(500).json({
      message: "Error obteniendo usuarios"
    });
  }
};

// =========================
// 🔍 OBTENER USUARIO
// =========================
export const getUserById = async (req, res) => {
  const { id } = req.params;

  try {
    const user = await prisma.user.findFirst({
      where: {
        id,
        ...applyTenantFilter(req)
      },
      include: {
        roles: {
          include: { role: true }
        },
        branch: true
      }
    });

    if (!user) {
      return res.status(404).json({
        message: "Usuario no encontrado"
      });
    }

    res.json(user);
  } catch (error) {
    

    res.status(500).json({
      message: "Error obteniendo usuario"
    });
  }
};

// =========================
// ✏️ ACTUALIZAR USUARIO
// =========================
export const updateUser = async (req, res) => {
  const { id } = req.params;
  const { email, fullName, password, roles, branchId, isActive } = req.body;

  try {
    const existingUser = await prisma.user.findFirst({
      where: {
        id,
        ...applyTenantFilter(req)
      }
    });

    if (!existingUser) {
      return res.status(404).json({
        message: "Usuario no encontrado"
      });
    }

    const result = await prisma.$transaction(async (tx) => {

      // VALIDAR SUCURSAL
      if (branchId) {
        const branch = await tx.branch.findFirst({
          where: {
            id: branchId,
            companyId: req.user.companyId
          }
        });

        if (!branch) {
          throw new Error("Sucursal inválida");
        }
      }

      // VALIDAR ROLES (🔥 agregado)
      if (roles) {
        const validRoles = await tx.role.findMany({
          where: {
            id: { in: roles },
            companyId: req.user.companyId
          }
        });

        if (validRoles.length !== roles.length) {
          throw new Error("Roles inválidos");
        }
      }

      // ELIMINAR ROLES
      await tx.userRole.deleteMany({ where: { userId: id } });

      let hashedPassword;
      if (password) {
        hashedPassword = await bcrypt.hash(password, 10);
      }

      // ACTUALIZAR USER
      const user = await tx.user.update({
        where: { id },
        data: {
          email,
          fullName,
          isActive,

          ...(branchId && {
            branch: { connect: { id: branchId } }
          }),

          ...(hashedPassword && { password: hashedPassword })
        }
      });

      // RECREAR ROLES
      if (roles && roles.length > 0) {
        await tx.userRole.createMany({
          data: roles.map(roleId => ({
            userId: id,
            roleId,
            companyId: req.user.companyId
          }))
        });
      }

      return user;
    });

    res.json({
      message: "Usuario actualizado correctamente",
      user: result
    });

  } catch (error) {
    

    res.status(400).json({
      message: error.message || "Error actualizando usuario"
    });
  }
};

// =========================
// ❌ DESACTIVAR USUARIO
// =========================
export const deleteUser = async (req, res) => {
  const { id } = req.params;

  try {
    const user = await prisma.user.findFirst({
      where: {
        id,
        ...applyTenantFilter(req)
      }
    });

    if (!user) {
      return res.status(404).json({
        message: "Usuario no encontrado"
      });
    }

    await prisma.user.update({
      where: { id },
      data: { isActive: false }
    });

    res.json({ message: "Usuario desactivado" });

  } catch (error) {
    

    res.status(500).json({
      message: "Error eliminando usuario"
    });
  }
};