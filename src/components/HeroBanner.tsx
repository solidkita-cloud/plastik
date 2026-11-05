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
              <div className="absolute -top-3.5 -left-2 sm:-left-4 z-20 bg-white px-4 py-2 rounded-xl neo-border shadow-hard text-xs sm:text-sm font-black text-primary flex items-center gap-1.5 -rotate-2 select-none animate-bounce-slow">
                <span className="text-base">✨</span>
                <span>Kemasan Lebih Higienis!</span>
              </div>

              {/* Main Commercial Packaging Photo Container */}
              <div className="bg-white rounded-3xl neo-border-thick shadow-hard-lg overflow-hidden relative group">
                <div className="relative pt-[70%] sm:pt-[65%] w-full bg-slate-50 overflow-hidden">
                  <img
                    src="/products/hero-packaging-group.jpg"
                    alt="Koleksi Kemasan Plastik & Paper PlastiPro"
                    className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 via-transparent to-transparent pointer-events-none" />
                </div>

                {/* Floating Micro Badges on Photo */}
                <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-[11px] font-extrabold text-white">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded-lg bg-eco/90 backdrop-blur-sm neo-border border-white/60 shadow-sm">
                      🌱 Food Grade & Eco
                    </span>
                    <span className="hidden sm:inline-block px-2.5 py-1 rounded-lg bg-primary/90 backdrop-blur-sm neo-border border-white/60 shadow-sm">
                      🔥 Tahan Panas & Dingin
                    </span>
                  </div>
                  <span className="px-2.5 py-1 rounded-lg bg-black/60 backdrop-blur-sm border border-white/40">
                    Ecer & Grosir Dus
                  </span>
                </div>
              </div>

            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
