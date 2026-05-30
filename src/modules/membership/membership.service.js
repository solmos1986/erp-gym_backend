import { PrismaClient } from "@prisma/client";
import { sendCommandToAgent, notifyFrontend } from '../../lib/websocket.server.js';
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
       startDate = startOfDay(current.startDate);
      startDateMembershipSale = startOfDay(current.endDate);
      endDate = endOfDay(addDays(startDateMembershipSale, plan.durationDays) );
    } else {
      startDate = startOfDay(today);
      endDate = endOfDay(addDays(startDate, plan.durationDays));
      startDateMembershipSale = startOfDay(startDate);
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

    // // 🔥 SYNC MEMBERSHIP
    // await tx.command.create({
    //   data: {
    //     type: "SYNC_MEMBERSHIP",
    //     payload: {
    //       membershipId: membership.id,
    //       clientId: partnerId,
    //       name: partner.name,
    //       startDate: startDate.toISOString(),
    //       endDate: endDate.toISOString()
    //     },
    //     membershipSaleId: sale.id,
    //     companyId,
    //     branchId
    //   }
    // });

    // // 🔥 SYNC FACE
     const baseUrl = process.env.BASE_URL;

    // await tx.command.create({
    //   data: {
    //     type: "SYNC_FACE",
    //     payload: {
    //       userId: partnerId,
    //       name: partner.name,
    //       imagePath: partner.imageUrl
    //         ? `${baseUrl}/${partner.imageUrl}`
    //         : null
    //     },
    //     membershipSaleId: sale.id,
    //     companyId,
    //     branchId
    //   }
    // });
    // 🔥 SYNC USER FULL (usuario + rostro)
await tx.command.create({
  data: {
    type: "SYNC_USER_FULL",
    payload: {
      userId: partnerId,
      name: partner.name,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      imagePath: partner.imageUrl
        ? `${baseUrl}/${partner.imageUrl}`
        : null
    },
    membershipSaleId: sale.id,
    companyId,
    branchId
  }
});
sendCommandToAgent(companyId, branchId, {
  type: 'SYNC'
});
notifyFrontend({
  type: "MEMBERSHIP_UPDATE"
});
    // 🔥 NOTIFICAR AL AGENT
//sendCommandToAgent({
  //companyId: command.companyId,
  //branchId: command.branchId,
  //payload: command
//});

    return { sale, membership };
  });
};
// =========================
// 📋 HISTORIAL
// =========================
export const getAll = async (req) => {
  const { companyId } = req.user;

  const { search, planId, userId, status, from, to } = req.query;
  console.log({ search, planId, userId, status, from, to });
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

  // 🟢 Estado
if (status) {
  where.status = status;
} else {
  where.status = {
    in: ['ACTIVE', 'EXPIRED']
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
//=========================
// SYNC CUSTOMER MEMBERSHIP STATUS
//=========================

export const syncMembershipStatus = async ({ customerId, companyId }) => {
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
          name: true,          // ajusta si usas firstName/lastName
          imageUrl: true      // ajusta nombre real del campo
        }
      }
    }
  });

  // 2. Validaciones básicas
  if (!membership) {
    throw new Error('MEMBERSHIP_NOT_FOUND');
  }

  // 3. Calcular estado REAL
  const isActive =
    membership.startDate <= now &&
    membership.endDate >= now;  

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
        imagePath: membership.customer.imageUrl
          ? `${baseUrl}/${membership.customer.imageUrl}`
          : null
      },
      companyId,
      branchId: membership.branchId
    }
  });
});

sendCommandToAgent({
  companyId,
  branchId: membership.branchId,
  payload: 'SYNC'
});
notifyFrontend({
  type: "MEMBERSHIP_UPDATE"
});

  return {
    success: true
  };
};
//=========================
// ASSIGN CUSTOMER MEMBERSHIP
//=========================
// export const assignMembership = async ({
//   customerId,
//   companyId,
//   branchId,
//   startDate,
//   endDate
// }) => {

//   // =====================
//   // VALIDACIONES
//   // =====================
//   if (!customerId || !startDate || !endDate) {
//     throw new Error('INVALID_DATA');
//   }

//   if (startDate > endDate) {
//     throw new Error('INVALID_DATES');
//   }

//   // validar cliente
//   const customer = await prisma.partner.findFirst({
//     where: {
//       id: customerId,
//       companyId
//     }
//   });

//   if (!customer) {
//     throw new Error('CUSTOMER_NOT_FOUND');
//   }

//   // =====================
//   // UPSERT MEMBERSHIP
//   // =====================
//   const membership = await prisma.customerMembership.upsert({
//     where: {
//       customerId
//     },
//     update: {
//       startDate: startDate,
//       endDate: endDate,
//       status: 'ACTIVE',
//       branchId
//     },
//     create: {
//       customerId,
//       companyId,
//       branchId,
//       startDate: startDate,
//       endDate: endDate,
//       status: 'ACTIVE'
//     }
//   });

//   // =====================
//   // CREAR COMMAND DIRECTO (igual que sync)
//   // =====================
//   const baseUrl = process.env.BASE_URL;

//   await prisma.$transaction(async (tx) => {
//     await tx.command.create({
//       data: {
//         type: "SYNC_USER_FULL",
//         payload: {
//           userId: customer.id,
//           name: customer.name,
//           startDate: startDate,
//           endDate: endDate,
//           imagePath: customer.imageUrl
//             ? `${baseUrl}/${customer.imageUrl}`
//             : null
//         },
//         companyId,
//         branchId
//       }
//     });
//   });

//   // =====================
//   // DISPARAR AGENT
//   // =====================
//   sendCommandToAgent(companyId, branchId, {
//     type: 'SYNC'
//   });

//   notifyFrontend({
//     type: "MEMBERSHIP_UPDATE"
//   });

//   return {
//     success: true,
//     membership
//   };
// };
export const assignMembership = async ({
  customerId,
  companyId,
  branchId,
  startDate,
  endDate
}) => {

  // =====================
  // VALIDACIONES
  // =====================
  if (!customerId || !startDate || !endDate) {
    throw new Error('INVALID_DATA');
  }

  // =====================
  // NORMALIZAR FECHAS
  // =====================
    const normalizedStartDate = startOfDay(startDate);
  const normalizedEndDate = endOfDay(endDate);

  if (normalizedStartDate > normalizedEndDate) {
    throw new Error('INVALID_DATES');
  }
  // validar cliente
  const customer = await prisma.partner.findFirst({
    where: {
      id: customerId,
      companyId
    }
  });

  if (!customer) {
    throw new Error('CUSTOMER_NOT_FOUND');
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
      status: 'ACTIVE',
      branchId
    },
    create: {
      customerId,
      companyId,
      branchId,
      startDate: normalizedStartDate,
      endDate: normalizedEndDate,
      status: 'ACTIVE'
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
          imagePath: customer.imageUrl
            ? `${baseUrl}/${customer.imageUrl}`
            : null
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
    type: 'SYNC'
  });

  notifyFrontend({
    type: "MEMBERSHIP_UPDATE"
  });

  return {
    success: true,
    membership
  };
};
//=========================
// ANULAR MEMBERSHIP (SOFT DELETE)
//=========================
export const annulMembershipSale = async ({
  saleId,
  companyId,
  branchId,
  userId
}) => {

  return await prisma.$transaction(
    async (tx) => {

      const sale =
        await tx.membershipSale.findFirst({

        where: {
          id: saleId,
          companyId
        },

        include: {
          plan: true,
          partner: true
        }

      });

      if (!sale)
        throw new Error(
          'Inscripción no encontrada'
        );

      if (
        sale.status ===
        'ANNULLED'
      ) {
        throw new Error(
          'Ya fue anulada'
        );
      }

      // mismo día
      const today = new Date();

      if (
        startOfDay(
          sale.createdAt
        ).getTime()
        !==
        startOfDay(
          today
        ).getTime()
      ) {
        throw new Error(
          'Solo puede anularse el mismo día'
        );
      }

      ////////////////////////////////////
      // CUSTOMER MEMBERSHIP
      ////////////////////////////////////

      const membership =
        await tx.customerMembership
        .findUnique({

        where: {
          customerId:
            sale.partnerId
        }

      });

      if (!membership)
        throw new Error(
          'Membresía no encontrada'
        );

      const newEndDate =
        endOfDay(
          addDays(
            membership.endDate,
            -sale.plan.durationDays
          )
        );

      ////////////////////////////////////
      // ANULAR VENTA
      ////////////////////////////////////

      await tx.membershipSale.update({

        where: {
          id: sale.id
        },

        data: {
          status:
            'ANNULLED'
        }

      });

      ////////////////////////////////////
      // SIN MEMBRESÍA
      ////////////////////////////////////

      if (
        newEndDate <= today
      ) {

        await tx.customerMembership
        .update({

          where: {
            customerId:
              sale.partnerId
          },

          data: {
            endDate:
              today,

            deletedFromDevice:
              true
          }

        });

        await tx.command.create({

          data: {

            type:
              'DELETE_FACE',

            payload: {
              userId:
                sale.partnerId
            },

            membershipSaleId:
              sale.id,

            companyId,
            branchId
          }

        });
        // =====================
        // DISPARAR AGENT
        // =====================
        sendCommandToAgent(companyId, branchId, {
          type: 'SYNC'
        });

        notifyFrontend({
          type: "MEMBERSHIP_UPDATE"
        });

        return {
          success: true,
          membership
        };
      

      }

      ////////////////////////////////////
      // AÚN TIENE VIGENCIA
      ////////////////////////////////////

      else {

          await tx.customerMembership
          .update({

            where: {
              customerId:
                sale.partnerId
            },

            data: {
              endDate:
                newEndDate
            }

          });
        // =====================
          // CREAR COMMAND DIRECTO (igual que sync)
          // =====================
          const baseUrl = process.env.BASE_URL;

                await tx.command.create({

                  data: {

                    type:
                    'SYNC_USER_FULL',

                    payload: {

                      userId:
                        sale.partnerId,

                      name:
                        sale.partner.name,

                      startDate:
                        membership.startDate
                        .toISOString(),

                      endDate:
                        newEndDate
                        .toISOString(),

                      imagePath:
                        sale.partner
                        .imageUrl 
                        ? `${baseUrl}/${sale.partner.imageUrl}`
                    : null
                    },

                    membershipSaleId:
                      sale.id,

                    companyId,
                    branchId

                  }

                });
          }
        // =====================
          // DISPARAR AGENT
          // =====================
          sendCommandToAgent(companyId, branchId, {
            type: 'SYNC'
          });

          notifyFrontend({
            type: "MEMBERSHIP_UPDATE"
          });

          return {
            success: true,
            membership
          };

      return true;

    }
  );

};