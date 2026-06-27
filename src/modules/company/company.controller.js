import prisma from "../../lib/prisma.js";
import bcrypt from "bcrypt";
import crypto from "crypto";

const copyRoleTemplatesToCompany = async (tx, businessTemplateId, companyId) => {
  const rolesMap = {};

  const roleTemplates = await tx.roleTemplate.findMany({
    where: {
      businessTemplateId
    },
    include: {
      permissions: true
    }
  });

  for (const template of roleTemplates) {
    const role = await tx.role.create({
      data: {
        name: template.name,
        scope: "TENANT",
        companyId,
        // NUEVO
        roleTemplateId: template.id
      }
    });

    rolesMap[template.name] = role.id;

    if (template.permissions.length) {
      await tx.rolePermission.createMany({
        data: template.permissions.map((p) => ({
          roleId: role.id,
          permissionId: p.permissionId
        })),
        skipDuplicates: true
      });
    }
  }

  return rolesMap;
};
// =========================
// ➕ CREAR COMPANY
// =========================

export const registerCompany = async (req, res) => {
  const { name, email, password, businessTemplateId, logoUrl } = req.body;
  try {
    const fullName = 'OWNER';
    const result = await prisma.$transaction(async (tx) => {
      // ========================
      // VALIDACIONES
      // ========================
      if (!name) throw new Error("Nombre de empresa requerido");
      if (!fullName) throw new Error("Nombre completo requerido");
      if (!email) throw new Error("Email requerido");
      if (!password) throw new Error("Password requerido");
      if (!businessTemplateId) {
        throw new Error("Debe seleccionar un tipo de empresa");
      }

      const businessTemplate = await tx.businessTemplate.findUnique({
        where: {
          id: businessTemplateId
        }
      });

      if (!businessTemplate) {
        throw new Error("Template de negocio inválido");
      }
      // ========================
      // EMAIL ÚNICO
      // ========================
      const existingUser = await tx.user.findUnique({
        where: { email }
      });

      if (existingUser) {
        throw new Error("El email ya está registrado");
      }

      // ========================
      // CREAR EMPRESA
      // ========================
      const company = await tx.company.create({
        data: {
          name,
          logoUrl,
          isActive: true,
          businessTemplateId
        }
      });
      const roles = await copyRoleTemplatesToCompany(tx, businessTemplateId, company.id);
      const templatePermissions = await tx.businessTemplatePermission.findMany({
        where: {
          businessTemplateId
        }
      });
      // ========================
      // CREAR BRANCH PRINCIPAL
      // ========================
      const branch = await tx.branch.create({
        data: {
          name: "Principal",
          companyId: company.id
        }
      });

      // ========================
      // CREAR AGENT AUTOMÁTICO
      // ========================
      const agentKey = crypto.randomBytes(32).toString("hex");

      await tx.agent.create({
        data: {
          name: `Agent - ${branch.name}`,
          agentKey,
          companyId: company.id,
          branchId: branch.id
        }
      });

      // // ========================
      // // CREAR ROLE OWNER
      // // ========================
      // const ownerRole = await tx.role.create({
      //   data: {
      //     name: "OWNER",
      //     scope: "TENANT",
      //     companyId: company.id
      //   }
      // });

      // // ========================
      // // ASIGNAR PERMISOS AL ROLE
      // // ========================
      // await tx.rolePermission.createMany({
      //   data: templatePermissions.map((p) => ({
      //     roleId: ownerRole.id,
      //     permissionId: p.permissionId
      //   })),
      //   skipDuplicates: true
      // });

      // ========================
      // HASH PASSWORD
      // ========================
      const hashedPassword = await bcrypt.hash(password, 10);

      // ========================
      // CREAR USER OWNER 🔥
      // ========================
      const user = await tx.user.create({
        data: {
          fullName,
          email,
          password: hashedPassword,
          companyId: company.id,
          branchId: branch.id,
          isOwner: true // 🔥 CLAVE
        }
      });

      // ========================
      // ASIGNAR ROLE AL USER
      // ========================
      await tx.userRole.create({
        data: {
          userId: user.id,
          roleId: roles.OWNER,
          companyId: company.id
        }
      });

      // ========================
      // PERMISOS DE EMPRESA
      // ========================
      await tx.companyPermission.createMany({
        data: templatePermissions.map((p) => ({
          companyId: company.id,
          permissionId: p.permissionId
        })),
        skipDuplicates: true
      });

      return {
        company,
        owner: {
          id: user.id,
          email: user.email,
          fullName: user.fullName
        }
      };
    });

    res.status(201).json({
      message: "Empresa creada correctamente",
      data: result
    });
  } catch (error) {
    console.error("❌ ERROR REGISTER COMPANY:", error);

    res.status(400).json({
      message: error.message || "Error creando empresa"
    });
  }
};
// =========================
// 📋 LISTAR
// =========================

export const getCompanies = async (req, res) => {
  try {
    const companies = await prisma.company.findMany({
      include: {
        // 🔐 permisos de la empresa
        companyPermissions: {
          select: {
            permissionId: true
          }
        },

        // 👤 SOLO EL OWNER
        users: {
          where: { isOwner: true },
          select: {
            id: true,
            email: true,
            fullName: true,
            isActive: true
          }
        },

        // 🏢 sucursales
        branches: {
          include: {
            agents: true, // para tu vista de estado del agent
            users: {
              select: {
                id: true,
                fullName: true,
                email: true,
                isActive: true
              }
            }
          }
        },
        businessTemplate: {
          select: {
            id: true,
            code: true,
            name: true
          }
        }
      },
      orderBy: {
        createdAt: "desc"
      }
    });

    // =========================
    // 🔥 FORMATEO FINAL
    // =========================
    const result = companies.map((c) => ({
      id: c.id,
      name: c.name,
      isActive: c.isActive,
      logoUrl: c.logoUrl,
      createdAt: c.createdAt,
      businessTemplate: c.businessTemplate,
      // 👤 owner limpio
      owner: c.users[0] || null,

      // 🔐 permisos simplificados (solo ids)
      permissions: c.companyPermissions.map((p) => p.permissionId),

      // 🏢 sucursales completas
      branches: c.branches
    }));

    res.json(result);
  } catch (error) {
    console.error("❌ ERROR GET COMPANIES:", error);

    res.status(500).json({
      message: "Error obteniendo empresas"
    });
  }
};
// =========================
// 🔍 OBTENER POR ID
// =========================
export const getCompanyById = async (req, res) => {
  const { id } = req.params;

  try {
    const company = await prisma.company.findUnique({
      where: { id },
      include: {
        companyPermissions: true
      }
    });

    if (!company) {
      return res.status(404).json({
        message: "Empresa no encontrada"
      });
    }

    res.json(company);
  } catch (error) {
    res.status(500).json({
      message: "Error obteniendo empresa"
    });
  }
};

// =========================
// ✏️ UPDATE
// =========================
export const updateCompany = async (req, res) => {
  const { id } = req.params;

  try {
    const { name, email, fullName, password, permissions } = req.body;

    await prisma.$transaction(async (tx) => {
      // =========================
      // 🔍 EMPRESA + OWNER
      // =========================
      const company = await tx.company.findUnique({
        where: { id },
        include: {
          users: {
            where: { isOwner: true }
          }
        }
      });

      if (!company) {
        throw new Error("Empresa no encontrada");
      }

      const owner = company.users[0];

      // =========================
      // 🔥 VALIDAR EMAIL ÚNICO
      // =========================
      if (email) {
        const existingUser = await tx.user.findUnique({
          where: { email }
        });

        if (existingUser && existingUser.id !== owner?.id) {
          throw new Error("El email ya está en uso");
        }
      }

      // =========================
      // 👤 UPDATE OWNER
      // =========================
      if (owner) {
        const userData = {};

        if (email !== undefined) userData.email = email;
        if (fullName !== undefined) userData.fullName = fullName;

        // 🔐 password opcional
        if (password) {
          userData.password = await bcrypt.hash(password, 10);
        }

        if (Object.keys(userData).length > 0) {
          await tx.user.update({
            where: { id: owner.id },
            data: userData
          });
        }
      }

      // =========================
      // 🏢 UPDATE COMPANY
      // =========================
      if (name !== undefined) {
        await tx.company.update({
          where: { id },
          data: { name }
        });
      }

      // =========================
      // 🔐 PERMISOS EMPRESA
      // =========================
      if (permissions) {
        // validar permisos
        const validPermissions = await tx.permission.findMany({
          where: {
            id: { in: permissions },
            scope: "TENANT"
          }
        });

        if (validPermissions.length !== permissions.length) {
          throw new Error("Permisos inválidos detectados");
        }

        // reset permisos
        await tx.companyPermission.deleteMany({
          where: { companyId: id }
        });

        await tx.companyPermission.createMany({
          data: permissions.map((permissionId) => ({
            companyId: id,
            permissionId
          })),
          skipDuplicates: true
        });

        // 🔥 (OPCIONAL PERO PRO)
        // actualizar también permisos del ROLE OWNER
        const ownerRole = await tx.role.findFirst({
          where: {
            companyId: id,
            name: "OWNER"
          }
        });

        if (ownerRole) {
          await tx.rolePermission.deleteMany({
            where: { roleId: ownerRole.id }
          });

          await tx.rolePermission.createMany({
            data: permissions.map((permissionId) => ({
              roleId: ownerRole.id,
              permissionId
            })),
            skipDuplicates: true
          });
        }
      }
    });

    res.json({
      message: "Empresa actualizada correctamente"
    });
  } catch (error) {
    console.error("❌ ERROR UPDATE COMPANY:", error);

    res.status(400).json({
      message: error.message || "Error actualizando empresa"
    });
  }
};
// =========================
// ❌ DELETE (soft)
// =========================
export const deleteCompany = async (req, res) => {
  const { id } = req.params;

  try {
    await prisma.company.update({
      where: { id },
      data: {
        isActive: false
      }
    });

    res.json({
      message: "Empresa desactivada"
    });
  } catch (error) {
    res.status(400).json({
      message: "Error eliminando empresa"
    });
  }
};

// =========================
// ✅ ACTIVATE
// =========================
export const activateCompany = async (req, res) => {
  const { id } = req.params;

  try {
    await prisma.company.update({
      where: { id },
      data: {
        isActive: true
      }
    });

    res.json({
      message: "Empresa activada"
    });
  } catch (error) {
    res.status(400).json({
      message: "Error activando empresa"
    });
  }
};

// =========================
// 🖼️ UPLOAD LOGO
// =========================
export const uploadCompanyLogo = async (req, res) => {
  const { id } = req.params;

  try {
    if (!req.file) {
      throw new Error("Archivo no enviado");
    }

    const baseUrl = process.env.BASE_URL || `${req.protocol}://${req.get("host")}`;

    const filePath = `uploads/logos/${req.file.filename}`;
    const fileUrl = `${baseUrl}/${filePath}`;

    const company = await prisma.company.findUnique({
      where: { id }
    });

    if (!company) {
      return res.status(404).json({
        message: "Empresa no encontrada"
      });
    }

    await prisma.company.update({
      where: { id },
      data: {
        logoUrl: filePath
      }
    });

    res.json({
      message: "Logo subido correctamente",
      url: fileUrl
    });
  } catch (error) {
    res.status(400).json({
      message: error.message || "Error subiendo logo"
    });
  }
};
