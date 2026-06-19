import * as membershipService from "./membership.service.js";
import { generateMembershipReport } from "./membership.report.js";
// =========================
// 💰 PURCHASE
// =========================
export const purchaseMembership = async (req, res) => {
  try {
    const result = await membershipService.purchase({
      ...req.body,
      companyId: req.user.companyId,
      branchId: req.user.branchId,
      userId: req.user.userId, // ✅ EXISTE AQUÍ
      payments: req.body.payments
    });

    res.status(201).json({
      message: "Membresía procesada correctamente",
      data: result
    });
  } catch (error) {
    res.status(400).json({
      message: error.message || "Error procesando membresía"
    });
  }
};

// =========================
// 📋 HISTORIAL
// =========================
export const getMemberships = async (req, res) => {
  try {
    const result = await membershipService.getAll(req);
    res.json(result);
  } catch (error) {
    res.status(500).json({
      message: error.message || "Error obteniendo membresías"
    });
  }
};

// =========================
// 🔍 DETALLE
// =========================
export const getMembershipById = async (req, res) => {
  try {
    const result = await membershipService.getById(req.params.id, req);
    res.json(result);
  } catch (error) {
    res.status(404).json({ message: error.message });
  }
};

// =========================
// 🔐 ESTADO ACTUAL
// =========================
export const getMembershipStatus = async (req, res) => {
  try {
    const result = await membershipService.getStatus(req.params.customerId, req.user.companyId);

    res.json(result);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const getAllStatus = async (req, res) => {
  try {
    const result = await membershipService.getAllStatus(req.user.companyId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: "Error obteniendo estado de membresías" });
  }
};
// =========================
// 🔄 REINTENTAR PAGO
// =========================
export const retryMembershipSale = async (req, res) => {
  const { id } = req.params;

  try {
    await membershipService.retryMembershipSale({
      membershipSaleId: id,
      companyId: req.user.companyId, // 🔥 importante multi-tenant
      branchId: req.user.branchId
    });

    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({
      error: "Error retrying membership sale commands"
    });
  }
};

//=========================
// 🧾 REPORTE PDF
//=========================
export const getMembershipReportPDF = async (req, res) => {
  try {
    const data = await membershipService.getAll(req); // 🔥 reutilizas filtros
    const uniquePartners = [...new Set(data.map((item) => item.partner?.name))];

    const partnerName = uniquePartners.length === 1 ? uniquePartners[0] : "TODOS";
    const filters = {
      partner: partnerName,
      plan: req.query.plan ? data[0]?.plan?.name || "TODOS" : "TODOS",

      user: req.query.user ? data[0]?.user?.fullName || "TODOS" : "TODOS",

      from: req.query.from || "TODOS",

      to: req.query.to || "TODOS",

      status: req.query.status || "TODOS"
    };
    return generateMembershipReport(res, data, filters);
  } catch (error) {
    res.status(500).json({ message: "Error generating PDF" });
  }
};
//=========================
// SYNC CUSTOMER MEMBERSHIP STATUS
//=========================
export const syncMembershipStatus = async (req, res) => {
  try {
    const { id } = req.params;
    await membershipService.syncMembershipStatus({
      customerId: id,
      companyId: req.user.companyId,
      branchId: req.user.branchId
    });
    res.json({ success: true });
  } catch (error) {
    console.error(error); // 🔥 IMPORTANTE
    res.status(500).json({ message: error.message });
  }
};

//=========================
// ASIGNAR CUSTOMER MEMBERSHIP STATUS
//=========================
export const assignMembership = async (req, res) => {
  try {
    const { customerId, startDate, endDate } = req.body;

    const result = await membershipService.assignMembership({
      customerId,
      companyId: req.user.companyId,
      branchId: req.user.branchId,
      startDate,
      endDate
    });

    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};
//=========================
// ANULAR MEMBERSHIP (SOFT DELETE)
//=========================
export const annulMembershipSale = async (req, res) => {
  try {
    const saleId = req.params.id;

    const result = await membershipService.annulMembershipSale({
      saleId,
      userId: req.user.id,
      companyId: req.user.companyId,
      branchId: req.user.branchId
    });

    res.json(result);
  } catch (error) {
    res.status(400).json({
      message: error.message
    });
  }
};
