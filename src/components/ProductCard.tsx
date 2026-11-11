import React from 'react';
import { ShoppingCart, Plus, Minus } from 'lucide-react';
import { Product } from '../types';
import { useCartStore } from '../stores/cartStore';

interface ProductCardProps {
  product: Product;
  onOpenModal: (product: Product) => void;
  onShowToast?: (msg: string) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, onOpenModal, onShowToast }) => {
  const defaultVariant = product.variants[0];
  const defaultUnit = defaultVariant?.units.find((u) => u.is_default) || defaultVariant?.units[0];

  const items = useCartStore((state) => state.items);
  const addItem = useCartStore((state) => state.addItem);
  const updateQty = useCartStore((state) => state.updateQty);

  // Check if default unit of this product is in cart
  const cartItem = items.find((i) => i.unit_id === defaultUnit?.id);
  const currentQty = cartItem?.qty || 0;

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!defaultVariant || !defaultUnit) return;

    addItem({
      product_id: product.id,
      product_name: product.name,
      variant_id: defaultVariant.id,
      variant_name: defaultVariant.name,
      unit_id: defaultUnit.id,
      unit_name: defaultUnit.unit_name,
      unit_code: defaultUnit.unit_code,
      base_multiplier: defaultUnit.base_multiplier,
      sku: defaultVariant.sku,
      price: defaultUnit.price,
      cogs_price: defaultUnit.cogs_price,
      qty: 1,
      weight_grams: (defaultVariant.base_pcs_weight_grams || 10) * defaultUnit.base_multiplier
    });

    if (onShowToast) {
      onShowToast(`${product.name} (${defaultUnit.unit_name}) masuk ke keranjang`);
    }
  };

  const handleQuickQtyChange = (e: React.MouseEvent, delta: number) => {
    e.stopPropagation();
    if (!defaultUnit) return;
    const newQty = currentQty + delta;
    updateQty(defaultUnit.id, newQty);
  };

  return (
    <div
      onClick={() => onOpenModal(product)}
      className="group bg-surface rounded-2xl neo-border shadow-hard hover:shadow-hard-lg transition-all duration-200 overflow-hidden flex flex-col justify-between cursor-pointer relative hover:-translate-y-0.5"
    >
      {/* Badge (Best Seller / Eco Friendly / Promo) */}
      {product.badge && (
        <div className="absolute top-3 left-3 z-10">
          <span
            className={`px-2.5 py-1 text-[11px] font-extrabold rounded-lg neo-border shadow-sm uppercase tracking-wider ${
              product.badge === 'Best Seller'
                ? 'bg-amber-400 text-ink'
                : product.badge === 'Eco Friendly'
                ? 'bg-eco text-white'
                : product.badge === 'Promo'
                ? 'bg-red-500 text-white'
                : 'bg-primary text-white'
            }`}
          >
            {product.badge}
          </span>
        </div>
      )}

      {/* Food Grade / Microwave Safe icons in top right */}
      <div className="absolute top-3 right-3 z-10 flex flex-col gap-1 items-end">
        {product.microwave_safe && (
          <span className="px-1.5 py-0.5 bg-white/95 text-eco-dark text-[10px] font-bold rounded neo-border shadow-sm">
            Microwave Safe
          </span>
        )}
        {product.food_grade && (
          <span className="px-1.5 py-0.5 bg-white/95 text-primary text-[10px] font-bold rounded neo-border shadow-sm">
            Food Grade
          </span>
        )}
      </div>

      {/* Product Image */}
      <div className="relative pt-[85%] bg-slate-50 border-b-2 border-ink overflow-hidden flex items-center justify-center p-4">
        <img
          src={product.image_url}
          alt={product.name}
          className="absolute inset-0 w-full h-full object-contain p-4 group-hover:scale-105 transition-transform duration-300"
          loading="lazy"
        />
      </div>

      {/* Product Info */}
      <div className="p-4 flex-1 flex flex-col justify-between">
        <div>
          {/* Material & Variant count */}
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 mb-1">
            <span className="px-1.5 py-0.5 bg-slate-100 rounded text-slate-700">
              {product.material}
            </span>
            <span>•</span>
            <span className="text-primary font-semibold">
              {product.variants.length} Ukuran
            </span>
          </div>

          {/* Title */}
          <h3 className="font-extrabold text-sm sm:text-base text-ink line-clamp-2 leading-snug group-hover:text-primary transition-colors">
            {product.name}
          </h3>

          {/* Price & Unit Details matching mockup */}
          <div className="mt-2.5">
            <div className="flex items-baseline gap-1">
              <span className="text-base sm:text-lg font-black text-accent tracking-tight">
                Rp {defaultUnit?.price.toLocaleString('id-ID')}
              </span>
              <span className="text-xs font-bold text-slate-500">
                / {defaultUnit?.unit_code.toLowerCase()}
              </span>
            </div>

            {/* Note multiplier (e.g. 1 pack = 50 pcs) */}
            {defaultUnit && defaultUnit.base_multiplier > 1 && (
              <p className="text-[11px] font-medium text-slate-500 mt-0.5">
                1 {defaultUnit.unit_code.toLowerCase()} = {defaultUnit.base_multiplier} pcs
              </p>
            )}
          </div>
        </div>

        {/* Action Controls */}
        <div className="mt-4 pt-3 border-t border-slate-100">
          {currentQty === 0 ? (
            <button
              onClick={handleQuickAdd}
              className="w-full py-2.5 px-3 bg-primary hover:bg-primary-dark text-white rounded-xl text-xs sm:text-sm font-extrabold flex items-center justify-center gap-2 neo-border transition-all active:translate-x-0.5 active:translate-y-0.5 shadow-sm"
            >
              <ShoppingCart className="w-4 h-4" />
              <span>+ Tambah Keranjang</span>
            </button>
          ) : (
            <div className="flex items-center justify-between bg-primary-light/60 p-1 rounded-xl border border-primary/40">
              <button
                onClick={(e) => handleQuickQtyChange(e, -1)}
                className="w-8 h-8 rounded-lg bg-white text-ink hover:bg-slate-100 neo-border flex items-center justify-center font-bold"
                title="Kurangi"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              
              <div className="text-center font-black text-sm text-primary-dark px-2">
                {currentQty} <span className="text-[10px] font-bold text-slate-600">{defaultUnit?.unit_code}</span>
              </div>

              <button
                onClick={(e) => handleQuickQtyChange(e, 1)}
                className="w-8 h-8 rounded-lg bg-primary text-white hover:bg-primary-dark neo-border flex items-center justify-center font-bold"
                title="Tambah"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
