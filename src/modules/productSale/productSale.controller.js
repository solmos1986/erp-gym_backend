import * as productSaleService from "./productSale.service.js";

// =========================
// 🛒 VENDER PRODUCTOS
// =========================
export const createProductSale = async (req, res, next) => {
  try {
    //console.log("BODY:", req.body);
    //console.log("USER:", req.user);
    const result = await productSaleService.sale({
      partnerId: req.body.partnerId,
      branchId: req.user.branchId,
      items: req.body.items,

      companyId: req.user.companyId,
      userId: req.user.userId,
      payments: req.body.payments
    });

    return res.status(201).json(result);
  } catch (error) {
    next(error);
  }
};

// =========================
// 🛒 ANULLAR VENTA DE PRODUCTOS
// =========================
export const annulProductSale = async (req, res, next) => {
  try {
    const result = await productSaleService.annulProductSale({
      saleId: req.params.id,
      companyId: req.user.companyId,
      branchId: req.user.branchId,
      userId: req.user.id,
      isOwner: req.user.role === "OWNER"
    });

    res.json(result);
  } catch (error) {
    next(error);
  }
};
