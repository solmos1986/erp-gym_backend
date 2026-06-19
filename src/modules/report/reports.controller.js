import { getSalesReportService } from "./reports.service.js";
import { generateSalesReport } from "./sales.report.js";
import ExcelJS from "exceljs";
import PDFDocument from "pdfkit";
import path from "path";
//=================
// FILTROS VENTAS
//=================

export const getSalesReport = async (req, res, next) => {
  try {
    const data = await getSalesReportService({
      companyId: req.user.companyId,

      // 🔥 usuario logueado
      userBranchId: req.user.branchId,
      isOwner: req.user.isOwner,

      // 🔥 filtros opcionales
      branchId: req.query.branchId,
      customerId: req.query.customerId,
      sellerId: req.query.sellerId,
      status: req.query.status,
      from: req.query.from,
      to: req.query.to
    });

    res.json(data);
  } catch (error) {
    next(error);
  }
};

// =========================
// 📗 EXPORTAR EXCEL
// =========================
export const exportSalesExcel = async (req, res, next) => {
  try {
    const sales = await getSalesReportService({
      companyId: req.user.companyId,

      userBranchId: req.user.branchId,
      isOwner: req.user.isOwner,

      branchId: req.query.branchId,
      customerId: req.query.customerId,
      sellerId: req.query.sellerId,
      status: req.query.status,
      from: req.query.from,
      to: req.query.to
    });

    const workbook = new ExcelJS.Workbook();

    workbook.creator = "ERP Gym";
    workbook.created = new Date();

    const worksheet = workbook.addWorksheet("Ventas");

    // =========================
    // COLUMNAS
    // =========================

    worksheet.columns = [
      {
        header: "Fecha",
        key: "date",
        width: 18
      },
      {
        header: "Nro Venta",
        key: "saleNumber",
        width: 15
      },
      {
        header: "Tipo",
        key: "type",
        width: 18
      },
      {
        header: "Cliente",
        key: "customer",
        width: 35
      },
      {
        header: "Vendedor",
        key: "seller",
        width: 30
      },
      {
        header: "Sucursal",
        key: "branch",
        width: 25
      },
      {
        header: "Total",
        key: "total",
        width: 15
      },
      {
        header: "Estado",
        key: "status",
        width: 15
      }
    ];

    // =========================
    // CABECERA
    // =========================

    const headerRow = worksheet.getRow(1);

    headerRow.font = {
      bold: true,
      color: {
        argb: "FFFFFF"
      }
    };

    headerRow.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: {
        argb: "1F4E78"
      }
    };

    // =========================
    // CONGELAR CABECERA
    // =========================

    worksheet.views = [
      {
        state: "frozen",
        ySplit: 1
      }
    ];

    // =========================
    // AUTOFILTRO
    // =========================

    worksheet.autoFilter = {
      from: "A1",
      to: "G1"
    };

    // =========================
    // DATOS
    // =========================

    let grandTotal = 0;

    sales.forEach((sale) => {
      grandTotal += Number(sale.total);

      worksheet.addRow({
        date: new Date(sale.date).toLocaleDateString("es-BO"),

        saleNumber: sale.saleNumber,

        customer: sale.customer,

        seller: sale.seller,

        branch: sale.branch,

        total: Number(sale.total),

        status: sale.status === "CONFIRMED" ? "CONFIRMADA" : sale.status === "CANCELLED" ? "ANULADA" : sale.status
      });
    });

    // =========================
    // FORMATO MONEDA
    // =========================

    worksheet.getColumn("total").numFmt = "#,##0.00";

    // =========================
    // TOTAL GENERAL
    // =========================

    worksheet.addRow([]);

    worksheet.addRow({
      customer: "TOTAL GENERAL",
      total: grandTotal
    });

    const totalRow = worksheet.lastRow;

    totalRow.font = {
      bold: true
    };

    totalRow.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: {
        argb: "D9EAD3"
      }
    };

    // =========================
    // DESCARGA
    // =========================

    const today = new Date().toISOString().split("T")[0];

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");

    res.setHeader("Content-Disposition", `attachment; filename=ReporteVentas-${today}.xlsx`);

    await workbook.xlsx.write(res);

    res.end();
  } catch (error) {
    next(error);
  }
};

// =========================
// 📄 EXPORTAR PDF
// =========================
export const exportSalesPDF = async (req, res, next) => {
  try {
    const sales = await getSalesReportService({
      companyId: req.user.companyId,
      userBranchId: req.user.branchId,
      isOwner: req.user.isOwner,
      branchId: req.query.branchId,
      customerId: req.query.customerId,
      sellerId: req.query.sellerId,
      status: req.query.status,
      from: req.query.from,
      to: req.query.to
    });

    const filters = {
      customer: req.query.customerName || "TODOS",
      seller: req.query.sellerName || "TODOS",
      branch: req.query.branchName || "TODAS",
      status: req.query.status || "TODOS",
      from: req.query.from || "TODOS",
      to: req.query.to || "TODOS"
    };

    return generateSalesReport(res, sales, filters);
  } catch (error) {
    next(error);
  }
};
