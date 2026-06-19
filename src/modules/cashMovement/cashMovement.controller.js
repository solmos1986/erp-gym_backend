import { PrismaClient } from "@prisma/client";
import { applyTenantFilter } from "../../utils/tenant.util.js";

const prisma = new PrismaClient();

// =========================
// ➕ CREAR MOVIMIENTO
// =========================

export const createCashMovement = async (req, res) => {
  const { type, amount, description, referenceType = "MANUAL", referenceId = null, payments = [] } = req.body;

  try {
    // =========================
    // VALIDACIONES
    // =========================

    if (!type) {
      return res.status(400).json({
        message: "El tipo es obligatorio"
      });
    }

    if (!amount || Number(amount) <= 0) {
      return res.status(400).json({
        message: "El monto debe ser mayor a cero"
      });
    }

    if (!Array.isArray(payments) || payments.length === 0) {
      return res.status(400).json({
        message: "Debe registrar al menos un método de pago"
      });
    }

    // =========================
    // VALIDAR SUMA PAGOS
    // =========================

    const paymentsTotal = payments.reduce((sum, payment) => sum + Number(payment.amount), 0);

    if (paymentsTotal !== Number(amount)) {
      return res.status(400).json({
        message: "La suma de los pagos no coincide con el monto total"
      });
    }

    // =========================
    // OBTENER CAJA ABIERTA
    // =========================

    const cashRegister = await prisma.cashRegister.findFirst({
      where: {
        companyId: req.user.companyId,
        openedById: req.user.userId,
        status: "OPEN"
      }
    });

    if (!cashRegister) {
      return res.status(400).json({
        message: "No tienes una caja abierta"
      });
    }
    if (cashRegister.status !== "OPEN") {
      return res.status(400).json({
        message: "La caja está cerrada"
      });
    }

    // =========================
    // TRANSACCIÓN
    // =========================

    const result = await prisma.$transaction(async (tx) => {
      const cashMovement = await tx.cashMovement.create({
        data: {
          companyId: req.user.companyId,
          branchId: req.user.branchId,

          cashRegisterId: cashRegister.id,

          type,
          amount,

          description,

          referenceType,
          referenceId,

          createdById: req.user.userId
        }
      });

      await tx.payment.createMany({
        data: payments.map((payment) => ({
          companyId: req.user.companyId,
          branchId: req.user.branchId,

          cashMovementId: cashMovement.id,

          method: payment.method,
          amount: payment.amount,

          reference: payment.reference || null
        }))
      });

      return cashMovement;
    });

    return res.status(201).json({
      message: "Movimiento creado correctamente",
      cashMovement: result
    });
  } catch (error) {
    console.error("Error creando movimiento:", error);

    return res.status(500).json({
      message: error.message
    });
  }
};

// =========================
// 📋 LISTAR MOVIMIENTOS
// =========================

export const getCashMovements = async (req, res) => {
  console.log("llegue cashMovement.controller.js");
  try {
    const movements = await prisma.cashMovement.findMany({
      where: {
        ...applyTenantFilter(req)
      },

      include: {
        payments: true,

        createdBy: {
          select: {
            id: true,
            fullName: true
          }
        }
      },

      orderBy: {
        createdAt: "desc"
      }
    });

    return res.json(movements);
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: error.message
    });
  }
};

// =========================
// listar movimientos por id
// =========================

export const getCashMovementById = async (req, res) => {
  const { id } = req.params;

  try {
    const movement = await prisma.cashMovement.findFirst({
      where: {
        id,
        ...applyTenantFilter(req)
      },

      include: {
        payments: true,

        createdBy: {
          select: {
            id: true,
            fullName: true,
            email: true
          }
        },

        cashRegister: {
          select: {
            id: true,
            openedAt: true,
            status: true
          }
        }
      }
    });

    if (!movement) {
      return res.status(404).json({
        message: "Movimiento no encontrado"
      });
    }

    return res.json(movement);
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: error.message
    });
  }
};

// =========================
// ❌ ANULAR MOVIMIENTO
// =========================
export const cancelCashMovement = async (req, res) => {
  const { id } = req.params;

  try {
    const movement = await prisma.cashMovement.findFirst({
      where: {
        id,
        ...applyTenantFilter(req)
      },

      include: {
        cashRegister: true
      }
    });
    console.log("Movimiento encontrado:", movement.cashRegister.id);
    if (!movement) {
      return res.status(404).json({
        message: "Movimiento no encontrado"
      });
    }

    if (movement.status === "CANCELLED") {
      return res.status(400).json({
        message: "El movimiento ya fue anulado"
      });
    }

    // =========================
    // NO PERMITIR ANULAR
    // SI LA CAJA ESTÁ CERRADA
    // =========================

    // if (movement.cashRegister.status !== "OPEN") {
    //   return res.status(400).json({
    //     message: "No se pueden anular movimientos de una caja cerrada"
    //   });
    // }

    const updatedMovement = await prisma.cashMovement.update({
      where: {
        id: movement.id
      },

      data: {
        status: "CANCELLED",

        cancelledAt: new Date(),

        cancelledById: req.user.userId
      }
    });

    return res.json({
      message: "Movimiento anulado correctamente",
      movement: updatedMovement
    });
  } catch (error) {
    console.error("Error anulando movimiento:", error);

    return res.status(500).json({
      message: error.message,
      code: error.code
    });
  }
};
