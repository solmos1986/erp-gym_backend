import prisma from "../../lib/prisma.js";
import { getStockMap } from "../../utils/inventory.helper.js";

//////////////////////////////////////
// 📊 DASHBOARD INVENTARIO
//////////////////////////////////////
export const getInventoryDashboard = async ({ companyId, branchId }) => {
  //////////////////////////////////////
  // 📅 FECHA INICIO MES
  //////////////////////////////////////
  const now = new Date();

  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  //////////////////////////////////////
  // 📦 PRODUCTOS ACTIVOS
  //////////////////////////////////////
  const activeProducts = await prisma.product.count({
    where: {
      companyId,
      isActive: true
    }
  });

  //////////////////////////////////////
  // 📦 PRODUCTOS
  //////////////////////////////////////
  const products = await prisma.product.findMany({
    where: {
      companyId,
      isActive: true
    },

    select: {
      id: true,
      name: true,
      minStock: true,
      costPrice: true
    }
  });

  //////////////////////////////////////
  // 📦 STOCK REAL
  //////////////////////////////////////
  const stockMap = await getStockMap(prisma, companyId, branchId);

  //////////////////////////////////////
  // KPI
  //////////////////////////////////////
  let totalStock = 0;

  let outOfStock = 0;

  let lowStock = 0;

  let inventoryValue = 0;

  for (const product of products) {
    const stock = stockMap.get(product.id) || 0;

    totalStock += stock;

    if (stock <= 0) {
      outOfStock++;
    }

    if (stock > 0 && stock <= product.minStock) {
      lowStock++;
    }

    inventoryValue += stock * Number(product.costPrice || 0);
  }

  //////////////////////////////////////
  // 💰 COMPRAS DEL MES
  //////////////////////////////////////
  const purchasesMonth = await prisma.purchase.aggregate({
    _sum: {
      total: true
    },

    where: {
      companyId,
      ...(branchId && { branchId }),

      status: "CONFIRMED",

      purchaseDate: {
        gte: startOfMonth
      }
    }
  });

  //////////////////////////////////////
  // 💰 VENTAS DEL MES
  //////////////////////////////////////
  const salesMonth = await prisma.sale.aggregate({
    _sum: {
      total: true
    },

    where: {
      companyId,
      ...(branchId && { branchId }),

      status: "CONFIRMED",

      saleDate: {
        gte: startOfMonth
      }
    }
  });

  //////////////////////////////////////
  // RESPONSE
  //////////////////////////////////////
  return {
    activeProducts,

    totalStock,

    outOfStock,

    lowStock,

    inventoryValue: Number(inventoryValue.toFixed(2)),

    monthlyPurchases: Number(purchasesMonth._sum.total || 0),

    monthlySales: Number(salesMonth._sum.total || 0)
  };
};

//////////////////////////////////////
// ⚠️ PRODUCTOS BAJO STOCK
//////////////////////////////////////
export const getLowStockProductsService = async ({ companyId, branchId }) => {
  //////////////////////////////////////
  // STOCK REAL
  //////////////////////////////////////
  const stockMap = await getStockMap(prisma, companyId, branchId);

  //////////////////////////////////////
  // PRODUCTOS
  //////////////////////////////////////
  const products = await prisma.product.findMany({
    where: {
      companyId,
      isActive: true
    },

    select: {
      id: true,
      code: true,
      name: true,
      minStock: true
    }
  });

  //////////////////////////////////////
  // FILTRAR BAJO STOCK
  //////////////////////////////////////
  const result = [];

  for (const product of products) {
    const stock = stockMap.get(product.id) || 0;

    if (stock > 0 && stock <= product.minStock) {
      result.push({
        productId: product.id,
        code: product.code,
        name: product.name,
        stock,
        minStock: product.minStock
      });
    }
  }

  //////////////////////////////////////
  // ORDENAR
  //////////////////////////////////////
  result.sort((a, b) => a.stock - b.stock);

  return result;
};
//////////////////////////////////////
// 📋 ÚLTIMOS MOVIMIENTOS
//////////////////////////////////////
export const getRecentMovementsService = async ({ companyId, branchId, limit = 5 }) => {
  console.log("llegue a service de recent movements limite", limit);
  const movements = await prisma.inventoryMovement.findMany({
    where: {
      companyId,
      ...(branchId && { branchId })
    },
    take: limit,
    orderBy: {
      createdAt: "desc"
    },

    take: limit,

    include: {
      product: {
        select: {
          id: true,
          code: true,
          name: true
        }
      }
    }
  });

  return movements.map((m) => ({
    id: m.id,

    date: m.createdAt,

    type: m.movementType,

    quantity: Number(m.quantity),

    productId: m.product?.id,

    code: m.product?.code,

    productName: m.product?.name
  }));
};

//////////////////////////////////////
// 💰 VALORIZACIÓN INVENTARIO
//////////////////////////////////////
export const getInventoryValuationService = async ({ companyId, branchId }) => {
  const stockMap = await getStockMap(prisma, companyId, branchId);

  const products = await prisma.product.findMany({
    where: {
      companyId,
      isActive: true
    },

    select: {
      id: true,
      code: true,
      name: true,
      costPrice: true
    }
  });

  const rows = [];

  for (const product of products) {
    const stock = stockMap.get(product.id) || 0;

    const costPrice = Number(product.costPrice || 0);

    const inventoryValue = stock * costPrice;

    rows.push({
      productId: product.id,

      code: product.code,

      name: product.name,

      stock,

      costPrice,

      inventoryValue
    });
  }

  rows.sort((a, b) => b.inventoryValue - a.inventoryValue);

  const totalInventoryValue = rows.reduce((sum, item) => sum + item.inventoryValue, 0);

  return {
    totalInventoryValue,
    products: rows
  };
};

//////////////////////////////////////
// 🏆 TOP PRODUCTOS
//////////////////////////////////////
export const getTopProductsService = async ({ companyId, branchId, from, to, limit = 5 }) => {
  const details = await prisma.saleDetail.findMany({
    where: {
      itemType: "PRODUCT",

      sale: {
        companyId,
        ...(branchId && { branchId }),
        status: "CONFIRMED",
        ...(from || to
          ? {
              saleDate: {
                ...(from && {
                  gte: new Date(from)
                }),
                ...(to && {
                  lte: new Date(to)
                })
              }
            }
          : {})
      }
    },

    select: {
      itemId: true,

      code: true,

      description: true,

      quantity: true,

      unitPrice: true,

      unitCost: true
    }
  });

  const map = new Map();

  for (const row of details) {
    const current = map.get(row.itemId) || {
      productId: row.itemId,

      code: row.code,

      name: row.description,

      quantitySold: 0,

      revenue: 0,

      estimatedProfit: 0
    };

    const qty = Number(row.quantity);

    const revenue = qty * Number(row.unitPrice);

    const profit = qty * (Number(row.unitPrice) - Number(row.unitCost));

    current.quantitySold += qty;

    current.revenue += revenue;

    current.estimatedProfit += profit;

    map.set(row.itemId, current);
  }

  return [...map.values()].sort((a, b) => b.quantitySold - a.quantitySold).slice(0, limit);
};

//////////////////////////////////////
// 📒 KARDEX
//////////////////////////////////////
export const getKardexService = async ({ companyId, branchId, productId, from, to }) => {
  let dateFilter = {};

  if (from) {
    const startDate = new Date(from);

    startDate.setHours(0, 0, 0, 0);

    dateFilter.gte = startDate;
  }

  if (to) {
    const endDate = new Date(to);

    endDate.setHours(23, 59, 59, 999);

    dateFilter.lte = endDate;
  }
  if (!productId) {
    throw new Error("productId es requerido");
  }

  //////////////////////////////////////
  // PRODUCTO
  //////////////////////////////////////
  const product = await prisma.product.findFirst({
    where: {
      id: productId,
      companyId
    },

    select: {
      id: true,
      code: true,
      name: true
    }
  });

  //////////////////////////////////////
  // MOVIMIENTOS
  //////////////////////////////////////
  const movements = await prisma.inventoryMovement.findMany({
    where: {
      companyId,
      productId,

      ...(branchId && { branchId }),

      ...(Object.keys(dateFilter).length
        ? {
            createdAt: dateFilter
          }
        : {})
    },
    take: 5,
    orderBy: {
      createdAt: "asc"
    }
  });

  //////////////////////////////////////
  // SALDO ACUMULADO
  //////////////////////////////////////
  let balance = 0;

  const rows = [];

  for (const m of movements) {
    const qty = Number(m.quantity);

    let qtyIn = 0;
    let qtyOut = 0;

    switch (m.movementType) {
      case "INITIAL_STOCK":
      case "PURCHASE":
      case "SALE_CANCEL":
      case "ADJUSTMENT_IN":
      case "TRANSFER_IN":
        qtyIn = qty;
        balance += qty;
        break;

      case "SALE":
      case "ADJUSTMENT_OUT":
      case "TRANSFER_OUT":
        qtyOut = qty;
        balance -= qty;
        break;
    }

    rows.push({
      date: m.createdAt,
      type: m.movementType,
      reference: m.notes || "-",
      qtyIn,
      qtyOut,
      balance
    });
  }

  return {
    product,

    movements: rows,

    currentStock: balance
  };
};

//////////////////////////////////////
// 💰 UTILIDAD POR PRODUCTO
//////////////////////////////////////
export const getProductProfitabilityService = async ({ companyId, branchId, from, to }) => {
  const details = await prisma.saleDetail.findMany({
    where: {
      itemType: "PRODUCT",

      sale: {
        companyId,

        ...(branchId && { branchId }),

        status: "CONFIRMED",

        ...(from || to
          ? {
              saleDate: {
                ...(from && {
                  gte: new Date(from)
                }),
                ...(to && {
                  lte: new Date(to)
                })
              }
            }
          : {})
      }
    },

    select: {
      itemId: true,

      code: true,

      description: true,

      quantity: true,

      unitPrice: true,

      unitCost: true
    }
  });

  const map = new Map();

  for (const row of details) {
    const current = map.get(row.itemId) || {
      productId: row.itemId,

      code: row.code,

      name: row.description,

      quantitySold: 0,

      revenue: 0,

      cost: 0,

      profit: 0,

      marginPercent: 0
    };

    const qty = Number(row.quantity);

    const revenue = qty * Number(row.unitPrice);

    const cost = qty * Number(row.unitCost);

    const profit = revenue - cost;

    current.quantitySold += qty;

    current.revenue += revenue;

    current.cost += cost;

    current.profit += profit;

    map.set(row.itemId, current);
  }

  const rows = [...map.values()];

  for (const row of rows) {
    row.marginPercent = row.revenue > 0 ? Number(((row.profit / row.revenue) * 100).toFixed(2)) : 0;
  }

  rows.sort((a, b) => b.profit - a.profit);

  const totals = {
    revenue: rows.reduce((a, b) => a + b.revenue, 0),

    cost: rows.reduce((a, b) => a + b.cost, 0),

    profit: rows.reduce((a, b) => a + b.profit, 0)
  };

  return {
    totals,
    products: rows
  };
};

//////////////////////////////////////
// 💰 UTILIDAD GENERAL
//////////////////////////////////////
export const getGeneralProfitabilityService = async ({ companyId, branchId, from, to, type = "ALL" }) => {
  console.log("generalProfit ", from, " ", to);
  const details = await prisma.saleDetail.findMany({
    where: {
      ...(type === "PRODUCT"
        ? {
            itemType: "PRODUCT"
          }
        : {}),

      sale: {
        companyId,

        ...(branchId && { branchId }),

        status: "CONFIRMED",

        ...(from || to
          ? {
              saleDate: {
                ...(from && {
                  gte: new Date(from)
                }),
                ...(to && {
                  lte: new Date(to)
                })
              }
            }
          : {})
      }
    },

    select: {
      quantity: true,

      unitPrice: true,

      unitCost: true
    }
  });

  let revenue = 0;

  let cost = 0;

  for (const row of details) {
    const qty = Number(row.quantity);

    revenue += qty * Number(row.unitPrice);

    cost += qty * Number(row.unitCost);
  }

  const profit = revenue - cost;

  const marginPercent = revenue > 0 ? Number(((profit / revenue) * 100).toFixed(2)) : 0;

  return {
    revenue,

    cost,

    profit,

    marginPercent
  };
};
