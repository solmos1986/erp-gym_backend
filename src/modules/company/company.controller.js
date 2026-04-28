import prisma from "../../lib/prisma.js";
import bcrypt from "bcrypt";
import crypto from "crypto";
// =========================
// ➕ CREAR COMPANY
// =========================
export const registerCompany = async (req, res) => {
  const { name, fullName, email, password, permissions, logoUrl } = req.body;

  try {
    const result = await prisma.$transaction(async (tx) => {

      // ========================
      // VALIDACIONES
      // ========================
      if (!name) throw new Error("Nombre de empresa requerido");
      if (!fullName) throw new Error("Nombre completo requerido");
      if (!email) throw new Error("Email requerido");
      if (!password) throw new Error("Password requerido");

      const parsedPermissions = permissions || [];

      if (!parsedPermissions.length) {
        throw new Error("Debe seleccionar permisos");
      }

      // ========================
      // VALIDAR EMAIL ÚNICO
      // ========================
      const existingUser = await tx.user.findUnique({
        where: { email }
      });

      if (existingUser) {
        throw new Error("El email ya está registrado");
      }

      // ========================
      // VALIDAR PERMISOS
      // ========================
      const validPermissions = await tx.permission.findMany({
        where: {
          id: { in: parsedPermissions },
          scope: "TENANT"
        }
      });

      if (validPermissions.length !== parsedPermissions.length) {
        throw new Error("Permisos inválidos detectados");
      }

      // ========================
      // CREAR EMPRESA
      // ========================
      const company = await tx.company.create({
        data: {
          name,
          logoUrl,
          isActive: true
        }
      });

      // ========================
      // CREAR BRANCH
      // ========================
      const branch = await tx.branch.create({
        data: {
          name: "Principal",
          companyId: company.id
        }
      });
      // 2️⃣ Generar agentKey seguro
            const agentKey = crypto.randomBytes(32).toString("hex");
      
            // 3️⃣ Crear Agent automático
            const agent = await tx.agent.create({
              data: {
                name: `Agent - ${branch.name}`, // 🔥 EXTRA PRO
                agentKey,
                companyId: company.id,
                branchId: branch.id,
              },
            });

      // ========================
      // CREAR ROLE OWNER
      // ========================
      const ownerRole = await tx.role.create({
        data: {
          name: "OWNER",
          scope: "TENANT",
          companyId: company.id
        }
      });

      // ========================
      // ASIGNAR PERMISOS AL ROLE
      // ========================
      await tx.rolePermission.createMany({
        data: parsedPermissions.map((permissionId) => ({
          roleId: ownerRole.id,
          permissionId
        })),
        skipDuplicates: true // 🔥 IMPORTANTE
      });

      // ========================
      // HASH PASSWORD
      // ========================
      const hashedPassword = await bcrypt.hash(password, 10);

      // ========================
      // CREAR USUARIO
      // ========================
      const user = await tx.user.create({
        data: {
          fullName,
          email,
          password: hashedPassword,
          companyId: company.id,
          branchId: branch.id
        }
      });

      // ========================
      // ASIGNAR ROLE AL USER
      // ========================
      await tx.userRole.create({
        data: {
          userId: user.id,
          roleId: ownerRole.id,
          companyId: company.id
        }
      });

      // ========================
      // PERMISOS DE EMPRESA
      // ========================
      await tx.companyPermission.createMany({
        data: parsedPermissions.map((permissionId) => ({
          companyId: company.id,
          permissionId
        })),
        skipDuplicates: true // 🔥 IMPORTANTE
      });

      return {
        company,
        user
      };
    });

    res.status(201).json({
      message: "Empresa creada correctamente",
      data: result
    });

  } catch (error) {
    console.error("❌ ERROR REGISTER COMPANY:", error); // 🔥 LOG REAL
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
        companyPermissions: true,
        branches: {
          include: {
            agent: true // 🔥 opcional pero recomendado
          }
        }
      }
    });

    res.json(companies);

  } catch (error) {
    

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
    const { permissions, ...data } = req.body;

    const result = await prisma.$transaction(async (tx) => {

      const company = await tx.company.findUnique({
        where: { id }
      });

      if (!company) {
        throw new Error("Empresa no encontrada");
      }

      const updateData = {};

      if (data.name !== undefined) {
        updateData.name = data.name;
      }

      // 🏢 update company
      await tx.company.update({
        where: { id },
        data: updateData
      });

      // 🔐 actualizar permisos
      if (permissions) {
        await tx.companyPermission.deleteMany({
          where: { companyId: id }
        });

        await tx.companyPermission.createMany({
          data: permissions.map((permissionId) => ({
            companyId: id,
            permissionId
          }))
        });
      }

      return true;
    });

    res.json({
      message: "Empresa actualizada correctamente"
    });

  } catch (error) {
    

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

    const baseUrl = process.env.BASE_URL || `${req.protocol}://${req.get('host')}`;

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