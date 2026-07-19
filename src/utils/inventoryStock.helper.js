import { Prisma } from "@prisma/client";

export async function calculateStock(tx, companyId, branchId, productId, movementType, quantity) {
  let productBranch = await tx.productBranch.findUnique({
    where: {
      branchId_productId: {
        branchId,
        productId
      }
    }
  });

  if (!productBranch) {
    productBranch = await tx.productBranch.create({
      data: {
        companyId,
        branchId,
        productId,
        currentStock: 0,
        unitCost: 0,
        salePrice: 0
      }
    });
  }

  let stock = Number(productBranch.currentStock);
  const qty = Number(quantity);

  switch (movementType) {
    case "INITIAL_STOCK":
    case "PURCHASE":
    case "PRODUCTION_IN":
    case "TRANSFER_IN":
    case "ADJUSTMENT_IN":
    case "SALE_CANCEL":
      stock += qty;
      break;

    case "PURCHASE_CANCEL":
    case "SALE":
    case "PRODUCTION_OUT":
    case "TRANSFER_OUT":
    case "ADJUSTMENT_OUT":
      stock -= qty;
      break;

    default:
      throw new Error(`Tipo de movimiento no soportado: ${movementType}`);
  }



  return stock;
}

export const getStockMap = async (tx, companyId, branchId = null) => {
  const movements = await tx.inventoryMovement.findMany({
    where: {
      companyId,
      ...(branchId && { branchId })
    },

    select: {
      productId: true,
      movementType: true,
      quantity: true
    }
  });

  const stockMap = new Map();

  for (const movement of movements) {
    const current = stockMap.get(movement.productId) || 0;

    let qty = Number(movement.quantity);

    switch (movement.movementType) {
      case "PURCHASE":
      case "ADJUSTMENT_IN":
      case "TRANSFER_IN":
      case "SALE_CANCEL":
      case "PRODUCTION_IN":
        stock += Number(movement.quantity);
        break;

      case "SALE":
      case "ADJUSTMENT_OUT":
      case "TRANSFER_OUT":
      case "PRODUCTION_OUT":
      case "PURCHASE_CANCEL":
        stock -= Number(movement.quantity);
        break;
    }
  }

  return stockMap;
};
