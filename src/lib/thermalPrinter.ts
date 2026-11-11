import { jsPDF } from 'jspdf';
import { CartItem } from '../types';
import { StoreSettings } from '../stores/settingsStore';

export interface ThermalReceiptData {
  orderNumber: string;
  customerName: string;
  customerPhone?: string;
  customerAddress?: string;
  deliveryMethodName: string;
  items: CartItem[];
  subtotal: number;
  totalWeightKg: number;
  verificationCode: string;
  storeSettings: StoreSettings;
  cashierName?: string;
  date?: string;
  cashReceived?: number;
  cashChange?: number;
}

export function generateThermalReceiptPDF(data: ThermalReceiptData) {
  // Calculate dynamic height based on number of items
  // Base header (45mm) + items (8mm each) + totals & verification (35mm) + footer (20mm)
  const itemHeight = data.items.length * 8.5;
  const extraHeight = data.cashReceived ? 10 : 0;
  const calculatedHeight = Math.max(130, 85 + itemHeight + extraHeight);

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [58, calculatedHeight]
  });

  const darkInk = [20, 20, 20];
  doc.setTextColor(darkInk[0], darkInk[1], darkInk[2]);

  let y = 7;

  // 1. Store Header
  doc.setFont('courier', 'bold');
  doc.setFontSize(11);
  doc.text(data.storeSettings.storeName.toUpperCase(), 29, y, { align: 'center' });
  y += 4;

  doc.setFont('courier', 'normal');
  doc.setFontSize(7.5);
  doc.text(data.storeSettings.tagline, 29, y, { align: 'center' });
  y += 3.5;

  const splitAddr = doc.splitTextToSize(data.storeSettings.address, 50);
  doc.text(splitAddr, 29, y, { align: 'center' });
  y += splitAddr.length * 3 + 1;

  doc.text(`WA: ${data.storeSettings.phoneDisplay}`, 29, y, { align: 'center' });
  y += 3.5;

  // Divider
  doc.text('================================', 29, y, { align: 'center' });
  y += 4;

  // 2. Order Metadata
  doc.setFontSize(7);
  doc.text(`No. Struk : ${data.orderNumber}`, 4, y);
  y += 3.2;

  const now = data.date || new Date().toLocaleString('id-ID', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
  doc.text(`Tanggal   : ${now}`, 4, y);
  y += 3.2;

  doc.text(`Kasir     : ${data.cashierName || 'Kasir Toko'}`, 4, y);
  y += 3.2;

  doc.text(`Pelanggan : ${data.customerName.substring(0, 22)}`, 4, y);
  y += 3.2;

  doc.text(`Kirim     : ${data.deliveryMethodName}`, 4, y);
  y += 3.5;

  // Divider
  doc.text('--------------------------------', 29, y, { align: 'center' });
  y += 4;

  // 3. Items List
  data.items.forEach((item) => {
    // Product Title
    doc.setFont('courier', 'bold');
    doc.setFontSize(7.5);
    const prodName = `${item.product_name} (${item.variant_name})`;
    const splitName = doc.splitTextToSize(prodName, 50);
    doc.text(splitName, 4, y);
    y += splitName.length * 3;

    // Unit qty x price = total
    doc.setFont('courier', 'normal');
    doc.setFontSize(7);
    const lineQty = `${item.qty} ${item.unit_code} x ${item.price.toLocaleString('id-ID')}`;
    const lineTotal = (item.qty * item.price).toLocaleString('id-ID');

    doc.text(lineQty, 6, y);
    doc.text(lineTotal, 54, y, { align: 'right' });
    y += 4;
  });

  // Divider
  doc.text('--------------------------------', 29, y, { align: 'center' });
  y += 4;

  // 4. Totals
  doc.setFont('courier', 'normal');
  doc.setFontSize(7.5);
  doc.text(`Total Barang : ${data.items.reduce((acc, i) => acc + i.qty, 0)} item`, 4, y);
  y += 3.5;
  doc.text(`Estimasi Berat: ± ${data.totalWeightKg} Kg`, 4, y);
  y += 4;

  // Total Big
  doc.setFont('courier', 'bold');
  doc.setFontSize(9);
  doc.text('TOTAL :', 4, y);
  doc.text(`Rp ${data.subtotal.toLocaleString('id-ID')}`, 54, y, { align: 'right' });
  y += 4.5;

  if (data.cashReceived !== undefined && data.cashReceived > 0) {
    doc.setFont('courier', 'normal');
    doc.setFontSize(7.5);
    doc.text('Tunai :', 4, y);
    doc.text(`Rp ${data.cashReceived.toLocaleString('id-ID')}`, 54, y, { align: 'right' });
    y += 3.5;

    doc.setFont('courier', 'bold');
    doc.text('Kembali :', 4, y);
    doc.text(`Rp ${(data.cashChange || 0).toLocaleString('id-ID')}`, 54, y, { align: 'right' });
    y += 4;
  }

  // Divider
  doc.setFont('courier', 'normal');
  doc.setFontSize(7);
  doc.text('================================', 29, y, { align: 'center' });
  y += 3.5;

  // Integrity Checksum
  doc.setFontSize(6.5);
  doc.text(`KODE VERIFIKASI: [VERIF: ${data.verificationCode}]`, 29, y, { align: 'center' });
  y += 4.5;

  // Footer Note
  doc.setFont('courier', 'bold');
  doc.setFontSize(7.5);
  doc.text('TERIMA KASIH ATAS KUNJUNGANNYA!', 29, y, { align: 'center' });
  y += 3.5;

  doc.setFont('courier', 'normal');
  doc.setFontSize(6.5);
  const splitFooter = doc.splitTextToSize(data.storeSettings.thermalFooterNote, 48);
  doc.text(splitFooter, 29, y, { align: 'center' });

  // Save PDF
  doc.save(`Struk-Thermal-${data.orderNumber}.pdf`);
}
