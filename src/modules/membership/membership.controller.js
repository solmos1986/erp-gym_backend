import * as membershipService from "./membership.service.js";
import { generateMembershipReport } from './membership.report.js';
// =========================
// 💰 PURCHASE
// =========================
export const purchaseMembership = async (req, res) => {
    
  try {
    const result = await membershipService.purchase({
      ...req.body,
      companyId: req.user.companyId,
      branchId: req.user.branchId,
      userId: req.user.userId  // ✅ EXISTE AQUÍ
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
      message: "Error obteniendo membresías"
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
    const result = await membershipService.getStatus(
      req.params.customerId,
      req.user.companyId
    );

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
    });

    return res.json({ success: true });
  } catch (error) {
    

    return res.status(500).json({
      error: 'Error retrying membership sale commands',
    });
  }
};

//=========================
// 🧾 REPORTE PDF
//=========================
export const getMembershipReportPDF = async (req, res) => {
  try {
    const data = await membershipService.getAll(req); // 🔥 reutilizas filtros

    return generateMembershipReport(res, data);

  } catch (error) {
    
    res.status(500).json({ message: 'Error generating PDF' });
  }
};