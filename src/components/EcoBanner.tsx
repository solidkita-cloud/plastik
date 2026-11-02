import React from 'react';
import { Leaf, ArrowRight } from 'lucide-react';

interface EcoBannerProps {
  onFilterEco: () => void;
}

export const EcoBanner: React.FC<EcoBannerProps> = ({ onFilterEco }) => {
  return (
    <div className="bg-gradient-to-br from-emerald-100 via-emerald-50 to-teal-50 rounded-2xl neo-border shadow-hard p-5 sm:p-6 flex flex-col justify-between relative overflow-hidden">
      {/* Decorative background element */}
      <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-eco/10 rounded-full blur-xl pointer-events-none" />

      <div>
        <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-eco text-white text-[11px] font-extrabold uppercase tracking-wider mb-3">
          <Leaf className="w-3.5 h-3.5" />
          <span>Biodegradable</span>
        </div>

        <h3 className="font-display font-black text-xl sm:text-2xl text-emerald-950 leading-tight mb-2">
          Kemasan Ramah <br />
          <span className="text-eco-dark">Lingkungan</span>
        </h3>

        <p className="text-xs sm:text-sm text-emerald-900/80 font-medium mb-4">
          Dukung bisnis hijau & tingkatkan citra kuliner Anda bersama pilihan kemasan ramah alam PlastiPro.
        </p>
      </div>

      <div className="mt-4 pt-3 border-t border-emerald-200/60 flex items-center justify-between">
        <button
          onClick={onFilterEco}
          className="py-2.5 px-5 bg-eco hover:bg-eco-dark text-white rounded-xl text-xs sm:text-sm font-extrabold flex items-center gap-2 neo-border transition-all active:translate-x-0.5 active:translate-y-0.5 shadow-sm"
        >
          <span>Jelajahi Produk Eco</span>
          <ArrowRight className="w-4 h-4" />
        </button>

        <span className="text-2xl">🌱</span>
      </div>
    </div>
  );
};
