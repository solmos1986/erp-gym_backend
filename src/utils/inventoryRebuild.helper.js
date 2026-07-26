// export async function rebuildInventory(tx, companyId, branchId, productId, movementId) {
//   // =========================
//   // 🔍 MOVIMIENTO MODIFICADO
//   // =========================

//   const movement = await tx.inventoryMovement.findFirst({
//     where: {
//       id: movementId,
//       companyId,
//       branchId,
//       productId
//     }
//   });

//   if (!movement) {
//     throw new Error("Movimiento de inventario no encontrado.");
//   }
//   console.log('movement ', movement);
//   // =========================
//   // 🔍 MOVIMIENTO ANTERIOR
//   // =========================

//   const previousMovement = await tx.inventoryMovement.findFirst({
//     where: {
//       companyId,
//       branchId,
//       productId,

//       createdAt: {
//         lt: movement.createdAt
//       }
//     },

//     orderBy: {
//       createdAt: "desc"
//     }
//   });
//   console.log('previousMovement ',previousMovement);
//   // =========================
//   // 📊 ESTADO INICIAL
//   // =========================

//   let currentStock = 0;
//   let currentUnitCost = 0;

//   if (previousMovement) {
//     currentStock = Number(previousMovement.stockAfter);
//     currentUnitCost = Number(previousMovement.unitCostAfter);
//     console.log('currentStockk ', currentStock,' currentUnitCostttt ', currentUnitCost);
//   }

//   // =========================
//   // 📚 MOVIMIENTOS A RECONSTRUIR
//   // =========================

//   const movements = await tx.inventoryMovement.findMany({
//     where: {
//       companyId,
//       branchId,
//       productId,

//       createdAt: {
//         gte: movement.createdAt
//       }
//     },

//     orderBy: {
//       createdAt: "asc"
//     }
//   });
//   console.log('movements ', movements);
//   for (const movement of movements) {
//     switch (movement.movementType) {
//       case "PURCHASE": {
//         const quantity = Number(movement.quantity);
//         const purchaseUnitCost = Number(movement.unitCost);

//         const previousStock = currentStock;
//         const previousUnitCost = currentUnitCost;

//         const previousValue = previousStock * previousUnitCost;
//         const purchaseValue = quantity * purchaseUnitCost;

//         currentStock = previousStock + quantity;

//         currentUnitCost = currentStock > 0 ? (previousValue + purchaseValue) / currentStock : 0;

//         await tx.inventoryMovement.update({
//           where: {
//             id: movement.id
//           },
//           data: {
//             totalCost: quantity * purchaseUnitCost,
//             stockAfter: currentStock,
//             unitCostAfter: currentUnitCost
//           }
//         });

//         break;
//       }

//       case "SALE": {
//         const quantity = Number(movement.quantity);

//         // Descontar stock
//         currentStock -= quantity;

//         // Actualizar InventoryMovement
//         await tx.inventoryMovement.update({
//           where: {
//             id: movement.id
//           },
//           data: {
//             unitCost: currentUnitCost,
//             totalCost: quantity * currentUnitCost,
//             stockAfter: currentStock,
//             unitCostAfter: currentUnitCost
//           }
//         });

//         // Actualizar costo del detalle de venta
//         await tx.saleDetail.updateMany({
//           where: {
//             saleId: movement.referenceId,
//             itemId: movement.productId
//           },
//           data: {
//             unitCost: currentUnitCost
//           }
//         });

//         break;
//       }

//       case "PURCHASE_CANCEL": {
//         const quantity = Number(movement.quantity);
//         const purchaseUnitCost = Number(movement.unitCost);

//         const previousStock = currentStock;
//         const previousUnitCost = currentUnitCost;

//         const previousValue = previousStock * previousUnitCost;
//         const purchaseValue = quantity * purchaseUnitCost;

//         currentStock = previousStock - quantity;

//         if (currentStock > 0) {
//           currentUnitCost = (previousValue - purchaseValue) / currentStock;
//         } else {
//           currentUnitCost = 0;
//         }

//         await tx.inventoryMovement.update({
//           where: {
//             id: movement.id
//           },
//           data: {
//             totalCost: quantity * purchaseUnitCost,
//             stockAfter: currentStock,
//             unitCostAfter: currentUnitCost
//           }
//         });

//         break;
//       }

//       case "SALE_CANCEL": {
//         const quantity = Number(movement.quantity);

//         // Devolver stock
//         currentStock += quantity;

//         // Actualizar InventoryMovement
//         await tx.inventoryMovement.update({
//           where: {
//             id: movement.id
//           },
//           data: {
//             unitCost: currentUnitCost,
//             totalCost: quantity * currentUnitCost,
//             stockAfter: currentStock,
//             unitCostAfter: currentUnitCost
//           }
//         });

//         break;
//       }

//       default:
//         throw new Error(`Tipo de movimiento no soportado: ${movement.movementType}`);
//     }
//     await tx.productBranch.update({
//       where: {
//         branchId_productId: {
//           branchId,
//           productId
//         }
//       },
//       data: {
//         currentStock,
//         unitCost: currentUnitCost
//       }
//     });
//   }
// }
export async function rebuildInventory(tx, companyId, branchId, productId) {
  const movements = await tx.inventoryMovement.findMany({
    where: {
      companyId,
      branchId,
      productId,
      status: "ACTIVE"
    },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }]
  });

  let stock = 0;
  let unitCost = 0;

  for (const movement of movements) {
    const qty = Number(movement.quantity);

    switch (movement.movementType) {
      // =====================================================
      // PURCHASE
      // =====================================================
      case "PURCHASE": {
        const purchaseCost = Number(movement.unitCost);

        const inventoryValue = stock * unitCost;
        const purchaseValue = qty * purchaseCost;

        stock += qty;

        unitCost = stock > 0 ? (inventoryValue + purchaseValue) / stock : 0;

        await tx.inventoryMovement.update({
          where: {
            id: movement.id
          },
          data: {
            stockAfter: stock,
            unitCostAfter: unitCost
          }
        });

        break;
      }

      // =====================================================
      // SALE
      // =====================================================
      case "SALE": {
        const saleUnitCost = unitCost;
        const totalCost = saleUnitCost * qty;

        stock -= qty;

        await tx.inventoryMovement.update({
          where: {
            id: movement.id
          },
          data: {
            unitCost: saleUnitCost,
            totalCost: totalCost,
            stockAfter: stock,
            unitCostAfter: unitCost
          }
        });
        await tx.saleDetail.updateMany({
          where: {
            saleId: movement.referenceId,
            itemType: "PRODUCT",
            itemId: movement.productId
          },
          data: {
            unitCost: saleUnitCost
          }
        });

        break;
      }

      // =====================================================
      // SALE CANCEL
      // =====================================================
      case "SALE_CANCEL": {
        const returnCost = Number(movement.unitCost);

        const inventoryValue = stock * unitCost;
        const returnValue = qty * returnCost;

        stock += qty;

        unitCost = stock > 0 ? (inventoryValue + returnValue) / stock : 0;

        await tx.inventoryMovement.update({
          where: {
            id: movement.id
          },
          data: {
            stockAfter: stock,
            unitCostAfter: unitCost
          }
        });

        break;
      }

      // =====================================================
      // ADJUSTMENT IN
      // =====================================================
      case "ADJUSTMENT_IN": {
        const adjustmentCost = Number(movement.unitCost);

        const inventoryValue = stock * unitCost;
        const adjustmentValue = qty * adjustmentCost;

        stock += qty;

        unitCost = stock > 0 ? (inventoryValue + adjustmentValue) / stock : 0;

        await tx.inventoryMovement.update({
          where: {
            id: movement.id
          },
          data: {
            stockAfter: stock,
            unitCostAfter: unitCost
          }
        });

        break;
      }

      // =====================================================
      // ADJUSTMENT OUT
      // =====================================================
      case "ADJUSTMENT_OUT": {
        const adjustmentCost = unitCost;
        const totalCost = adjustmentCost * qty;

        stock -= qty;

        await tx.inventoryMovement.update({
          where: {
            id: movement.id
          },
          data: {
            unitCost: adjustmentCost,
            totalCost: totalCost,
            stockAfter: stock,
            unitCostAfter: unitCost
          }
        });

        break;
      }

      default:
        break;
    }
  }

  await tx.productBranch.update({
    where: {
      branchId_productId: {
        branchId,
        productId
      }
    },
    data: {
      currentStock: stock,
      unitCost: unitCost
    }
  });

  return {
    currentStock: stock,
    unitCost: unitCost
  };
}
