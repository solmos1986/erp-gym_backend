import { PrismaClient } from "@prisma/client";
import { calculateStock } from "../../utils/inventoryStock.helper.js";
import { createCashMovementPayments } from "../../utils/payment.helper.js";

const prisma = new PrismaClient();

// =========================
// 🛒 VENDER PRODUCTOS
// =========================
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
    for (const item of items) {
      const product = products.find((p) => p.id === item.productId);

      const productBranch = product.productBranches[0];

      if (!productBranch) {
        throw new Error(`El producto ${product.name} no existe en esta sucursal`);
      }

      if (Number(productBranch.currentStock) < Number(item.quantity)) {
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
      }
    });

    // =========================
    // 🧾 CREAR DETAILS + INVENTARIO
    // =========================
    for (const item of items) {
      const product = products.find((p) => p.id === item.productId);

      const productBranch = product.productBranches[0];

      const lineTotal = Number(productBranch.salePrice) * Number(item.quantity);

      // SaleDetail
      await tx.saleDetail.create({
        data: {
          saleId: commercialSale.id,

          itemType: "PRODUCT",

          itemId: product.id,

          code: product.code,

          description: product.name,

          quantity: item.quantity,

          unitCost: productBranch.unitCost || 0,
          unitPrice: productBranch.salePrice,

          discount: 0,

          total: lineTotal
        }
      });
      // =========================
      // 📉 CALCULAR STOCK
      // =========================

      const stock = await calculateStock(tx, companyId, branchId, product.id, "SALE", item.quantity);

      // =========================
      // 📦 ACTUALIZAR PRODUCTBRANCH
      // =========================

      await tx.productBranch.update({
        where: {
          id: productBranch.id
        },
        data: {
          currentStock: stock
        }
      });

      // =========================
      // 📦 INVENTORY MOVEMENT
      // =========================

      await tx.inventoryMovement.create({
        data: {
          companyId,
          branchId,

          productId: product.id,

          movementType: "SALE",

          referenceType: "SALE",
          referenceId: commercialSale.id,

          quantity: item.quantity,

          unitCost: productBranch.unitCost,
          totalCost: Number(item.quantity) * Number(productBranch.unitCost),

          stockAfter: stock,
          unitCostAfter: productBranch.unitCost,

          notes: `Venta #${nextSaleNumber}`,

          createdById: userId
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
      sale: commercialSale
    };
  });
};
