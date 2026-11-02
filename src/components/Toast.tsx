import React from 'react';
import { CheckCircle2, ShoppingBag, X } from 'lucide-react';

interface ToastProps {
  message: string;
  isOpen: boolean;
  onClose: () => void;
  onViewCart: () => void;
}

export const Toast: React.FC<ToastProps> = ({ message, isOpen, onClose, onViewCart }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed top-20 right-4 z-50 max-w-sm w-full animate-slideDown pointer-events-none">
      <div className="pointer-events-auto p-4 bg-white rounded-2xl neo-border-thick neo-shadow-lg flex items-center justify-between gap-3 bg-gradient-to-r from-emerald-50 via-white to-sky-50">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-eco text-white flex items-center justify-center shrink-0 neo-border shadow-sm">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] font-black uppercase tracking-wider text-eco-dark block">
              Berhasil Masuk Keranjang
            </span>
            <p className="text-xs font-extrabold text-ink truncate">
              {message}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={onViewCart}
            className="px-2.5 py-1.5 bg-accent hover:bg-accent-dark text-white rounded-lg text-xs font-black flex items-center gap-1 shadow-sm transition-transform active:scale-95"
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>Lihat</span>
          </button>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-ink rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
