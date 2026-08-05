import { PrismaClient } from "@prisma/client";
import { sendCommandToAgent, notifyFrontend, notifyBranch } from "../../lib/websocket.server.js";
import { createCashMovementPayments } from "../../utils/payment.helper.js";
const prisma = new PrismaClient();

// helper
const addDays = (date, days) => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};
// helpers de fecha
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
// 💰 PURCHASE (CORE)
// =========================
export const purchase = async ({
  partnerId,
  planId,
  companyId,
  branchId,
  userId, //👈 NUEVO (vendedor)
  payments
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

    // 🔍 validar usuario (vendedor)
    const user = await tx.user.findFirst({
      where: { id: userId, companyId }
    });
    if (!user) throw new Error("Usuario vendedor no válido");
    if (!payments || payments.length === 0) {
      throw new Error("Debe registrar al menos un método de pago");
    }
    // 🔍 validar caja abierta
    const cashRegister = await tx.cashRegister.findFirst({
      where: {
        companyId,
        branchId,
        status: "OPEN"
      }
    });

    if (!cashRegister) {
      throw new Error("Debe existir una caja abierta para realizar ventas");
    }
    const today = new Date();
    let startDate;
    let endDate;
    let startDateMembershipSale;

    // 🔍 membresía actual
    const current = await tx.customerMembership.findUnique({
      where: { customerId: partnerId }
    });

    if (current && current.endDate >= today) {
      startDate = startOfDay(current.startDate);
      startDateMembershipSale = startOfDay(current.endDate);
      endDate = endOfDay(addDays(startDateMembershipSale, plan.durationDays));
    } else {
      startDate = startOfDay(today);
      endDate = endOfDay(addDays(startDate, plan.durationDays));
      startDateMembershipSale = startOfDay(startDate);
    }
    const totalPayments = payments.reduce((sum, payment) => sum + Number(payment.amount), 0);

    if (totalPayments !== Number(plan.price)) {
      throw new Error("Los pagos no coinciden con el total de la venta");
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
    const lastSale = await tx.sale.findFirst({
      where: {
        companyId,
        branchId
      },
      orderBy: {
        saleNumber: "desc"
      },
      select: {
        saleNumber: true
      }
    });

    const nextSaleNumber = (lastSale?.saleNumber || 0) + 1;

    const commercialSale = await tx.sale.create({
      data: {
        companyId,
        branchId,

        customerId: partnerId,
        userId, // 🔥 FALTA ESTO
        saleNumber: nextSaleNumber,

        saleDate: new Date(),

        subtotal: plan.price,
        discount: 0,
        total: plan.price,

        status: "CONFIRMED"
      }
    });
    await tx.saleDetail.create({
      data: {
        saleId: commercialSale.id,

        itemType: "MEMBERSHIP_PLAN",

        itemId: plan.id,

        description: `${plan.name} (${startDateMembershipSale.toISOString().slice(0, 10)} - ${endDate.toISOString().slice(0, 10)})`,

        quantity: 1,

        unitPrice: plan.price,
        unitCost: 0,
        total: plan.price
      }
    });

    // 💰 crear venta (MEJORADA)
    const membershipSale = await tx.membershipSale.create({
      data: {
        partnerId,
        planId,
        companyId,
        branchId, // 👈 opcional pero recomendado
        saleId: commercialSale.id,
        startDate: startDateMembershipSale,
        endDate,
        price: plan.price,

        saleDate: new Date(), // negocio
        userId: userId // 👈 NUEVO (clave 🔥)
      }
    });
    await createCashMovementPayments({
      tx,

      companyId,
      branchId,

      userId,

      cashRegisterId: cashRegister.id,
      referenceId: commercialSale.id,
      movementType: "INCOME",

      referenceType: "MEMBERSHIP_SALE",

      description: `Venta Membresía #${commercialSale.saleNumber}`,

      payments
    });
    // // 🔥 SYNC FACE
    const baseUrl = process.env.BASE_URL;

    // 🔥 SYNC USER FULL (usuario + rostro)
    await tx.command.create({
      data: {
        type: "SYNC_USER_FULL",
        payload: {
          userId: partnerId,
          name: partner.name,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          imagePath: partner.imageUrl ? `${baseUrl}/${partner.imageUrl}` : null
        },
        membershipSaleId: membershipSale.id,
        companyId,
        branchId
      }
    });
    sendCommandToAgent(companyId, branchId, {
      type: "SYNC"
    });
   notifyBranch({
    companyId,
    branchId,
    event: {
        type: "MEMBERSHIP_UPDATE"
    }
});

    return {
      sale: commercialSale,
      membershipSale,
      membership
    };
  });
};
// =========================
// 📋 HISTORIAL
// =========================
export const getAll = async (req) => {
  const { companyId, branchId: userBranchId, isOwner } = req.user;
  
  const { search, planId, userId, branchId, status, from, to } = req.query;

  const where = {
    companyId
  };
  // 🏢 SUCURSAL
  if (!isOwner) {
    where.branchId = userBranchId;
  } else if (branchId) {
    where.branchId = branchId;
  }

  // 🔎 Cliente
  if (search) {
    where.partner = {
      name: {
        contains: search,
        mode: "insensitive"
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

  // 📅 FECHA DE VENTA

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

  // 🟢 Estado
  const now = new Date();

  // 🟢 Estado
  if (status) {
    where.status = status;
  } else {
    where.status = {
      in: ["ACTIVE", "EXPIRED"]
    };
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
      saleDate: "desc"
    }
  });
};
// =========================
// 🔍 DETALLE
// =========================
export const getById = async (id, req) => {
  const { companyId, branchId, isOwner } = req.user;

  const membership = await prisma.membershipSale.findFirst({
    where: {
      id,
      companyId,

      ...(isOwner
        ? {}
        : {
            branchId
          })
    },

    include: {
      partner: true,
      plan: true,
      user: true,
      branch: true,
      company: true
    }
  });

  if (!membership) {
    throw new Error("Membresía no encontrada");
  }

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
    orderBy: { endDate: "asc" }
  });
};
// =========================
// 🔄 REINTENTAR PAGO
// =========================
export const retryMembershipSale = async ({ membershipSaleId, companyId, branchId }) => {
  return await prisma.command.updateMany({
    where: {
      membershipSaleId,
      companyId,
      branchId,
      status: "ERROR" // luego podemos mejorar esto
    },
    data: {
      status: "PENDING",
      attempts: 0,
      error: null,
      executedAt: null
    }
  });
};
//=========================
// SYNC CUSTOMER MEMBERSHIP STATUS
//=========================

export const syncMembershipStatus = async ({ customerId, companyId, branchId }) => {
  const now = new Date();

  // 1. Traer membership + customer
  const membership = await prisma.customerMembership.findFirst({
    where: {
      customerId,
      companyId
    },
    include: {
      customer: {
        select: {
          id: true,
          name: true, // ajusta si usas firstName/lastName
          imageUrl: true // ajusta nombre real del campo
        }
      }
    }
  });

  // 2. Validaciones básicas
  if (!membership) {
    throw new Error("MEMBERSHIP_NOT_FOUND");
  }

  // 3. Calcular estado REAL
  const isActive = membership.startDate <= now && membership.endDate >= now;

  const baseUrl = process.env.BASE_URL;
  await prisma.$transaction(async (tx) => {
    await tx.command.create({
      data: {
        type: "SYNC_USER_FULL",
        payload: {
          userId: membership.customer.id,
          name: membership.customer.name,
          startDate: membership.startDate.toISOString(),
          endDate: membership.endDate.toISOString(),
          imagePath: membership.customer.imageUrl ? `${baseUrl}/${membership.customer.imageUrl}` : null
        },
        companyId,
        branchId
      }
    });
  });

  sendCommandToAgent({
    companyId,
    branchId,
    payload: "SYNC"
  });
  notifyBranch({
    companyId,
    branchId,
    event: {
        type: "MEMBERSHIP_UPDATE"
    }
});

  return {
    success: true
  };
};

export const assignMembership = async ({ customerId, companyId, branchId, startDate, endDate }) => {
  // =====================
  // VALIDACIONES
  // =====================
  if (!customerId || !startDate || !endDate) {
    throw new Error("INVALID_DATA");
  }

  // =====================
  // NORMALIZAR FECHAS
  // =====================
  const normalizedStartDate = startOfDay(startDate);
  const normalizedEndDate = endOfDay(endDate);

  if (normalizedStartDate > normalizedEndDate) {
    throw new Error("INVALID_DATES");
  }
  // validar cliente
  const customer = await prisma.partner.findFirst({
    where: {
      id: customerId,
      companyId
    }
  });

  if (!customer) {
    throw new Error("CUSTOMER_NOT_FOUND");
  }

  // =====================
  // UPSERT MEMBERSHIP
  // =====================
  const membership = await prisma.customerMembership.upsert({
    where: {
      customerId
    },
    update: {
      startDate: normalizedStartDate,
      endDate: normalizedEndDate,
      status: "ACTIVE",
      branchId
    },
    create: {
      customerId,
      companyId,
      branchId,
      startDate: normalizedStartDate,
      endDate: normalizedEndDate,
      status: "ACTIVE"
    }
  });

  // =====================
  // CREAR COMMAND DIRECTO (igual que sync)
  // =====================
  const baseUrl = process.env.BASE_URL;

  await prisma.$transaction(async (tx) => {
    await tx.command.create({
      data: {
        type: "SYNC_USER_FULL",
        payload: {
          userId: customer.id,
          name: customer.name,
          startDate: normalizedStartDate,
          endDate: normalizedEndDate,
          imagePath: customer.imageUrl ? `${baseUrl}/${customer.imageUrl}` : null
        },
        companyId,
        branchId
      }
    });
  });

  // =====================
  // DISPARAR AGENT
  // =====================
  sendCommandToAgent(companyId, branchId, {
    type: "SYNC"
  });

  notifyBranch({
    companyId,
    branchId,
    event: {
        type: "MEMBERSHIP_UPDATE"
    }
});

  return {
    success: true,
    membership
  };
};
//=========================
// ANULAR MEMBERSHIP (SOFT DELETE)
//=========================
export const annulMembershipSale = async ({ saleId, companyId, branchId, userId, isOwner }) => {
  return await prisma.$transaction(async (tx) => {
    ////////////////////////////////////
    // BUSCAR VENTA
    ////////////////////////////////////

    const where = {
      id: saleId,
      companyId
    };

    if (!isOwner) {
      where.branchId = branchId;
    }

    const sale = await tx.membershipSale.findFirst({
      where,

      include: {
        plan: true,
        partner: true,
        sale: true
      }
    });

    if (!sale) {
      throw new Error("Inscripción no encontrada");
    }

    if (sale.status === "ANNULLED") {
      throw new Error("Ya fue anulada");
    }

    ////////////////////////////////////
    // SOLO MISMO DÍA
    ////////////////////////////////////

    const today = new Date();

    if (startOfDay(sale.createdAt).getTime() !== startOfDay(today).getTime()) {
      throw new Error("Solo puede anularse el mismo día");
    }

    ////////////////////////////////////
    // VALIDAR CAJA ABIERTA
    ////////////////////////////////////

    const cashMovement = await tx.cashMovement.findFirst({
      where: {
        companyId,
        referenceId: sale.saleId
      },

      include: {
        cashRegister: {
          select: {
            id: true,
            status: true
          }
        }
      }
    });

    if (cashMovement && cashMovement.cashRegister?.status === "CLOSED") {
      throw new Error("No se puede anular una membresía perteneciente a una caja cerrada");
    }

    ////////////////////////////////////
    // CUSTOMER MEMBERSHIP
    ////////////////////////////////////

    const membership = await tx.customerMembership.findUnique({
      where: {
        customerId: sale.partnerId
      }
    });

    if (!membership) {
      throw new Error("Membresía no encontrada");
    }

    const newEndDate = endOfDay(addDays(membership.endDate, -sale.plan.durationDays));

    ////////////////////////////////////
    // ANULAR MEMBERSHIP SALE
    ////////////////////////////////////

    await tx.membershipSale.update({
      where: {
        id: sale.id
      },

      data: {
        status: "ANNULLED"
      }
    });

    ////////////////////////////////////
    // ANULAR SALE COMERCIAL
    ////////////////////////////////////

    if (sale.saleId) {
      await tx.sale.update({
        where: {
          id: sale.saleId
        },

        data: {
          status: "CANCELLED"
        }
      });
    }

    ////////////////////////////////////
    // ANULAR MOVIMIENTOS DE CAJA
    ////////////////////////////////////

    await tx.cashMovement.updateMany({
      where: {
        companyId,
        referenceId: sale.saleId,
        status: "ACTIVE"
      },

      data: {
        status: "CANCELLED",

        cancelledAt: new Date(),

        cancelledById: userId
      }
    });

    ////////////////////////////////////
    // SIN MEMBRESÍA VIGENTE
    ////////////////////////////////////

    if (newEndDate <= today) {
      await tx.customerMembership.update({
        where: {
          customerId: sale.partnerId
        },

        data: {
          endDate: today,

          deletedFromDevice: true
        }
      });

      const branches = await tx.branch.findMany({
        where: {
          companyId
        },

        select: {
          id: true
        }
      });

      ////////////////////////////////////
      // DELETE USER EN TODAS LAS SUCURSALES
      ////////////////////////////////////

      for (const branch of branches) {
        await tx.command.create({
          data: {
            type: "DELETE_USER",

            payload: {
              userId: sale.partnerId
            },

            membershipSaleId: sale.id,

            companyId,

            branchId: branch.id
          }
        });
      }

      ////////////////////////////////////
      // DISPARAR AGENTS
      ////////////////////////////////////

      for (const branch of branches) {
        sendCommandToAgent(companyId, branch.id, {
          type: "SYNC"
        });
      }

      notifyBranch({
    companyId,
    branchId,
    event: {
        type: "MEMBERSHIP_UPDATE"
    }
});

      return {
        success: true,
        membership
      };
    }

    ////////////////////////////////////
    // AÚN TIENE VIGENCIA
    ////////////////////////////////////

    await tx.customerMembership.update({
      where: {
        customerId: sale.partnerId
      },

      data: {
        endDate: newEndDate
      }
    });

    const baseUrl = process.env.BASE_URL;

    await tx.command.create({
      data: {
        type: "SYNC_USER_FULL",

        payload: {
          userId: sale.partnerId,

          name: sale.partner.name,

          startDate: membership.startDate.toISOString(),

          endDate: newEndDate.toISOString(),

          imagePath: sale.partner.imageUrl ? `${baseUrl}/${sale.partner.imageUrl}` : null
        },

        membershipSaleId: sale.id,

        companyId,

        branchId: sale.branchId
      }
    });

    ////////////////////////////////////
    // DISPARAR AGENT
    ////////////////////////////////////

    sendCommandToAgent(companyId, sale.branchId, {
      type: "SYNC"
    });

    notifyBranch({
    companyId,
    branchId,
    event: {
        type: "MEMBERSHIP_UPDATE"
    }
});

    return {
      success: true,
      membership
    };
  });
};
