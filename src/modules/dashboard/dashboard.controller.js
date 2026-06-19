import * as dashboardService from "./dashboard.service.js";

//////////////////////////////////////
// 📋 SUMMARY
//////////////////////////////////////
export const getDashboardSummary = async (req, res) => {
  try {
    const data = await dashboardService.getDashboardSummary({
      companyId: req.user.companyId,
      branchId: req.user.branchId
    });

    res.json(data);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Error obteniendo dashboard"
    });
  }
};

//////////////////////////////////////
// 📈 SALES LAST 7 DAYS
//////////////////////////////////////
export const getSalesLast7Days = async (req, res) => {
  try {
    const data = await dashboardService.getSalesLast7Days({
      companyId: req.user.companyId,
      branchId: req.user.branchId
    });

    res.json(data);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Error obteniendo gráfico"
    });
  }
};
//////////////////////////////////////
// 💰 REVENUE COMPARISON
//////////////////////////////////////
export const getRevenueComparison = async (req, res) => {
  try {
    const data = await dashboardService.getRevenueComparison({
      companyId: req.user.companyId,

      branchId: req.user.branchId
    });

    res.json(data);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Error revenue comparison"
    });
  }
};

//////////////////////////////////////
// 📅 REGISTRATIONS
//////////////////////////////////////
export const getRegistrationsComparison = async (req, res) => {
  try {
    const data = await dashboardService.getRegistrationsComparison({
      companyId: req.user.companyId,

      branchId: req.user.branchId
    });

    res.json(data);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Error registrations"
    });
  }
};

//////////////////////////////////////
// 🍩 PLAN DISTRIBUTION
//////////////////////////////////////
export const getPlanDistribution = async (req, res) => {
  try {
    const data = await dashboardService.getPlanDistribution({
      companyId: req.user.companyId,

      branchId: req.user.branchId
    });

    res.json(data);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Error plan distribution"
    });
  }
};
