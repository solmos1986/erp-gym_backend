export const calculateStock = async (tx, companyId, productId) => {
  const movements = await tx.inventoryMovement.findMany({
    where: {
      companyId,
      productId
    }
  });

  let stock = 0;

  for (const movement of movements) {
    switch (movement.movementType) {
      case "INITIAL_STOCK":
      case "PURCHASE":
      case "ADJUSTMENT_IN":
      case "TRANSFER_IN":
      case "SALE_CANCEL":
        stock += Number(movement.quantity);
        break;

      case "SALE":
      case "ADJUSTMENT_OUT":
      case "TRANSFER_OUT":
        stock -= Number(movement.quantity);
        break;
    }
  }

  return stock;
};

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
      case "INITIAL_STOCK":
      case "PURCHASE":
      case "ADJUSTMENT_IN":
      case "TRANSFER_IN":
      case "SALE_CANCEL":
        stockMap.set(movement.productId, current + qty);
        break;

      case "SALE":
      case "ADJUSTMENT_OUT":
      case "TRANSFER_OUT":
        stockMap.set(movement.productId, current - qty);
        break;
    }
  }

  return stockMap;
};
