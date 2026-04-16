import { PrismaClient } from "@prisma/client";
import { applyTenantFilter } from "../../utils/tenant.util.js";

const prisma = new PrismaClient();

// =========================
// ➕ CREAR PARTNER
// =========================
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

      // 🧼 SANITIZAR CAMPOS
      const cleanDocument = document ? String(document) : null;
      const cleanPhone = phone ? String(phone) : null;
      const cleanEmail = email || null;
      const cleanAddress = address || null;
      const cleanImageUrl = imageUrl?.trim() || null;

      // 🔍 VALIDAR DOCUMENTO ÚNICO
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
            connect: { id: req.user.companyId }
          }
        }
      });

      // 🖼️ CREAR IMAGEN (solo si válida)
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
    

    res.status(400).json({
      message: error.message || "Error creando cliente"
    });
  }
};

// =========================
// 📋 LISTAR PARTNERS
// =========================
export const getPartners = async (req, res) => {
  try {
    const partners = await prisma.partner.findMany({
      where: applyTenantFilter(req),
      orderBy: { createdAt: "desc" }
    });

    const baseUrl = process.env.BASE_URL || `${req.protocol}://${req.get('host')}`;

    const partnersWithUrl = partners.map(p => ({
      ...p,
      imageUrl: p.imageUrl ? `${baseUrl}/${p.imageUrl}` : null
    }));

    res.json(partnersWithUrl);

  } catch (error) {
    

    res.status(500).json({
      message: "Error obteniendo clientes"
    });
  }
};

// =========================
// 🔍 OBTENER PARTNER
// =========================
export const getPartnerById = async (req, res) => {
  const { id } = req.params;

  try {
    const partner = await prisma.partner.findFirst({
      where: {
        id,
        ...applyTenantFilter(req)
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

    res.json({ message: "Cliente desactivado" });

  } catch (error) {
    

    res.status(500).json({
      message: "Error eliminando cliente"
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

    const baseUrl = process.env.BASE_URL || `${req.protocol}://${req.get('host')}`;

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