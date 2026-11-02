import React from 'react';
import { Home, Grid, ShoppingBag, QrCode } from 'lucide-react';
import { useCartStore } from '../stores/cartStore';

interface MobileNavProps {
  activeTab: string;
  onSelectTab: (tab: string) => void;
  onOpenCart: () => void;
  onOpenQR: () => void;
}

export const MobileNav: React.FC<MobileNavProps> = ({
  activeTab,
  onSelectTab,
  onOpenCart,
  onOpenQR
}) => {
  const totalQty = useCartStore((state) => state.getTotalQty());
  const subtotal = useCartStore((state) => state.getSubtotal());

  return (
    <>
      {/* Floating Sticky Cart Bar (Thumb Zone) when items exist */}
      {totalQty > 0 && (
        <div className="fixed bottom-16 inset-x-0 z-30 px-4 sm:hidden pointer-events-none animate-slideUp">
          <div 
            onClick={onOpenCart}
            className="pointer-events-auto bg-accent text-white p-3 rounded-2xl neo-border-thick neo-shadow-accent flex items-center justify-between cursor-pointer active:scale-98 transition-transform"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center font-black text-sm">
                {totalQty}
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider block text-white/90">
                  Keranjang Belanja
                </span>
                <span className="font-extrabold text-sm">
                  Rp {subtotal.toLocaleString('id-ID')}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1.5 font-black text-xs bg-white text-accent px-3 py-1.5 rounded-xl neo-border">
              <span>Checkout WA</span>
              <span>→</span>
            </div>
          </div>
        </div>
      )}

      {/* Main Mobile Bottom Navigation Bar matching phone mockup */}
      <nav className="fixed bottom-0 inset-x-0 z-40 bg-white border-t-2 border-slate-200 sm:hidden">
        <div className="grid grid-cols-4 h-14">
          <button
            onClick={() => onSelectTab('beranda')}
            className={`flex flex-col items-center justify-center gap-1 transition-colors ${
              activeTab === 'beranda' ? 'text-primary font-black' : 'text-slate-500 font-bold'
            }`}
          >
            <Home className="w-5 h-5" />
            <span className="text-[10px]">Beranda</span>
          </button>

          <button
            onClick={() => onSelectTab('kategori')}
            className={`flex flex-col items-center justify-center gap-1 transition-colors ${
              activeTab === 'kategori' ? 'text-primary font-black' : 'text-slate-500 font-bold'
            }`}
          >
            <Grid className="w-5 h-5" />
            <span className="text-[10px]">Kategori</span>
          </button>

          <button
            onClick={onOpenCart}
            className="relative flex flex-col items-center justify-center gap-1 text-slate-500 font-bold transition-colors"
          >
            <div className="relative">
              <ShoppingBag className="w-5 h-5" />
              {totalQty > 0 && (
                <span className="absolute -top-1.5 -right-2 w-4 h-4 rounded-full bg-accent text-white text-[9px] font-black flex items-center justify-center">
                  {totalQty}
                </span>
              )}
            </div>
            <span className="text-[10px]">Keranjang</span>
          </button>

          <button
            onClick={onOpenQR}
            className="flex flex-col items-center justify-center gap-1 text-slate-500 font-bold transition-colors"
          >
            <QrCode className="w-5 h-5" />
            <span className="text-[10px]">QR Order</span>
          </button>
        </div>
      </nav>
    </>
  );
};
