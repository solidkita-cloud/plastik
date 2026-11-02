import React, { useState, useEffect } from 'react';
import { X, Check, ShoppingBag, Sparkles } from 'lucide-react';
import { Product, ProductVariant, VariantUnit } from '../types';
import { useCartStore } from '../stores/cartStore';

interface VariantModalProps {
  product: Product | null;
  onClose: () => void;
  onShowToast?: (msg: string) => void;
}

export const VariantModal: React.FC<VariantModalProps> = ({ product, onClose, onShowToast }) => {
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const [selectedUnit, setSelectedUnit] = useState<VariantUnit | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [showAddedNotice, setShowAddedNotice] = useState(false);

  const addItem = useCartStore((state) => state.addItem);

  // Initialize selected variant and unit when product changes
  useEffect(() => {
    if (product && product.variants.length > 0) {
      const initialVar = product.variants[0];
      setSelectedVariant(initialVar);
      const defaultUnit = initialVar.units.find((u) => u.is_default) || initialVar.units[0];
      setSelectedUnit(defaultUnit || null);
      setQuantity(1);
      setShowAddedNotice(false);
    }
  }, [product]);

  if (!product || !selectedVariant || !selectedUnit) return null;

  // Handle unit switch
  const handleSelectUnit = (unit: VariantUnit) => {
    setSelectedUnit(unit);
    setQuantity(unit.min_order_qty || 1);
  };

  // Calculations
  const lineTotal = selectedUnit.price * quantity;
  const totalBasePcs = selectedUnit.base_multiplier * quantity;

  // Find if there is a pcs unit to compare savings
  const pcsUnit = selectedVariant.units.find((u) => u.unit_code === 'PCS');
  let savingsMessage = '';
  if (pcsUnit && selectedUnit.unit_code !== 'PCS' && selectedUnit.base_multiplier > 1) {
    const costIfBoughtAsPcs = pcsUnit.price * selectedUnit.base_multiplier;
    const diff = costIfBoughtAsPcs - selectedUnit.price;
    if (diff > 0) {
      savingsMessage = `Hemat Rp ${(diff * quantity).toLocaleString('id-ID')} dibanding beli eceran!`;
    }
  }

  const handleAddToCart = () => {
    addItem({
      product_id: product.id,
      product_name: product.name,
      variant_id: selectedVariant.id,
      variant_name: selectedVariant.name,
      unit_id: selectedUnit.id,
      unit_name: selectedUnit.unit_name,
      unit_code: selectedUnit.unit_code,
      base_multiplier: selectedUnit.base_multiplier,
      sku: selectedVariant.sku,
      price: selectedUnit.price,
      qty: quantity,
      weight_grams: (selectedVariant.base_pcs_weight_grams || 10) * selectedUnit.base_multiplier
    });

    setShowAddedNotice(true);
    if (onShowToast) {
      onShowToast(`${product.name} (${selectedVariant.name} - ${selectedUnit.unit_name}) masuk ke keranjang`);
    }
    setTimeout(() => {
      setShowAddedNotice(false);
      onClose();
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-ink/70 backdrop-blur-sm animate-fadeIn">
      <div 
        className="bg-white w-full max-w-lg rounded-2xl neo-border-thick neo-shadow-lg overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-4 border-b-2 border-ink flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-accent" />
            <h3 className="font-display font-extrabold text-base sm:text-lg text-ink truncate">
              Pilih Ukuran & Satuan Grosir
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-500 hover:text-ink hover:bg-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-5">
          {/* Product Overview Header */}
          <div className="flex gap-4 items-start">
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl bg-slate-50 neo-border p-2 shrink-0 flex items-center justify-center">
              <img
                src={product.image_url}
                alt={product.name}
                className="w-full h-full object-contain"
              />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap gap-1 mb-1">
                <span className="px-2 py-0.5 rounded bg-primary-light text-primary-dark font-extrabold text-[10px] uppercase">
                  {product.material}
                </span>
                {product.food_grade && (
                  <span className="px-2 py-0.5 rounded bg-eco-light text-eco-dark font-extrabold text-[10px]">
                    Food Grade
                  </span>
                )}
                {product.microwave_safe && (
                  <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-extrabold text-[10px]">
                    Microwave Safe
                  </span>
                )}
              </div>
              <h2 className="font-extrabold text-base text-ink leading-snug">
                {product.name}
              </h2>
              <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                {product.description}
              </p>
            </div>
          </div>

          {/* Step 1: Pilih Ukuran / Varian */}
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-slate-600 mb-2">
              1. Pilih Ukuran / Varian:
            </label>
            <div className="grid grid-cols-2 gap-2">
              {product.variants.map((variant) => {
                const isSelected = selectedVariant.id === variant.id;
                return (
                  <button
                    key={variant.id}
                    onClick={() => {
                      setSelectedVariant(variant);
                      const defaultU = variant.units.find((u) => u.is_default) || variant.units[0];
                      setSelectedUnit(defaultU || null);
                      setQuantity(defaultU?.min_order_qty || 1);
                    }}
                    className={`p-3 text-left rounded-xl border-2 transition-all flex flex-col justify-between ${
                      isSelected
                        ? 'border-primary bg-primary-light/40 shadow-sm'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-xs sm:text-sm text-ink">
                        {variant.name}
                      </span>
                      {isSelected && (
                        <span className="w-4 h-4 rounded-full bg-primary text-white flex items-center justify-center">
                          <Check className="w-3 h-3 stroke-[3]" />
                        </span>
                      )}
                    </div>
                    {variant.dimension_detail && (
                      <span className="text-[11px] text-slate-500 font-medium mt-1">
                        {variant.dimension_detail}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Step 2: Pilih Satuan & Tier Harga (Ecer, Pak, Dus) */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-black uppercase tracking-wider text-slate-600">
                2. Pilih Satuan & Harga Grosir:
              </label>
              <span className="text-[11px] text-slate-500 font-bold">
                Satuan: {selectedUnit.unit_code}
              </span>
            </div>

            <div className="space-y-2">
              {selectedVariant.units.map((unit) => {
                const isSelected = selectedUnit.id === unit.id;
                const unitPcsRate = unit.base_multiplier > 0 
                  ? Math.round(unit.price / unit.base_multiplier) 
                  : unit.price;

                return (
                  <div
                    key={unit.id}
                    onClick={() => handleSelectUnit(unit)}
                    className={`p-3 rounded-xl border-2 cursor-pointer transition-all flex items-center justify-between ${
                      isSelected
                        ? 'border-accent bg-orange-50/60 shadow-sm'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                        isSelected ? 'border-accent bg-accent text-white' : 'border-slate-300'
                      }`}>
                        {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-xs sm:text-sm text-ink">
                            {unit.unit_name}
                          </span>
                          {unit.badge_label && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wide bg-accent text-white">
                              {unit.badge_label}
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          {unit.base_multiplier > 1 && (
                            <span>Isi {unit.base_multiplier} pcs • </span>
                          )}
                          <span className="text-primary font-bold">
                            Rp {unitPcsRate.toLocaleString('id-ID')}/pcs
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="font-black text-sm sm:text-base text-accent">
                        Rp {unit.price.toLocaleString('id-ID')}
                      </div>
                      <div className="text-[10px] font-bold text-slate-400">
                        per {unit.unit_code.toLowerCase()}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Savings Callout */}
            {savingsMessage && (
              <div className="mt-2.5 p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-eco-dark text-xs font-bold flex items-center gap-2 animate-fadeIn">
                <Sparkles className="w-4 h-4 text-eco shrink-0" />
                <span>{savingsMessage}</span>
              </div>
            )}
          </div>

          {/* Step 3: Jumlah Pembelian (Qty Stepper) */}
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-slate-600 mb-2">
              3. Tentukan Jumlah Pesanan ({selectedUnit.unit_code}):
            </label>
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl neo-border border-slate-300">
              <div>
                <span className="text-xs font-bold text-slate-600">Total Fisik:</span>
                <p className="text-sm font-extrabold text-ink">
                  {quantity} {selectedUnit.unit_code} ({totalBasePcs} pcs total)
                </p>
              </div>

              {/* Large Thumb-Friendly Buttons (min 48x48) */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setQuantity((prev) => Math.max(selectedUnit.min_order_qty || 1, prev - 1))}
                  className="w-11 h-11 rounded-xl bg-white neo-border text-ink hover:bg-slate-100 flex items-center justify-center font-black text-lg transition-transform active:scale-95"
                  title="Kurangi"
                >
                  -
                </button>
                <div className="w-12 text-center font-black text-lg text-ink">
                  {quantity}
                </div>
                <button
                  type="button"
                  onClick={() => setQuantity((prev) => prev + 1)}
                  className="w-11 h-11 rounded-xl bg-primary text-white neo-border hover:bg-primary-dark flex items-center justify-center font-black text-lg transition-transform active:scale-95 shadow-sm"
                  title="Tambah"
                >
                  +
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer with Live Total */}
        <div className="p-4 border-t-2 border-ink bg-slate-50 flex items-center justify-between gap-4">
          <div>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              Subtotal:
            </span>
            <span className="font-display font-black text-xl text-accent">
              Rp {lineTotal.toLocaleString('id-ID')}
            </span>
          </div>

          <button
            onClick={handleAddToCart}
            disabled={showAddedNotice}
            className="flex-1 py-3.5 px-4 bg-primary hover:bg-primary-dark text-white rounded-xl font-extrabold text-sm sm:text-base neo-border neo-shadow-primary flex items-center justify-center gap-2 transition-all active:translate-x-0.5 active:translate-y-0.5 disabled:opacity-80"
          >
            {showAddedNotice ? (
              <>
                <Check className="w-5 h-5 text-white" />
                <span>Berhasil Ditambahkan!</span>
              </>
            ) : (
              <>
                <ShoppingBag className="w-5 h-5" />
                <span>Masuk Keranjang</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
