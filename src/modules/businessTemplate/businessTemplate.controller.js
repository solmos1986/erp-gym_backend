import { PrismaClient } from "@prisma/client";
import { applyTenantFilter } from "../../utils/tenant.util.js";

const prisma = new PrismaClient();

// =========================
// 📋 LISTAR BUSINESS TEMPLATES
// =========================
export const getBusinessTemplates = async (req, res) => {
  const templates = await prisma.businessTemplate.findMany({
    include: {
      permissions: {
        include: {
          permission: true
        }
      },

      roleTemplates: {
        include: {
          permissions: {
            include: {
              permission: true
            }
          }
        }
      }
    }
  });

  res.json(templates);
};

// =========================
// 📋 LISTAR BUSINESS TEMPLATES POR ID
// =========================
export const getBusinessTemplateById = async (req, res) => {
  try {
    const { id } = req.params;

    const template = await prisma.businessTemplate.findUnique({
      where: { id }
    });

    if (!template) {
      return res.status(404).json({
        message: "Vertical no encontrada"
      });
    }

    res.json(template);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Error obteniendo vertical"
    });
  }
};

// =========================
// 📋 CREAR BUSINESS TEMPLATES
// =========================
export const createBusinessTemplate = async (req, res) => {
  try {
    const { code, name, description, permissions = [] } = req.body;

    if (!code) {
      throw new Error("Código requerido");
    }

    if (!name) {
      throw new Error("Nombre requerido");
    }

    const result = await prisma.$transaction(async (tx) => {
      const exists = await tx.businessTemplate.findFirst({
        where: {
          OR: [{ code: code.toUpperCase() }, { name }]
        }
      });

      if (exists) {
        throw new Error("Ya existe una vertical con ese código o nombre");
      }

      // =========================
      // CREAR VERTICAL
      // =========================
      const template = await tx.businessTemplate.create({
        data: {
          code: code.toUpperCase(),
          name,
          description
        }
      });

      // =========================
      // PERMISOS DE LA VERTICAL
      // =========================
      if (permissions.length) {
        await tx.businessTemplatePermission.createMany({
          data: permissions.map((permissionId) => ({
            businessTemplateId: template.id,
            permissionId
          })),
          skipDuplicates: true
        });
      }

      // =========================
      // CREAR OWNER AUTOMÁTICO
      // =========================
      const ownerRole = await tx.roleTemplate.create({
        data: {
          name: "OWNER",
          businessTemplateId: template.id
        }
      });

      // =========================
      // OWNER RECIBE TODOS LOS
      // PERMISOS DE LA VERTICAL
      // =========================
      if (permissions.length) {
        await tx.roleTemplatePermission.createMany({
          data: permissions.map((permissionId) => ({
            roleTemplateId: ownerRole.id,
            permissionId
          })),
          skipDuplicates: true
        });
      }

      return template;
    });

    res.status(201).json(result);
  } catch (error) {
    console.error(error);

    res.status(400).json({
      message: error.message
    });
  }
};

// =========================
// 📋 ACTUALIZAR BUSINESS TEMPLATES
// =========================
export const updateBusinessTemplate = async (req, res) => {
  try {
    const { id } = req.params;

    const { code, name, description, permissions = [] } = req.body;

    const result = await prisma.$transaction(async (tx) => {
      // =========================
      // ACTUALIZAR VERTICAL
      // =========================
      const template = await tx.businessTemplate.update({
        where: { id },
        data: {
          code: code?.toUpperCase(),
          name,
          description
        }
      });

      // =========================
      // PERMISOS ACTUALES
      // =========================
      const currentPermissions = await tx.businessTemplatePermission.findMany({
        where: {
          businessTemplateId: id
        }
      });

      const currentIds = currentPermissions.map((p) => p.permissionId);

      const newIds = permissions;

      // =========================
      // DIFERENCIAS
      // =========================
      const addedPermissions = newIds.filter((id) => !currentIds.includes(id));

      const removedPermissions = currentIds.filter((id) => !newIds.includes(id));

      // =========================
      // REEMPLAZAR PERMISOS
      // =========================
      await tx.businessTemplatePermission.deleteMany({
        where: {
          businessTemplateId: id
        }
      });

      if (permissions.length) {
        await tx.businessTemplatePermission.createMany({
          data: permissions.map((permissionId) => ({
            businessTemplateId: id,
            permissionId
          })),
          skipDuplicates: true
        });
      }

      // =========================
      // OWNER DE LA VERTICAL
      // =========================
      const ownerRole = await tx.roleTemplate.findFirst({
        where: {
          businessTemplateId: id,
          name: "OWNER"
        }
      });

      // =========================
      // NUEVOS PERMISOS
      // → AGREGAR A OWNER
      // =========================
      if (ownerRole && addedPermissions.length) {
        await tx.roleTemplatePermission.createMany({
          data: addedPermissions.map((permissionId) => ({
            roleTemplateId: ownerRole.id,
            permissionId
          })),
          skipDuplicates: true
        });
      }

      // =========================
      // PERMISOS ELIMINADOS
      // → ELIMINAR DE TODOS LOS
      // ROLE TEMPLATE DE LA VERTICAL
      // =========================
      if (removedPermissions.length) {
        const roleTemplates = await tx.roleTemplate.findMany({
          where: {
            businessTemplateId: id
          },
          select: {
            id: true
          }
        });

        const roleTemplateIds = roleTemplates.map((r) => r.id);

        await tx.roleTemplatePermission.deleteMany({
          where: {
            roleTemplateId: {
              in: roleTemplateIds
            },
            permissionId: {
              in: removedPermissions
            }
          }
        });
      }
      // =========================
      // SINCRONIZAR EMPRESAS
      // =========================
      await syncBusinessTemplatePermissions(tx, id);
      return template;
    });

    res.json(result);
  } catch (error) {
    console.error(error);

    res.status(400).json({
      message: error.message
    });
  }
};

// =========================
// 📋 ACTIVAR/DESACTUALIZAR BUSINESS TEMPLATES
// =========================
export const toggleBusinessTemplate = async (req, res) => {
  try {
    const { id } = req.params;

    const current = await prisma.businessTemplate.findUnique({
      where: { id }
    });

    if (!current) {
      return res.status(404).json({
        message: "Vertical no encontrada"
      });
    }

    const template = await prisma.businessTemplate.update({
      where: { id },
      data: {
        isActive: !current.isActive
      }
    });

    res.json(template);
  } catch (error) {
    console.error(error);

    res.status(400).json({
      message: error.message
    });
  }
};

// =========================
// 👥 CREAR ROLE TEMPLATE
// =========================
export const createRoleTemplate = async (req, res) => {
  try {
    const { id: businessTemplateId } = req.params;

    const { name, permissions = [] } = req.body;

    if (!name) {
      throw new Error("Nombre requerido");
    }

    const result = await prisma.$transaction(async (tx) => {
      const exists = await tx.roleTemplate.findFirst({
        where: {
          businessTemplateId,
          name: name.toUpperCase()
        }
      });

      if (exists) {
        throw new Error("Ya existe un rol con ese nombre en esta vertical");
      }

      const role = await tx.roleTemplate.create({
        data: {
          name: name.toUpperCase(),
          businessTemplateId
        }
      });

      if (permissions.length) {
        await tx.roleTemplatePermission.createMany({
          data: permissions.map((permissionId) => ({
            roleTemplateId: role.id,
            permissionId
          })),
          skipDuplicates: true
        });
      }
      await syncRoleTemplateCreation(tx, role.id);
      return role;
    });

    res.status(201).json(result);
  } catch (error) {
    console.error(error);

    res.status(400).json({
      message: error.message
    });
  }
};

// =========================
// 👥 ACTUALIZAR ROLE TEMPLATE
// =========================
export const updateRoleTemplate = async (req, res) => {
  try {
    const { roleId } = req.params;

    const { name, permissions = [] } = req.body;

    const result = await prisma.$transaction(async (tx) => {
      const role = await tx.roleTemplate.update({
        where: {
          id: roleId
        },
        data: {
          name: name.toUpperCase()
        }
      });

      await tx.roleTemplatePermission.deleteMany({
        where: {
          roleTemplateId: roleId
        }
      });

      if (permissions.length) {
        await tx.roleTemplatePermission.createMany({
          data: permissions.map((permissionId) => ({
            roleTemplateId: roleId,
            permissionId
          })),
          skipDuplicates: true
        });
      }
      await syncRoleTemplatePermissions(tx, roleId);
      return role;
    });

    res.json(result);
  } catch (error) {
    console.error(error);

    res.status(400).json({
      message: error.message
    });
  }
};

// =========================
// 👥 ELIMINAR ROLE TEMPLATE
// =========================
export const deleteRoleTemplate = async (req, res) => {
  try {
    const { roleId } = req.params;

    await prisma.$transaction(async (tx) => {
      await tx.roleTemplatePermission.deleteMany({
        where: {
          roleTemplateId: roleId
        }
      });

      await tx.roleTemplate.delete({
        where: {
          id: roleId
        }
      });
    });

    res.json({
      message: "Rol eliminado correctamente"
    });
  } catch (error) {
    console.error(error);

    res.status(400).json({
      message: error.message
    });
  }
};

//==========================
// SYNC BUSINESS TEMPLATE PERMISSIONS
//============================

export const syncBusinessTemplatePermissions = async (tx, businessTemplateId) => {
  // =========================
  // EMPRESAS DE LA VERTICAL
  // =========================
  const companies = await tx.company.findMany({
    where: {
      businessTemplateId
    },
    select: {
      id: true
    }
  });

  const companyIds = companies.map((c) => c.id);

  if (!companyIds.length) {
    return;
  }

  // =========================
  // BUSINESS TEMPLATE PERMISSIONS
  // =========================
  const templatePermissions = await tx.businessTemplatePermission.findMany({
    where: {
      businessTemplateId
    }
  });

  const templatePermissionIds = templatePermissions.map((p) => p.permissionId);

  // =========================
  // SINCRONIZAR COMPANY PERMISSION
  // =========================

  await tx.companyPermission.deleteMany({
    where: {
      companyId: {
        in: companyIds
      }
    }
  });

  if (templatePermissionIds.length) {
    await tx.companyPermission.createMany({
      data: companyIds.flatMap((companyId) =>
        templatePermissionIds.map((permissionId) => ({
          companyId,
          permissionId
        }))
      ),
      skipDuplicates: true
    });
  }

  // =========================
  // ROLE TEMPLATES DE LA VERTICAL
  // =========================
  const roleTemplates = await tx.roleTemplate.findMany({
    where: {
      businessTemplateId
    },
    include: {
      permissions: true
    }
  });

  // =========================
  // SINCRONIZAR ROLE PERMISSION
  // =========================
  for (const roleTemplate of roleTemplates) {
    const roles = await tx.role.findMany({
      where: {
        roleTemplateId: roleTemplate.id
      },
      select: {
        id: true
      }
    });

    const roleIds = roles.map((r) => r.id);

    if (!roleIds.length) {
      continue;
    }

    const permissionIds = roleTemplate.permissions.map((p) => p.permissionId);

    await tx.rolePermission.deleteMany({
      where: {
        roleId: {
          in: roleIds
        }
      }
    });

    if (permissionIds.length) {
      await tx.rolePermission.createMany({
        data: roleIds.flatMap((roleId) =>
          permissionIds.map((permissionId) => ({
            roleId,
            permissionId
          }))
        ),
        skipDuplicates: true
      });
    }
  }
};

//========================
// SYNC UPDATE ROLE TEMPLATE PERMISSIONS
//========================

const syncRoleTemplatePermissions = async (tx, roleTemplateId) => {
  // =========================
  // ROLES CREADOS A PARTIR
  // DE ESTE ROLE TEMPLATE
  // =========================
  const roles = await tx.role.findMany({
    where: {
      roleTemplateId
    },
    select: {
      id: true
    }
  });

  const roleIds = roles.map((r) => r.id);

  if (!roleIds.length) {
    return;
  }

  // =========================
  // PERMISOS DEL TEMPLATE
  // =========================
  const templatePermissions = await tx.roleTemplatePermission.findMany({
    where: {
      roleTemplateId
    }
  });

  const permissionIds = templatePermissions.map((p) => p.permissionId);

  // =========================
  // ELIMINAR PERMISOS ACTUALES
  // =========================
  await tx.rolePermission.deleteMany({
    where: {
      roleId: {
        in: roleIds
      }
    }
  });

  // =========================
  // RECREAR DESDE TEMPLATE
  // =========================
  if (permissionIds.length) {
    await tx.rolePermission.createMany({
      data: roleIds.flatMap((roleId) =>
        permissionIds.map((permissionId) => ({
          roleId,
          permissionId
        }))
      ),
      skipDuplicates: true
    });
  }
};

//==========================
// SYNC CREATE ROLE TEMPLATE AND PERMISSIONS
//==========================

const syncRoleTemplateCreation = async (tx, roleTemplateId) => {
  // =========================
  // TEMPLATE
  // =========================
  const roleTemplate = await tx.roleTemplate.findUnique({
    where: {
      id: roleTemplateId
    },
    include: {
      permissions: true
    }
  });

  if (!roleTemplate) {
    return;
  }

  // =========================
  // EMPRESAS DE LA VERTICAL
  // =========================
  const companies = await tx.company.findMany({
    where: {
      businessTemplateId: roleTemplate.businessTemplateId
    }
  });

  for (const company of companies) {
    // =========================
    // EVITAR DUPLICADOS
    // =========================
    const exists = await tx.role.findFirst({
      where: {
        companyId: company.id,
        roleTemplateId
      }
    });

    if (exists) {
      continue;
    }

    // =========================
    // CREAR ROLE
    // =========================
    const role = await tx.role.create({
      data: {
        name: roleTemplate.name,
        scope: "TENANT",
        companyId: company.id,
        roleTemplateId
      }
    });

    // =========================
    // COPIAR PERMISOS
    // =========================
    if (roleTemplate.permissions.length) {
      await tx.rolePermission.createMany({
        data: roleTemplate.permissions.map((p) => ({
          roleId: role.id,
          permissionId: p.permissionId
        })),
        skipDuplicates: true
      });
    }
  }
};

// ======================================================
// 🔄 SINCRONIZAR PERMISOS DEL OWNER DESDE EL TEMPLATE
// ETAPA 1: SOLO AGREGA PERMISOS FALTANTES
// ======================================================
export const syncOwnerPermissionsFromTemplate = async (tx, companyId) => {
  // =========================
  // EMPRESA
  // =========================
  const company = await tx.company.findUnique({
    where: { id: companyId }
  });

  if (!company || !company.businessTemplateId) {
    return;
  }

  // =========================
  // ROLE TEMPLATE OWNER
  // =========================
  const ownerTemplate = await tx.roleTemplate.findFirst({
    where: {
      businessTemplateId: company.businessTemplateId,
      name: "OWNER"
    },
    include: {
      permissions: true
    }
  });

  if (!ownerTemplate) {
    return;
  }

  // =========================
  // ROLE OWNER DEL TENANT
  // =========================
  const ownerRole = await tx.role.findFirst({
    where: {
      companyId,
      name: "OWNER"
    },
    include: {
      permissions: true
    }
  });

  if (!ownerRole) {
    return;
  }

  // =========================
  // PERMISOS ACTUALES DEL OWNER
  // =========================
  const currentPermissionIds = new Set(ownerRole.permissions.map((p) => p.permissionId));

  // =========================
  // PERMISOS FALTANTES
  // =========================
  const missingPermissions = ownerTemplate.permissions
    .filter((p) => !currentPermissionIds.has(p.permissionId))
    .map((p) => ({
      roleId: ownerRole.id,
      permissionId: p.permissionId
    }));

  // =========================
  // INSERTAR SOLO LOS FALTANTES
  // =========================
  if (missingPermissions.length > 0) {
    await tx.rolePermission.createMany({
      data: missingPermissions,
      skipDuplicates: true
    });
  }
};
