import { jsPDF } from 'jspdf';
import { CartItem } from '../types';
import { useSettingsStore } from '../stores/settingsStore';

export interface InvoiceData {
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  deliveryMethod: string;
  deliveryAddress: string;
  items: CartItem[];
  subtotal: number;
  totalWeightKg: number;
  verificationCode: string;
}

export function generateInvoicePDF(data: InvoiceData) {
  const settings = useSettingsStore.getState();
  const storeName = settings.storeName.toUpperCase();
  const tagline = settings.tagline;
  const phone = settings.phoneDisplay;
  const address = settings.address;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const primaryColor = [2, 132, 199]; // #0284C7
  const darkInk = [15, 23, 42]; // #0F172A

  // 1. Header Banner
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.rect(0, 0, 210, 28, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.text(storeName, 15, 12);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(tagline, 15, 18);
  doc.text(`WA: ${phone} | ${address}`, 15, 23);

  // 2. Invoice Meta Info
  doc.setTextColor(darkInk[0], darkInk[1], darkInk[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('NOTA PESANAN / SURAT JALAN', 15, 38);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`No. Pesanan : ${data.orderNumber}`, 15, 45);
  doc.text(`Tanggal     : ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`, 15, 50);
  doc.text(`Metode Kirim: ${data.deliveryMethod.toUpperCase()}`, 15, 55);

  doc.text(`Nama Pemesan : ${data.customerName}`, 115, 45);
  doc.text(`No. WhatsApp : ${data.customerPhone}`, 115, 50);
  doc.text(`Alamat Kirim : ${data.deliveryAddress || 'Ambil di Toko Fisik'}`, 115, 55);

  // Divider Line
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.5);
  doc.line(15, 62, 195, 62);

  // 3. Table Header
  doc.setFillColor(241, 245, 249);
  doc.rect(15, 65, 180, 8, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('NO', 18, 70);
  doc.text('NAMA PRODUK & VARIAN', 30, 70);
  doc.text('SATUAN', 110, 70);
  doc.text('QTY', 135, 70);
  doc.text('HARGA SATUAN', 150, 70);
  doc.text('SUBTOTAL', 178, 70);

  // 4. Table Body
  doc.setFont('helvetica', 'normal');
  let currentY = 78;

  data.items.forEach((item, index) => {
    const lineTotal = item.price * item.qty;
    doc.text(`${index + 1}`, 18, currentY);
    
    // Product title & variant
    doc.setFont('helvetica', 'bold');
    doc.text(`${item.product_name.substring(0, 38)}`, 30, currentY);
    doc.setFont('helvetica', 'normal');
    doc.text(`${item.variant_name} (${item.sku})`, 30, currentY + 4);

    doc.text(`${item.unit_name.substring(0, 16)}`, 110, currentY);
    doc.text(`${item.qty} ${item.unit_code}`, 135, currentY);
    doc.text(`Rp ${item.price.toLocaleString('id-ID')}`, 150, currentY);
    doc.text(`Rp ${lineTotal.toLocaleString('id-ID')}`, 178, currentY);

    currentY += 10;
  });

  // Divider Line
  doc.setDrawColor(200, 200, 200);
  doc.line(15, currentY + 2, 195, currentY + 2);

  // 5. Total & Summary Box
  const summaryY = currentY + 8;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text(`Total Berat Fisik: ± ${data.totalWeightKg} Kg`, 15, summaryY);
  doc.text(`Status Verifikasi: [VERIF: ${data.verificationCode}]`, 15, summaryY + 6);

  doc.setFontSize(12);
  doc.setTextColor(234, 88, 12); // Accent Orange
  doc.text(`TOTAL TAGIHAN: Rp ${data.subtotal.toLocaleString('id-ID')}`, 130, summaryY + 4);

  // 6. Signatures
  doc.setTextColor(darkInk[0], darkInk[1], darkInk[2]);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  
  const signY = summaryY + 22;
  doc.text('Penerima / Pembeli,', 25, signY);
  doc.text('( .................................... )', 20, signY + 20);

  doc.text('Kasir / Bagian Gudang,', 145, signY);
  doc.text(`( ${storeName} )`, 140, signY + 20);

  // Footer Note
  doc.setFontSize(7.5);
  doc.setTextColor(100, 100, 100);
  doc.text(settings.thermalFooterNote, 15, 280);

  // Save to file
  doc.save(`Nota-${data.orderNumber}.pdf`);
}
