import React, { useState, useMemo } from 'react';
import {
  X,
  Moon,
  Printer,
  Send,
  CheckCircle2,
  AlertTriangle,
  Banknote,
  History
} from 'lucide-react';
import { useSalesStore } from '../stores/salesStore';
import { useExpenseStore } from '../stores/expenseStore';
import { useClosingStore } from '../stores/closingStore';
import { useSettingsStore } from '../stores/settingsStore';
import {
  printCashierClosingViaBluetooth,
  isBluetoothSupported,
  formatBluetoothErrorAlert
} from '../lib/bluetoothPrinter';
import { BluetoothPrinterBar } from './BluetoothPrinterBar';
import { AuthRole, logSecurityEvent } from '../lib/security';
import { CashierClosingRecap } from '../types';

interface CashierClosingModalProps {
  isOpen: boolean;
  onClose: () => void;
  role: AuthRole;
}

function toWibDateKey(isoOrDate: string | Date): string {
  const d = typeof isoOrDate === 'string' ? new Date(isoOrDate) : isoOrDate;
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' });
}

export const CashierClosingModal: React.FC<CashierClosingModalProps> = ({
  isOpen,
  onClose,
  role
}) => {
  const orders = useSalesStore((s) => s.orders);
  const expenses = useExpenseStore((s) => s.expenses);
  const storeSettings = useSettingsStore();

  const recaps = useClosingStore((s) => s.recaps);
  const defaultOpeningFloat = useClosingStore((s) => s.defaultOpeningFloat);
  const addRecap = useClosingStore((s) => s.addRecap);
  const setDefaultOpeningFloat = useClosingStore((s) => s.setDefaultOpeningFloat);

  const [closingDate, setClosingDate] = useState<string>(() => toWibDateKey(new Date()));
  const [cashierName, setCashierName] = useState<string>(role === 'owner' ? 'Pemilik Toko' : 'Kasir Shift');
  const [openingCashFloat, setOpeningCashFloat] = useState<number | string>(defaultOpeningFloat);
  const [actualDrawerCash, setActualDrawerCash] = useState<number | string>('');
  const [keepFloatForTomorrow, setKeepFloatForTomorrow] = useState<boolean>(true);
  const [notes, setNotes] = useState<string>('Laci kasir ditutup rapi, stok & nota sesuai.');
  const [isPrinting, setIsPrinting] = useState(false);
  const [statusNotice, setStatusNotice] = useState<string | null>(null);

  const metrics = useMemo(() => {
    const activeOrdersToday = orders.filter(
      (o) => o.status !== 'cancelled' && toWibDateKey(o.created_at) === closingDate
    );

    let cashSalesRevenue = 0;
    let transferSalesRevenue = 0;
    let tempoSalesRevenue = 0;
    let totalItemsSold = 0;
    let totalGrossProfit = 0;

    activeOrdersToday.forEach((o) => {
      totalItemsSold += o.total_qty;
      totalGrossProfit += o.total_profit;

      if (o.payment_method === 'tempo') {
        tempoSalesRevenue += o.total_omzet;
      } else if (o.payment_method === 'transfer') {
        transferSalesRevenue += o.total_omzet;
      } else {
        cashSalesRevenue += o.total_omzet;
      }
    });

    // Cicilan / Pelunasan Tempo yang dibayar di tanggal closingDate
    let tempoCashCollected = 0;
    let tempoTransferCollected = 0;
    orders.forEach((o) => {
      if (o.status === 'cancelled' || o.payment_method !== 'tempo') return;
      o.payment_history?.forEach((p) => {
        if (toWibDateKey(p.created_at) === closingDate) {
          if (p.method === 'transfer') {
            tempoTransferCollected += p.amount;
          } else {
            tempoCashCollected += p.amount;
          }
        }
      });
    });

    const todayExpenses = expenses.filter((e) => toWibDateKey(e.created_at) === closingDate);
    const totalExpenses = todayExpenses.reduce((sum, e) => sum + e.amount, 0);
    const totalNetProfit = totalGrossProfit - totalExpenses;

    const totalCashInDrawerSales = cashSalesRevenue + tempoCashCollected;
    const totalTransferCollected = transferSalesRevenue + tempoTransferCollected;

    return {
      totalOrders: activeOrdersToday.length,
      totalItemsSold,
      cashSalesRevenue,
      transferSalesRevenue,
      tempoSalesRevenue,
      tempoCashCollected,
      tempoTransferCollected,
      totalCashInDrawerSales,
      totalTransferCollected,
      totalExpenses,
      totalGrossProfit,
      totalNetProfit
    };
  }, [orders, expenses, closingDate]);

  if (!isOpen) return null;

  const floatNum = Math.max(0, Number(openingCashFloat) || 0);
  const expectedDrawerCash = Math.max(
    0,
    floatNum + metrics.totalCashInDrawerSales - metrics.totalExpenses
  );
  const isActualEntered = actualDrawerCash !== '';
  const actualNum = Math.max(0, Number(actualDrawerCash) || 0);
  const cashDifference = isActualEntered ? actualNum - expectedDrawerCash : 0;
  const effectiveActual = isActualEntered ? actualNum : expectedDrawerCash;
  const depositToOwner = keepFloatForTomorrow
    ? Math.max(0, effectiveActual - floatNum)
    : effectiveActual;

  const buildRecapObject = (): CashierClosingRecap => ({
    id: `CLS-${Date.now()}`,
    recapDate: closingDate,
    closedAt: new Date().toISOString(),
    cashierName: cashierName.trim() || 'Kasir Toko',
    totalOrders: metrics.totalOrders,
    totalItemsSold: metrics.totalItemsSold,
    cashSalesRevenue: metrics.cashSalesRevenue,
    transferSalesRevenue: metrics.transferSalesRevenue,
    tempoSalesRevenue: metrics.tempoSalesRevenue,
    tempoCashCollected: metrics.tempoCashCollected,
    tempoTransferCollected: metrics.tempoTransferCollected,
    totalCashInDrawerSales: metrics.totalCashInDrawerSales,
    totalExpenses: metrics.totalExpenses,
    totalGrossProfit: role === 'owner' ? metrics.totalGrossProfit : undefined,
    totalNetProfit: role === 'owner' ? metrics.totalNetProfit : undefined,
    openingCashFloat: floatNum,
    expectedDrawerCash,
    actualDrawerCash: effectiveActual,
    cashDifference,
    depositToOwner,
    notes: notes.trim() || undefined
  });

  const handleSaveClosing = () => {
    const recap = buildRecapObject();
    addRecap(recap);
    setDefaultOpeningFloat(floatNum);
    logSecurityEvent(
      'CLOSING_RECAP',
      `Tutup kasir tgl ${closingDate} oleh ${recap.cashierName}: fisik laci Rp ${recap.actualDrawerCash.toLocaleString('id-ID')} (selisih Rp ${recap.cashDifference.toLocaleString('id-ID')})`,
      recap.cashDifference < -5000 ? 'WARN' : 'INFO'
    );
    setStatusNotice('✅ Laporan tutup kasir & rekonsiliasi laci tersimpan!');
    return recap;
  };

  const handleSaveAndPrintBluetooth = async () => {
    const recap = handleSaveClosing();
    if (!isBluetoothSupported()) {
      return;
    }
    setIsPrinting(true);
    try {
      const res = await printCashierClosingViaBluetooth(recap, storeSettings);
      setStatusNotice(`✅ Rekap tutup kasir tersimpan & tercetak ke "${res.deviceName}"!`);
    } catch (err: any) {
      const info = formatBluetoothErrorAlert(err);
      if (!info.isCancelled) {
        alert(info.message);
      }
    } finally {
      setIsPrinting(false);
    }
  };

  const handleSendWA = () => {
    const recap = handleSaveClosing();
    const diffText =
      recap.cashDifference === 0
        ? 'PAS (Rp 0)'
        : recap.cashDifference > 0
        ? `LEBIH (+Rp ${recap.cashDifference.toLocaleString('id-ID')})`
        : `KURANG (-Rp ${Math.abs(recap.cashDifference).toLocaleString('id-ID')})`;

    let msg = `🌙 *LAPORAN TUTUP KASIR ${(storeSettings.storeName || 'PLASTIPRO').toUpperCase()}*\n`;
    msg += `📅 Tanggal: *${recap.recapDate}*\n`;
    msg += `👤 Petugas: *${recap.cashierName}*\n`;
    msg += `━━━━━━━━━━━━━━━━━━━━\n`;
    msg += `🧾 Total Transaksi: *${recap.totalOrders} Nota* (${recap.totalItemsSold} item)\n`;
    msg += `💵 Penjualan Tunai: *Rp ${recap.cashSalesRevenue.toLocaleString('id-ID')}*\n`;
    msg += `🏦 Transfer Bank: *Rp ${metrics.totalTransferCollected.toLocaleString('id-ID')}*\n`;
    if (recap.tempoSalesRevenue > 0) {
      msg += `⏳ Nota Tempo Baru: *Rp ${recap.tempoSalesRevenue.toLocaleString('id-ID')}*\n`;
    }
    if (recap.tempoCashCollected > 0) {
      msg += `💳 Cicilan Piutang Tunai Masuk: *Rp ${recap.tempoCashCollected.toLocaleString('id-ID')}*\n`;
    }
    msg += `💸 Kas Keluar / Biaya: *-Rp ${recap.totalExpenses.toLocaleString('id-ID')}*\n`;
    msg += `━━━━━━━━━━━━━━━━━━━━\n`;
    msg += `🗄️ *REKONSILIASI LACI TUNAI:*\n`;
    msg += `• Modal Awal Laci: Rp ${recap.openingCashFloat.toLocaleString('id-ID')}\n`;
    msg += `• Seharusnya di Laci: *Rp ${recap.expectedDrawerCash.toLocaleString('id-ID')}*\n`;
    msg += `• Hitung Fisik Laci: *Rp ${recap.actualDrawerCash.toLocaleString('id-ID')}*\n`;
    msg += `• Selisih Kas: *${diffText}*\n`;
    msg += `💰 *SETORAN KE PEMILIK:* *Rp ${recap.depositToOwner.toLocaleString('id-ID')}*\n`;
    if (recap.notes) {
      msg += `\n📝 Catatan: ${recap.notes}`;
    }

    const url = `https://wa.me/${storeSettings.phone}?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div
        className="bg-white max-w-2xl w-full rounded-3xl neo-border-thick shadow-hard-lg p-6 sm:p-8 space-y-6 animate-scaleUp text-left relative max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-6 right-6 p-2 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-ink transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3.5 pr-8">
          <div className="w-12 h-12 rounded-2xl bg-slate-900 text-amber-300 flex items-center justify-center border-2 border-ink shrink-0">
            <Moon className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-display font-black text-xl text-ink">
              Tutup Kasir & Rekonsiliasi Laci Tunai
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              Cocokkan uang fisik laci kasir di akhir shift / tutup toko dengan catatan sistem.
            </p>
          </div>
        </div>

        <BluetoothPrinterBar compact showAutoPrintToggle={false} onNotice={(m) => setStatusNotice(m)} />

        {statusNotice && (
          <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-xl text-xs font-bold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{statusNotice}</span>
          </div>
        )}

        {/* Filter Tanggal & Nama Kasir */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-black uppercase text-slate-600 mb-1">
              Tanggal Rekap (WIB):
            </label>
            <input
              type="date"
              value={closingDate}
              onChange={(e) => setClosingDate(e.target.value)}
              className="w-full h-11 px-3.5 rounded-xl border-2 border-slate-300 font-bold text-sm text-ink bg-white"
            />
          </div>
          <div>
            <label className="block text-xs font-black uppercase text-slate-600 mb-1">
              Nama Petugas / Kasir:
            </label>
            <input
              type="text"
              value={cashierName}
              onChange={(e) => setCashierName(e.target.value)}
              placeholder="Cth: Mbak Dina (Shift Siang)"
              className="w-full h-11 px-3.5 rounded-xl border-2 border-slate-300 font-bold text-sm text-ink bg-white"
            />
          </div>
        </div>

        {/* Ringkasan Sistem Hari Ini */}
        <div className="p-4 sm:p-5 bg-slate-50 rounded-2xl border-2 border-slate-200 space-y-3 text-xs">
          <div className="flex items-center justify-between font-black text-ink border-b border-slate-200 pb-2">
            <span>Ringkasan Transaksi ({metrics.totalOrders} Nota • {metrics.totalItemsSold} item)</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="p-3 bg-white rounded-xl border border-slate-200">
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Tunai Laci Masuk</span>
              <strong className="font-mono font-black text-sm text-emerald-700">
                Rp {metrics.totalCashInDrawerSales.toLocaleString('id-ID')}
              </strong>
              {metrics.tempoCashCollected > 0 && (
                <span className="text-[10px] text-slate-500 block">
                  (Termasuk cicilan Rp {metrics.tempoCashCollected.toLocaleString('id-ID')})
                </span>
              )}
            </div>

            <div className="p-3 bg-white rounded-xl border border-slate-200">
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Transfer Masuk</span>
              <strong className="font-mono font-black text-sm text-primary">
                Rp {metrics.totalTransferCollected.toLocaleString('id-ID')}
              </strong>
            </div>

            <div className="p-3 bg-white rounded-xl border border-slate-200">
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Pengeluaran Kas</span>
              <strong className="font-mono font-black text-sm text-rose-600">
                -Rp {metrics.totalExpenses.toLocaleString('id-ID')}
              </strong>
            </div>
          </div>

          {role === 'owner' && (
            <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between">
              <span className="font-bold text-emerald-900">Laba Kotor Hari Ini (Owner Only):</span>
              <strong className="font-mono font-black text-emerald-700">
                Rp {metrics.totalGrossProfit.toLocaleString('id-ID')} (Net: Rp {metrics.totalNetProfit.toLocaleString('id-ID')})
              </strong>
            </div>
          )}
        </div>

        {/* Rekonsiliasi Fisik Laci */}
        <div className="p-5 bg-amber-50/60 rounded-2xl border-2 border-amber-300 space-y-4">
          <div className="flex items-center gap-2 font-black text-sm text-amber-950">
            <Banknote className="w-5 h-5 text-amber-600" />
            <span>Hitung & Cocokkan Uang Fisik Laci</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-extrabold text-slate-700 mb-1">
                Modal Awal Kembalian Laci (Rp):
              </label>
              <input
                type="number"
                min={0}
                step={5000}
                value={openingCashFloat}
                onChange={(e) => setOpeningCashFloat(e.target.value)}
                className="w-full h-11 px-3.5 rounded-xl border-2 border-amber-300 font-mono font-black text-base text-ink bg-white outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-extrabold text-slate-700 mb-1">
                Uang Fisik Aktual di Laci (Rp):
              </label>
              <input
                type="number"
                min={0}
                step={1000}
                value={actualDrawerCash}
                onChange={(e) => setActualDrawerCash(e.target.value)}
                placeholder={`Seharusnya ${expectedDrawerCash.toLocaleString('id-ID')}`}
                className="w-full h-11 px-3.5 rounded-xl border-2 border-amber-400 font-mono font-black text-base text-ink bg-white outline-none focus:border-primary"
              />
            </div>
          </div>

          <div className="p-3.5 bg-white rounded-xl border border-amber-200 space-y-1.5 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-600 font-medium">Uang Tunai Seharusnya Ada di Laci:</span>
              <strong className="font-mono font-black text-ink">
                Rp {expectedDrawerCash.toLocaleString('id-ID')}
              </strong>
            </div>

            {isActualEntered && (
              <div className="flex justify-between items-center pt-1 border-t border-slate-100">
                <span className="font-bold text-slate-700">Selisih Hitungan Laci:</span>
                <span className={`px-2.5 py-0.5 rounded-lg font-mono font-black inline-flex items-center gap-1 ${
                  cashDifference === 0
                    ? 'bg-emerald-100 text-emerald-800'
                    : cashDifference > 0
                    ? 'bg-sky-100 text-primary'
                    : 'bg-red-100 text-red-700'
                }`}>
                  {cashDifference === 0 ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>PAS (Rp 0)</span>
                    </>
                  ) : cashDifference > 0 ? (
                    <span>LEBIH +Rp {cashDifference.toLocaleString('id-ID')}</span>
                  ) : (
                    <>
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>KURANG -Rp {Math.abs(cashDifference).toLocaleString('id-ID')}</span>
                    </>
                  )}
                </span>
              </div>
            )}

            <div className="flex justify-between items-center pt-1 border-t border-slate-100">
              <label className="inline-flex items-center gap-2 font-bold text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={keepFloatForTomorrow}
                  onChange={(e) => setKeepFloatForTomorrow(e.target.checked)}
                  className="rounded text-primary"
                />
                <span>Sisakan modal awal untuk kembalian besok</span>
              </label>
              <strong className="font-mono font-black text-sm text-emerald-700">
                Setor: Rp {depositToOwner.toLocaleString('id-ID')}
              </strong>
            </div>
          </div>
        </div>

        {/* Catatan Evaluasi */}
        <div>
          <label className="block text-xs font-black uppercase text-slate-600 mb-1">
            Catatan Tutup Toko / Serah Terima Shift:
          </label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Misal: Uang receh pas, stok cup 16oz perlu order ulang besok"
            className="w-full h-11 px-3.5 rounded-xl border-2 border-slate-300 text-xs font-medium text-ink bg-white"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          {isBluetoothSupported() ? (
            <button
              type="button"
              disabled={isPrinting}
              onClick={handleSaveAndPrintBluetooth}
              className="flex-1 py-3.5 px-4 bg-primary hover:bg-primary-dark text-white font-black text-xs sm:text-sm rounded-2xl neo-border shadow-sm flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
            >
              <Printer className="w-4 h-4" />
              <span>{isPrinting ? 'Mencetak...' : 'Simpan & Cetak Slip Bluetooth'}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSaveClosing}
              className="flex-1 py-3.5 px-4 bg-primary hover:bg-primary-dark text-white font-black text-xs sm:text-sm rounded-2xl neo-border shadow-sm flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Simpan Rekap Tutup Kasir</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleSendWA}
            className="flex-1 py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs sm:text-sm rounded-2xl neo-border shadow-sm flex items-center justify-center gap-2 transition-all active:scale-95"
          >
            <Send className="w-4 h-4" />
            <span>Kirim Laporan ke WA Pemilik</span>
          </button>
        </div>

        {/* Riwayat Tutup Kasir Terakhir */}
        {recaps.length > 0 && (
          <div className="pt-3 border-t border-slate-200 space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-black text-slate-600">
              <History className="w-3.5 h-3.5" />
              <span>Riwayat Tutup Kasir Terakhir ({recaps.length})</span>
            </div>
            <div className="max-h-32 overflow-y-auto space-y-1.5 pr-1">
              {recaps.slice(0, 5).map((r) => (
                <div
                  key={r.id}
                  className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-[11px]"
                >
                  <div>
                    <strong className="text-ink">{r.recapDate}</strong> &bull; {r.cashierName}
                    <span className="block text-[10px] text-slate-500">
                      {r.totalOrders} nota &bull; Setoran Rp {r.depositToOwner.toLocaleString('id-ID')}
                    </span>
                  </div>
                  <div className="text-right font-mono font-bold">
                    <span className="block text-ink">Laci: Rp {r.actualDrawerCash.toLocaleString('id-ID')}</span>
                    <span
                      className={
                        r.cashDifference === 0
                          ? 'text-emerald-600'
                          : r.cashDifference > 0
                          ? 'text-primary'
                          : 'text-red-600'
                      }
                    >
                      Selisih: {r.cashDifference === 0 ? 'PAS' : `${r.cashDifference > 0 ? '+' : ''}Rp ${r.cashDifference.toLocaleString('id-ID')}`}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
