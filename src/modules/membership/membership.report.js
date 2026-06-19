import PDFDocument from "pdfkit";
import path from "path";
import { truncateText } from "../../utils/pdf.util.js";

export const generateMembershipReport = (res, data, filters) => {
  const doc = new PDFDocument({ margin: 30, size: "A4" });

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", "inline; filename=membership-report.pdf");
  const logoFile = data[0]?.company?.logoUrl;

  if (logoFile) {
    const logoPath = path.join(process.cwd(), logoFile);

    try {
      doc.image(logoPath, 30, 20, { width: 100 });
    } catch (err) {}
  }

  // 🔹 POSICIONES
  const leftX = 30;
  const rightX = 330;

  const topY = 40;

  // 🔹 EMPRESA (IZQUIERDA)
  doc.fontSize(11).font("Helvetica");

  doc.text(`Empresa: ${data[0]?.company?.name || "N/A"}`, leftX, 80);

  doc.text(`Sucursal: ${data[0]?.branch?.name || "Todas"}`, leftX, 100);

  // 🔹 FECHA (DERECHA)
  doc.fontSize(10);

  doc.text(`Fecha generación: ${new Date().toLocaleString()}`, rightX, topY + 10);

  // 🔹 TÍTULO FILTROS
  doc.fontSize(13).font("Helvetica-Bold").text("FILTROS APLICADOS", rightX, 75);

  // 🔹 FILTROS
  doc.fontSize(10);

  // Cliente
  doc.font("Helvetica-Bold").text("Cliente:", rightX, 95);

  doc.font("Helvetica").text(filters.partner, rightX + 60, 95);

  // Plan
  doc.font("Helvetica-Bold").text("Plan:", rightX, 110);

  doc.font("Helvetica").text(filters.plan, rightX + 40, 110);

  // Vendedor
  doc.font("Helvetica-Bold").text("Vendedor:", rightX, 125);

  doc.font("Helvetica").text(filters.user, rightX + 75, 125);

  // Desde
  doc.font("Helvetica-Bold").text("Desde:", rightX, 140);

  doc.font("Helvetica").text(filters.from, rightX + 55, 140);

  // Hasta
  doc.font("Helvetica-Bold").text("Hasta:", rightX, 155);

  doc.font("Helvetica").text(filters.to, rightX + 45, 155);

  // Estado
  doc.font("Helvetica-Bold").text("Estado:", rightX, 170);

  doc.font("Helvetica").text(filters.status, rightX + 55, 170);

  // 🔹 LÍNEA DIVISORA
  doc.moveTo(30, 190).lineTo(570, 190).stroke();
  doc.pipe(res);
  // 🔹 CONTINUAR PDF
  doc.y = 210;
  // 🔥 TOTALES (AQUÍ VAN)
  const totalAmount = data.reduce((sum, item) => {
    return sum + Number(item.price || 0);
  }, 0);

  const totalCount = data.length;

  // 🧾 HEADER
  doc.x = 30;
  doc.y = 210;

  doc.fontSize(22).font("Helvetica-Bold");

  doc.text("REPORTE DE MEMBRESÍAS", 20, doc.y, {
    width: 540,
    align: "center"
  });

  // 📉 Línea
  doc.moveTo(30, doc.y).lineTo(570, doc.y).stroke();

  doc.moveDown();

  // 📊 Tabla
  const tableTop = doc.y;

  const columns = [
    { label: "Venta", x: 30 },
    { label: "Vendedor", x: 90 },
    { label: "Plan", x: 170 },
    { label: "Cliente", x: 260 },
    { label: "Inicio", x: 360 },
    { label: "Fin", x: 430 },
    { label: "Precio", x: 490 }
  ];

  columns.forEach((col) => {
    doc.fontSize(10).text(col.label, col.x, tableTop);
  });

  // 📄 Filas
  let y = tableTop + 20;

  data.forEach((item) => {
    doc.fontSize(9).font("Helvetica");
    // ✅ FECHA VENTA
    doc.text(formatDate(item.saleDate), 30, y);
    doc.text(truncateText(item.user?.fullName, 18), 90, y);
    doc.text(item.plan?.name || "-", 170, y);
    doc.text(truncateText(item.partner?.name, 22), 260, y);
    // ✅ FECHA INICIO
    doc.text(formatDate(item.startDate), 360, y);

    // ✅ FECHA FIN
    doc.text(formatDate(item.endDate), 430, y);

    doc.text(`Bs ${Number(item.price || 0).toFixed(2)}`, 490, y, {
      width: 70,
      lineBreak: false
    });

    y += 20;

    if (y > 750) {
      doc.addPage();
      y = 50;
    }
  });

  // 📌 Footer
  doc.moveDown(2);

  // 🏢 Info
  doc.fontSize(11).font("Helvetica-Bold");
  doc.text(`Total vendido: Bs ${totalAmount.toFixed(2)}`, 410);
  doc.text(`Total membresías: ${totalCount}`, 410);

  doc.moveDown();
  doc.fontSize(8).text("Reporte generado automáticamente por el sistema", { align: "left" });

  doc.end();
};

// ✅ SOLO FORMATEA FECHA (SIN LÓGICA EXTRA)
const formatDate = (date) => {
  return new Date(date).toLocaleDateString();
};
