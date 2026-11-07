import React, { useState, useEffect } from 'react';
import { X, CreditCard, CheckCircle2, History, AlertCircle, Banknote, Building2 } from 'lucide-react';
import { SalesOrder } from '../types';
import { useSalesStore } from '../stores/salesStore';
import { saveOrderToFirebase } from '../services/firebaseSync';

interface PaymentTempoModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: SalesOrder | null;
}

export const PaymentTempoModal: React.FC<PaymentTempoModalProps> = ({
  isOpen,
  onClose,
  order
}) => {
  const recordPayment = useSalesStore((state) => state.recordPayment);

  const [paymentAmount, setPaymentAmount] = useState<number | string>('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'transfer'>('cash');
  const [notes, setNotes] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState(false);

  const remaining = order ? (order.remaining_balance ?? (order.total_omzet - (order.amount_paid || 0))) : 0;

  useEffect(() => {
    if (order) {
      setPaymentAmount(remaining);
      setNotes('Pelunasan tagihan tempo');
      setErrorMsg(null);
      setSuccessToast(false);
    }
  }, [order, remaining]);

  if (!isOpen || !order) return null;

  const handleQuickAmount = (val: number) => {
    setPaymentAmount(Math.min(remaining, Math.max(0, val)));
    setErrorMsg(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = Number(paymentAmount);

    if (!amount || amount <= 0) {
      setErrorMsg('Masukkan nominal pembayaran yang valid!');
      return;
    }

    if (amount > remaining) {
      setErrorMsg(`Nominal melebihi sisa tagihan (Maksimal Rp ${remaining.toLocaleString('id-ID')})`);
      return;
    }

    const updated = recordPayment(order.id, amount, paymentMethod, notes);
    if (updated) {
      try {
        await saveOrderToFirebase(updated);
      } catch (err) {
        console.warn('Sync payment to Firebase warning:', err);
      }
    }

    setSuccessToast(true);
    setTimeout(() => {
      setSuccessToast(false);
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div 
        className="bg-white max-w-lg w-full rounded-3xl neo-border-thick shadow-hard-lg p-6 sm:p-8 space-y-6 animate-scaleUp text-left relative max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-6 right-6 p-2 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-ink transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center border-2 border-amber-300 shrink-0">
            <CreditCard className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-display font-black text-xl text-ink">
              Catat Pembayaran Piutang
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              Nota <span className="font-mono font-bold text-ink">{order.order_number}</span> &bull; {order.customer_name}
            </p>
          </div>
        </div>

        {successToast ? (
          <div className="p-6 bg-emerald-50 rounded-2xl border-2 border-emerald-300 text-center space-y-2 animate-fadeIn">
            <div className="w-12 h-12 bg-emerald-500 text-white rounded-full flex items-center justify-center mx-auto shadow-sm">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h4 className="font-black text-emerald-900 text-base">Pembayaran Berhasil Dicatat!</h4>
            <p className="text-xs text-emerald-700">
              Sisa tagihan nota ini telah diperbarui secara otomatis dan tersinkronisasi.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Kartu Ringkasan Tagihan */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500 font-medium">Total Nilai Transaksi:</span>
                <span className="font-mono font-bold text-slate-800">
                  Rp {order.total_omzet.toLocaleString('id-ID')}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500 font-medium">Sudah Dibayar:</span>
                <span className="font-mono font-bold text-emerald-600">
                  Rp {(order.amount_paid || 0).toLocaleString('id-ID')}
                </span>
              </div>
              <div className="pt-2 border-t border-slate-200 flex justify-between items-center">
                <div>
                  <span className="text-xs font-black text-ink block">Sisa Tagihan Tempo:</span>
                  {order.due_date && (
                    <span className="text-[10px] text-slate-400 font-medium">
                      Jatuh tempo: {new Date(order.due_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                  )}
                </div>
                <span className="font-mono font-black text-lg text-amber-600">
                  Rp {remaining.toLocaleString('id-ID')}
                </span>
              </div>
            </div>

            {/* Error Message */}
            {errorMsg && (
              <div className="p-3 bg-red-50 rounded-xl border border-red-200 flex items-center gap-2 text-xs text-red-700 font-bold">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Nominal Pembayaran */}
            <div className="space-y-2">
              <label className="block text-xs font-black text-ink">
                Nominal Pembayaran Kali Ini (Rp)
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-mono font-bold text-sm text-slate-400">
                  Rp
                </span>
                <input
                  type="number"
                  min="1"
                  max={remaining}
                  value={paymentAmount}
                  onChange={(e) => {
                    setPaymentAmount(e.target.value);
                    setErrorMsg(null);
                  }}
                  placeholder="0"
                  className="w-full h-12 pl-12 pr-4 font-mono font-black text-base text-ink bg-white border-2 border-slate-300 rounded-xl focus:border-primary outline-none"
                  required
                />
              </div>

              {/* Quick Presets */}
              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => handleQuickAmount(remaining)}
                  className="px-2.5 py-1 text-xs font-bold bg-amber-50 text-amber-800 border border-amber-300 rounded-lg hover:bg-amber-100 transition-colors"
                >
                  ⚡ Lunas Semua (Rp {remaining.toLocaleString('id-ID')})
                </button>
                {remaining > 50000 && (
                  <button
                    type="button"
                    onClick={() => handleQuickAmount(Math.round(remaining / 2))}
                    className="px-2.5 py-1 text-xs font-bold bg-slate-100 text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-200 transition-colors"
                  >
                    50% (Rp {Math.round(remaining / 2).toLocaleString('id-ID')})
                  </button>
                )}
              </div>
            </div>

            {/* Metode Pembayaran */}
            <div className="space-y-2">
              <label className="block text-xs font-black text-ink">
                Metode Pembayaran
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('cash')}
                  className={`p-3 rounded-xl border-2 flex items-center gap-2 font-bold text-xs transition-all ${
                    paymentMethod === 'cash'
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-900 shadow-sm'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                  }`}
                >
                  <Banknote className="w-4 h-4 text-emerald-600" />
                  <span>💵 Tunai (Cash)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod('transfer')}
                  className={`p-3 rounded-xl border-2 flex items-center gap-2 font-bold text-xs transition-all ${
                    paymentMethod === 'transfer'
                      ? 'border-blue-500 bg-blue-50 text-blue-900 shadow-sm'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                  }`}
                >
                  <Building2 className="w-4 h-4 text-blue-600" />
                  <span>💳 Transfer Bank</span>
                </button>
              </div>
            </div>

            {/* Catatan / Keterangan */}
            <div className="space-y-1.5">
              <label className="block text-xs font-black text-ink">
                Catatan / Keterangan
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Misal: Dititipkan ke sopir / Transfer via BCA"
                className="w-full h-10 px-3.5 text-xs text-ink bg-white border-2 border-slate-300 rounded-xl focus:border-primary outline-none"
              />
            </div>

            {/* Riwayat Pembayaran Sebelumnya */}
            {order.payment_history && order.payment_history.length > 0 && (
              <div className="space-y-1.5 pt-2 border-t border-slate-200">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600">
                  <History className="w-3.5 h-3.5 text-slate-400" />
                  <span>Riwayat Angsuran ({order.payment_history.length}):</span>
                </div>
                <div className="max-h-28 overflow-y-auto space-y-1 pr-1">
                  {order.payment_history.map((hist) => (
                    <div key={hist.id} className="p-2 bg-slate-50 rounded-lg text-[11px] flex justify-between items-center border border-slate-200">
                      <div>
                        <span className="font-semibold text-slate-800">
                          {hist.method === 'transfer' ? 'Transfer' : 'Tunai'}: Rp {hist.amount.toLocaleString('id-ID')}
                        </span>
                        {hist.notes && <span className="block text-[10px] text-slate-400">{hist.notes}</span>}
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {new Date(hist.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tombol Aksi */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 h-12 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-xs rounded-xl transition-all"
              >
                Batal
              </button>
              <button
                type="submit"
                className="flex-1 h-12 bg-amber-500 hover:bg-amber-600 text-white font-black text-xs rounded-xl shadow-md transition-all active:scale-[0.99]"
              >
                Simpan Pembayaran
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
