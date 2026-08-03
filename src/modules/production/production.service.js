import { PrismaClient } from "@prisma/client";
import { applyTenantFilter } from "../../utils/tenant.util.js";
import { executeProductionItem } from "../../utils/productionExecute.helper.js";
import { createProductionOrderHelper } from "../../utils/createProductionOrder.helper.js";
import { calculateStock } from "../../utils/inventoryStock.helper.js";
const prisma = new PrismaClient();

// =========================
// ➕ CREAR ORDEN DE PRODUCCIÓN
// =========================
export const createProductionOrder = async (req) => {
  const { items = [], notes, branchId, originType = "MANUAL", originId = null } = req.body;

  // =========================
  // Validaciones básicas
  // =========================

  if (!branchId) {
    throw new Error("Debe seleccionar una sucursal.");
  }

  if (!Array.isArray(items) || items.length === 0) {
    throw new Error("Debe agregar al menos un producto a producir.");
  }

  // =========================
  // Crear Orden
  // =========================

  const productionOrder = await prisma.$transaction(async (tx) => {
    return await createProductionOrderHelper(tx, {
      companyId: req.user.companyId,
      branchId,
      userId: req.user.userId,
      originType,
      originId,
      notes,
      items,
      tenantFilter: applyTenantFilter(req)
    });
  });

  return productionOrder;
};

// =========================
// 📋 LISTAR ÓRDENES
// =========================
export const getProductionOrders = async (req) => {
  const { status, originType, branchId, search } = req.query;

  return await prisma.productionOrder.findMany({
    where: {
      ...applyTenantFilter(req),

      ...(status && {
        status
      }),

      ...(originType && {
        originType
      }),

      ...(branchId && {
        branchId
      }),

      ...(search && {
        OR: [
          {
            notes: {
              contains: search,
              mode: "insensitive"
            }
          }
        ]
      })
    },

    include: {
      requestedBy: {
        select: {
          id: true,
          fullName: true
        }
      },

      startedBy: {
        select: {
          id: true,
          fullName: true
        }
      },

      finishedBy: {
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
        }
      }
    },

    orderBy: {
      number: "desc"
    }
  });
};

// =========================
// 🔍 OBTENER ORDEN
// =========================
export const getProductionOrderById = async (req) => {
  const { id } = req.params;

  const productionOrder = await prisma.productionOrder.findFirst({
    where: {
      id,
      ...applyTenantFilter(req)
    },

    include: {
      requestedBy: {
        select: {
          id: true,
          fullName: true
        }
      },

      startedBy: {
        select: {
          id: true,
          fullName: true
        }
      },

      finishedBy: {
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
              barcode: true,
              name: true,
              unit: true,
              productType: true,
              sourceType: true
            }
          },

          consumptions: {
            include: {
              material: {
                select: {
                  id: true,
                  code: true,
                  name: true,
                  unit: true
                }
              }
            }
          }
        },

        orderBy: {
          createdAt: "asc"
        }
      }
    }
  });

  if (!productionOrder) {
    throw new Error("Orden de producción no encontrada.");
  }

  return productionOrder;
};

// =========================
// ✏️ ACTUALIZAR ORDEN
// =========================
export const updateProductionOrder = async (req) => {
  const { id } = req.params;

  const { branchId, originType, originId, notes, items = [] } = req.body;

  // =========================
  // Validaciones
  // =========================

  if (!Array.isArray(items) || items.length === 0) {
    throw new Error("Debe agregar al menos un producto.");
  }

  const existingOrder = await prisma.productionOrder.findFirst({
    where: {
      id,
      ...applyTenantFilter(req)
    }
  });

  if (!existingOrder) {
    throw new Error("La orden de producción no existe.");
  }

  if (existingOrder.status !== "PENDING") {
    throw new Error("Solo pueden editarse órdenes en estado PENDING.");
  }

  // =========================
  // Actualizar
  // =========================

  return await prisma.$transaction(async (tx) => {
    await tx.productionOrder.update({
      where: {
        id
      },

      data: {
        ...(branchId && { branchId }),

        originType,

        originId,

        notes: notes?.trim() || null
      }
    });

    // =========================
    // Eliminar Items
    // =========================

    await tx.productionOrderItem.deleteMany({
      where: {
        productionOrderId: id
      }
    });

    // =========================
    // Crear nuevos Items
    // =========================

    for (const item of items) {
      console.log("item en items", item);
      const product = await tx.product.findFirst({
        where: {
          id: item.productId,
          ...applyTenantFilter(req)
        }
      });

      if (!product) {
        throw new Error("Producto no encontrado.");
      }

      await tx.productionOrderItem.create({
        data: {
          productionOrderId: id,

          productId: item.productId,

          quantity: item.quantity,

          unitCost: item.unitCost ?? 0,

          totalCost: item.totalCost ?? 0,

          notes: item.notes?.trim() || null
        }
      });
    }

    return await tx.productionOrder.findUnique({
      where: {
        id
      },

      include: {
        requestedBy: {
          select: {
            id: true,
            fullName: true
          }
        },

        startedBy: {
          select: {
            id: true,
            fullName: true
          }
        },

        finishedBy: {
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
  });
};

// =========================
// ❌ CANCELAR ORDEN
// =========================
export const cancelProductionOrder = async (req) => {
  const { id } = req.params;

  // =========================
  // Verificar existencia
  // =========================

  const productionOrder = await prisma.productionOrder.findFirst({
    where: {
      id,
      ...applyTenantFilter(req)
    }
  });

  if (!productionOrder) {
    throw new Error("La orden de producción no existe.");
  }

  // =========================
  // Validar estado
  // =========================

  if (productionOrder.status !== "PENDING") {
    throw new Error("Solo pueden cancelarse órdenes en estado PENDING.");
  }

  // =========================
  // Cancelar
  // =========================

  await prisma.productionOrder.update({
    where: {
      id
    },

    data: {
      status: "CANCELLED"
    }
  });
};

// =========================
// ✅ ACTIVAR ORDEN
// =========================
export const activateProductionOrder = async (req) => {
  const { id } = req.params;

  // =========================
  // Verificar existencia
  // =========================

  const productionOrder = await prisma.productionOrder.findFirst({
    where: {
      id,
      ...applyTenantFilter(req)
    }
  });

  if (!productionOrder) {
    throw new Error("La orden de producción no existe.");
  }

  // =========================
  // Validar estado
  // =========================

  if (productionOrder.status !== "CANCELLED") {
    throw new Error("Solo pueden activarse órdenes en estado CANCELLED.");
  }

  // =========================
  // Activar
  // =========================

  await prisma.productionOrder.update({
    where: {
      id
    },

    data: {
      status: "PENDING"
    }
  });
};

// =========================
// ▶️ INICIAR PRODUCCIÓN
// =========================
export const startProductionOrder = async (req) => {
  const { id } = req.params;

  // =========================
  // Verificar existencia
  // =========================

  const productionOrder = await prisma.productionOrder.findFirst({
    where: {
      id,
      ...applyTenantFilter(req)
    }
  });

  if (!productionOrder) {
    throw new Error("La orden de producción no existe.");
  }

  // =========================
  // Validar estado
  // =========================

  if (productionOrder.status !== "PENDING") {
    throw new Error("Solo pueden iniciarse órdenes en estado PENDING.");
  }

  // =========================
  // Iniciar Producción
  // =========================

  await prisma.productionOrder.update({
    where: {
      id
    },

    data: {
      status: "IN_PROGRESS",

      startedBy: {
        connect: {
          id: req.user.userId
        }
      },

      startedAt: new Date()
    }
  });

  // =========================
  // Retornar Orden
  // =========================

  return await prisma.productionOrder.findUnique({
    where: {
      id
    },

    include: {
      requestedBy: {
        select: {
          id: true,
          fullName: true
        }
      },

      startedBy: {
        select: {
          id: true,
          fullName: true
        }
      },

      finishedBy: {
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
        }
      }
    }
  });
};

// =========================
// ▶️ INICIAR ITEM
// =========================
export const startProductionOrderItem = async (req) => {
  const { itemId } = req.params;

  const item = await prisma.productionOrderItem.findFirst({
    where: {
      id: itemId,
      productionOrder: applyTenantFilter(req)
    },

    include: {
      productionOrder: true,
      product: true
    }
  });

  if (!item) {
    throw new Error("El producto de la orden no existe.");
  }

  if (item.productionOrder.status !== "IN_PROGRESS") {
    throw new Error("La orden debe estar IN_PROGRESS para iniciar un producto.");
  }

  if (item.status !== "PENDING") {
    throw new Error("Solo pueden iniciarse productos en estado PENDING.");
  }

  await prisma.productionOrderItem.update({
    where: {
      id: itemId
    },

    data: {
      status: "IN_PROGRESS"
    }
  });

  return await prisma.productionOrderItem.findUnique({
    where: {
      id: itemId
    },

    include: {
      product: {
        select: {
          id: true,
          code: true,
          name: true,
          unit: true
        }
      }
    }
  });
};

// =========================
// 🏁 FINALIZAR ITEM
// =========================
export const finishProductionOrderItem = async (req) => {
  const { itemId } = req.params;

  return await prisma.$transaction(async (tx) => {
    // =========================
    // Obtener Item
    // =========================

    const item = await tx.productionOrderItem.findFirst({
      where: {
        id: itemId,
        productionOrder: applyTenantFilter(req)
      },

      include: {
        productionOrder: true,
        product: true
      }
    });

    if (!item) {
      throw new Error("El producto de la orden no existe.");
    }

    if (item.productionOrder.status !== "IN_PROGRESS") {
      throw new Error("La orden debe estar IN_PROGRESS.");
    }

    if (item.status !== "IN_PROGRESS") {
      throw new Error("Solo pueden finalizarse productos en estado IN_PROGRESS.");
    }

    // ==================================================
    // EJECUTAR LA PRODUCCIÓN
    // ==================================================

    await executeProductionItem(tx, req.user.companyId, item.productionOrder.branchId, req.user.userId, item.id);

    // =========================
    // ¿Quedan Items pendientes?
    // =========================
    const updatedItem = await tx.productionOrderItem.findUnique({
      where: {
        id: itemId
      },
      include: {
        product: {
          select: {
            id: true,
            code: true,
            name: true,
            unit: true
          }
        }
      }
    });

    const pendingItems = await tx.productionOrderItem.count({
      where: {
        productionOrderId: item.productionOrderId,

        status: {
          not: "COMPLETED"
        }
      }
    });

    // =========================
    // Finalizar Orden
    // =========================

    if (pendingItems === 0) {
      console.log("aqui antes de completed 2??????");
      const productionOrder = await tx.productionOrder.update({
        where: {
          id: item.productionOrderId
        },
        data: {
          status: "COMPLETED",

          finishedBy: {
            connect: {
              id: req.user.userId
            }
          },

          finishedAt: new Date()
        }
      });
      console.log("aqui despues de completed 2?????");

      // =========================
      // ACTUALIZAR VENTA
      // =========================

      if (productionOrder.originType === "SALE" && productionOrder.originId) {
        // =========================
        // ENTREGAR PRODUCTOS PRODUCIDOS
        // =========================

        const productionItems = await tx.productionOrderItem.findMany({
          where: {
            productionOrderId: productionOrder.id
          }
        });

        for (const productionItem of productionItems) {
          const productBranch = await tx.productBranch.findUnique({
            where: {
              branchId_productId: {
                branchId: productionOrder.branchId,
                productId: productionItem.productId
              }
            }
          });

          const stock = await calculateStock(
            tx,
            productionOrder.companyId,
            productionOrder.branchId,
            productionItem.productId,
            "SALE",
            productionItem.quantity
          );

          await tx.productBranch.update({
            where: {
              id: productBranch.id
            },
            data: {
              currentStock: stock
            }
          });

          await tx.inventoryMovement.create({
            data: {
              companyId: productionOrder.companyId,
              branchId: productionOrder.branchId,

              productId: productionItem.productId,

              movementType: "SALE",

              referenceType: "SALE",
              referenceId: productionOrder.originId,

              quantity: productionItem.quantity,

              unitCost: productBranch.unitCost,
              totalCost: Number(productBranch.unitCost) * Number(productionItem.quantity),

              stockAfter: stock,
              unitCostAfter: productBranch.unitCost,

              notes: `Entrega automática desde Producción`,

              createdById: req.user.userId
            }
          });
        }

        // =========================
        // ACTUALIZAR VENTA
        // =========================
        await tx.sale.update({
          where: {
            id: productionOrder.originId
          },
          data: {
            fulfillmentStatus: "READY"
          }
        });
      }
    }

    return updatedItem;
  });
};
