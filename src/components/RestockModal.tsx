import React, { useState } from 'react';
import { X, Package, Plus, ArrowUpRight, Check } from 'lucide-react';
import { useCatalogStore } from '../stores/catalogStore';
import { saveProductToFirebase } from '../services/firebaseSync';

interface RestockModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultProductId?: string;
  defaultVariantId?: string;
}

export const RestockModal: React.FC<RestockModalProps> = ({
  isOpen,
  onClose,
  defaultProductId,
  defaultVariantId
}) => {
  const products = useCatalogStore((state) => state.products);
  const restockVariant = useCatalogStore((state) => state.restockVariant);

  const [selectedProductId, setSelectedProductId] = useState<string>(
    defaultProductId || products[0]?.id || ''
  );
  const selectedProduct = products.find((p) => p.id === selectedProductId) || products[0];

  const [selectedVariantId, setSelectedVariantId] = useState<string>(
    defaultVariantId || selectedProduct?.variants?.[0]?.id || ''
  );
  const selectedVariant = selectedProduct?.variants?.find((v) => v.id === selectedVariantId) || selectedProduct?.variants?.[0];

  const [addedQty, setAddedQty] = useState<number | string>(500);
  const [notes, setNotes] = useState<string>('Restock / Pengiriman dari Pabrik');
  const [successToast, setSuccessToast] = useState(false);

  if (!isOpen) return null;

  const currentStock = selectedVariant?.stock_qty ?? 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const qty = Number(addedQty);
    if (!qty || qty <= 0 || !selectedProduct || !selectedVariant) return;

    restockVariant(selectedProduct.id, selectedVariant.id, qty, notes.trim());

    // Sync updated product to Firebase
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
        className="bg-white max-w-lg w-full rounded-3xl neo-border-thick shadow-hard-lg p-6 sm:p-8 space-y-6 animate-scaleUp text-left relative"
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
              Tambahkan kuota stok fisik barang yang baru datang dari pabrik / supplier.
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
                    setSelectedVariantId(prod.variants[0].id);
                  }
                }}
                className="w-full h-12 px-4 rounded-xl border-2 border-slate-300 font-bold text-sm text-ink focus:border-primary outline-none bg-white"
              >
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Pilih Varian & Ukuran */}
            {selectedProduct && selectedProduct.variants.length > 0 && (
              <div>
                <label className="block text-xs font-black uppercase text-slate-700 mb-1.5">
                  Varian / Ukuran:
                </label>
                <select
                  value={selectedVariantId}
                  onChange={(e) => setSelectedVariantId(e.target.value)}
                  className="w-full h-12 px-4 rounded-xl border-2 border-slate-300 font-bold text-sm text-ink focus:border-primary outline-none bg-white"
                >
                  {selectedProduct.variants.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name} (Stok Saat Ini: {v.stock_qty ?? 0} pcs)
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
              <div className="relative">
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={addedQty}
                  onChange={(e) => setAddedQty(e.target.value)}
                  placeholder="Contoh: 500"
                  className="w-full h-12 px-4 rounded-xl border-2 border-slate-300 font-black text-base text-ink focus:border-primary outline-none bg-white"
                  required
                />
              </div>
              <div className="flex gap-2 mt-2">
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
                className="w-full h-12 px-4 rounded-xl border-2 border-slate-300 font-medium text-xs sm:text-sm text-ink focus:border-primary outline-none bg-white"
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
