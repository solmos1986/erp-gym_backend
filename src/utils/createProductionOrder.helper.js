// =========================
// ➕ HELPER CREAR ORDEN DE PRODUCCIÓN
// =========================

export const createProductionOrderHelper = async (
  tx,
  { companyId, branchId, userId, originType = "MANUAL", originId = null, notes = null, items = [], tenantFilter = {} }
) => {
  // =========================
  // Obtener siguiente número
  // =========================

  const lastOrder = await tx.productionOrder.findFirst({
    where: {
      companyId
    },
    orderBy: {
      number: "desc"
    }
  });

  const nextNumber = lastOrder ? lastOrder.number + 1 : 1;

  // =========================
  // Crear Orden
  // =========================

  const createdOrder = await tx.productionOrder.create({
    data: {
      company: {
        connect: {
          id: companyId
        }
      },

      branch: {
        connect: {
          id: branchId
        }
      },

      number: nextNumber,

      originType,
      originId,

      notes: notes?.trim() || null,

      requestedBy: {
        connect: {
          id: userId
        }
      }
    }
  });

  // =========================
  // Crear Items
  // =========================

  for (const item of items) {
    const product = await tx.product.findFirst({
      where: {
        id: item.productId,
        ...tenantFilter
      }
    });

    if (!product) {
      throw new Error("Producto no encontrado.");
    }

    await tx.productionOrderItem.create({
      data: {
        productionOrder: {
          connect: {
            id: createdOrder.id
          }
        },

        product: {
          connect: {
            id: item.productId
          }
        },

        quantity: item.quantity,

        unitCost: item.unitCost ?? 0,

        totalCost: item.totalCost ?? 0,

        notes: item.notes?.trim() || null
      }
    });
  }

  // =========================
  // Retornar Orden completa
  // =========================

  return await tx.productionOrder.findUnique({
    where: {
      id: createdOrder.id
    },

    include: {
      requestedBy: {
        select: {
          id: true,
          fullName: true
        }
      },

      branch: {
        select: {
          id: true,
          name: true
        }
      },

      items: {
        include: {
          product: {
            select: {
              id: true,
              code: true,
              name: true,
              unit: true
            }
          }
        },

        orderBy: {
          createdAt: "asc"
        }
      }
    }
  });
};
