import { PrismaClient } from "@prisma/client";
import { applyTenantFilter } from "../../utils/tenant.util.js";

const prisma = new PrismaClient();

// =========================
// 📋 LISTAR BUSINESS TEMPLATES
// =========================
export const getBusinessTemplates = async (req, res) => {
  const templates = await prisma.businessTemplate.findMany({
    where: {
      isActive: true
    },
    orderBy: {
      name: "asc"
    }
  });

  res.json(templates);
};
