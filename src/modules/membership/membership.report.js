import PDFDocument from 'pdfkit';
import path from 'path';

export const generateMembershipReport = (res, data) => {
  const doc = new PDFDocument({ margin: 30, size: 'A4' });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'inline; filename=membership-report.pdf');
const logoFile = data[0]?.company?.logoUrl;

if (logoFile) {
  const logoPath = path.join(process.cwd(), logoFile); // 🔥 FIX

  try {
    doc.image(logoPath, 30, 20, { width: 100 });
  } catch (err) {
    
  }
}
doc.fontSize(10).text(`Fecha generación: ${new Date().toLocaleString()}`, {
    align: 'right'
  });
 doc.moveDown();
  doc.moveDown();
  doc.pipe(res);

  // 🔥 TOTALES (AQUÍ VAN)
  const totalAmount = data.reduce((sum, item) => {
    return sum + Number(item.price || 0);
  }, 0);

  const totalCount = data.length;

  // 🧾 HEADER
  doc.fontSize(18).text('REPORTE DE MEMBRESÍAS', { align: 'center' });  

  doc.moveDown();

  // 📉 Línea
  doc.moveTo(30, doc.y)
     .lineTo(570, doc.y)
     .stroke();

  doc.moveDown();

  // 🏢 Info
  doc.fontSize(11).text(`Empresa: ${data[0]?.company?.name || 'N/A'}`);
  doc.text(`Sucursal: ${data[0]?.branch?.name || 'Todas'}`);
  doc.text(`Total membresías: ${totalCount}`);
  doc.text(`Total vendido: Bs ${totalAmount.toFixed(2)}`);

  doc.moveDown();

  // 📊 Tabla
  const tableTop = doc.y;

  const columns = [
    { label: 'Cliente', x: 30 },
    { label: 'Plan', x: 140 },
    { label: 'Vendedor', x: 250 },
    { label: 'Inicio', x: 360 },
    { label: 'Fin', x: 430 },
    { label: 'Precio', x: 500 }
  ];

  columns.forEach(col => {
    doc.fontSize(10).text(col.label, col.x, tableTop);
  });

  // 📄 Filas
  let y = tableTop + 20;

  data.forEach((item) => {
    doc.fontSize(9);

    doc.text(item.partner?.name || '-', 30, y);
    doc.text(item.plan?.name || '-', 140, y);
    doc.text(item.user?.fullName || '-', 250, y);
    doc.text(formatDate(item.startDate), 360, y);
    doc.text(formatDate(item.endDate), 430, y);
    doc.text(`Bs ${Number(item.price || 0).toFixed(2)}`, 500, y);

    y += 20;

    if (y > 750) {
      doc.addPage();
      y = 50;
    }
  });

  // 📌 Footer
  doc.moveDown(2);

  doc.fontSize(8).text(
    'Reporte generado automáticamente por el sistema',
    { align: 'center' }
  );

  doc.end();
};

// ✅ SOLO FORMATEA FECHA (SIN LÓGICA EXTRA)
const formatDate = (date) => {
  return new Date(date).toLocaleDateString();
};