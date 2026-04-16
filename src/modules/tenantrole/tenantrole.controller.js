import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// =========================
// 🏢 CREAR ROL Y ASIGNAR PERMISOS
// =========================
export const createRole = async (req, res) => {
  const { roleName, permissionIds } = req.body;

  try {
    const companyId = req.user.companyId;

    // VALIDAR
    if (!roleName) {
      throw new Error("El nombre del rol es obligatorio");
    }

    // VALIDAR DUPLICADO
    const existingRole = await prisma.role.findFirst({
      where: {
        name: roleName,
        scope: "TENANT",
        companyId
      }
    });

    if (existingRole) {
      throw new Error("El rol ya existe");
    }

    // CREAR ROL
    const role = await prisma.role.create({
      data: {
        name: roleName,
        scope: "TENANT",
        company: {
          connect: { id: companyId }
        }
      }
    });

    // ASIGNAR PERMISOS
    if (permissionIds && permissionIds.length > 0) {
      await prisma.rolePermission.createMany({
        data: permissionIds.map(permissionId => ({
          roleId: role.id,
          permissionId
        }))
      });
    }

    res.status(201).json({
      message: "Rol creado correctamente",
      role
    });

  } catch (error) {
    

    res.status(400).json({
      message: error.message || "Error creando rol"
    });
  }
};

// =========================
// 📋 LISTAR ROLES CON PERMISOS
// =========================
export const getRoles = async (req, res) => {
  try {
    const companyId = req.user.companyId;

    const roles = await prisma.role.findMany({
      where: {
        companyId,
        scope: "TENANT"
      },
      include: {
        permissions: {
          include: {
            permission: {
              select: {
                id: true,
                code: true,
                description: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    res.json(roles);

  } catch (error) {
    

    res.status(500).json({
      message: "Error obteniendo roles"
    });
  }
};

// =========================
// ✏️ ACTUALIZAR ROL
// =========================
export const updateRole = async (req, res) => {
  const { id } = req.params;
  const { name, permissionIds } = req.body;

  try {
    const companyId = req.user.companyId;

    // VALIDAR QUE EL ROL PERTENECE AL TENANT
    const existingRole = await prisma.role.findFirst({
      where: {
        id,
        companyId
      }
    });

    if (!existingRole) {
      return res.status(404).json({
        message: "Rol no encontrado"
      });
    }

    const result = await prisma.$transaction(async (tx) => {

      // ACTUALIZAR NOMBRE
      const role = await tx.role.update({
        where: { id },
        data: {
          ...(name && { name })
        }
      });

      // ACTUALIZAR PERMISOS
      if (permissionIds !== undefined) {

        // ELIMINAR ANTERIORES
        await tx.rolePermission.deleteMany({
          where: { roleId: id }
        });

        // CREAR NUEVOS
        if (permissionIds.length > 0) {
          await tx.rolePermission.createMany({
            data: permissionIds.map(permissionId => ({
              roleId: id,
              permissionId
            }))
          });
        }
      }

      return role;
    });

    res.json({
      message: "Rol actualizado correctamente",
      role: result
    });

  } catch (error) {
    

    res.status(400).json({
      message: error.message || "Error actualizando rol"
    });
  }
};

// =========================
// 🗑 ELIMINAR ROL
// =========================
export const deleteRole = async (req, res) => {
  const { id } = req.params;

  try {
    const companyId = req.user.companyId;

    const role = await prisma.role.findFirst({
      where: {
        id,
        companyId
      }
    });

    if (!role) {
      return res.status(404).json({
        message: "Rol no encontrado"
      });
    }

    await prisma.$transaction(async (tx) => {

      // eliminar relaciones
      await tx.userRole.deleteMany({
        where: { roleId: id }
      });

      await tx.rolePermission.deleteMany({
        where: { roleId: id }
      });

      // eliminar rol
      await tx.role.delete({
        where: { id }
      });
    });

    res.json({
      message: "Rol eliminado correctamente"
    });

  } catch (error) {
    

    res.status(500).json({
      message: error.message || "Error eliminando rol"
    });
  }
};

// =========================
// ➕ ASIGNAR ROL A USUARIO
// =========================
export const assignRoleToUser = async (req, res) => {
  const { userId, roleId } = req.body;

  try {
    const companyId = req.user.companyId;

    const userRole = await prisma.userRole.create({
      data: {
        userId,
        roleId,
        companyId
      }
    });

    res.status(201).json({
      message: "Rol asignado correctamente",
      userRole
    });

  } catch (error) {
    

    res.status(400).json({
      message: "Error asignando rol al usuario"
    });
  }
};

// =========================
// ❌ QUITAR ROL A USUARIO
// =========================
export const removeRoleFromUser = async (req, res) => {
  const { userId, roleId } = req.body;

  try {
    const userRole = await prisma.userRole.delete({
      where: {
        userId_roleId: {
          userId,
          roleId
        }
      }
    });

    res.json({
      message: "Rol eliminado correctamente del usuario",
      userRole
    });

  } catch (error) {
    

    res.status(400).json({
      message: "Error eliminando rol del usuario"
    });
  }
};