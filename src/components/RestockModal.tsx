import React, { useState, useEffect } from 'react';
import { X, Package, Plus, ArrowUpRight, Check } from 'lucide-react';
import { useCatalogStore } from '../stores/catalogStore';
import { useExpenseStore } from '../stores/expenseStore';
import { saveProductToFirebase, saveExpenseToFirebase } from '../services/firebaseSync';
import { logSecurityEvent } from '../lib/security';

interface RestockModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultProductId?: string;
  defaultVariantId?: string;
  canManageHpp?: boolean;
}

export const RestockModal: React.FC<RestockModalProps> = ({
  isOpen,
  onClose,
  defaultProductId,
  defaultVariantId,
  canManageHpp = true
}) => {
  const products = useCatalogStore((state) => state.products);
  const restockVariant = useCatalogStore((state) => state.restockVariant);
  const addExpense = useExpenseStore((state) => state.addExpense);

  const [selectedProductId, setSelectedProductId] = useState<string>(
    defaultProductId || products[0]?.id || ''
  );
  const selectedProduct = products.find((p) => p.id === selectedProductId) || products[0];

  const [selectedVariantId, setSelectedVariantId] = useState<string>(
    defaultVariantId || selectedProduct?.variants?.[0]?.id || ''
  );
  const selectedVariant =
    selectedProduct?.variants?.find((v) => v.id === selectedVariantId) ||
    selectedProduct?.variants?.[0];

  const [addedQty, setAddedQty] = useState<number | string>(500);
  const [unitCostRp, setUnitCostRp] = useState<number | string>('');
  const [updateUnitCogs, setUpdateUnitCogs] = useState<boolean>(true);
  const [recordAsExpense, setRecordAsExpense] = useState<boolean>(false);
  const [notes, setNotes] = useState<string>('Restock / Pengiriman dari Pabrik');
  const [successToast, setSuccessToast] = useState(false);

  // Sinkronkan produk & varian default setiap kali modal dibuka
  useEffect(() => {
    if (!isOpen) return;
    const prod = products.find((p) => p.id === defaultProductId) || products[0];
    if (prod) {
      setSelectedProductId(prod.id);
      const variant = prod.variants?.find((v) => v.id === defaultVariantId) || prod.variants?.[0];
      if (variant) {
        setSelectedVariantId(variant.id);
        // Estimasi harga beli per 1 unit dasar dari HPP unit pertama jika tersedia
        const u = variant.units?.[0];
        if (u && u.cogs_price && u.base_multiplier > 0) {
          setUnitCostRp(Math.round(u.cogs_price / u.base_multiplier));
        } else {
          setUnitCostRp('');
        }
      }
    }
    setSuccessToast(false);
  }, [isOpen, defaultProductId, defaultVariantId, products]);

  if (!isOpen) return null;

  const currentStock = selectedVariant?.stock_qty ?? 0;
  const qtyNum = Number(addedQty) || 0;
  const unitCostNum = Number(unitCostRp) || 0;
  const estimatedPurchaseTotal = qtyNum > 0 && unitCostNum > 0 ? Math.round(qtyNum * unitCostNum) : 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!qtyNum || qtyNum <= 0 || !selectedProduct || !selectedVariant) return;

    const validCost = canManageHpp && unitCostNum > 0 ? unitCostNum : undefined;

    restockVariant(selectedProduct.id, selectedVariant.id, qtyNum, notes.trim(), {
      unitCostRp: validCost,
      updateUnitCogs: Boolean(canManageHpp && validCost && updateUnitCogs)
    });

    if (canManageHpp && validCost && updateUnitCogs) {
      logSecurityEvent(
        'HPP_UPDATED',
        `Restock ${selectedProduct.name} (${selectedVariant.name}) +${qtyNum} pcs & update HPP @Rp ${validCost.toLocaleString('id-ID')}/pcs`,
        'INFO'
      );
    }

    if (canManageHpp && recordAsExpense && estimatedPurchaseTotal > 0) {
      const exp = addExpense({
        category: 'pembelian_stok',
        title: `Kulakan Stok: ${selectedProduct.name} (${selectedVariant.name})`,
        amount: estimatedPurchaseTotal,
        notes: `${qtyNum.toLocaleString('id-ID')} pcs x Rp ${unitCostNum.toLocaleString('id-ID')} | ${notes.trim()}`
      });
      saveExpenseToFirebase(exp).catch((err) => console.warn('Sync expense error:', err));
    }

    const updatedProd = useCatalogStore.getState().products.find((p) => p.id === selectedProduct.id);
    if (updatedProd) {
      saveProductToFirebase(updatedProd).catch((err) => console.warn('Sync restock to Firebase error:', err));
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
        className="bg-white max-w-lg w-full rounded-3xl neo-border-thick shadow-hard-lg p-6 sm:p-8 space-y-5 animate-scaleUp text-left relative max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-6 right-6 p-2 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-ink transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center border-2 border-emerald-300 shrink-0">
            <ArrowUpRight className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-display font-black text-xl text-ink">
              Catat Stok Masuk (Restock)
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              Tambahkan stok fisik barang datang{canManageHpp ? ' sekaligus perbarui harga kulakan (HPP Beli)' : ''}.
            </p>
          </div>
        </div>

        {successToast ? (
          <div className="p-6 bg-emerald-50 rounded-2xl border-2 border-emerald-300 text-center space-y-2 animate-fadeIn">
            <div className="w-12 h-12 bg-emerald-500 text-white rounded-full flex items-center justify-center mx-auto shadow-sm">
              <Check className="w-6 h-6" />
            </div>
            <h4 className="font-black text-emerald-900 text-base">Stok Berhasil Ditambahkan!</h4>
            <p className="text-xs text-emerald-700">
              {selectedProduct?.name} ({selectedVariant?.name}) kini memiliki stok {currentStock.toLocaleString('id-ID')} unit.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Pilih Produk */}
            <div>
              <label className="block text-xs font-black uppercase text-slate-700 mb-1.5">
                Pilih Produk:
              </label>
              <select
                value={selectedProductId}
                onChange={(e) => {
                  setSelectedProductId(e.target.value);
                  const prod = products.find((p) => p.id === e.target.value);
                  if (prod && prod.variants.length > 0) {
                    const firstVar = prod.variants[0];
                    setSelectedVariantId(firstVar.id);
                    const u = firstVar.units?.[0];
                    if (u?.cogs_price && u.base_multiplier > 0) {
                      setUnitCostRp(Math.round(u.cogs_price / u.base_multiplier));
                    }
                  }
                }}
                className="w-full h-11 px-3.5 rounded-xl border-2 border-slate-300 font-bold text-sm text-ink focus:border-primary outline-none bg-white"
              >
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Pilih Varian */}
            {selectedProduct && selectedProduct.variants.length > 0 && (
              <div>
                <label className="block text-xs font-black uppercase text-slate-700 mb-1.5">
                  Varian / Ukuran:
                </label>
                <select
                  value={selectedVariantId}
                  onChange={(e) => {
                    setSelectedVariantId(e.target.value);
                    const vr = selectedProduct.variants.find((v) => v.id === e.target.value);
                    const u = vr?.units?.[0];
                    if (u?.cogs_price && u.base_multiplier > 0) {
                      setUnitCostRp(Math.round(u.cogs_price / u.base_multiplier));
                    }
                  }}
                  className="w-full h-11 px-3.5 rounded-xl border-2 border-slate-300 font-bold text-sm text-ink focus:border-primary outline-none bg-white"
                >
                  {selectedProduct.variants.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name} (Stok: {(v.stock_qty ?? 0).toLocaleString('id-ID')} pcs)
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Current Stock Banner */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs font-bold text-slate-700">
              <span className="flex items-center gap-1.5">
                <Package className="w-4 h-4 text-primary" />
                <span>Stok Fisik Saat Ini:</span>
              </span>
              <span className="font-mono text-sm text-ink font-black">
                {currentStock.toLocaleString('id-ID')} unit (pcs)
              </span>
            </div>

            {/* Jumlah Masuk */}
            <div>
              <label className="block text-xs font-black uppercase text-slate-700 mb-1.5">
                Jumlah Barang Masuk (Satuan Dasar / Pcs):
              </label>
              <input
                type="number"
                min="1"
                step="1"
                value={addedQty}
                onChange={(e) => setAddedQty(e.target.value)}
                placeholder="Contoh: 500"
                className="w-full h-11 px-4 rounded-xl border-2 border-slate-300 font-black text-base text-ink focus:border-primary outline-none bg-white"
                required
              />
              <div className="flex flex-wrap gap-2 mt-2">
                {[100, 250, 500, 1000, 2500].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setAddedQty(preset)}
                    className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-[11px] font-bold text-slate-700 border border-slate-300 transition-colors"
                  >
                    +{preset}
                  </button>
                ))}
              </div>
            </div>

            {/* Harga Beli / Kulakan (Khusus Pemilik) */}
            {canManageHpp && (
              <div className="p-4 bg-emerald-50/60 rounded-2xl border border-emerald-200 space-y-3">
                <div>
                  <label className="block text-xs font-black uppercase text-emerald-900 mb-1">
                    Harga Beli Kulakan per 1 Unit Dasar / Pcs (Opsional):
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-mono font-bold text-xs text-emerald-700">
                      Rp
                    </span>
                    <input
                      type="number"
                      min="0"
                      value={unitCostRp}
                      onChange={(e) => setUnitCostRp(e.target.value)}
                      placeholder="Kosongkan jika HPP tidak berubah"
                      className="w-full h-10 pl-10 pr-3 rounded-xl border border-emerald-300 font-mono font-bold text-sm text-ink bg-white focus:border-emerald-500 outline-none"
                    />
                  </div>
                  {estimatedPurchaseTotal > 0 && (
                    <span className="block text-[11px] font-bold text-emerald-800 mt-1">
                      Total Nilai Nota Pabrik: <strong>Rp {estimatedPurchaseTotal.toLocaleString('id-ID')}</strong>
                    </span>
                  )}
                </div>

                {unitCostNum > 0 && (
                  <div className="space-y-1.5 text-xs">
                    <label className="flex items-center gap-2 font-bold text-emerald-900 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={updateUnitCogs}
                        onChange={(e) => setUpdateUnitCogs(e.target.checked)}
                        className="rounded text-emerald-600 focus:ring-emerald-500"
                      />
                      <span>Perbarui HPP Beli di katalog produk sesuai harga kulakan baru</span>
                    </label>

                    <label className="flex items-center gap-2 font-bold text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={recordAsExpense}
                        onChange={(e) => setRecordAsExpense(e.target.checked)}
                        className="rounded text-rose-600 focus:ring-rose-500"
                      />
                      <span>Catat sekalian ke Buku Kas sebagai pengeluaran belanja stok</span>
                    </label>
                  </div>
                )}
              </div>
            )}

            {/* Keterangan Supplier / Asal Restock */}
            <div>
              <label className="block text-xs font-black uppercase text-slate-700 mb-1.5">
                Keterangan / Asal Pengiriman:
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Cth: Pengiriman Supplier Krian / Bongkar Truk Bal"
                className="w-full h-11 px-4 rounded-xl border-2 border-slate-300 font-medium text-xs sm:text-sm text-ink focus:border-primary outline-none bg-white"
              />
            </div>

            <div className="pt-2 flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="w-1/3 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs sm:text-sm transition-all"
              >
                Batal
              </button>
              <button
                type="submit"
                className="w-2/3 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-xs sm:text-sm neo-border shadow-sm flex items-center justify-center gap-1.5 transition-all active:translate-x-0.5 active:translate-y-0.5"
              >
                <Plus className="w-4 h-4" />
                <span>Simpan Stok Masuk</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
