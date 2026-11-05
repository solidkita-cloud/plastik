import React from 'react';
import { Leaf, ArrowRight } from 'lucide-react';

interface EcoBannerProps {
  onFilterEco: () => void;
}

export const EcoBanner: React.FC<EcoBannerProps> = ({ onFilterEco }) => {
  return (
    <div className="bg-gradient-to-br from-emerald-50 via-teal-50 to-sky-50 rounded-2xl neo-border shadow-hard p-5 sm:p-6 flex flex-col justify-between relative overflow-hidden group">
      {/* Tote bag photo in bottom right matching mockup */}
      <div className="absolute -right-4 -bottom-4 w-32 h-32 sm:w-36 sm:h-36 pointer-events-none opacity-85 group-hover:scale-110 transition-transform duration-300">
        <img
          src="/products/eco-bag.jpg"
          alt="Tas Kantong Ramah Lingkungan"
          className="w-full h-full object-contain drop-shadow-md rounded-2xl"
        />
      </div>

      <div className="relative z-10">
        <div className="w-10 h-10 rounded-xl bg-eco/10 border border-eco/30 flex items-center justify-center text-eco mb-3 shadow-sm">
          <Leaf className="w-5 h-5 text-eco fill-eco/30" />
        </div>

        <h3 className="font-display font-black text-xl sm:text-2xl text-ink leading-tight mb-2">
          Kemasan Ramah <br />
          <span className="text-eco">Lingkungan</span>
        </h3>

        <p className="text-xs sm:text-sm text-slate-600 font-medium mb-4 max-w-[200px]">
          Dukung bisnis hijau bersama PlastiPro dengan kemasan alami mudah terurai.
        </p>
      </div>

      <div className="relative z-10 mt-6 pt-3 border-t border-emerald-200/50">
        <button
          onClick={onFilterEco}
          className="py-2.5 px-6 bg-eco hover:bg-eco-dark text-white rounded-xl text-xs sm:text-sm font-black flex items-center gap-2 neo-border transition-all active:translate-x-0.5 active:translate-y-0.5 shadow-sm hover:shadow-none"
        >
          <span>Go Green</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
