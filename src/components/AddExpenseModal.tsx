import React, { useState } from 'react';
import { X, Receipt, Plus, CheckCircle2, AlertCircle } from 'lucide-react';
import { useExpenseStore, EXPENSE_CATEGORIES } from '../stores/expenseStore';
import { ExpenseCategory } from '../types';
import { saveExpenseToFirebase } from '../services/firebaseSync';

interface AddExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AddExpenseModal: React.FC<AddExpenseModalProps> = ({
  isOpen,
  onClose
}) => {
  const addExpense = useExpenseStore((state) => state.addExpense);

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<ExpenseCategory>('operasional');
  const [amount, setAmount] = useState<number | string>('');
  const [notes, setNotes] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState(false);

  if (!isOpen) return null;

  const handleQuickAmount = (val: number) => {
    setAmount(val);
    setErrorMsg(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = Number(amount);

    if (!title.trim()) {
      setErrorMsg('Harap isi judul / nama keperluan pengeluaran!');
      return;
    }

    if (!numAmount || numAmount <= 0) {
      setErrorMsg('Masukkan nominal biaya yang valid!');
      return;
    }

    const newExp = addExpense({
      category,
      title: title.trim(),
      amount: numAmount,
      notes: notes.trim() || undefined
    });

    try {
      await saveExpenseToFirebase(newExp);
    } catch (err) {
      console.warn('Sync expense to Firebase error:', err);
    }

    setSuccessToast(true);
    setTimeout(() => {
      setSuccessToast(false);
      setTitle('');
      setAmount('');
      setNotes('');
      setErrorMsg(null);
      onClose();
    }, 1100);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div 
        className="bg-white max-w-lg w-full rounded-3xl neo-border-thick shadow-hard-lg p-6 sm:p-8 space-y-6 animate-scaleUp text-left relative"
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
          <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center border-2 border-rose-300 shrink-0">
            <Receipt className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-display font-black text-xl text-ink">
              Catat Pengeluaran Operasional
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              Buku Kas: Catat biaya harian untuk menghitung laba bersih usaha secara akurat.
            </p>
          </div>
        </div>

        {successToast ? (
          <div className="p-6 bg-emerald-50 rounded-2xl border-2 border-emerald-300 text-center space-y-2 animate-fadeIn">
            <div className="w-12 h-12 bg-emerald-500 text-white rounded-full flex items-center justify-center mx-auto shadow-sm">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h4 className="font-black text-emerald-900 text-base">Biaya Berhasil Dicatat!</h4>
            <p className="text-xs text-emerald-700">
              Pengeluaran telah masuk ke Buku Kas dan memperbarui perhitungan Laba Bersih.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {errorMsg && (
              <div className="p-3 bg-red-50 rounded-xl border border-red-200 flex items-center gap-2 text-xs text-red-700 font-bold">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Nama Pengeluaran */}
            <div className="space-y-1.5">
              <label className="block text-xs font-black text-ink">
                Keperluan / Nama Biaya <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  setErrorMsg(null);
                }}
                placeholder="Contoh: Bensin Motor Kurir Sidoarjo, Lakban Bening 2 Roll"
                className="w-full h-11 px-3.5 text-xs text-ink bg-white border-2 border-slate-300 rounded-xl focus:border-primary outline-none"
                required
              />
            </div>

            {/* Kategori Pengeluaran */}
            <div className="space-y-1.5">
              <label className="block text-xs font-black text-ink">
                Kategori Biaya
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
                className="w-full h-11 px-3 text-xs font-bold text-slate-800 bg-white border-2 border-slate-300 rounded-xl focus:border-primary outline-none cursor-pointer"
              >
                {EXPENSE_CATEGORIES.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Nominal Pengeluaran */}
            <div className="space-y-2">
              <label className="block text-xs font-black text-ink">
                Nominal Biaya (Rp) <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-mono font-bold text-sm text-slate-400">
                  Rp
                </span>
                <input
                  type="number"
                  min="1"
                  value={amount}
                  onChange={(e) => {
                    setAmount(e.target.value);
                    setErrorMsg(null);
                  }}
                  placeholder="0"
                  className="w-full h-12 pl-12 pr-4 font-mono font-black text-base text-ink bg-white border-2 border-slate-300 rounded-xl focus:border-primary outline-none"
                  required
                />
              </div>

              {/* Quick Presets */}
              <div className="flex flex-wrap gap-2 pt-1">
                {[20000, 35000, 50000, 100000, 250000].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => handleQuickAmount(val)}
                    className="px-2.5 py-1 text-xs font-bold bg-slate-100 text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-200 transition-colors"
                  >
                    Rp {val.toLocaleString('id-ID')}
                  </button>
                ))}
              </div>
            </div>

            {/* Catatan Tambahan */}
            <div className="space-y-1.5">
              <label className="block text-xs font-black text-ink">
                Keterangan Tambahan (Opsional)
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Misal: Nomor nota supplier / nama kasir pengambil uang"
                className="w-full h-10 px-3.5 text-xs text-ink bg-white border-2 border-slate-300 rounded-xl focus:border-primary outline-none"
              />
            </div>

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
                className="flex-1 h-12 bg-rose-600 hover:bg-rose-700 text-white font-black text-xs rounded-xl shadow-md transition-all active:scale-[0.99] flex items-center justify-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Simpan ke Buku Kas</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
