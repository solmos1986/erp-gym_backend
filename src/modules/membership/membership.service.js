import { PrismaClient } from "@prisma/client";
import { sendCommandToAgent } from '../../lib/websocket.server.js';
const prisma = new PrismaClient();

// helper
const addDays = (date, days) => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

// =========================
// 💰 PURCHASE (CORE)
// =========================
export const purchase = async ({
  partnerId,
  planId,
  companyId,
  branchId,
  userId // 👈 NUEVO (vendedor)
}) => {
  return await prisma.$transaction(async (tx) => {

    // 🔍 validar cliente
    const partner = await tx.partner.findFirst({
      where: { id: partnerId, companyId }
    });
    if (!partner) throw new Error("Cliente no encontrado");

    // 🔍 validar plan
    const plan = await tx.plan.findFirst({
      where: { id: planId, companyId }
    });
    if (!plan) throw new Error("Plan no encontrado");

    // 🔍 validar usuario (vendedor) 👈 NUEVO
    const user = await tx.user.findFirst({
      where: { id: userId, companyId }
    });
    if (!user) throw new Error("Usuario vendedor no válido");

    const today = new Date();
    let startDate;
    let endDate;
    let startDateMembershipSale;

    // 🔍 membresía actual
    const current = await tx.customerMembership.findUnique({
      where: { customerId: partnerId }
    });

    if (current && current.endDate >= today) {
      startDate = current.startDate;
      startDateMembershipSale = current.endDate;
      endDate = addDays(startDateMembershipSale, plan.durationDays);
    } else {
      startDate = today;
      endDate = addDays(startDate, plan.durationDays);
      startDateMembershipSale = startDate;
    }

    // 🧱 upsert membresía
    const membership = await tx.customerMembership.upsert({
      where: { customerId: partnerId },
      update: {
        startDate,
        endDate,
        deletedFromDevice: false
      },
      create: {
        startDate,
        endDate,
        customer: { connect: { id: partnerId } },
        company: { connect: { id: companyId } },
        branch: { connect: { id: branchId } }
      }
    });

    // 💰 crear venta (MEJORADA)
    const sale = await tx.membershipSale.create({
      data: {
        partnerId,
        planId,
        companyId,
        branchId, // 👈 opcional pero recomendado
        startDate: startDateMembershipSale,
        endDate,
        price: plan.price,

        saleDate: new Date(), // negocio
        userId: userId // 👈 NUEVO (clave 🔥)
      }
    });

    // 🔥 SYNC MEMBERSHIP
    await tx.command.create({
      data: {
        type: "SYNC_MEMBERSHIP",
        payload: {
          membershipId: membership.id,
          clientId: partnerId,
          name: partner.name,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString()
        },
        membershipSaleId: sale.id,
        companyId,
        branchId
      }
    });

    // 🔥 SYNC FACE
    const baseUrl = process.env.BASE_URL;

    await tx.command.create({
      data: {
        type: "SYNC_FACE",
        payload: {
          userId: partnerId,
          name: partner.name,
          imagePath: partner.imageUrl
            ? `${baseUrl}/${partner.imageUrl}`
            : null
        },
        membershipSaleId: sale.id,
        companyId,
        branchId
      }
    });

    // 🚀 notificar agent
    sendCommandToAgent(companyId, branchId, 'SYNC');

    return { sale, membership };
  });
};
// =========================
// 📋 HISTORIAL
// =========================
export const getAll = async (req) => {
  const { companyId } = req.user;

  const { search, planId, userId, status, from, to } = req.query;

  const where = {
    companyId
  };
  

  // 🔎 Cliente
  if (search) {
    where.partner = {
      name: {
        contains: search,
        mode: 'insensitive'
      }
    };
  }

  // 📦 Plan
  if (planId) {
    where.planId = planId;
  }

  // 👤 Vendedor
  if (userId) {
    where.userId = userId;
  }

  // 📅 FECHA DE VENTA (AQUÍ VA 👇)
  if (from && to) {
    const start = new Date(from);
    start.setHours(0, 0, 0, 0);

    const end = new Date(to);
    end.setHours(23, 59, 59, 999);

    where.saleDate = {
      gte: start,
      lte: end
    };
  }

  // 🟢 Estado
  const now = new Date();

  if (status === 'ACTIVE') {
    where.startDate = { lte: now };
    where.endDate = { gte: now };
  }

  if (status === 'EXPIRED') {
    where.endDate = { lt: now };
  }

  if (status === 'FUTURE') {
    where.startDate = { gt: now };
  }

  return await prisma.membershipSale.findMany({
    where,
    include: {
      partner: true,
      plan: true,
      user: true,
      commands: true,
      company: true,
      branch: true
    },
    orderBy: {
      saleDate: 'desc'
    }
  });
};
// =========================
// 🔍 DETALLE
// =========================
export const getById = async (id, req) => {
  const membership = await prisma.membershipSale.findFirst({
    where: {
      id,
      companyId: req.user.companyId
    },
    include: {
      partner: true,
      plan: true
    }
  });

  if (!membership) throw new Error("Membresía no encontrada");

  return membership;
};

// =========================
// 🔐 ESTADO ACTUAL
// =========================
export const getStatus = async (customerId, companyId) => {
  const membership = await prisma.customerMembership.findUnique({
    where: { customerId }
  });

  if (!membership) {
    return { status: "NONE" };
  }

  const today = new Date();

  return {
    status: membership.endDate >= today ? "ACTIVE" : "EXPIRED",
    startDate: membership.startDate,
    endDate: membership.endDate
  };
};

export const getAllStatus = async (companyId) => {
  return await prisma.customerMembership.findMany({
    where: { companyId },
    include: {
      customer: true
    },
    orderBy: { endDate: 'asc' }
  });
};
// =========================
// 🔄 REINTENTAR PAGO
// =========================
export const retryMembershipSale = async ({
  membershipSaleId,
  companyId,
}) => {
  
  return await prisma.command.updateMany({
    where: {
      membershipSaleId,
      companyId,
      status: 'ERROR', // luego podemos mejorar esto
    },
    data: {
      status: 'PENDING',
      attempts: 0,
      error: null,
      executedAt: null,
    },
  });
};