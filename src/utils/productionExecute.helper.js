import { calculateStock } from "./inventoryStock.helper.js";

export async function executeProductionItem(tx, companyId, branchId, userId, productionOrderItemId) {
  // ============================================
  // OBTENER ITEM DE PRODUCCIÓN
  // ============================================

  const productionItem = await tx.productionOrderItem.findUnique({
    where: {
      id: productionOrderItemId
    },
    include: {
      productionOrder: true,
      product: true
    }
  });

  if (!productionItem) {
    throw new Error("El item de producción no existe.");
  }

  // ============================================
  // BUSCAR BOM ACTIVO
  // ============================================

  const bom = await tx.productBom.findFirst({
    where: {
      companyId,
      productId: productionItem.productId,
      isActive: true
    },
    include: {
      items: {
        include: {
          material: true
        }
      }
    }
  });

  if (!bom) {
    throw new Error(`El producto ${productionItem.product.name} no tiene una receta activa.`);
  }

  if (bom.items.length === 0) {
    throw new Error(`La receta del producto ${productionItem.product.name} no tiene materiales.`);
  }

  // ============================================
  // CALCULAR MATERIALES NECESARIOS
  // ============================================

  const materials = [];

  for (const item of bom.items) {
    const waste = Number(item.wastePercent) / 100;

    const quantity = Number(productionItem.quantity) * Number(item.quantity) * (1 + waste);

    materials.push({
      materialId: item.materialId,

      materialName: item.material.name,

      quantity,

      bomItem: item
    });
  }

  // ============================================
  // VALIDAR STOCK
  // ============================================

  for (const material of materials) {
    const productBranch = await tx.productBranch.findUnique({
      where: {
        branchId_productId: {
          branchId,

          productId: material.materialId
        }
      }
    });

    if (!productBranch) {
      throw new Error(`No existe inventario para ${material.materialName}.`);
    }

    if (Number(productBranch.currentStock) < material.quantity) {
      throw new Error(`Stock insuficiente para ${material.materialName}.`);
    }

    material.unitCost = Number(productBranch.unitCost);

    material.totalCost = material.quantity * material.unitCost;
  }

  // ============================================
  // SIGUE EN LA PARTE 2
  // ============================================

  // ============================================
  // CONSUMIR MATERIA PRIMA
  // ============================================

  for (const material of materials) {
    // ============================================
    // REGISTRAR CONSUMO
    // ============================================

    await tx.productionConsumption.create({
      data: {
        productionOrderItemId: productionItem.id,

        materialId: material.materialId,

        quantity: material.quantity,

        unitCost: material.unitCost,

        totalCost: material.totalCost
      }
    });

    // ============================================
    // NUEVO STOCK
    // ============================================

    const stock = await calculateStock(tx, companyId, branchId, material.materialId, "PRODUCTION_OUT", material.quantity);

    // ============================================
    // ACTUALIZAR PRODUCTBRANCH
    // ============================================

    await tx.productBranch.update({
      where: {
        branchId_productId: {
          branchId,

          productId: material.materialId
        }
      },

      data: {
        currentStock: stock
      }
    });

    // ============================================
    // INVENTORY MOVEMENT
    // ============================================

    await tx.inventoryMovement.create({
      data: {
        companyId,

        branchId,

        productId: material.materialId,

        movementType: "PRODUCTION_OUT",

        referenceType: "PRODUCTION_ORDER",

        referenceId: productionItem.productionOrderId,

        quantity: material.quantity,

        unitCost: material.unitCost,

        totalCost: material.totalCost,

        stockAfter: stock,

        unitCostAfter: material.unitCost,

        notes: `Consumo producción ${productionItem.productionOrder.number}`,

        createdById: userId
      }
    });
  }

  // ============================================
  // CALCULAR NUEVO STOCK
  // ============================================

  const finishedStock = await calculateStock(tx, companyId, branchId, productionItem.productId, "PRODUCTION_IN", productionItem.quantity);

  // ============================================
  // ACTUALIZAR PRODUCTBRANCH
  // ============================================

  await tx.productBranch.update({
    where: {
      branchId_productId: {
        branchId,

        productId: productionItem.productId
      }
    },

    data: {
      currentStock: finishedStock
    }
  });

  // ============================================
  // INVENTORY MOVEMENT
  // ============================================

  await tx.inventoryMovement.create({
    data: {
      companyId,

      branchId,

      productId: productionItem.productId,

      movementType: "PRODUCTION_IN",

      referenceType: "PRODUCTION_ORDER",

      referenceId: productionItem.productionOrderId,

      quantity: productionItem.quantity,

      unitCost: productionItem.unitCost,

      totalCost: Number(productionItem.unitCost) * Number(productionItem.quantity),

      stockAfter: finishedStock,

      unitCostAfter: productionItem.unitCost,

      notes: `Producción ${productionItem.productionOrder.number}`,

      createdById: userId
    }
  });

  // ============================================
  // ACTUALIZAR ITEM DE PRODUCCIÓN
  // ============================================

  await tx.productionOrderItem.update({
    where: {
      id: productionItem.id
    },
    data: {
      status: "COMPLETED"
    }
  });

  // ============================================
  // RETORNAR RESULTADO
  // ============================================

  return {
    productionOrderId: productionItem.productionOrderId,
    productionOrderItemId: productionItem.id,
    quantity: productionItem.quantity
  };
}
