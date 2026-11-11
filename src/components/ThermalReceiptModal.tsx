import React, { useState } from 'react';
import { X, Printer, Download, CheckCircle2, Bluetooth } from 'lucide-react';
import { CartItem } from '../types';
import { useSettingsStore } from '../stores/settingsStore';
import { generateThermalReceiptPDF } from '../lib/thermalPrinter';
import {
  printPlastikReceiptViaBluetooth,
  formatBluetoothErrorAlert,
  isBluetoothSupported
} from '../lib/bluetoothPrinter';
import { BluetoothPrinterBar } from './BluetoothPrinterBar';
import { useSalesStore } from '../stores/salesStore';

interface ThermalReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderNumber: string;
  customerName: string;
  customerPhone?: string;
  customerAddress?: string;
  deliveryMethodName: string;
  items: CartItem[];
  subtotal: number;
  totalWeightKg: number;
  verificationCode: string;
  cashierName?: string;
  paymentMethod?: 'cash' | 'transfer' | 'tempo';
  dueDate?: string;
}

export const ThermalReceiptModal: React.FC<ThermalReceiptModalProps> = ({
  isOpen,
  onClose,
  orderNumber,
  customerName,
  customerPhone,
  customerAddress,
  deliveryMethodName,
  items,
  subtotal,
  totalWeightKg,
  verificationCode,
  cashierName = 'Kasir Toko',
  paymentMethod = 'cash',
  dueDate
}) => {
  const storeSettings = useSettingsStore();
  const incrementPrintCount = useSalesStore((s) => s.incrementPrintCount);
  const [btStatusMsg, setBtStatusMsg] = useState<string | null>(null);
  const [isPrintingBt, setIsPrintingBt] = useState(false);

  if (!isOpen) return null;

  const nowFormatted = new Date().toLocaleString('id-ID', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  const totalItemCount = items.reduce((acc, curr) => acc + curr.qty, 0);

  const handleBluetoothPrint = async () => {
    setIsPrintingBt(true);
    try {
      const res = await printPlastikReceiptViaBluetooth(
        {
          orderNumber,
          customerName,
          deliveryMethodName,
          items,
          subtotal,
          totalWeightKg,
          verificationCode,
          cashierName,
          dateStr: nowFormatted,
          paymentMethod,
          paymentStatus: paymentMethod === 'tempo' ? 'unpaid' : 'paid',
          dueDate
        },
        storeSettings
      );
      incrementPrintCount(orderNumber);
      setBtStatusMsg(`✅ Struk terkirim ke printer Bluetooth "${res.deviceName}"!`);
    } catch (err: any) {
      const info = formatBluetoothErrorAlert(err);
      if (info.isCancelled) {
        setBtStatusMsg('Pemilihan printer dibatalkan.');
      } else {
        alert(info.message);
      }
    } finally {
      setIsPrintingBt(false);
    }
  };

  const handleDirectPrint = () => {
    window.print();
  };

  const handleDownloadPDF = () => {
    generateThermalReceiptPDF({
      orderNumber,
      customerName,
      customerPhone,
      customerAddress,
      deliveryMethodName,
      items,
      subtotal,
      totalWeightKg,
      verificationCode,
      storeSettings,
      cashierName,
      date: nowFormatted
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/75 backdrop-blur-sm overflow-y-auto animate-fadeIn">
      <div 
        className="bg-white w-full max-w-2xl rounded-3xl neo-border-thick shadow-hard-lg overflow-hidden flex flex-col my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-100 border-b-2 border-ink flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary text-white flex items-center justify-center neo-border shadow-sm">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-display font-black text-lg text-ink">
                Format Struk Kasir Thermal (58mm)
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Siap cetak ke mini printer kasir Bluetooth (POS-58) atau USB toko
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-500 hover:text-ink hover:bg-slate-200 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Modal Body: Spacious layout with Receipt Preview & Quick Print Instructions */}
        <div className="p-6 sm:p-8 bg-slate-50 flex flex-col lg:flex-row items-center lg:items-start justify-center gap-8 max-h-[75vh] overflow-y-auto">
          
          {/* Authentic 58mm Thermal Receipt View */}
          <div 
            id="thermal-receipt-printable-area"
            className="w-[300px] bg-white border border-slate-300 shadow-md p-4 text-[12px] font-mono leading-tight text-slate-900 rounded-sm select-none relative"
            style={{ fontFamily: "'Courier New', Courier, monospace" }}
          >
            {/* Store Header */}
            <div className="text-center pb-2 border-b border-dashed border-slate-400">
              {storeSettings.logoUrl ? (
                <img
                  src={storeSettings.logoUrl}
                  alt="Logo Toko"
                  className="w-12 h-12 mx-auto object-contain mb-1.5"
                />
              ) : null}
              <div className="font-black text-sm uppercase tracking-wide">
                {storeSettings.storeName}
              </div>
              <div className="text-[11px] text-slate-600">
                {storeSettings.tagline}
              </div>
              <div className="text-[10px] text-slate-500 mt-1 leading-snug">
                {storeSettings.address}
              </div>
              <div className="text-[11px] text-slate-700 font-bold mt-0.5">
                WA: {storeSettings.phoneDisplay}
              </div>
            </div>

            {/* Receipt Meta */}
            <div className="py-2 border-b border-dashed border-slate-400 space-y-1 text-[11px]">
              <div className="flex justify-between">
                <span>No. Struk:</span>
                <span className="font-bold">{orderNumber}</span>
              </div>
              <div className="flex justify-between">
                <span>Tanggal:</span>
                <span>{nowFormatted}</span>
              </div>
              <div className="flex justify-between">
                <span>Kasir:</span>
                <span>{cashierName}</span>
              </div>
              <div className="flex justify-between">
                <span>Pelanggan:</span>
                <span className="font-bold truncate max-w-[150px]">{customerName}</span>
              </div>
              <div className="flex justify-between">
                <span>Kirim:</span>
                <span>{deliveryMethodName}</span>
              </div>
              <div className="flex justify-between">
                <span>Bayar:</span>
                <span className="font-bold">
                  {paymentMethod === 'tempo' ? 'TEMPO (PIUTANG)' : paymentMethod === 'transfer' ? 'TRANSFER' : 'TUNAI (LUNAS)'}
                </span>
              </div>
              {paymentMethod === 'tempo' && dueDate && (
                <div className="flex justify-between">
                  <span>Jatuh Tempo:</span>
                  <span className="font-bold">
                    {new Date(dueDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                </div>
              )}
            </div>

            {/* Items Table */}
            <div className="py-2 border-b border-dashed border-slate-400 space-y-2">
              {items.map((item, idx) => {
                const lineTotal = item.price * item.qty;
                return (
                  <div key={idx} className="space-y-0.5">
                    <div className="font-bold text-[11px] text-slate-950">
                      {item.product_name}
                    </div>
                    <div className="text-[10px] text-slate-600 pl-1">
                      {item.variant_name}
                    </div>
                    <div className="flex justify-between text-[11px] pl-1">
                      <span>{item.qty} {item.unit_code} x {item.price.toLocaleString('id-ID')}</span>
                      <span className="font-bold">{lineTotal.toLocaleString('id-ID')}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Subtotal & Totals */}
            <div className="py-2 border-b border-dashed border-slate-400 space-y-1 text-[11px]">
              <div className="flex justify-between">
                <span>Total Item:</span>
                <span>{items.length} macam ({totalItemCount} qty)</span>
              </div>
              <div className="flex justify-between">
                <span>Estimasi Berat:</span>
                <span>± {totalWeightKg} Kg</span>
              </div>
              <div className="flex justify-between font-black text-sm pt-1 border-t border-slate-300">
                <span>TOTAL:</span>
                <span>Rp {subtotal.toLocaleString('id-ID')}</span>
              </div>
            </div>

            {/* Verification Code */}
            <div className="py-2 text-center text-[10px] text-slate-500 border-b border-dashed border-slate-400">
              <span>INTEGRITAS DATA:</span>
              <div className="font-bold text-[11px] text-slate-800">[VERIF: {verificationCode}]</div>
            </div>

            {/* Footer Greeting */}
            <div className="pt-2 text-center text-[10px] space-y-1">
              <div className="font-bold uppercase tracking-wider text-slate-900">
                TERIMA KASIH ATAS KUNJUNGANNYA!
              </div>
              <div className="text-slate-600 text-[9px] leading-tight">
                {storeSettings.thermalFooterNote}
              </div>
            </div>

            {/* Bottom jagged tear decoration */}
            <div className="absolute -bottom-1.5 left-0 right-0 h-2 bg-gradient-to-r from-transparent via-slate-200 to-transparent opacity-40" />
          </div>

          {/* Action Panel & Instructions (Spacious & Clean) */}
          <div className="flex-1 space-y-4 text-ink">
            <BluetoothPrinterBar
              compact
              onNotice={(m) => setBtStatusMsg(m)}
            />

            {btStatusMsg && (
              <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-xl text-xs font-bold">
                {btStatusMsg}
              </div>
            )}

            <div className="bg-white p-5 rounded-2xl neo-border shadow-sm space-y-2.5">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-eco-dark font-extrabold text-xs">
                <CheckCircle2 className="w-4 h-4 text-eco" />
                <span>Format POS ({storeSettings.printerPaperWidth || '58mm'}) Siap Cetak</span>
              </span>
              <h4 className="font-display font-black text-base sm:text-lg">
                Cetak Cepat ke Printer Kasir Toko
              </h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Cetak langsung via <strong>Bluetooth (ESC/POS)</strong> dari Chrome Android/Desktop, cetak lewat browser, atau unduh file PDF 58mm.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2.5">
              {isBluetoothSupported() && (
                <button
                  type="button"
                  disabled={isPrintingBt}
                  onClick={handleBluetoothPrint}
                  className="w-full py-3.5 px-5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black text-sm sm:text-base neo-border-thick neo-shadow transition-all flex items-center justify-center gap-2.5 active:translate-x-0.5 active:translate-y-0.5 disabled:opacity-50"
                >
                  <Bluetooth className="w-5 h-5" />
                  <span>{isPrintingBt ? 'Mengirim ke Printer...' : '🖨️ Cetak Langsung Bluetooth (ESC/POS)'}</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleDirectPrint}
                className="w-full py-3.5 px-5 bg-primary hover:bg-primary-dark text-white rounded-2xl font-black text-sm neo-border neo-shadow transition-all flex items-center justify-center gap-2 active:translate-x-0.5 active:translate-y-0.5"
              >
                <Printer className="w-4 h-4" />
                <span>Cetak Biasa / Browser Print</span>
              </button>

              <button
                type="button"
                onClick={handleDownloadPDF}
                className="w-full py-3 px-5 bg-white hover:bg-slate-100 text-slate-800 rounded-2xl font-bold text-xs sm:text-sm neo-border transition-all flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4 text-slate-600" />
                <span>Unduh File Struk 58mm (.pdf)</span>
              </button>
            </div>
          </div>

        </div>

      </div>

      {/* Global CSS for 58mm Thermal Print Media */}
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #thermal-receipt-printable-area, #thermal-receipt-printable-area * {
            visibility: visible !important;
          }
          #thermal-receipt-printable-area {
            position: fixed !important;
            left: 0 !important;
            top: 0 !important;
            width: 58mm !important;
            margin: 0 !important;
            padding: 2mm 3mm !important;
            box-shadow: none !important;
            border: none !important;
          }
        }
      `}</style>
    </div>
  );
};
