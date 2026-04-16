import { PrismaClient } from "@prisma/client";
import { applyTenantFilter } from "../../utils/tenant.util.js";
import crypto from "crypto";

const prisma = new PrismaClient();

// =========================
// 📋 LISTAR SUCURSALES
// =========================
export const getBranches = async (req, res) => {
  

  try {
    const branches = await prisma.branch.findMany({
      where: applyTenantFilter(req),
      include: {
        company: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    res.json(branches);
  } catch (error) {
    

    res.status(500).json({
      message: "Error obteniendo sucursales",
    });
  }
};

// =========================
// ➕ CREAR SUCURSAL + AGENT
// =========================
export const createBranch = async (req, res) => {
  try {
    const { name } = req.body;
    const companyId = req.user.companyId; // 🔥 clave multi-tenant

    if (!name) {
      return res.status(400).json({
        message: "Nombre requerido",
      });
    }

    const result = await prisma.$transaction(async (tx) => {
      // 1️⃣ Crear sucursal
      const branch = await tx.branch.create({
        data: {
          name,
          companyId,
        },
      });

      // 2️⃣ Generar agentKey seguro
      const agentKey = crypto.randomBytes(32).toString("hex");

      // 3️⃣ Crear Agent automático
      const agent = await tx.agent.create({
        data: {
          name: `Agent - ${branch.name}`, // 🔥 EXTRA PRO
          agentKey,
          companyId,
          branchId: branch.id,
        },
      });

      return { branch, agentKey };
    });

    return res.status(201).json({
      message: "Sucursal creada correctamente",
      branch: result.branch,

      // 🔐 IMPORTANTE: solo mostrar una vez
      agentKey: result.agentKey,
    });
  } catch (error) {
    

    // 🔥 error por duplicado (name + companyId)
    if (error.code === "P2002") {
      return res.status(400).json({
        message: "Ya existe una sucursal con ese nombre",
      });
    }

    return res.status(500).json({
      message: "Error al crear sucursal",
    });
  }
};