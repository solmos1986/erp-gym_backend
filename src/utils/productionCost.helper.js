import { Prisma } from "@prisma/client";

/**
 * Recalcula el costo de los productos fabricados
 * que utilizan una materia prima cuyo costo cambió.
 */
export async function recalculateProductionCosts(tx, companyId, branchId, materialProductId) {
  // ============================================
  // BUSCAR TODOS LOS BOM QUE USAN ESTA MATERIA PRIMA
  // ============================================

  const boms = await tx.productBom.findMany({
    where: {
      companyId,
      isActive: true,
      items: {
        some: {
          materialId: materialProductId
        }
      }
    },

    include: {
      product: true,

      items: {
        include: {
          material: true
        }
      }
    }
  });

  // ============================================
  // RECALCULAR CADA PRODUCTO
  // ============================================

  for (const bom of boms) {
    let totalCost = 0;

    for (const item of bom.items) {
      const materialBranch = await tx.productBranch.findUnique({
        where: {
          branchId_productId: {
            branchId,
            productId: item.materialId
          }
        }
      });

      if (!materialBranch) {
        throw new Error(`No existe ProductBranch para ${item.material.name}`);
      }

      totalCost += Number(item.quantity) * Number(materialBranch.unitCost);
    }

    await tx.productBranch.update({
      where: {
        branchId_productId: {
          branchId,
          productId: bom.productId
        }
      },

      data: {
        unitCost: new Prisma.Decimal(totalCost)
      }
    });
  }
}
