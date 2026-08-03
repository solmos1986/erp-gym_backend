import { PrismaClient } from "@prisma/client";
import { calculateStock } from "../../utils/inventoryStock.helper.js";
import { createCashMovementPayments } from "../../utils/payment.helper.js";
import { createProductionOrderHelper } from "../../utils/createProductionOrder.helper.js";
import { startOfDay, endOfDay, addDays } from "date-fns";

const prisma = new PrismaClient();

export const sale = async ({ partnerId, companyId, branchId, userId, items, payments }) => {
  return await prisma.$transaction(async (tx) => {
    // =========================
    // 🔍 VALIDAR USUARIO
    // =========================

    const user = await tx.user.findFirst({
      where: {
        id: userId,
        companyId
      }
    });

    if (!user) {
      throw new Error("Usuario vendedor no válido");
    }

    // =========================
    // 🔍 VALIDAR CAJA ABIERTA
    // =========================
    console.log("Validando caja...");
    const cashRegister = await tx.cashRegister.findFirst({
      where: {
        companyId,
        branchId,
        openedById: userId,
        status: "OPEN"
      }
    });

    if (!cashRegister) {
      throw new Error("Debe existir una caja abierta para realizar ventas");
    }

    // =========================
    // 🔍 VALIDAR ITEMS
    // =========================

    if (!items || items.length === 0) {
      throw new Error("Debe seleccionar al menos un producto");
    }

    // =========================
    // 🔍 OBTENER PRODUCTOS
    // =========================

    const productIds = items.map((item) => item.productId);

    const products = await tx.product.findMany({
      where: {
        companyId,
        id: {
          in: productIds
        }
      },
      include: {
        productBranches: {
          where: {
            branchId
          }
        }
      }
    });

    // =========================
    // 🔍 VALIDAR PRODUCTOS
    // =========================

    if (products.length !== productIds.length) {
      throw new Error("Uno o más productos no existen");
    }

    // =========================
    // 🔍 VALIDAR STOCK
    // =========================
    // Solo validar STOCK.
    // Los PRODUCTION podrán venderse aunque no exista stock suficiente.

    for (const item of items) {
      const product = products.find((p) => p.id === item.productId);

      const productBranch = product.productBranches[0];

      if (!productBranch) {
        throw new Error(`El producto ${product.name} no existe en esta sucursal`);
      }

      if (product.sourceType === "PURCHASE" && Number(productBranch.currentStock) < Number(item.quantity)) {
        throw new Error(`Stock insuficiente para ${product.name}`);
      }
    }

    // =========================
    // 🔢 SIGUIENTE NÚMERO DE VENTA
    // =========================

    const lastSale = await tx.sale.findFirst({
      where: {
        companyId
      },
      orderBy: {
        saleNumber: "desc"
      },
      select: {
        saleNumber: true
      }
    });

    const nextSaleNumber = (lastSale?.saleNumber || 0) + 1;

    // =========================
    // 💰 CALCULAR TOTAL
    // =========================

    let subtotal = 0;

    for (const item of items) {
      const product = products.find((p) => p.id === item.productId);

      const productBranch = product.productBranches[0];

      subtotal += Number(productBranch.salePrice) * Number(item.quantity);
    }

    if (!payments || payments.length === 0) {
      throw new Error("Debe registrar al menos un método de pago");
    }

    const totalPayments = payments.reduce((sum, payment) => sum + Number(payment.amount), 0);

    if (totalPayments !== subtotal) {
      throw new Error("Los pagos no coinciden con el total de la venta");
    }

    // =========================
    // 🧾 CREAR SALE
    // =========================

    const commercialSale = await tx.sale.create({
      data: {
        companyId,
        branchId,
        userId,

        customerId: partnerId || null,

        saleNumber: nextSaleNumber,

        saleDate: new Date(),

        subtotal,
        discount: 0,
        total: subtotal,

        status: "CONFIRMED"
        //fulfillmentStatus: "PENDING"
      }
    });

    // =========================
    // 📦 PREPARAR PRODUCCIÓN
    // =========================

    const productionItems = [];

    // =========================
    // 🧾 CREAR DETAILS + INVENTARIO
    // =========================
    for (const item of items) {
      const product = products.find((p) => p.id === item.productId);

      const productBranch = product.productBranches[0];

      const lineTotal = Number(productBranch.salePrice) * Number(item.quantity);

      // =========================
      // 🧾 SALE DETAIL
      // =========================

      await tx.saleDetail.create({
        data: {
          saleId: commercialSale.id,

          itemType: "PRODUCT",

          itemId: product.id,

          code: product.code,

          description: product.name,

          // La venta registra la cantidad vendida completa
          quantity: item.quantity,

          unitCost: productBranch.unitCost || 0,
          unitPrice: productBranch.salePrice,

          discount: 0,

          total: lineTotal
        }
      });

      // =========================
      // 📉 PROCESAR INVENTARIO
      // =========================

      const requestedQty = Number(item.quantity);
      console.log({
        product: product.name,
        sourceType: product.sourceType,
        currentStock: Number(productBranch.currentStock),
        requestedQty
      });
      // Productos manejados únicamente por stock
      if (product.sourceType === "PURCHASE") {
        const stock = await calculateStock(tx, companyId, branchId, product.id, "SALE", requestedQty);

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
            companyId,
            branchId,

            productId: detail.itemId,

            movementType: "SALE",

            referenceType: "SALE",
            referenceId: commercialSale.id,

            quantity: requestedQty,

            unitCost: productBranch.unitCost,
            totalCost: requestedQty * Number(productBranch.unitCost),

            stockAfter: stock,
            unitCostAfter: productBranch.unitCost,

            notes: `Venta #${nextSaleNumber}`,

            createdById: userId
          }
        });

        continue;
      }

      // =========================
      // 🏭 PRODUCTOS PRODUCIDOS
      // =========================

      if (product.sourceType === "PRODUCTION" || product.sourceType === "BOTH") {
        // Releer el stock actual
        const currentProductBranch = await tx.productBranch.findUnique({
          where: {
            id: productBranch.id
          }
        });

        const availableStock = Number(currentProductBranch.currentStock);

        const deliveredQty = Math.min(availableStock, requestedQty);

        const pendingQty = requestedQty - deliveredQty;

        if (deliveredQty > 0) {
          const stock = await calculateStock(tx, companyId, branchId, product.id, "SALE", deliveredQty);

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
              companyId,
              branchId,

              productId: product.id,

              movementType: "SALE",

              referenceType: "SALE",
              referenceId: commercialSale.id,

              quantity: deliveredQty,

              unitCost: productBranch.unitCost,
              totalCost: deliveredQty * Number(productBranch.unitCost),

              stockAfter: stock,
              unitCostAfter: productBranch.unitCost,

              notes: `Venta #${nextSaleNumber}`,

              createdById: userId
            }
          });
        }

        if (pendingQty > 0) {
          console.log({
            availableStock,
            deliveredQty,
            pendingQty
          });
          productionItems.push({
            productId: product.id,
            quantity: pendingQty
          });
        }
      }
    }
    console.log("productionItems", productionItems);
    // =========================
    // 🏭 CREAR PRODUCTION ORDER
    // =========================

    let saleResult = commercialSale;

    if (productionItems.length > 0) {
      saleResult = await tx.sale.update({
        where: {
          id: commercialSale.id
        },
        data: {
          fulfillmentStatus: "PENDING"
        }
      });
    }
    if (productionItems.length > 0) {
      await createProductionOrderHelper(tx, {
        companyId,
        branchId,
        userId,

        originType: "SALE",
        originId: commercialSale.id,

        notes: `Generada automáticamente desde Venta #${nextSaleNumber}`,

        items: productionItems
      });

      saleResult = await tx.sale.update({
        where: {
          id: commercialSale.id
        },
        data: {
          fulfillmentStatus: "PENDING"
        }
      });
    } else {
      saleResult = await tx.sale.update({
        where: {
          id: commercialSale.id
        },
        data: {
          fulfillmentStatus: "READY"
        }
      });
    }

    // =========================
    // 💰 MOVIMIENTOS DE CAJA
    // =========================

    await createCashMovementPayments({
      tx,

      companyId,
      branchId,

      userId,

      cashRegisterId: cashRegister.id,

      referenceId: commercialSale.id,

      referenceType: "PRODUCT_SALE",
      movementType: "INCOME",

      description: `Venta #${commercialSale.saleNumber}`,

      payments
    });

    // =========================
    // ✅ RESULTADO
    // =========================

    return {
      sale: saleResult
    };
  });
};

export const annulProductSale = async ({ saleId, companyId, branchId, userId, isOwner }) => {
  return await prisma.$transaction(async (tx) => {
    const where = {
      id: saleId,
      companyId
    };

    if (!isOwner) {
      where.branchId = branchId;
    }
    //Buscar la venta
    const sale = await tx.sale.findFirst({
  where,
  include: {
    details: true
  }
});

    if (!sale) {
      throw new Error("Venta no encontrada");
    }

    if (sale.status === "CANCELLED") {
      throw new Error("La venta ya fue anulada");
    }

    //Verificar que la venta sea del mismo día
    const today = new Date();

    if (startOfDay(sale.createdAt).getTime() !== startOfDay(today).getTime()) {
      throw new Error("Solo puede anularse el mismo día");
    }

    //Busca el movimiento de caja
    const cashMovement = await tx.cashMovement.findFirst({
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

    if (cashMovement && cashMovement.cashRegister?.status === "CLOSED") {
      throw new Error("No se puede anular una venta perteneciente a una caja cerrada");
    }
    //validar estado de production order
    const productionOrder = await tx.productionOrder.findFirst({
      where: {
        companyId,
        originType: "SALE",
        originId: sale.id
      }
    });

    if (productionOrder) {
    if (productionOrder.status === "PENDING") {
        await tx.productionOrder.update({
            where: { id: productionOrder.id },
            data: { status: "CANCELLED" }
        });

        // No hubo movimientos de inventario
        // No crear SALE_CANCEL
    } else if (productionOrder.status !== "COMPLETED") {
        throw new Error(
            "La orden de producción ya fue iniciada y no puede anularse la venta."
        );
    } else {
        // Regla para COMPLETED (la definiremos)
    }
} else {
    // Venta normal de stock
    for (const detail of sale.details) {
        const stockAfter = await calculateStock(
            tx,
            companyId,
            sale.branchId,
            detail.itemId,
            "SALE_CANCEL",
            detail.quantity
        );

        await tx.inventoryMovement.create({
          
        });
    }
}
    //cancelar venta
    await tx.sale.update({
      where: {
        id: sale.id
      },
      data: {
        status: "CANCELLED"
      }
    });
    
    //anular movimiento de caja
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

    return {
      success: true
    };

    // Validar que exista

    // Validar que no esté anulada

    // Validar que sea del mismo día

    // Validar que la caja no esté cerrada
  });
};
