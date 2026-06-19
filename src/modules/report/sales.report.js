import PDFDocument from "pdfkit";
import path from "path";
import { truncateText } from "../../utils/pdf.util.js";

export const generateSalesReport = (res, data, filters) => {
  const doc = new PDFDocument({
    margin: 30,
    size: "A4"
  });

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", "inline; filename=sales-report.pdf");

  const logoFile = data[0]?.company?.logoUrl;

  if (logoFile) {
    const logoPath = path.join(process.cwd(), logoFile);

    try {
      doc.image(logoPath, 30, 20, {
        width: 100
      });
    } catch (err) {}
  }

  // =========================
  // POSICIONES
  // =========================

  const leftX = 30;
  const rightX = 330;
  const topY = 40;

  // =========================
  // EMPRESA
  // =========================

  doc.fontSize(11).font("Helvetica");

  doc.text(`Empresa: ${data[0]?.company?.name || "N/A"}`, leftX, 80);

  doc.text(`Sucursal: ${filters.branch || "Todas"}`, leftX, 100);

  // =========================
  // FECHA
  // =========================

  doc.fontSize(10);

  doc.text(`Fecha generación: ${new Date().toLocaleString()}`, rightX, topY + 10);

  // =========================
  // FILTROS
  // =========================

  doc.fontSize(13).font("Helvetica-Bold").text("FILTROS APLICADOS", rightX, 75);

  doc.fontSize(10);

  doc.font("Helvetica-Bold").text("Cliente:", rightX, 95);

  doc.font("Helvetica").text(filters.customer || "TODOS", rightX + 60, 95);

  doc.font("Helvetica-Bold").text("Vendedor:", rightX, 110);

  doc.font("Helvetica").text(filters.seller || "TODOS", rightX + 75, 110);

  doc.font("Helvetica-Bold").text("Estado:", rightX, 125);

  doc.font("Helvetica").text(filters.status || "TODOS", rightX + 55, 125);

  doc.font("Helvetica-Bold").text("Desde:", rightX, 140);

  doc.font("Helvetica").text(filters.from || "TODOS", rightX + 55, 140);

  doc.font("Helvetica-Bold").text("Hasta:", rightX, 155);

  doc.font("Helvetica").text(filters.to || "TODOS", rightX + 45, 155);

  // =========================
  // DIVISOR
  // =========================

  doc.moveTo(30, 190).lineTo(570, 190).stroke();

  doc.pipe(res);

  // =========================
  // TOTALES
  // =========================

  const totalAmount = data.reduce((sum, item) => sum + Number(item.total || 0), 0);

  const totalCount = data.length;

  // =========================
  // TITULO
  // =========================

  doc.y = 210;

  doc.fontSize(22).font("Helvetica-Bold");

  doc.text("REPORTE DE VENTAS", 20, doc.y, {
    width: 540,
    align: "center"
  });

  doc.moveTo(30, doc.y).lineTo(570, doc.y).stroke();

  doc.moveDown();

  // =========================
  // TABLA
  // =========================

  const tableTop = doc.y;

  const columns = [
    { label: "Fecha", x: 30 },
    { label: "Tipo", x: 80 },
    { label: "Cliente", x: 150 },
    { label: "Sucursal", x: 260 },
    { label: "Vendedor", x: 350 },
    { label: "Total", x: 470 },
    { label: "Estado", x: 525 }
  ];

  columns.forEach((col) => {
    doc.fontSize(10).font("Helvetica-Bold").text(col.label, col.x, tableTop);
  });

  doc
    .moveTo(30, tableTop + 15)
    .lineTo(570, tableTop + 15)
    .stroke();

  // =========================
  // FILAS
  // =========================

  let y = tableTop + 25;

  data.forEach((item) => {
    doc.fontSize(9).font("Helvetica");

    doc.text(formatDate(item.date), 30, y, {
      width: 45
    });

    doc.text(truncateText(item.type, 12), 80, y, {
      width: 65
    });

    doc.text(truncateText(item.customer, 20), 150, y, {
      width: 100
    });

    doc.text(truncateText(item.branch?.name, 15), 260, y, {
      width: 80
    });

    doc.text(truncateText(item.seller, 18), 350, y, {
      width: 110
    });

    doc.text(`Bs ${Number(item.total).toFixed(0)}`, 470, y, {
      width: 50
    });

    doc.text(item.status === "CONFIRMADA" ? "OK" : "ANULADA", 525, y, {
      width: 45
    });
    y += 20;

    if (y > 750) {
      doc.addPage();

      y = 50;

      columns.forEach((col) => {
        doc.fontSize(10).font("Helvetica-Bold").text(col.label, col.x, y);
      });

      doc
        .moveTo(30, y + 15)
        .lineTo(570, y + 15)
        .stroke();

      y += 25;
    }
  });

  // =========================
  // FOOTER
  // =========================

  doc.moveDown(2);

  doc.fontSize(11).font("Helvetica-Bold");

  doc.text(
    `Total vendido: Bs ${totalAmount.toLocaleString("es-BO", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`,
    380
  );

  doc.text(`Total ventas: ${totalCount}`, 380);

  doc.moveDown();

  doc.fontSize(8).font("Helvetica").text("Reporte generado automáticamente por el sistema", {
    align: "left"
  });

  doc.end();
};

const formatDate = (date) => {
  return new Date(date).toLocaleDateString();
};
