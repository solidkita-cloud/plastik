import React from 'react';
import { QrCode, ArrowRight, MessageCircle } from 'lucide-react';
import { useSettingsStore } from '../stores/settingsStore';

interface BottomBannerProps {
  onOpenQR: () => void;
}

export const BottomBanner: React.FC<BottomBannerProps> = ({ onOpenQR }) => {
  const storeSettings = useSettingsStore();

  const openWhatsApp = () => {
    const text = encodeURIComponent(
      `Halo Admin ${storeSettings.storeName}! Saya ingin melakukan pemesanan rutin plastik & kemasan.`
    );
    window.open(`https://wa.me/${storeSettings.phone}?text=${text}`, '_blank');
  };

  return (
    <div className="my-8 sm:my-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-gradient-to-r from-sky-100 via-sky-50 to-amber-50/50 rounded-2xl neo-border-thick shadow-hard p-5 sm:p-7">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
            
            {/* Left: QR Scan Feature Highlight */}
            <div 
              onClick={onOpenQR}
              className="md:col-span-4 flex items-center gap-4 bg-white p-3.5 rounded-xl neo-border cursor-pointer hover:bg-sky-50 transition-colors"
            >
              <div className="w-14 h-14 bg-primary text-white rounded-xl flex items-center justify-center shrink-0 neo-border shadow-sm">
                <QrCode className="w-8 h-8" />
              </div>
              <div>
                <span className="text-[11px] font-extrabold text-primary uppercase tracking-wider block">
                  Smart QR CRM
                </span>
                <h4 className="font-extrabold text-sm sm:text-base text-ink leading-tight">
                  Scan QR untuk Re-Order Cepat
                </h4>
                <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                  Pesan lagi dalam 1 klik!
                </p>
              </div>
            </div>

            {/* Center: 3 Easy Order Steps */}
            <div className="md:col-span-5">
              <span className="text-xs font-black uppercase tracking-wider text-slate-700 block mb-2.5">
                Cara Order Mudah:
              </span>
              <div className="flex items-center gap-3 sm:gap-4 text-xs font-bold text-slate-700">
                <div className="flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-primary text-white text-[11px] font-black flex items-center justify-center shrink-0">
                    1
                  </span>
                  <span>Scan QR / Klik Pesan</span>
                </div>
                <span className="text-slate-300">→</span>
                <div className="flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-primary text-white text-[11px] font-black flex items-center justify-center shrink-0">
                    2
                  </span>
                  <span>Pilih Varian</span>
                </div>
                <span className="text-slate-300">→</span>
                <div className="flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-primary text-white text-[11px] font-black flex items-center justify-center shrink-0">
                    3
                  </span>
                  <span>Kirim ke WA</span>
                </div>
              </div>
            </div>

            {/* Right: Big Green Button "Chat Sekarang ->" */}
            <div className="md:col-span-3 flex justify-start md:justify-end">
              <button
                onClick={openWhatsApp}
                className="w-full md:w-auto py-3.5 px-6 bg-eco hover:bg-eco-dark text-white rounded-xl font-extrabold text-sm sm:text-base neo-border-thick neo-shadow-eco flex items-center justify-center gap-2 transition-all active:translate-x-0.5 active:translate-y-0.5"
              >
                <MessageCircle className="w-5 h-5 fill-white/20" />
                <span>Chat Sekarang</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};
