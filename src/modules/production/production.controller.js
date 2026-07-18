import * as productionService from "./production.service.js";

// =========================
// ➕ CREAR ORDEN DE PRODUCCIÓN
// =========================
export const createProductionOrder = async (req, res) => {
  console.log(req.user);
  try {
    const productionOrder = await productionService.createProductionOrder(req);

    res.status(201).json({
      message: "Orden de producción creada correctamente.",
      productionOrder
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: error.message,
      code: error.code
    });
  }
};

// =========================
// 📋 LISTAR ÓRDENES
// =========================
export const getProductionOrders = async (req, res) => {
  try {
    const productionOrders = await productionService.getProductionOrders(req);

    res.json(productionOrders);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: error.message,
      code: error.code
    });
  }
};

// =========================
// 🔍 OBTENER ORDEN
// =========================
export const getProductionOrderById = async (req, res) => {
  try {
    const productionOrder = await productionService.getProductionOrderById(req);

    res.json(productionOrder);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: error.message,
      code: error.code
    });
  }
};

// =========================
// ✏️ ACTUALIZAR ORDEN
// =========================
export const updateProductionOrder = async (req, res) => {
  try {
    const productionOrder = await productionService.updateProductionOrder(req);

    res.json({
      message: "Orden de producción actualizada correctamente.",
      productionOrder
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: error.message,
      code: error.code
    });
  }
};

// =========================
// ❌ CANCELAR ORDEN
// =========================
export const deleteProductionOrder = async (req, res) => {
  try {
    await productionService.deleteProductionOrder(req);

    res.json({
      message: "Orden de producción cancelada correctamente."
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: error.message,
      code: error.code
    });
  }
};

// =========================
// ✅ ACTIVAR ORDEN
// =========================
export const activateProductionOrder = async (req, res) => {
  try {
    await productionService.activateProductionOrder(req);

    res.json({
      message: "Orden de producción activada correctamente."
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: error.message,
      code: error.code
    });
  }
};

// =========================
// ▶️ INICIAR PRODUCCIÓN
// =========================
export const startProductionOrder = async (req, res) => {
  try {
    const productionOrder = await productionService.startProductionOrder(req);

    res.json({
      message: "Producción iniciada correctamente.",
      productionOrder
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: error.message,
      code: error.code
    });
  }
};

// =========================
// ▶️ INICIAR ITEM
// =========================
export const startProductionOrderItem = async (req, res) => {
  try {
    const item = await productionService.startProductionOrderItem(req);

    res.json({
      message: "Producción del producto iniciada correctamente.",
      item
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: error.message,
      code: error.code
    });
  }
};

// =========================
// 🏁 FINALIZAR ITEM
// =========================
export const finishProductionOrderItem = async (req, res) => {
  try {
    const item = await productionService.finishProductionOrderItem(req);

    res.json({
      message: "Producto terminado correctamente.",
      item
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: error.message,
      code: error.code
    });
  }
};
