import { PrismaClient } from "@prisma/client";
import { calculateStock } from "../../utils/inventory.helper.js";
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

      const stock = await calculateStock(tx, companyId, product.id);

      if (stock < Number(item.quantity)) {
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

      subtotal += Number(product.salePrice) * Number(item.quantity);
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
    // 🧾 CREAR DETAILS + STOCK
    // =========================
    for (const item of items) {
      const product = products.find((p) => p.id === item.productId);

      const lineTotal = Number(product.salePrice) * Number(item.quantity);

      // SaleDetail
      await tx.saleDetail.create({
        data: {
          saleId: commercialSale.id,

          itemType: "PRODUCT",

          itemId: product.id,

          code: product.code,

          description: product.name,

          quantity: item.quantity,
          unitCost: product.costPrice || 0,
          unitPrice: product.salePrice,

          discount: 0,

          total: lineTotal
        }
      });

      // InventoryMovement
      await tx.inventoryMovement.create({
        data: {
          companyId,
          branchId,

          productId: product.id,

          movementType: "SALE",

          quantity: item.quantity,

          notes: `Venta #${nextSaleNumber}`,

          createdById: userId
        }
      });
    }
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
