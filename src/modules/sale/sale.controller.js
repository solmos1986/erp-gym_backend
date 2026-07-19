import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// =========================
// 📋 LISTAR VENTAS
// =========================
export const getSales = async (req, res, next) => {
  try {
    const { companyId, branchId, isOwner } = req.user;

    const where = {
      companyId
    };

    // 🔐 Multi-sucursal
    if (!isOwner) {
      where.branchId = branchId;
    }

    const sales = await prisma.sale.findMany({
      where,

      include: {
        customer: {
          select: {
            id: true,
            name: true
          }
        },

        details: {
          select: {
            itemType: true,
            description: true,
            quantity: true,
            unitPrice: true,
            total: true,
            unitCost: true,
          }
        },

        branch: {
          select: {
            id: true,
            name: true
          }
        },

        user: {
          select: {
            id: true,
            fullName: true
          }
        }
      },

      orderBy: {
        saleDate: "desc"
      }
    });

    res.json(sales);
  } catch (error) {
    next(error);
  }
};

// =========================
// 🔍 OBTENER VENTA
// =========================
export const getSaleById = async (req, res, next) => {
  try {
    const { companyId, branchId, isOwner } = req.user;

    const { id } = req.params;

    const where = {
      id,
      companyId
    };

    // 🔐 Multi-sucursal
    if (!isOwner) {
      where.branchId = branchId;
    }

    const sale = await prisma.sale.findFirst({
      where,

      include: {
        customer: true,

        details: true,

        branch: {
          select: {
            id: true,
            name: true
          }
        },

        MembershipSale: {
          select: {
            id: true,
            startDate: true,
            endDate: true,
            status: true,
            price: true,

            plan: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      }
    });

    if (!sale) {
      return res.status(404).json({
        message: "Venta no encontrada"
      });
    }

    res.json(sale);
  } catch (error) {
    next(error);
  }
};
// =========================
// 🔄 ANULAR VENTA
// =========================
export const annulSale = async (req, res, next) => {
  try {
    const { companyId, branchId, userId, isOwner } = req.user;

    const { id } = req.params;

    const result = await prisma.$transaction(async (tx) => {
      // =========================
      // 🔍 BUSCAR VENTA
      // =========================

      const saleWhere = {
        id,
        companyId
      };

      if (!isOwner) {
        saleWhere.branchId = branchId;
      }

      const sale = await tx.sale.findFirst({
        where: saleWhere,

        include: {
          details: true,
          customer: {
            select: {
              id: true,
              name: true
            }
          },
          branch: {
            select: {
              id: true,
              name: true
            }
          }
        }
      });

      if (!sale) {
        throw new Error("Venta no encontrada");
      }

      // =========================
      // 🔍 YA ANULADA
      // =========================

      if (sale.status === "CANCELLED") {
        throw new Error("La venta ya fue anulada");
      }

      // =========================
      // 🔍 MOVIMIENTOS DE CAJA
      // =========================

      const cashMovements = await tx.cashMovement.findMany({
        where: {
          companyId,
          referenceId: sale.id
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

      // =========================
      // 🔒 CAJA CERRADA
      // =========================

      const hasClosedRegister = cashMovements.some((movement) => movement.cashRegister?.status === "CLOSED");

      if (hasClosedRegister) {
        throw new Error("No se puede anular una venta perteneciente a una caja cerrada");
      }

      // =========================
      // 🧾 ANULAR VENTA
      // =========================

      await tx.sale.update({
        where: {
          id: sale.id
        },

        data: {
          status: "CANCELLED"
        }
      });

      // =========================
      // 💰 ANULAR MOVIMIENTOS
      // =========================

      await tx.cashMovement.updateMany({
        where: {
          companyId,
          referenceId: sale.id,
          status: "ACTIVE"
        },

        data: {
          status: "CANCELLED",

          cancelledAt: new Date(),

          cancelledById: userId
        }
      });

      // =========================
      // 📦 DEVOLVER STOCK
      // =========================

      for (const detail of sale.details) {
        if (detail.itemType !== "PRODUCT" || !detail.itemId) {
          continue;
        }

        const productBranch = await tx.productBranch.findUnique({
          where: {
            branchId_productId: {
              branchId: sale.branchId,
              productId: detail.itemId
            }
          }
        });

        if (!productBranch) {
          throw new Error("ProductBranch no encontrado.");
        }

        const stock = await calculateStock(tx, companyId, sale.branchId, detail.itemId, "SALE_CANCEL", detail.quantity);

        await tx.productBranch.update({
          where: {
            id: productBranch.id
          },
          data: {
            currentStock: stock.currentStock
          }
        });

        await tx.inventoryMovement.create({
          data: {
            companyId,
            branchId: sale.branchId,

            productId: detail.itemId,

            movementType: "SALE_CANCEL",

            quantity: detail.quantity,

            unitCost: detail.unitCost,
            totalCost: Number(detail.quantity) * Number(detail.unitCost),

            stockAfter: stock.currentStock,
            unitCostAfter: productBranch.unitCost,
            status: 'CANCELLED',
            notes: `Anulación Venta #${sale.saleNumber}`,

            createdById: userId
          }
        });
      }

      return sale;
    });

    return res.json({
      success: true,

      message: "Venta anulada correctamente",

      sale: result
    });
  } catch (error) {
    next(error);
  }
};
