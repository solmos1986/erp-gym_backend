import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const getSalesReportService = async ({ companyId, branchId, userBranchId, isOwner, customerId, status, from, to }) => {
  const where = {
    companyId
  };

  // =========================
  // 🏢 SUCURSAL
  // =========================

  if (!isOwner) {
    where.branchId = userBranchId;
  } else if (branchId) {
    where.branchId = branchId;
  }

  // =========================
  // 👤 CLIENTE
  // =========================

  if (customerId) {
    where.customerId = customerId;
  }

  // =========================
  // 🟢 ESTADO
  // =========================

  if (status) {
    where.status = status;
  }

  // =========================
  // 📅 FECHAS
  // =========================

  if (!from && !to) {
    const last30Days = new Date();

    last30Days.setDate(last30Days.getDate() - 30);

    last30Days.setHours(0, 0, 0, 0);

    where.saleDate = {
      gte: last30Days
    };
  } else {
    where.saleDate = {};

    if (from) {
      const start = new Date(from);

      start.setHours(0, 0, 0, 0);

      where.saleDate.gte = start;
    }

    if (to) {
      const end = new Date(to);

      end.setHours(23, 59, 59, 999);

      where.saleDate.lte = end;
    }
  }

  const sales = await prisma.sale.findMany({
    where,

    include: {
      company: {
        select: {
          name: true,
          logoUrl: true
        }
      },

      customer: {
        select: {
          name: true
        }
      },

      user: {
        select: {
          fullName: true
        }
      },

      branch: {
        select: {
          name: true
        }
      },

      details: {
        select: {
          itemType: true
        }
      }
    }
  });

  return sales.map((sale) => ({
    id: sale.id,

    date: sale.saleDate,

    saleNumber: sale.saleNumber,

    type: sale.details.some((d) => d.itemType === "MEMBERSHIP_PLAN") ? "MEMBRESÍA" : "PRODUCTO",

    customer: sale.customer?.name || "Consumidor Final",

    seller: sale.user?.fullName || "-",

    branch: sale.branch,

    company: sale.company,

    total: Number(sale.total),

    status: sale.status
  }));
};
