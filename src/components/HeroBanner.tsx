import React from 'react';
import { CheckCircle2, ArrowRight } from 'lucide-react';
import { STORE_INFO } from '../lib/constants';

interface HeroBannerProps {
  onOrderClick: () => void;
}

export const HeroBanner: React.FC<HeroBannerProps> = ({ onOrderClick }) => {
  const openWhatsApp = () => {
    const text = encodeURIComponent(
      `Halo ${STORE_INFO.name}! Saya ingin memesan plastik & kemasan untuk kebutuhan usaha kuliner / bisnis saya.`
    );
    window.open(`https://wa.me/${STORE_INFO.phone}?text=${text}`, '_blank');
  };

  return (
    <div className="relative overflow-hidden bg-gradient-to-r from-sky-100 via-sky-50 to-white border-b-2 border-slate-200 py-6 sm:py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          
          {/* Left Content */}
          <div className="lg:col-span-7 z-10">
            {/* Tagline Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-light border border-primary/30 text-primary-dark text-xs font-bold mb-3">
              <span className="w-2 h-2 rounded-full bg-primary animate-ping" />
              Pusat Grosir & Eceran Kemasan UMKM
            </div>

            {/* Main Headline (Exact Copy from Mockup) */}
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-ink tracking-tight leading-[1.15] mb-4">
              Solusi Lengkap <br />
              <span className="text-primary">Plastik & Kemasan</span> <br />
              <span className="text-accent">untuk Bisnis Anda</span>
            </h1>

            {/* 3 Checkpoint USPs */}
            <div className="flex flex-wrap items-center gap-4 sm:gap-6 text-xs sm:text-sm font-bold text-slate-700 mb-6">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-eco fill-eco-light" />
                <span>Kualitas Terbaik</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-eco fill-eco-light" />
                <span>Harga Grosir</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-eco fill-eco-light" />
                <span>Pengiriman Cepat</span>
              </div>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={openWhatsApp}
                className="flex items-center justify-center gap-2 px-6 py-3.5 bg-accent hover:bg-accent-dark text-white rounded-xl font-extrabold text-sm sm:text-base neo-border-thick neo-shadow-accent transition-all active:translate-x-0.5 active:translate-y-0.5"
              >
                <span>Pesan Sekarang via WhatsApp</span>
                <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>

              <button
                onClick={onOrderClick}
                className="px-5 py-3.5 bg-white hover:bg-slate-50 text-ink rounded-xl font-bold text-sm sm:text-base neo-border transition-all hover:bg-slate-100"
              >
                Lihat Katalog & Ukuran
              </button>
            </div>
          </div>

          {/* Right Hero Image / Visual Representation matching Mockup */}
          <div className="lg:col-span-5 relative">
            <div className="relative mx-auto max-w-md lg:max-w-none">
              
              {/* Callout Bubble matching Mockup: "Kemasan Lebih Higienis!" */}
              <div className="absolute -top-3 -left-2 sm:-left-4 z-20 bg-white px-3.5 py-1.5 rounded-xl neo-border shadow-hard text-xs sm:text-sm font-extrabold text-primary flex items-center gap-1.5 -rotate-2">
                <span className="text-base">✨</span>
                <span>Kemasan Lebih Higienis!</span>
              </div>

              {/* Main Card with Packaging Illustration */}
              <div className="bg-white rounded-2xl neo-border-thick shadow-hard p-4 sm:p-6 relative overflow-hidden bg-gradient-to-br from-white via-sky-50/40 to-amber-50/30">
                <div className="grid grid-cols-2 gap-3 items-center">
                  
                  {/* Thinwall Containers Preview */}
                  <div className="space-y-2">
                    <div className="p-3 bg-sky-50 rounded-xl neo-border border-slate-300 text-center">
                      <div className="w-12 h-12 mx-auto bg-primary/10 rounded-lg flex items-center justify-center text-primary font-bold text-xs mb-1">
                        500-1000ml
                      </div>
                      <span className="font-extrabold text-xs text-ink block">Thinwall Box</span>
                      <span className="text-[10px] text-eco font-bold">Microwave Safe</span>
                    </div>

                    <div className="p-3 bg-amber-50 rounded-xl neo-border border-slate-300 text-center">
                      <div className="w-12 h-12 mx-auto bg-amber-500/10 rounded-lg flex items-center justify-center text-accent font-bold text-xs mb-1">
                        Kraft
                      </div>
                      <span className="font-extrabold text-xs text-ink block">Paper Lunch Box</span>
                      <span className="text-[10px] text-slate-500 font-semibold">Food Grade</span>
                    </div>
                  </div>

                  {/* Cup & Bag Preview */}
                  <div className="space-y-2">
                    <div className="p-3 bg-emerald-50 rounded-xl neo-border border-slate-300 text-center">
                      <div className="w-12 h-12 mx-auto bg-eco/10 rounded-lg flex items-center justify-center text-eco font-bold text-xs mb-1">
                        12-22 oz
                      </div>
                      <span className="font-extrabold text-xs text-ink block">Cup Minuman PP</span>
                      <span className="text-[10px] text-primary font-bold">Bisa Sealer Roll</span>
                    </div>

                    <div className="p-3 bg-purple-50 rounded-xl neo-border border-slate-300 text-center">
                      <div className="w-12 h-12 mx-auto bg-purple-500/10 rounded-lg flex items-center justify-center text-purple-700 font-bold text-xs mb-1">
                        HDPE
                      </div>
                      <span className="font-extrabold text-xs text-ink block">Kresek Bening</span>
                      <span className="text-[10px] text-slate-500 font-semibold">Kuat & Ulet</span>
                    </div>
                  </div>

                </div>

                {/* Footer badge on visual */}
                <div className="mt-3 text-center bg-primary text-white py-1.5 px-3 rounded-lg text-[11px] font-bold">
                  Tersedia Eceran, Per Pack, Bal & Dus Pabrik
                </div>
              </div>

            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
