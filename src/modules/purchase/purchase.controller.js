import { PrismaClient } from "@prisma/client";
import { createPurchase as createPurchaseService } from "./purchase.service.js";
const prisma = new PrismaClient();
// =========================
// 🛒 CREAR COMPRA
// =========================
export const createPurchase = async (req, res, next) => {
  try {
    const result = await createPurchaseService({
      supplierId: req.body.supplierId,

      items: req.body.items,

      payments: req.body.payments,

      notes: req.body.notes,

      companyId: req.user.companyId,

      branchId: req.user.branchId,

      userId: req.user.userId
    });

    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
};
// =========================
// 📋 LISTAR COMPRAS
// =========================
export const getPurchases = async (req, res, next) => {
  try {
    const { companyId, branchId, isOwner } = req.user;

    const { search, supplierId, status, from, to, userId } = req.query;

    const where = {
      companyId
    };

    // 🔐 Multi-sucursal
    if (!isOwner) {
      where.branchId = branchId;
    }

    // 🏢 Owner puede filtrar sucursal (para futuro)
    if (isOwner && req.query.branchId) {
      where.branchId = req.query.branchId;
    }

    // 📅 Fechas
    if (from || to) {
      where.purchaseDate = {};

      if (from) {
        where.purchaseDate.gte = new Date(from);
      }

      if (to) {
        const endDate = new Date(to);
        endDate.setHours(23, 59, 59, 999);

        where.purchaseDate.lte = endDate;
      }
    }

    // 🚚 Proveedor
    if (supplierId) {
      where.supplierId = supplierId;
    }

    // 📌 Estado
    if (status) {
      where.status = status;
    }

    // 🔍 Búsqueda
    if (search) {
      where.OR = [
        {
          supplier: {
            name: {
              contains: search,
              mode: "insensitive"
            }
          }
        },
        {
          purchaseNumber: isNaN(Number(search)) ? undefined : Number(search)
        }
      ].filter(Boolean);
    }
    if (userId) {
      where.userId = userId;
    }

    const purchases = await prisma.purchase.findMany({
      where,

      include: {
        supplier: {
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
        },

        details: {
          include: {
            product: {
              select: {
                id: true,
                name: true
              }
            }
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
        purchaseDate: "desc"
      }
    });

    res.json(purchases);
  } catch (error) {
    next(error);
  }
};
// =========================
// 🔍 OBTENER COMPRA
// =========================
export const getPurchaseById = async (req, res, next) => {
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

    const purchase = await prisma.purchase.findFirst({
      where,

      include: {
        supplier: true,

        branch: {
          select: {
            id: true,
            name: true
          }
        },

        details: {
          include: {
            product: true
          }
        }
      }
    });

    if (!purchase) {
      return res.status(404).json({
        message: "Compra no encontrada"
      });
    }

    res.json(purchase);
  } catch (error) {
    next(error);
  }
};

// =========================
// ❌ ANULAR COMPRA
// =========================
export const cancelPurchase = async (req, res, next) => {
  try {
    const { companyId, branchId, userId, isOwner } = req.user;

    const { id } = req.params;

    const result = await prisma.$transaction(async (tx) => {
      // =========================
      // 🔍 BUSCAR COMPRA
      // =========================

      const purchaseWhere = {
        id,
        companyId
      };

      if (!isOwner) {
        purchaseWhere.branchId = branchId;
      }

      const purchase = await tx.purchase.findFirst({
        where: purchaseWhere,

        include: {
          details: true,

          supplier: {
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

      if (!purchase) {
        throw new Error("Compra no encontrada");
      }

      // =========================
      // 🔍 YA ANULADA
      // =========================

      if (purchase.status === "CANCELLED") {
        throw new Error("La compra ya fue anulada");
      }

      // =========================
      // 🔍 MOVIMIENTOS DE CAJA
      // =========================

      const cashMovements = await tx.cashMovement.findMany({
        where: {
          companyId,
          referenceId: purchase.id
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
        throw new Error("No se puede anular una compra perteneciente a una caja cerrada");
      }

      // =========================
      // 🧾 ANULAR COMPRA
      // =========================

      await tx.purchase.update({
        where: {
          id: purchase.id
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
          referenceId: purchase.id,
          status: "ACTIVE"
        },

        data: {
          status: "CANCELLED",

          cancelledAt: new Date(),

          cancelledById: userId
        }
      });

      // =========================
      // 📦 REVERSIÓN INVENTARIO
      // =========================

      for (const detail of purchase.details) {
        await tx.inventoryMovement.create({
          data: {
            companyId,

            branchId: purchase.branchId,

            productId: detail.productId,

            movementType: "ADJUSTMENT_OUT",

            quantity: detail.quantity,

            notes: `Anulación Compra #${purchase.purchaseNumber}`,

            createdById: userId
          }
        });
      }

      return purchase;
    });

    return res.json({
      success: true,

      message: "Compra anulada correctamente",

      purchase: result
    });
  } catch (error) {
    next(error);
  }
};
