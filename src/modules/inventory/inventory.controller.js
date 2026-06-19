import {
  getInventoryDashboard,
  getLowStockProductsService,
  getRecentMovementsService,
  getInventoryValuationService,
  getTopProductsService,
  getKardexService,
  getProductProfitabilityService,
  getGeneralProfitabilityService
} from "./inventory.service.js";

//////////////////////////////////////
// 📊 DASHBOARD INVENTARIO
//////////////////////////////////////
export const getDashboard = async (req, res) => {
  try {
    const companyId = req.user.companyId;

    const branchId = req.query.branchId || req.user.branchId;

    const data = await getInventoryDashboard({
      companyId,
      branchId
    });

    return res.json(data);
  } catch (error) {
    console.error("❌ Error inventory dashboard:", error);

    return res.status(500).json({
      message: "Error obteniendo dashboard de inventario"
    });
  }
};

//////////////////////////////////////
// ⚠️ PRODUCTOS BAJO STOCK
//////////////////////////////////////
export const getLowStockProducts = async (req, res) => {
  try {
    const companyId = req.user.companyId;

    const branchId = req.user.branchId;

    const data = await getLowStockProductsService({
      companyId,
      branchId
    });

    return res.json(data);
  } catch (error) {
    console.error("❌ Error low stock:", error);

    return res.status(500).json({
      message: "Error obteniendo productos bajo stock"
    });
  }
};

//////////////////////////////////////
// 📋 ÚLTIMOS MOVIMIENTOS
//////////////////////////////////////
export const getRecentMovements = async (req, res) => {
  try {
    const companyId = req.user.companyId;

    const branchId = req.user.branchId;

    const limit = Number(req.query.limit || 5);

    const data = await getRecentMovementsService({
      companyId,
      branchId,
      limit
    });

    return res.json(data);
  } catch (error) {
    console.error("❌ Error recent movements:", error);

    return res.status(500).json({
      message: "Error obteniendo movimientos"
    });
  }
};
//////////////////////////////////////
// 💰 VALORIZACIÓN INVENTARIO
//////////////////////////////////////
export const getInventoryValuation = async (req, res) => {
  try {
    const companyId = req.user.companyId;

    const branchId = req.user.branchId;

    const data = await getInventoryValuationService({
      companyId,
      branchId
    });

    return res.json(data);
  } catch (error) {
    console.error("❌ Error valuation:", error);

    return res.status(500).json({
      message: "Error obteniendo valorización"
    });
  }
};

//////////////////////////////////////
// 🏆 TOP PRODUCTOS
//////////////////////////////////////
export const getTopProducts = async (req, res) => {
  try {
    const companyId = req.user.companyId;

    const branchId = req.user.branchId;

    const { from, to } = req.query;

    const limit = Number(req.query.limit || 10);

    // 📅 Mes actual por defecto
    const now = new Date();

    const defaultFrom = new Date(now.getFullYear(), now.getMonth(), 1);

    const defaultTo = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const data = await getTopProductsService({
      companyId,
      branchId,
      limit,

      // Si llegan fechas se usan.
      // Si no llegan -> mes actual.
      from: from || defaultFrom,
      to: to || defaultTo
    });

    return res.json(data);
  } catch (error) {
    console.error("❌ Error top products:", error);

    return res.status(500).json({
      message: "Error obteniendo top productos"
    });
  }
};
//////////////////////////////////////
// 📒 KARDEX
//////////////////////////////////////
export const getKardex = async (req, res) => {
  try {
    const companyId = req.user.companyId;

    const branchId = req.user.branchId;

    const { productId, from, to } = req.query;

    const data = await getKardexService({
      companyId,
      branchId,
      productId,
      from,
      to
    });

    return res.json(data);
  } catch (error) {
    console.error("❌ Error kardex:", error);

    return res.status(500).json({
      message: "Error obteniendo kardex"
    });
  }
};

//////////////////////////////////////
// 💰 UTILIDAD POR PRODUCTO
//////////////////////////////////////
export const getProductProfitability = async (req, res) => {
  try {
    const companyId = req.user.companyId;

    const branchId = req.user.branchId;

    const { from, to } = req.query;

    // 📅 Mes actual por defecto
    const now = new Date();

    const defaultFrom = new Date(now.getFullYear(), now.getMonth(), 1);

    const defaultTo = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const data = await getProductProfitabilityService({
      companyId,
      branchId,

      // Si llegan fechas desde el frontend
      // se usan esas.
      // Si no llegan -> mes actual.
      from: from || defaultFrom,
      to: to || defaultTo
    });

    return res.json(data);
  } catch (error) {
    console.error("❌ Error profitability:", error);

    return res.status(500).json({
      message: "Error obteniendo utilidad por producto"
    });
  }
};

//////////////////////////////////////
// 💰 UTILIDAD GENERAL
//////////////////////////////////////
export const getGeneralProfitability = async (req, res) => {
  try {
    const companyId = req.user.companyId;

    const branchId = req.user.branchId;

    const { from, to, type = "ALL" } = req.query;

    // 📅 Mes actual por defecto
    const now = new Date();

    const defaultFrom = new Date(now.getFullYear(), now.getMonth(), 1);

    const defaultTo = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const data = await getGeneralProfitabilityService({
      companyId,
      branchId,

      // Si frontend envía fechas -> usa esas
      // Si no envía -> usa mes actual
      from: from || defaultFrom,
      to: to || defaultTo,

      type
    });

    return res.json(data);
  } catch (error) {
    console.error("❌ Error general profitability:", error);

    return res.status(500).json({
      message: "Error obteniendo utilidad general"
    });
  }
};
