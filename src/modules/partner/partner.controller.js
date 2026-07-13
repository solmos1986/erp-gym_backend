import { PrismaClient } from "@prisma/client";
import { applyTenantFilter } from "../../utils/tenant.util.js";
import { sendCommandToAgent, notifyFrontend } from "../../lib/websocket.server.js";
import XLSX from "xlsx";

const prisma = new PrismaClient();
const parseExcelDate = (value) => {
  // Excel serial
  if (typeof value === "number") {
    const utcDays = Math.floor(value - 25569);

    const date = new Date(utcDays * 86400 * 1000);

    return new Date(
      date.getUTCFullYear(),

      date.getUTCMonth(),
      date.getUTCDate()
    );
  }
  // Texto YYYY-MM-DD
  if (typeof value === "string") {
    const [year, month, day] = value.split("-").map(Number);
    return new Date(year, month - 1, day);
  }
  return null;
};

const startOfDay = (date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

const endOfDay = (date) => {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
};
// =========================
// ➕ CREAR PARTNER
// =========================

// export const createPartner = async (req, res) => {
//   const { name, document, phone, email, address, type, imageUrl } = req.body;

//   try {
//     const result = await prisma.$transaction(async (tx) => {
//       // 🔒 VALIDAR companyId
//       if (!req.user.companyId) {
//         throw new Error("CompanyId no definido");
//       }

//       // 🧠 NORMALIZAR TYPE
//       const validTypes = ["CUSTOMER", "SUPPLIER"];
//       const safeType = (type || "CUSTOMER").toUpperCase();

//       if (!validTypes.includes(safeType)) {
//         throw new Error("Tipo inválido");
//       }

//       // 🧼 SANITIZAR CAMPOS
//       const cleanDocument = document?.trim();
//       const cleanPhone = phone ? String(phone) : null;
//       const cleanEmail = email || null;
//       const cleanAddress = address || null;
//       const cleanImageUrl = imageUrl?.trim() || null;

//       // 🚫 VALIDAR DOCUMENTO OBLIGATORIO
//       if (!cleanDocument) {
//         throw new Error("El documento es obligatorio");
//       }

//       // 🔍 VALIDAR DOCUMENTO ÚNICO
//       const existing = await tx.partner.findFirst({
//         where: {
//           document: cleanDocument,
//           companyId: req.user.companyId
//         }
//       });

//       if (existing) {
//         throw new Error("El documento ya está registrado");
//       }

//       // ➕ CREAR PARTNER
//       const partner = await tx.partner.create({
//         data: {
//           name,
//           document: cleanDocument,
//           phone: cleanPhone,
//           email: cleanEmail,
//           address: cleanAddress,
//           type: safeType,
//           company: {
//             connect: { id: req.user.companyId }
//           }
//         }
//       });

//       // 🖼️ CREAR IMAGEN (solo si válida)
//       if (cleanImageUrl) {
//         await tx.partnerImage.create({
//           data: {
//             partnerId: partner.id,
//             url: cleanImageUrl,
//             isMain: true
//           }
//         });
//       }

//       return partner;
//     });

//     res.status(201).json({
//       message: "Cliente creado correctamente",
//       partner: result
//     });
//   } catch (error) {
//     res.status(400).json({
//       message: error.message || "Error creando cliente"
//     });
//   }
// };
export const createPartner = async (req, res) => {
  const { name, document, phone, email, address, type, imageUrl } = req.body;

  try {
    const result = await prisma.$transaction(async (tx) => {
      // 🔒 VALIDAR companyId
      if (!req.user.companyId) {
        throw new Error("CompanyId no definido");
      }

      // 🧠 NORMALIZAR TYPE
      const validTypes = ["CUSTOMER", "SUPPLIER"];
      const safeType = (type || "CUSTOMER").toUpperCase();

      if (!validTypes.includes(safeType)) {
        throw new Error("Tipo inválido");
      }

      // 🔍 OBTENER TIPO DE NEGOCIO
      const company = await tx.company.findUnique({
        where: {
          id: req.user.companyId
        },
        include: {
          businessTemplate: true
        }
      });

      if (!company) {
        throw new Error("Empresa no encontrada");
      }

      const requiresDocument =
        company.businessTemplate?.code === "GYM";

      // 🧼 SANITIZAR CAMPOS
      const cleanDocument = document?.trim() || null;
      const cleanPhone = phone ? String(phone) : null;
      const cleanEmail = email || null;
      const cleanAddress = address || null;
      const cleanImageUrl = imageUrl?.trim() || null;

      // 🚫 DOCUMENTO OBLIGATORIO SOLO PARA GYM
      if (requiresDocument && !cleanDocument) {
        throw new Error("El documento es obligatorio");
      }

      // 🔍 VALIDAR DOCUMENTO ÚNICO SOLO SI EXISTE
      if (cleanDocument) {
        const existing = await tx.partner.findFirst({
          where: {
            document: cleanDocument,
            companyId: req.user.companyId
          }
        });

        if (existing) {
          throw new Error("El documento ya está registrado");
        }
      }

      // ➕ CREAR PARTNER
      const partner = await tx.partner.create({
        data: {
          name,
          document: cleanDocument,
          phone: cleanPhone,
          email: cleanEmail,
          address: cleanAddress,
          type: safeType,
          company: {
            connect: {
              id: req.user.companyId
            }
          }
        }
      });

      // 🖼️ CREAR IMAGEN
      if (cleanImageUrl) {
        await tx.partnerImage.create({
          data: {
            partnerId: partner.id,
            url: cleanImageUrl,
            isMain: true
          }
        });
      }

      return partner;
    });

    res.status(201).json({
      message: "Cliente creado correctamente",
      partner: result
    });
  } catch (error) {
  console.error(error);

  res.status(400).json({
    message: error.message,
    stack: error.stack
  });}
};
// =========================
// 📋 LISTAR PARTNERS
// =========================
export const getPartners = async (req, res) => {
  try {
    const { type } = req.query;
    const partners = await prisma.partner.findMany({
      where: {
        ...applyTenantFilter(req),
        ...(type && { type })
      },
      orderBy: { createdAt: "desc" },
      include: {
        membership: true // 🔗 incluir membresías
      }
    });

    const baseUrl = process.env.BASE_URL || `${req.protocol}://${req.get("host")}`;

    const partnersWithUrl = partners.map((p) => ({
      ...p,
      imageUrl: p.imageUrl ? `${baseUrl}/${p.imageUrl}` : null
    }));

    res.json(partnersWithUrl);
  } catch (error) {
    console.error(error); // 🔥 AGREGA ESTO
    res.status(500).json({ message: "Error obteniendo clientes" });
  }
};

// =========================
// 🔍 OBTENER PARTNER
// =========================
export const getPartnerById = async (req, res) => {
  const { id } = req.params;

  try {
    const { type } = req.query;
    const partner = await prisma.partner.findFirst({
      where: {
        id,
        ...applyTenantFilter(req),
        ...(type && { type })
      },
      include: {
        memberships: true
      }
    });

    if (!partner) {
      return res.status(404).json({
        message: "Cliente no encontrado"
      });
    }

    res.json(partner);
  } catch (error) {
    res.status(500).json({
      message: "Error obteniendo cliente"
    });
  }
};

// =========================
// ✏️ ACTUALIZAR PARTNER
// =========================
export const updatePartner = async (req, res) => {
  const { id } = req.params;
  const { name, document, phone, email, address, type, isActive } = req.body;

  try {
    // 🔒 Validar existencia + tenant
    const existing = await prisma.partner.findFirst({
      where: {
        id,
        ...applyTenantFilter(req)
      }
    });

    if (!existing) {
      return res.status(404).json({
        message: "Cliente no encontrado"
      });
    }

    // 🧠 Normalizar tipo
    const safeType = type ? type.toUpperCase() : existing.type;

    // 🔍 Validar documento único (si cambia)
    if (document && document !== existing.document) {
      const duplicate = await prisma.partner.findFirst({
        where: {
          document: String(document),
          companyId: req.user.companyId,
          NOT: { id }
        }
      });

      if (duplicate) {
        return res.status(400).json({
          message: "El documento ya está registrado"
        });
      }
    }

    // ✏️ Actualizar partner
    const partner = await prisma.partner.update({
      where: { id },
      data: {
        name: name ?? existing.name,
        document: document ? String(document) : null,
        phone: phone ? String(phone) : null,
        email: email || null,
        address: address || null,
        type: safeType,
        ...(typeof isActive === "boolean" && { isActive })
      }
    });

    res.json({
      message: "Cliente actualizado correctamente",
      partner
    });
  } catch (error) {
    res.status(400).json({
      message: error.message || "Error actualizando cliente"
    });
  }
};

// =========================
// ❌ DESACTIVAR PARTNER
// =========================
export const deletePartner = async (req, res) => {
  const { id } = req.params;
  const companyId = req.user.companyId;
  try {
    const partner = await prisma.partner.findFirst({
      where: {
        id,
        ...applyTenantFilter(req)
      }
    });

    if (!partner) {
      return res.status(404).json({
        message: "Cliente no encontrado"
      });
    }

    await prisma.partner.update({
      where: { id },
      data: { isActive: false }
    });

    // =====================
    // CREAR COMMAND DIRECTO (igual que sync)
    // =====================
    const baseUrl = process.env.BASE_URL;
    const branches = await prisma.branch.findMany({
      where: {
        companyId
      },
      select: {
        id: true
      }
    });

    for (const branch of branches) {
      await prisma.$transaction(async (tx) => {
        await tx.command.create({
          data: {
            type: "DELETE_USER",
            payload: {
              userId: partner.id,
              name: partner.name
            },
            companyId: partner.companyId,
            branchId: req.user.branchId
          }
        });
      });
    }

    sendCommandToAgent(partner.companyId, req.user.branchId, {
      type: "SYNC"
    });

    notifyFrontend({
      type: "MEMBERSHIP_UPDATE"
    });

    res.json({ message: "Cliente desactivado" });
  } catch (error) {
    res.status(500).json({
      message: "Error eliminando cliente",
      error: error.message
    });
  }
};

// =========================
// 🖼️ AGREGAR IMAGEN
// =========================
export const addPartnerImage = async (req, res) => {
  const { id } = req.params;

  try {
    if (!req.file) {
      throw new Error("Archivo no enviado");
    }

    const baseUrl = process.env.BASE_URL || `${req.protocol}://${req.get("host")}`;

    const filePath = `uploads/partners/${req.file.filename}`; // 👈 lo que guardas en DB
    const fileUrl = `${baseUrl}/${filePath}`; // 👈 solo si lo necesitas devolver
    const partner = await prisma.partner.findFirst({
      where: {
        id,
        ...applyTenantFilter(req)
      }
    });

    if (!partner) {
      return res.status(404).json({
        message: "Cliente no encontrado"
      });
    }

    // 🔥🔥🔥 AQUÍ ESTABA EL ERROR → FALTABA ESTO
    const updated = await prisma.partner.updateMany({
      where: {
        id,
        ...applyTenantFilter(req)
      },
      data: {
        imageUrl: filePath
      }
    });

    res.json({
      message: "Imagen subida correctamente",
      url: fileUrl
    });
  } catch (error) {
    res.status(400).json({
      message: error.message || "Error subiendo imagen"
    });
  }
};
//=======================
// 🖼️ ACTIVAR PARTNE
// ========================
export const activatePartner = async (req, res) => {
  const { id } = req.params;

  try {
    const partner = await prisma.partner.findFirst({
      where: {
        id,
        companyId: req.user.companyId
      }
    });

    if (!partner) {
      return res.status(404).json({
        message: "Cliente no encontrado"
      });
    }

    await prisma.partner.update({
      where: { id },
      data: { isActive: true }
    });

    res.json({ message: "Cliente activado correctamente" });
  } catch (error) {
    res.status(500).json({
      message: "Error activando cliente"
    });
  }
};
// =========================
// IMPORTAR CLIENTES EXCEL
// =========================
export const importPartnersFromExcel = async (req, res) => {
  try {
    const workbook = XLSX.readFile(req.file.path);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet);

    let imported = 0;
    let skipped = 0;
    let memberships = 0;

    for (const row of rows) {
      if (!row.Nombre) {
        skipped++;
        continue;
      }

      const document = row.Documento ? String(row.Documento) : null;

      let partner = await prisma.partner.findFirst({
        where: {
          companyId: req.user.companyId,
          document
        }
      });

      if (!partner) {
        partner = await prisma.partner.create({
          data: {
            companyId: req.user.companyId,
            type: "CUSTOMER",
            name: row.Nombre,
            document,
            phone: row.Telefono ? String(row.Telefono) : null,
            email: row.Email ?? null,
            address: row.Direccion ?? null
          }
        });
        imported++;
      } else {
        skipped++;
      }

      if (row.FechaInicio && row.FechaFin) {
        await prisma.customerMembership.upsert({
          where: {
            customerId: partner.id
          },
          update: {
            startDate: startOfDay(parseExcelDate(row.FechaInicio)),
            endDate: endOfDay(parseExcelDate(row.FechaFin)),
            status: "ACTIVE",
            branchId: req.user.branchId
          },
          create: {
            customerId: partner.id,
            companyId: req.user.companyId,
            branchId: req.user.branchId,
            startDate: startOfDay(parseExcelDate(row.FechaInicio)),
            endDate: endOfDay(parseExcelDate(row.FechaFin)),
            status: "ACTIVE"
          }
        });
        memberships++;
      }
    }
    notifyFrontend({
      type: "MIGRATION_IMPORT"
    });
    return res.json({
      ok: true,
      total: rows.length,
      imported,
      skipped,
      memberships
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      ok: false,
      message: error.message
    });
  }
};
