import { PrismaClient } from "@prisma/client";
import { applyTenantFilter, applyBranchScope } from "../../utils/tenant.util.js";

const prisma = new PrismaClient();

// =========================
// ABRIR CAJA
// =========================
export const openCashRegister = async (req, res) => {
  const { openingAmount, notes } = req.body;

  try {
    // =========================
    // VALIDACIONES
    // =========================

    if (openingAmount === undefined || openingAmount === null || Number(openingAmount) < 0) {
      return res.status(400).json({
        message: "El monto inicial es obligatorio"
      });
    }

    // =========================
    // VALIDAR CAJA ABIERTA
    // =========================

    const existingCashRegister = await prisma.cashRegister.findFirst({
      where: {
        companyId: req.user.companyId,
        openedById: req.user.userId,
        status: "OPEN"
      }
    });

    if (existingCashRegister) {
      return res.status(400).json({
        message: "Ya tienes una caja abierta"
      });
    }

    // =========================
    // CREAR CAJA
    // =========================

    const cashRegister = await prisma.cashRegister.create({
      data: {
        companyId: req.user.companyId,
        branchId: req.user.branchId,

        openedById: req.user.userId,

        openedAt: new Date(),

        openingAmount,
        notes,

        status: "OPEN"
      },

      include: {
        branch: {
          select: {
            id: true,
            name: true
          }
        },

        openedBy: {
          select: {
            id: true,
            fullName: true,
            email: true
          }
        }
      }
    });

    return res.status(201).json({
      message: "Caja abierta correctamente",
      cashRegister
    });
  } catch (error) {
    console.error("Error abriendo caja:", error);

    return res.status(500).json({
      message: "Error interno del servidor"
    });
  }
};

// =========================
// CAJA ACTUAL
// =========================
export const getCurrentCashRegister = async (req, res) => {
  try {
    console.log("Obteniendo caja actual para usuario:", req.user.userId);
    const cashRegister = await prisma.cashRegister.findFirst({
      where: {
        ...applyTenantFilter(req),

        openedById: req.user.userId,

        status: "OPEN"
      },

      include: {
        branch: true,

        openedBy: {
          select: {
            id: true,
            fullName: true,
            email: true
          }
        },

        movements: {
          include: {
            payments: true
          },

          orderBy: {
            createdAt: "desc"
          }
        }
      }
    });

    if (!cashRegister) {
      return res.status(404).json({
        message: "No existe una caja abierta"
      });
    }

    return res.json(cashRegister);
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: error.message,
      code: error.code
    });
  }
};

// =========================
// LISTAR CAJAS
// =========================
export const getCashRegisters = async (req, res) => {
  try {
    const where = {
      ...applyBranchScope(req)
    };

    // =========================
    // 🏢 SUCURSAL (solo owner)
    // =========================

    if (req.user.isOwner && req.query.branchId) {
      where.branchId = req.query.branchId;
    }

    // =========================
    // 🟢 ESTADO
    // =========================

    if (req.query.status) {
      where.status = req.query.status;
    }

    // =========================
    // 📅 FECHAS
    // =========================

    if (req.query.from || req.query.to) {
      where.openedAt = {};

      if (req.query.from) {
        const start = new Date(req.query.from);

        start.setHours(0, 0, 0, 0);

        where.openedAt.gte = start;
      }

      if (req.query.to) {
        const end = new Date(req.query.to);

        end.setHours(23, 59, 59, 999);

        where.openedAt.lte = end;
      }
    }

    const cashRegisters = await prisma.cashRegister.findMany({
      where,

      include: {
        branch: true,

        openedBy: {
          select: {
            id: true,
            fullName: true,
            email: true
          }
        },

        closedBy: {
          select: {
            id: true,
            fullName: true,
            email: true
          }
        }
      },

      orderBy: {
        openedAt: "desc"
      }
    });

    return res.json(cashRegisters);
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: error.message,
      code: error.code
    });
  }
};

// =========================
// OBTENER CAJA
// =========================
export const getCashRegisterById = async (req, res) => {
  const { id } = req.params;

  try {
    const cashRegister = await prisma.cashRegister.findFirst({
      where: applyBranchScope(req, {
        id
      }),

      include: {
        branch: true,

        openedBy: {
          select: {
            id: true,
            fullName: true,
            email: true
          }
        },

        closedBy: {
          select: {
            id: true,
            fullName: true,
            email: true
          }
        },

        movements: {
          include: {
            createdBy: {
              select: {
                id: true,
                fullName: true,
                email: true
              }
            },

            cancelledBy: {
              select: {
                id: true,
                fullName: true
              }
            },

            payments: true
          },

          orderBy: {
            createdAt: "desc"
          }
        }
      }
    });

    if (!cashRegister) {
      return res.status(404).json({
        message: "Caja no encontrada"
      });
    }

    return res.json(cashRegister);
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: error.message,
      code: error.code
    });
  }
};

// =========================
// CERRAR CAJA
// =========================
export const closeCashRegister = async (req, res) => {
  const { id } = req.params;

  const { countedAmount, notes } = req.body;

  try {
    const cashRegister = await prisma.cashRegister.findFirst({
      where: {
        id,
        ...applyTenantFilter(req)
      }
    });

    if (!cashRegister) {
      return res.status(404).json({
        message: "Caja no encontrada"
      });
    }

    if (cashRegister.status !== "OPEN") {
      return res.status(400).json({
        message: "La caja ya está cerrada"
      });
    }

    if (cashRegister.openedById !== req.user.userId) {
      return res.status(403).json({
        message: "No puedes cerrar una caja abierta por otro usuario"
      });
    }

    // =========================
    // CALCULAR INGRESOS
    // =========================

    const incomes = await prisma.cashMovement.aggregate({
      where: {
        cashRegisterId: cashRegister.id,
        type: "INCOME",
        status: "ACTIVE"
      },

      _sum: {
        amount: true
      }
    });

    // =========================
    // CALCULAR EGRESOS
    // =========================

    const expenses = await prisma.cashMovement.aggregate({
      where: {
        cashRegisterId: cashRegister.id,
        type: "EXPENSE",
        status: "ACTIVE"
      },

      _sum: {
        amount: true
      }
    });

    const totalIncome = Number(incomes._sum.amount || 0);

    const totalExpense = Number(expenses._sum.amount || 0);

    const expectedAmount = Number(cashRegister.openingAmount) + totalIncome - totalExpense;

    const difference = Number(countedAmount) - expectedAmount;

    // =========================
    // CERRAR
    // =========================

    const updatedCashRegister = await prisma.cashRegister.update({
      where: {
        id: cashRegister.id
      },

      data: {
        expectedAmount,
        countedAmount,
        difference,

        closedAt: new Date(),

        closedById: req.user.userId,

        notes,

        status: "CLOSED"
      }
    });

    return res.json({
      message: "Caja cerrada correctamente",

      expectedAmount,
      countedAmount,
      difference,

      cashRegister: updatedCashRegister
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: error.message
    });
  }
};
// =========================
// 📊 RESUMEN CAJA ACTUAL
// =========================
export const getCurrentCashSummary = async (req, res) => {
  try {
    const cashRegister = await prisma.cashRegister.findFirst({
      where: {
        companyId: req.user.companyId,
        branchId: req.user.branchId,
        status: "OPEN"
      }
    });

    if (!cashRegister) {
      return res.status(404).json({
        message: "No existe una caja abierta"
      });
    }

    // =========================
    // INGRESOS
    // =========================

    const incomes = await prisma.cashMovement.aggregate({
      where: {
        companyId: req.user.companyId,
        branchId: req.user.branchId,

        cashRegisterId: cashRegister.id,

        type: "INCOME",

        status: "ACTIVE"
      },

      _sum: {
        amount: true
      }
    });

    // =========================
    // EGRESOS
    // =========================

    const expenses = await prisma.cashMovement.aggregate({
      where: {
        companyId: req.user.companyId,
        branchId: req.user.branchId,

        cashRegisterId: cashRegister.id,

        type: "EXPENSE",

        status: "ACTIVE"
      },

      _sum: {
        amount: true
      }
    });

    const income = Number(incomes._sum.amount || 0);

    const expense = Number(expenses._sum.amount || 0);

    const expectedAmount = Number(cashRegister.openingAmount) + income - expense;

    // =========================
    // PAGOS POR MÉTODO
    // =========================

    const payments = await prisma.payment.groupBy({
      by: ["method"],

      where: {
        companyId: req.user.companyId,
        branchId: req.user.branchId,

        cashMovement: {
          cashRegisterId: cashRegister.id,

          status: "ACTIVE"
        }
      },

      _sum: {
        amount: true
      }
    });

    const byMethod = {
      CASH: 0,
      QR: 0,
      CARD: 0,
      TRANSFER: 0,
      DEPOSIT: 0
    };

    payments.forEach((item) => {
      byMethod[item.method] = Number(item._sum.amount || 0);
    });

    return res.json({
      openingAmount: Number(cashRegister.openingAmount),

      income,

      expense,

      expectedAmount,

      byMethod
    });
  } catch (error) {
    console.error("Error obteniendo resumen de caja:", error);

    return res.status(500).json({
      message: error.message
    });
  }
};
