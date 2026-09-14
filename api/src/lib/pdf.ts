import PDFDocument = require('pdfkit');
import { Invoice } from '../models/invoice';

export class PdfService {
  static generateInvoicePdf(invoice: Invoice): Promise<Buffer> {
    return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    const doc = new PDFDocument({ margin: 50, size: 'LETTER' });

    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const primary = '#0e2949';
    const lightGray = '#f5f5f5';

    // Header block
    const headerW = doc.page.width - 100;
    const hasPhone = !!(invoice.buildingPhone);
    const hasEmail = !!(invoice.buildingEmail);
    const headerH = 68 + (hasPhone ? 12 : 0) + (hasEmail ? 12 : 0);
    doc.rect(50, 50, headerW, headerH).fill(primary);
    doc.fill('white').fontSize(16).font('Helvetica-Bold')
      .text(invoice.buildingName, 50, 65, { width: headerW, align: 'center' });
    doc.fontSize(9).font('Helvetica')
      .text(invoice.buildingAddress, 50, 85, { width: headerW, align: 'center' });
    let contactY = 97;
    if (hasPhone) {
      doc.text(`Tel: ${formatPhone(invoice.buildingPhone!)}`, 50, contactY, { width: headerW, align: 'center' });
      contactY += 12;
    }
    if (hasEmail) {
      doc.text(`Email: ${invoice.buildingEmail!}`, 50, contactY, { width: headerW, align: 'center' });
    }

    // Title
    const titleY = 50 + headerH + 18;
    doc.fill(primary).fontSize(13).font('Helvetica-Bold')
      .text('STATEMENT OF ACCOUNT', 50, titleY, { align: 'center', width: doc.page.width - 100 });
    doc.fontSize(11).font('Helvetica')
      .text(`For the Month of ${invoice.billingLabel}`, 50, titleY + 17, { align: 'center', width: doc.page.width - 100 });

    // Tenant info — left/right split
    const fullW = doc.page.width - 100;
    const lesseeY = titleY + 40;
    doc.fill('#333333').fontSize(10);
    doc.font('Helvetica-Bold').text('Lessee: ', 50, lesseeY, { continued: true })
      .font('Helvetica').text(invoice.lesseeName);
    doc.font('Helvetica').text(`Invoice #: ${invoice.invoiceNumber}`, 50, lesseeY, { width: fullW, align: 'right' });
    doc.font('Helvetica').text(`Door No.: ${invoice.floor} ${invoice.roomNumber}`, 50, lesseeY + 15);
    doc.text(`Lessee No.: ${invoice.tenantCode}`, 50, lesseeY + 15, { width: fullW, align: 'right' });

    // ---- Current Charges Table ----
    const tableTop = lesseeY + 40;
    const col1 = 50;
    const col2 = doc.page.width - 200;
    const col3 = doc.page.width - 100;

    doc.fill(primary).rect(col1, tableTop, doc.page.width - 100, 18).fill(primary);
    doc.fill('white').fontSize(10).font('Helvetica-Bold')
      .text('Current Charges', col1 + 5, tableTop + 4, { width: col2 - col1 - 5 })
      .text('Amount', col1, tableTop + 4, { width: col3 - col1 - 5, align: 'right' });

    const rows: { label: string; amount: number | string; bold?: boolean; currency?: boolean; spacerAfter?: boolean }[] = [];
    rows.push({ label: 'Rent', amount: invoice.rent });
    if (invoice.vat !== 0) rows.push({ label: 'VAT (12%)', amount: invoice.vat });
    if (invoice.withholdingTax !== 0) rows.push({ label: 'Less: Withholding Tax (5%)', amount: -invoice.withholdingTax });
    rows.push({ label: 'Subtotal', amount: invoice.subtotal, bold: true, spacerAfter: true });

    // Water
    if (invoice.water.mode === 'metered' && (invoice.water.presentReading || 0) > 0) {
      const cu = (invoice.water.presentReading || 0) - (invoice.water.previousReading || 0);
      rows.push({ label: `Water (${invoice.water.presentReading} - ${invoice.water.previousReading} = ${cu}m3 x P${invoice.water.rate})`, amount: invoice.water.amount });
    } else if (invoice.water.amount > 0) {
      rows.push({ label: 'Water (Fixed)', amount: invoice.water.amount });
    }

    // Electricity
    if (invoice.electricity.mode !== 'direct' && (invoice.electricity.presentReading > 0 || invoice.electricity.amount > 0)) {
      const kwh = invoice.electricity.presentReading - invoice.electricity.previousReading;
      rows.push({ label: `Electricity (${invoice.electricity.presentReading} - ${invoice.electricity.previousReading} = ${kwh}kWh x P${invoice.electricity.rate})`, amount: invoice.electricity.amount });
    }

    if (invoice.guard > 0) rows.push({ label: 'Guard', amount: invoice.guard });
    for (const oc of invoice.otherCharges) {
      if (oc.amount !== 0) rows.push({ label: oc.description, amount: oc.amount });
    }
    if (invoice.discount > 0) rows.push({ label: 'Discount', amount: -invoice.discount });
    rows.push({ label: 'Total Current Charges', amount: invoice.currentChargesTotal, bold: true });

    let y = tableTop + 18;
    rows.forEach((row, i) => {
      const bg = i % 2 === 0 ? '#ffffff' : lightGray;
      doc.rect(col1, y, doc.page.width - 100, 16).fill(bg);
      const rowFont = row.bold ? 'Helvetica-Bold' : 'Helvetica';
      const amtStr = typeof row.amount === 'number' ? formatAmount(row.amount) : row.amount;
      doc.fill('#333333').fontSize(9).font(rowFont)
        .text(row.label, col1 + 5, y + 3, { width: col2 - col1 - 10 })
        .text(amtStr, col1, y + 3, { width: col3 - col1 - 5, align: 'right' });
      y += 16;
      if (row.spacerAfter) y += 6;
    });

    // ---- Previous Balance ----
    if (invoice.previousBalanceHistory && invoice.previousBalanceHistory.length > 0) {
      y += 10;
      doc.fill(primary).rect(col1, y, doc.page.width - 100, 18).fill(primary);
      doc.fill('white').fontSize(10).font('Helvetica-Bold')
        .text('Previous Balance', col1 + 5, y + 4);
      y += 18;

      // Headers
      const pcols = [col1, col1 + 90, col1 + 190, col1 + 270, col1 + 340, col1 + 415];
      doc.rect(col1, y, doc.page.width - 100, 14).fill('#dde4ee');
      doc.fill(primary).fontSize(8).font('Helvetica-Bold')
        .text('Invoice #', pcols[0] + 3, y + 2)
        .text('Period', pcols[1], y + 2)
        .text('Due', pcols[2], y + 2, { align: 'right', width: 60 })
        .text('Paid', pcols[3], y + 2, { align: 'right', width: 60 })
        .text('Outstanding', pcols[4], y + 2, { align: 'right', width: 65 })
        .text('Penalty', pcols[5], y + 2, { align: 'right', width: 55 });
      y += 14;

      invoice.previousBalanceHistory.forEach((entry, i) => {
        const bg = i % 2 === 0 ? '#ffffff' : lightGray;
        doc.rect(col1, y, doc.page.width - 100, 14).fill(bg);
        doc.fill('#333333').fontSize(8).font('Helvetica')
          .text(entry.invoiceNumber, pcols[0] + 3, y + 2, { width: 85 })
          .text(entry.billingLabel, pcols[1], y + 2, { width: 95 })
          .text(formatAmount(entry.amountDue), pcols[2], y + 2, { align: 'right', width: 60 })
          .text(formatAmount(entry.amountPaid), pcols[3], y + 2, { align: 'right', width: 60 })
          .text(formatAmount(entry.outstanding), pcols[4], y + 2, { align: 'right', width: 65 })
          .text(formatAmount(entry.penalty), pcols[5], y + 2, { align: 'right', width: 55 });
        y += 14;
      });
    }

    // ---- Totals ----
    y += 10;
    const totalRows: { label: string; amount: number; bold?: boolean; currency?: boolean }[] = [
      { label: 'Previous Balance', amount: invoice.previousBalance },
      { label: 'TOTAL DUE', amount: invoice.totalDue, bold: true, currency: true },
    ];
    if (invoice.amountPaid > 0) {
      totalRows.push({ label: 'Amount Paid', amount: invoice.amountPaid });
      totalRows.push({ label: 'Balance Outstanding', amount: invoice.outstanding, bold: true, currency: true });
    }

    totalRows.forEach((row) => {
      doc.rect(col1, y, doc.page.width - 100, 18).fill(row.bold ? '#dde4ee' : '#f9f9f9');
      const totalFont = row.bold ? 'Helvetica-Bold' : 'Helvetica';
      const totalAmtStr = row.currency ? formatCurrency(row.amount) : formatAmount(row.amount);
      doc.fill(primary).fontSize(10).font(totalFont)
        .text(row.label, col1 + 5, y + 4, { width: col2 - col1 - 10 })
        .text(totalAmtStr, col1, y + 4, { width: col3 - col1 - 5, align: 'right' });
      y += 18;
    });

    // Footer
    y += 20;
    doc.fill('#666666').fontSize(8).font('Helvetica')
      .text('Thank you for your payment. Please contact us if you have any questions.', col1, y, {
        align: 'center', width: doc.page.width - 100
      });

    doc.end();
    }); // end Promise
  }
}

function formatAmount(amount: number): string {
  return (amount || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatCurrency(amount: number): string {
  return 'PHP ' + formatAmount(amount);
}

function formatPhone(phone: string): string {
  const d = phone.replace(/\D/g, '');
  if (d.length === 7) return `${d.slice(0, 3)}-${d.slice(3)}`;
  if (d.length === 8) return `${d.slice(0, 4)}-${d.slice(4)}`;
  if (d.length === 10 && d.startsWith('02')) return `${d.slice(0, 2)}-${d.slice(2, 6)}-${d.slice(6)}`;
  if (d.length === 10) return `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}`;
  if (d.length === 11 && d.startsWith('0')) return `${d.slice(0, 4)}-${d.slice(4, 7)}-${d.slice(7)}`;
  if (d.length === 12 && d.startsWith('63')) return `+63 ${d.slice(2, 4)}-${d.slice(4, 8)}-${d.slice(8)}`;
  return phone;
}
