import prisma from "../lib/prisma.js";

// inventory-cost.helper.js

// helpers/inventory-cost.helper.js

export async function calculateCost(
    tx,
    companyId,
    branchId,
    productId,
    quantity,
    unitCost
) {
    const company = await tx.company.findUnique({
        where: {
            id: companyId
        },
        select: {
            costMethod: true
        }
    });

    if (!company) {
        throw new Error("Empresa no encontrada.");
    }

    switch (company.costMethod) {

        case "WEIGHTED_AVERAGE":
            return await calculateWeightedAverage(
                tx,
                branchId,
                productId,
                quantity,
                unitCost
            );

        case "FIFO":
            throw new Error("Método FIFO aún no implementado.");

        case "STANDARD":
            throw new Error("Método STANDARD aún no implementado.");

        default:
            throw new Error("Método de costeo no soportado.");
    }
}

async function calculateWeightedAverage(
    tx,
    branchId,
    productId,
    quantity,
    unitCost
) {
    const productBranch = await tx.productBranch.findUnique({
        where: {
            branchId_productId: {
                branchId,
                productId
            }
        }
    });

    if (!productBranch) {
        throw new Error("ProductBranch no encontrado.");
    }

    const currentStock = Number(productBranch.currentStock);
    const currentCost = Number(productBranch.costPrice);

    const qty = Number(quantity);
    const cost = Number(unitCost);

    const currentValue = currentStock * currentCost;
    const purchaseValue = qty * cost;

    const newStock = currentStock + qty;

    let newAverageCost = 0;

    if (newStock > 0) {
        newAverageCost = (currentValue + purchaseValue) / newStock;
    }

    await tx.productBranch.update({
        where: {
            id: productBranch.id
        },
        data: {
            costPrice: newAverageCost
        }
    });

    return newAverageCost;
}

/**
 * FIFO
 * (Pendiente de implementación)
 */
async function calculateFIFO(
    tx,
    branchId,
    productId,
    quantity,
    unitCost
) {
    throw new Error("Método FIFO aún no implementado.");
}

/**
 * COSTO ESTÁNDAR
 * (Pendiente de implementación)
 */
async function calculateStandardCost(
    tx,
    branchId,
    productId,
    quantity,
    unitCost
) {
    throw new Error("Método STANDARD aún no implementado.");
}