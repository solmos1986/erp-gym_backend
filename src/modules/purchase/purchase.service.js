import { PrismaClient } from "@prisma/client";
import { createCashMovementPayments } from "../../utils/payment.helper.js";
import { calculateStock } from '../../utils/inventory.helper.js';
import { calculateCost } from '../../utils/inventory-cost.helper.js';

const prisma = new PrismaClient();

export const createPurchase = async ({ supplierId, companyId, branchId, userId, items, payments, notes }) => {
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
      throw new Error("Usuario no válido");
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
      throw new Error("Debe existir una caja abierta para registrar compras");
    }

    // =========================
    // 🔍 VALIDAR PROVEEDOR
    // =========================
    const supplier = await tx.partner.findFirst({
      where: {
        id: supplierId,
        companyId,
        type: "SUPPLIER"
      }
    });

    if (!supplier) {
      throw new Error("Proveedor no válido");
    }

    // =========================
    // 🔍 VALIDAR ITEMS
    // =========================
    if (!items || items.length === 0) {
      throw new Error("Debe registrar al menos un producto");
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

    if (products.length !== productIds.length) {
      throw new Error("Uno o más productos no existen");
    }

    // =========================
    // 🔢 SIGUIENTE NÚMERO
    // =========================
    const lastPurchase = await tx.purchase.findFirst({
      where: {
        companyId
      },
      orderBy: {
        purchaseNumber: "desc"
      },
      select: {
        purchaseNumber: true
      }
    });

    const nextPurchaseNumber = (lastPurchase?.purchaseNumber || 0) + 1;

    // =========================
    // 💰 CALCULAR TOTAL
    // =========================
    let subtotal = 0;

    for (const item of items) {
      subtotal += Number(item.quantity) * Number(item.unitCost);
    }

    // =========================
    // 💳 VALIDAR PAGOS
    // =========================
    if (!payments || payments.length === 0) {
      throw new Error("Debe registrar al menos un método de pago");
    }

    const totalPayments = payments.reduce((sum, payment) => sum + Number(payment.amount), 0);

    const purchaseTotal = Number(subtotal.toFixed(2));

    const paymentTotal = Number(totalPayments.toFixed(2));

    if (purchaseTotal !== paymentTotal) {
      throw new Error("Los pagos no coinciden con el total de la compra");
    }

    // =========================
    // 🧾 CREAR PURCHASE
    // =========================
    const purchase = await tx.purchase.create({
      data: {
        companyId,
        branchId,
        userId,

        supplierId,

        purchaseNumber: nextPurchaseNumber,

        purchaseDate: new Date(),

        subtotal,
        total: subtotal,

        discount: 0,
        tax: 0,

        notes,

        status: "CONFIRMED"
      }
    });

    // =========================
    // 📦 DETALLES + INVENTARIO
    // =========================
    for (const item of items) {
      const product = products.find((p) => p.id === item.productId);

      const lineTotal = Number(item.quantity) * Number(item.unitCost);

      await tx.purchaseDetail.create({
        data: {
          purchaseId: purchase.id,

          productId: product.id,

          code: product.code,

          description: product.name,

          quantity: item.quantity,

          unitCost: item.unitCost,

          total: lineTotal
        }
      });
      // =========================
      // 📦 MOVIMIENTO INVENTARIO
      // =========================

      await tx.inventoryMovement.create({
          data: {
              companyId,
              branchId,

              productId: product.id,

              movementType: "PURCHASE",

              referenceType: "PURCHASE",
              referenceId: purchase.id,

              quantity: item.quantity,
              unitCost: item.unitCost,
              totalCost: Number(item.quantity) * Number(item.unitCost),

              notes: `Compra #${nextPurchaseNumber}`,

              createdById: userId
          }
      });

      // =========================
      // 💰 ACTUALIZAR COSTO
      // =========================

      await calculateCost(
          tx,
          companyId,
          branchId,
          product.id,
          item.quantity,
          item.unitCost
      );

      // =========================
      // 📈 ACTUALIZAR STOCK
      // =========================

      await calculateStock(
          tx,
          companyId,
          branchId,
          product.id,
          "PURCHASE",
          item.quantity
      )};
    // =========================
    // 💸 MOVIMIENTO CAJA
    // =========================
    await createCashMovementPayments({
      tx,

      companyId,
      branchId,

      userId,

      cashRegisterId: cashRegister.id,

      movementType: "EXPENSE",

      referenceType: "PURCHASE",

      referenceId: purchase.id,

      description: `Compra #${purchase.purchaseNumber}`,

      payments
    });

    return {
      purchase
    };
  });
};
